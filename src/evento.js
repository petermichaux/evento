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

    var listeners = [];

    var makeAdder = function(guts) {
        return function(element, type, listener, /*optional*/ auxArg) {
            // console.log('LIB_addEventListener called with "'+arguments.length+'" arguments.');
            // TODO does using apply arguments do the same thing as the next three lines?
            // If so then potentially use the same thing in EventTarget
            var o = (arguments.length > 3) ?
                        createListener(element, type, listener, auxArg) :
                        createListener(element, type, listener);
            if (hasEventListener(listeners, o)) {
                // do not add the same listener twice
                return;
            }
            guts(o);
            listeners.push(o);
        };
    };

    var makeRemover = function(guts) {
        return function(element, type, listener, /*optional*/ auxArg) {
            // console.log('LIB_removeEventListener called with "'+arguments.length+'" arguments.');
            // TODO does using apply arguments do the same thing as the next three lines?
            // If so then potentially use the same thing in EventTarget
            var o = (arguments.length > 3) ?
                        createListener(element, type, listener, auxArg) :
                        createListener(element, type, listener);
            if (o = hasEventListener(listeners, o)) {
                // console.log('removing');
                // element.removeEventListener(o.type, o.wrappedHandler, false);
                guts(o);
                removeEventListener(listeners, o); // TODO not efficient because already looked for it with hasEventListener
            }
        };
    };

    if (isHostMethod(document, 'addEventListener')) {

        LIB_addEventListener = makeAdder(function(o) {
            o.element.addEventListener(o.type, o.wrappedHandler, false);
        });

        LIB_removeEventListener = makeRemover(function(o) {
            o.element.removeEventListener(o.type, o.wrappedHandler, false);
        });

    }
    else if (isHostMethod(document, 'attachEvent')) {

        LIB_addEventListener = makeAdder(function(o) {
            o.element.attachEvent('on'+o.type, o.wrappedHandler);
        });

        LIB_removeEventListener = makeRemover(function(o) {
            o.element.detachEvent('on'+o.type, o.wrappedHandler);
        });

    }

}());
