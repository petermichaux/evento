var LIB_addEventListener;
var LIB_removeEventListener;

(function() {

    function hasOwnProperty(o, p) {
        return Object.prototype.hasOwnProperty.call(o, p);
    }

    function isHostMethod(object, property) {
        var type = typeof object[property];  
        return type === 'function' ||
               (type === 'object' && !!object[property]) ||
               type === 'unknown';
    }

    function createListener(element, type, listener, /*optional*/ auxArg) {
        var o = {
            element: element,
            type: type,
            listener: listener
        };
        if (arguments.length > 3) {
            o.auxArg = auxArg;
        }
        if (typeof o.listener === 'function') {
            o.thisObj = hasOwnProperty(o, 'auxArg') ? o.auxArg : element;
        }
        else {
            o.methodName = hasOwnProperty(o, 'auxArg') ? o.auxArg : 'handleEvent';
        }
        o.wrappedHandler = function(evt) {
            if (typeof o.listener === 'function') { // TODO this check can be when o.wrappedHandler is set
                o.listener.call(o.thisObj, evt); // o. doesn't need to be used because captured in closure
            }
            else {
                o.listener[o.methodName](evt);
            }
        };
        return o;
    }

    function listenersAreEqual(n, o) {
        return (n.element === o.element) &&
               (n.type === o.type) &&
               (n.listener === o.listener) &&
               ((!hasOwnProperty(n, 'auxArg') &&
                 !hasOwnProperty(o, 'auxArg')) ||
                (hasOwnProperty(n, 'auxArg') &&
                 hasOwnProperty(o, 'auxArg') &&
                 (n.auxArg === o.auxArg)));
    }

    // TODO rename getEventListener and don't return false
    function hasEventListener(listeners, o) {
        for (var i = 0, ilen = listeners.length; i < ilen; i++) {
            var listener = listeners[i];
            if (listenersAreEqual(listener, o)) {
                return listener;
            }
        }
        return false;
    }

    function removeEventListener(listeners, o) {
        // Loop backwards through the array so adjacent references
        // to "listener" are all removed.
        for (var i = listeners.length; i--; ) {
            if (listenersAreEqual(listeners[i], o)) {
                listeners.splice(i, 1);
            }
        }
    }

    var listeners = {};

    if (isHostMethod(document, 'addEventListener')) {

        LIB_addEventListener = function(element, type, listener, /*optional*/ auxArg) {
            // console.log('LIB_addEventListener called with "'+arguments.length+'" arguments.');
            // TODO does using apply arguments do the same thing as the next three lines?
            // If so then potentially use the same thing in EventTarget
            var o = (arguments.length > 3) ?
                        createListener(element, type, listener, auxArg) :
                        createListener(element, type, listener);
            if (hasOwnProperty(listeners, type)) {
                // console.log('listeners for type "'+type+'" already exists.');
                if (hasEventListener(listeners[type], o)) {
                    // do not add the same listener twice
                    return;
                }
            }
            else {
                // console.log('initializing listeners for type "'+type+'".');
                listeners[type] = [];
            }
            element.addEventListener(o.type, o.wrappedHandler, false);
            listeners[type].push(o);
        };

        LIB_removeEventListener = function(element, type, listener, /*optional*/ auxArg) {
            // console.log('LIB_removeEventListener called with "'+arguments.length+'" arguments.');
            // TODO does using apply arguments do the same thing as the next three lines?
            // If so then potentially use the same thing in EventTarget
            var o = (arguments.length > 3) ?
                        createListener(element, type, listener, auxArg) :
                        createListener(element, type, listener);
            if (hasOwnProperty(listeners, type)) {
                if (o = hasEventListener(listeners[type], o)) {
                    // console.log('removing');
                    element.removeEventListener(o.type, o.wrappedHandler, false);
                    removeEventListener(listeners[type], o); // TODO not efficient because already looked for it with hasEventListener
                }
            }
        };

    }
    else if (isHostMethod(document, 'attachEvent')) {

        throw new Error('TODO old IE not supported yet');

    }

}());
