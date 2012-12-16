/**

@property evento.on

@parameter element {EventTarget} The object you'd like to observe.

@parameter type {string} The name of the event.

@parameter listener {object|function} The listener object or callback function.

@parameter auxArg {string|object} Optional. See description.

@description

If the listener is an object then when a matching event type is dispatched on
the event target, the listener object's handleEvent method will be called.
By supplying a string value for auxArg you can specify the name of
the method to be called. You can also supply a function object for auxArg for
early binding.

If the listener is a function then when a matching event type is dispatched on
the event target, the listener function is called with event target object set as
the "this" object. Using the auxArg you can specifiy a different object to be
the "this" object.

One listener (or type/listener/auxArg pair to be more precise) can be added
only once.

var o = {
    handleEvent: function(){},
    handleClick: function(){}
};

// late binding. handleEvent is found when each event is dispatched
evento.on(document.body, 'click', o);

// late binding. handleClick is found when each event is dispatched
evento.on(document.body, 'click', o, 'handleClick');

// early binding. The supplied function is bound now
evento.on(document.body, 'click', o, o.handleClick);
evento.on(document.body, 'click', o, function(){});

// supplied function will be called with document.body as this object
evento.on(document.body, 'click', function(){});

// The following form is supported but is not neccessary given the options
// above and it is recommended you avoid it.
evento.on(document.body, 'click', this.handleClick, this);

*/

/**

@property evento.off

@parameter element {EventTarget} The object you'd like to stop observing.

@parameter type {string} The name of the event.

@parameter listener {object|function} The listener object or callback function.

@parameter auxArg {string|object} Optional.

@description

Removes added listener matching the element/type/listener/auxArg combination exactly.
If this combination is not found there are no errors.

var o = {handleEvent:function(){}, handleClick:function(){}};
evento.off(document.body, 'click', o);
evento.off(document.body, 'click', o, 'handleClick');
evento.off(document.body, 'click', o, fn);
evento.off(document.body, 'click', fn);
evento.off(document.body, 'click', this.handleClick, this);

*/

/**

@property evento.purge

@parameter listener {EventListener} The listener object that should stop listening.

@description

Removes all registrations of the listener added through evento.on.
This purging should be done before your application code looses its last reference
to listener. (This can also be done with more work using evento.off for
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
    evento.on(this.rootEl, 'click', this, 'handleClick');
    evento.on(this.model, 'change', this, 'handleModelChange');
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
    evento.purge(this);
};

*/

(function() {

    function createBundle(element, type, listener, /*optional*/ auxArg) {
        var bundle = {
            element: element,
            type: type,
            listener: listener
        };
        if (arguments.length > 3) {
            bundle.auxArg = auxArg;
        }
        if (typeof listener === 'function') {
            var thisObj = arguments.length > 3 ? auxArg : element;
            bundle.wrappedHandler = function(evt) {
                listener.call(thisObj, evt);
            };
        }
        else if (typeof auxArg === 'function') {
            bundle.wrappedHandler = function(evt) {
                auxArg.call(listener, evt);
            };
        }
        else {
            var methodName = arguments.length > 3 ? auxArg : 'handleEvent';
            bundle.wrappedHandler = function(evt) {
                listener[methodName](evt);
            };
        }
        return bundle;
    }

    function bundlesAreEqual(a, b) {
        return (a.element === b.element) &&
               (a.type === b.type) &&
               (a.listener === b.listener) &&
               ((!a.hasOwnProperty('auxArg') &&
                 !b.hasOwnProperty('auxArg')) ||
                (a.hasOwnProperty('auxArg') &&
                 b.hasOwnProperty('auxArg') &&
                 (a.auxArg === b.auxArg)));
    }

    function indexOfBundle(bundles, bundle) {
        for (var i = 0, ilen = bundles.length; i < ilen; i++) {
            if (bundlesAreEqual(bundles[i], bundle)) {
                return i;
            }
        }
        return -1;
    }

    evento.on = function(element, type, listener, /*optional*/ auxArg) {
        // Want to call createBundle with the same number of arguments
        // that were passed to this function. Using apply preserves
        // the number of arguments.
        var bundle = createBundle.apply(null, arguments);
        if (listener._evento_bundles) {
            if (indexOfBundle(listener._evento_bundles, bundle) >= 0) {
                // do not add the same listener twice
                return;
            }            
        }
        else {
            listener._evento_bundles = [];
        }
        if (typeof bundle.element.addEventListener === 'function') {
            bundle.element.addEventListener(bundle.type, bundle.wrappedHandler, false); 
        }
        else if ((typeof bundle.element.attachEvent === 'object') &&
                 (bundle.element.attachEvent !== null)) {
            bundle.element.attachEvent('on'+bundle.type, bundle.wrappedHandler);
        }
        else {
            throw new Error('evento.on: Supported EventTarget interface not found.');
        }
        listener._evento_bundles.push(bundle);
    };

    var remove = evento.off = function(element, type, listener, /*optional*/ auxArg) {
        if (listener._evento_bundles) {
            var i = indexOfBundle(listener._evento_bundles, createBundle.apply(null, arguments));
            if (i >= 0) {
                var bundle = listener._evento_bundles[i];
                if (typeof bundle.element.removeEventListener === 'function') {
                    bundle.element.removeEventListener(bundle.type, bundle.wrappedHandler, false);
                } 
                else if ((typeof bundle.element.detachEvent === 'object') &&
                         (bundle.element.detachEvent !== null)) {
                    bundle.element.detachEvent('on'+bundle.type, bundle.wrappedHandler);
                } 
                else {
                    throw new Error('evento.off: Supported EventTarget interface not found.');
                } 
                listener._evento_bundles.splice(i, 1);
            }
        }
    };

    evento.purge = function(listener) {
        if (listener._evento_bundles) {
            var bundles = listener._evento_bundles.slice(0);
            for (var i = 0, ilen = bundles.length; i < ilen; i++) {
                var bundle = bundles[i];
                if (bundle.hasOwnProperty('auxArg')) {
                    remove(bundle.element, bundle.type, bundle.listener, bundle.auxArg);
                }
                else {
                    remove(bundle.element, bundle.type, bundle.listener);
                }
            }
        }
    };

}());
