var LIB_addEventListener;
var LIB_removeEventListener;
var LIB_purgeEventListeners;

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
               ((!hasOwnProperty(a, 'auxArg') &&
                 !hasOwnProperty(b, 'auxArg')) ||
                (hasOwnProperty(a, 'auxArg') &&
                 hasOwnProperty(b, 'auxArg') &&
                 (a.auxArg === b.auxArg)));
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

    var getElementListeners = function(element) {
        var result = [];
        for (var i=0, ilen=listeners.length; i<ilen; i++) {
            var listener = listeners[i];
            if (listener.element === element) {
                result.push(listener);
            }
        }
        return result;
    };

    var makeAdder = function(guts) {
        return function(element, type, listener, /*optional*/ auxArg) {
            // Want to call createListener with the same number of arguments
            // that were passed to this function. Using apply preserves
            // the number of arguments.
            var o = createListener.apply(null, arguments);
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
            var o = createListener.apply(null, arguments);
            if (o = hasEventListener(listeners, o)) {
                guts(o);
                removeEventListener(listeners, o); // TODO not efficient because already looked for it with hasEventListener
            }
        };
    };

    if (isHostMethod(document, 'addEventListener') &&
        isHostMethod(document, 'removeEventListener')) {

        LIB_addEventListener = makeAdder(function(o) {
            o.element.addEventListener(o.type, o.wrappedHandler, false);
        });

        LIB_removeEventListener = makeRemover(function(o) {
            o.element.removeEventListener(o.type, o.wrappedHandler, false);
        });

    }
    else if (isHostMethod(document, 'attachEvent') &&
             isHostMethod(document, 'detachEvent')) {

        LIB_addEventListener = makeAdder(function(o) {
            o.element.attachEvent('on'+o.type, o.wrappedHandler);
        });

        LIB_removeEventListener = makeRemover(function(o) {
            o.element.detachEvent('on'+o.type, o.wrappedHandler);
        });

    }

    if (typeof LIB_removeEventListener === 'function') {

        var purge = LIB_purgeEventListeners = function(element) {
            var listeners = getElementListeners(element);
            for (var i = 0, ilen = listeners.length; i < ilen; i++) {
                var listener = listeners[i];
                if (hasOwnProperty(listener, 'auxArg')) {
                    LIB_removeEventListener(listener.element, listener.type, listener.listener, listener.auxArg);
                }
                else {
                    LIB_removeEventListener(listener.element, listener.type, listener.listener);
                }
            }
            // walk down the DOM tree
            for (var i = 0, ilen = element.childNodes.length; i < ilen; i++) {
                purge(element.childNodes[i]);
            }
        };

    }

}());
