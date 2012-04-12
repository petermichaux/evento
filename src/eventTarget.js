/*
 * Copyright (c) 2012, Peter Michaux, http://peter.michaux.ca/
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 */

/**

@property LIB_addEventListener

@parameter element {EventTarget} The object you'd like to observe.

@parameter type {string} The name of the event.

@parameter listener {object|function} The listener object or callback function.

@parameter auxArg {string|object} Optional. See description.

@description

If the listener is an object then when a matching event type is dispatched on
the event target, the listener object's handleEvent method will be called.
Using the auxArg you can specify the name of the method to be called.

If the listener is a function then when a matching event type is dispatched on
the event target, the listener function is called with event target object set as
the "this" object. Using the auxArg you can specifiy a different object to be
the "this" object.

One listener (or type/listener/auxArg pair to be more precise) can be added
only once.

LIB_addEventListener(document.body, 'click', {handleEvent:function(){}});
LIB_addEventListener(document.body, 'click', {handleClick:function(){}}, 'handleClick');
LIB_addEventListener(document.body, 'click', function(){});
LIB_addEventListener(document.body, 'click', this.handleClick, this);

*/

/**

@property LIB_removeEventListener

@parameter element {EventTarget} The object you'd like to stop observing.

@parameter type {string} The name of the event.

@parameter listener {object|function} The listener object or callback function.

@parameter auxArg {string|object} Optional.

@description

Removes added listener matching the element/type/listener/auxArg combination exactly.
If this combination is not found there are no errors.

var o = {handleEvent:function(){}, handleClick:function(){}};
LIB_removeEventListener(document.body, 'click', o);
LIB_removeEventListener(document.body, 'click', o, 'handleClick');
LIB_removeEventListener(document.body, 'click', fn);
LIB_removeEventListener(document.body, 'click', this.handleClick, this);

*/

/**

@property LIB_purgeEventListeners

@parameter element {EventTarget} The DOM element you'd like to purge.

@description

Removes all event listeners added to the element and all its descendent elements
through LIB_addEventListener. This purging should be done before your application
code looses its last reference to the element. Otherwise memory will leak
as this library will hold references to the element, the listener, and
auxArg (if it was used) and all objects referenced by those objects through
property or closure references.

*/

var LIB_addEventListener;
var LIB_removeEventListener;
var LIB_purgeEventListeners;

(function() {

    function createListener(element, type, listener, /*optional*/ auxArg) {
        var o = {
            element: element,
            type: type,
            listener: listener
        };
        if (arguments.length > 3) {
            o.auxArg = auxArg;
        }
        if (typeof listener === 'function') {
            var thisObj = arguments.length > 3 ? auxArg : element;
            o.wrappedHandler = function(evt) {
                listener.call(thisObj, evt);
            };
        }
        else {
            var methodName = arguments.length > 3 ? auxArg : 'handleEvent';
            o.wrappedHandler = function(evt) {
                listener[methodName](evt);
            };
        }
        return o;
    }

    function listenersAreEqual(a, b) {
        return (a.element === b.element) &&
               (a.type === b.type) &&
               (a.listener === b.listener) &&
               ((!a.hasOwnProperty('auxArg') &&
                 !b.hasOwnProperty('auxArg')) ||
                (a.hasOwnProperty('auxArg') &&
                 b.hasOwnProperty('auxArg') &&
                 (a.auxArg === b.auxArg)));
    }

    var listeners = [];

    function indexOfListener(o) {
        for (var i = 0, ilen = listeners.length; i < ilen; i++) {
            if (listenersAreEqual(listeners[i], o)) {
                return i;
            }
        }
        return -1;
    }

    LIB_addEventListener = function(element, type, listener, /*optional*/ auxArg) {
        // Want to call createListener with the same number of arguments
        // that were passed to this function. Using apply preserves
        // the number of arguments.
        var o = createListener.apply(null, arguments);
        if (indexOfListener(o) >= 0) {
            // do not add the same listener twice
            return;
        }
        if (typeof element.addEventListener === 'function') {
            o.element.addEventListener(o.type, o.wrappedHandler, false); 
        }
        else if ((typeof element.attachEvent === 'object') &&
                 (element.attachEvent !== null)) {
            o.element.attachEvent('on'+o.type, o.wrappedHandler);
        }
        else {
            throw new Error('LIB_addEventListener: Supported EventTarget interface not found.');
        }
        listeners.push(o);
    };

    LIB_removeEventListener = function(element, type, listener, /*optional*/ auxArg) {
        var i = indexOfListener(createListener.apply(null, arguments));
        if (i >= 0) {
            var o = listeners[i];
            if (typeof o.element.removeEventListener === 'function') {
                o.element.removeEventListener(o.type, o.wrappedHandler, false);
            } 
            else if ((typeof element.detachEvent === 'object') &&
                     (element.detachEvent !== null)) {
                o.element.detachEvent('on'+o.type, o.wrappedHandler);
            } 
            else {
                throw new Error('LIB_removeEventListener: Supported EventTarget interface not found.');
            } 
            listeners.splice(i, 1);
        }
    };

    if (typeof LIB_removeEventListener === 'function') {

        var getListeners = function(lstnr) {
            var result = [];
            for (var i = 0, ilen = listeners.length; i < ilen; i++) {
                var listener = listeners[i];
                if (listener.listener === lstnr) {
                    result.push(listener);
                }
            }
            return result;
        };

        var purge = LIB_purgeEventListeners = function(lstnr) {
            var listeners = getListeners(lstnr);
            for (var i = 0, ilen = listeners.length; i < ilen; i++) {
                var listener = listeners[i];
                if (listener.hasOwnProperty('auxArg')) {
                    LIB_removeEventListener(listener.element, listener.type, listener.listener, listener.auxArg);
                }
                else {
                    LIB_removeEventListener(listener.element, listener.type, listener.listener);
                }
            }
        };

    }

}());
