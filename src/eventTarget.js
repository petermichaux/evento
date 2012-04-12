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

@parameter listener {EventListener} The listener object that should stop listening.

@description

Removes all registrations of the listener added through LIB_addEventListener.
This purging should be done before your application code looses its last reference
to listener. (This can also be done with more work using LIB_removeEventListener for
each registeration.) If the listeners are not removed or purged, the listener
will continue to observe the EventTarget and cannot be garbage collected. In an
MVC application this can lead to "zombie views" if the model data cannot be
garbage collected. Event listeners need to be removed from event targets in browsers
with circular reference memory leak problems (i.e. old versions of Internet Explorer.)

The primary motivation for this purge function is to easy cleanup in MVC View destroy 
methods. For example,

var APP_BoxView = function(model, controller) {
    this.model = model || new APP_BoxModel();
    this.controller = controller || new APP_BoxController();
    this.rootEl = document.createElement('div');

    // subscribe to DOM node(s) and model object(s) or anything else
    // implementing the EventTarget interface using listener objects
    // and specifying method name using the same subscription interface.
    //
    LIB_addEventListener(this.rootEl, 'click', this, 'handleClick');
    LIB_addEventListener(this.model, 'change', this, 'handleModelChange');
};

APP_BoxView.prototype.handleClick = function() {
    // might subscribe/unsubscribe to more DOM nodes or models here
};

APP_BoxView.prototype.handleModelChange = function() {
    // might subscribe/unsubscribe to more DOM nodes or models here
};

APP_BoxView.prototype.destroy = function() {

    // Programmer doesn't need to remember anything. Purge all subscriptions
    // to DOM nodes, model objects, or anything else implementing
    // the EventTarget interface in one fell swoop.
    //
    LIB_purgeEventListeners(this);
};

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

    function indexOfListener(listeners, o) {
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
        if (listener._LIB_listeners) {
            if (indexOfListener(listener._LIB_listeners, o) >= 0) {
                // do not add the same listener twice
                return;
            }            
        }
        else {
            listener._LIB_listeners = [];
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
        listener._LIB_listeners.push(o);
    };

    LIB_removeEventListener = function(element, type, listener, /*optional*/ auxArg) {
        if (listener._LIB_listeners) {
            var i = indexOfListener(listener._LIB_listeners, createListener.apply(null, arguments));
            if (i >= 0) {
                var o = listener._LIB_listeners[i];
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
                listener._LIB_listeners.splice(i, 1);
            }
        }
    };

    LIB_purgeEventListeners = function(lstnr) {
        if (lstnr._LIB_listeners) {
            var listeners = lstnr._LIB_listeners.slice(0);
            for (var i = 0, ilen = listeners.length; i < ilen; i++) {
                var listener = listeners[i];
                if (listener.hasOwnProperty('auxArg')) {
                    LIB_removeEventListener(listener.element, listener.type, listener.listener, listener.auxArg);
                }
                else {
                    LIB_removeEventListener(listener.element, listener.type, listener.listener);
                }
            }
        }
    };

}());
