/**

@property evento.EventTarget

@description

A constructor function for creating event target objects.

var et = new evento.EventTarget();

The methods of an event target object are inspired by the DOM2 standard.

*/
evento.EventTarget = function() {};

(function() {

    function hasOwnProperty(o, p) {
        return Object.prototype.hasOwnProperty.call(o, p);
    }

    var create = (function() {
        function F() {}
        return function(o) {
            F.prototype = o;
            return new F();
        };
    }());

/**

@property evento.EventTarget.prototype.addEventListener

@parameter type {string} The name of the event.

@parameter listener {object|function} The listener object or callback function.

@description

If the listener is an object then when a matching event type is dispatched on
the event target, the listener object's handleEvent method will be called.

If the listener is a function then when a matching event type is dispatched on
the event target, the listener function is called with event target object set as
the "this" object.

One listener (or type/listener pair to be more precise) can be added only once.

et.addEventListener('change', {handleEvent:function(){}});
et.addEventListener('change', function(){});

*/
    evento.EventTarget.prototype.addEventListener = function(type, listener) {
        hasOwnProperty(this, '_evento_listeners') || (this._evento_listeners = {});
        hasOwnProperty(this._evento_listeners, type) || (this._evento_listeners[type] = []);
        var listeners = this._evento_listeners[type];
        for (var i = 0, ilen = listeners.length; i < ilen; i++) {
            if (listeners[i] === listener) {
                // can only add a listener once
                return;
            }
        }
        listeners.push(listener);
    };

/**

@property evento.EventTarget.prototype.removeEventListener

@parameter type {string} The name of the event.

@parameter listener {object|function} The listener object or callback function.

@description

Removes added listener matching the type/listener combination exactly.
If this combination is not found there are no errors.

var o = {handleEvent:function(){}};
et.removeEventListener('change', o);
et.removeEventListener('change', fn);

*/
    evento.EventTarget.prototype.removeEventListener = function(type, listener) {
        if (hasOwnProperty(this, '_evento_listeners') &&
            hasOwnProperty(this._evento_listeners, type)) {
            var listeners = this._evento_listeners[type];
            for (var i = 0, ilen = listeners.length; i < ilen; i++) {
                if (listeners[i] === listener) {
                    listeners.splice(i, 1);
                    // no need to continue since a particular listener
                    // can only be added once
                    return;
                }
            }
        }
    };

/**

@property evento.EventTarget.prototype.addParentEventTarget

@parameter parent {EventTarget} A parent to call when bubbling an event.

@description

When an event is dispatched on an event target, if that event target has parents
then the event is also dispatched on the parents as long as bubbling has not
been canceled on the event.

One parent can be added only once.

var o = new evento.EventTarget();
et.addParentEventTarget(o);

*/
    evento.EventTarget.prototype.addParentEventTarget = function(parent) {
        if (typeof parent.dispatchEvent !== 'function') {
            throw new TypeError('evento.EventTarget.prototype.addParentEventTarget: Parents must have dispatchEvent method.');
        }
        hasOwnProperty(this, '_evento_parents') || (this._evento_parents = []);
        var parents = this._evento_parents;
        for (var i = 0, ilen = parents.length; i < ilen; i++) {
            if (parents[i] === parent) {
                // can only add a particular parent once
                return;
            }
        }
        parents.push(parent);
    };

/**

@property evento.EventTarget.prototype.removeParentEventTarget

@parameter parent {EventTarget} The parent to remove.

@description

Removes parent added with addParentEventTarget. If the listener is
not found there are no errors.

var o = {handleEvent:function(){}};
et.removeParentEventTarget(o);

*/
    evento.EventTarget.prototype.removeParentEventTarget = function(parent) {
        if (hasOwnProperty(this, '_evento_parents')) {
            var parents = this._evento_parents;
            for (var i = 0, ilen = parents.length; i < ilen; i++) {
                if (parents[i] === parent) {
                    parents.splice(i, 1);
                    // no need to continue as parent can be added only once
                    return;
                }
            }
        }
    };

/**

@property evento.EventTarget.prototype.dispatchEvent

@parameter evt {object} The event object to dispatch to all listeners.

@description

The evt.type property is required. All listeners registered for this
event type are called with evt passed as an argument to the listeners.

If not set, the evt.target property will be set to be the event target.

The evt.currentTarget will be set to be the event target.

Call evt.stopPropagation() to stop bubbling to parents.

et.dispatchEvent({type:'change'});
et.dispatchEvent({type:'change', extraData:'abc'});

*/
    evento.EventTarget.prototype.dispatchEvent = function(evt) {
        // Want to ensure we don't alter the evt object passed in as it 
        // may be a bubbling event. So clone it and then setting currentTarget
        // won't break some event that is already being dispatched.
        evt = create(evt);
        ('target' in evt) || (evt.target = this); // don't change target on bubbling event
        evt.currentTarget = this;
        evt._propagationStopped = ('bubbles' in evt) ? !evt.bubbles : false;
        evt.stopPropagation = function() {
            evt._propagationStopped = true;
        };
        if (hasOwnProperty(this, '_evento_listeners') &&
            hasOwnProperty(this._evento_listeners, evt.type)) {
            // Copy the list of listeners in case one of the
            // listeners modifies the list while we are
            // iterating over the list.
            //
            // Without making a copy, one listener removing
            // an already-called listener would result in skipping
            // a not-yet-called listener. One listener removing 
            // a not-yet-called listener would result in skipping that
            // not-yet-called listner. The worst case scenario 
            // is a listener adding itself again which would
            // create an infinite loop.
            //
            var listeners = this._evento_listeners[evt.type].slice(0);
            for (var i = 0, ilen = listeners.length; i < ilen; i++) {
                var listener = listeners[i];
                if (typeof listener === 'function') {
                    listener.call(this, evt);
                }
                else {
                    listener.handleEvent(evt);
                }
            }
        }
        if (hasOwnProperty(this, '_evento_parents') &&
            !evt._propagationStopped) {
            var parents = this._evento_parents.slice(0);
            for (var i = 0, ilen = parents.length; i < ilen; i++) {
                parents[i].dispatchEvent(evt);
            }
        }
    };

    // Insure the prototype object is initialized properly
    evento.EventTarget.call(evento.EventTarget.prototype);

/**

@property evento.EventTarget.mixin

@parameter obj {object} The object to be made into an event target.

@description

Mixes in the event target methods into any object.

// Example 1

app.Person = function(name) {
    evento.EventTarget.call(this);
    this.setName(name);
};
evento.EventTarget.mixin(app.Person.prototype);
app.Person.prototype.setName = function(newName) {
    var oldName = this.name;
    this.name = newName;
    this.dispatchEvent({
        type: "change",
        oldName: oldName,
        newName: newName
    });
};

var person = new app.Person('David');
person.addEventListener('change', function(evt) {
    alert('"' + evt.oldName + '" is now called "' + evt.newName + '".');
});
person.setName('Dave');

// Example 2

var o = {};
evento.EventTarget.mixin(o);
o.addEventListener('change', function(){alert('change');});
o.dispatchEvent({type:'change'});

*/
    evento.EventTarget.mixin = function(obj) {
        var pt = evento.EventTarget.prototype;
        for (var p in pt) {
            if (hasOwnProperty(pt, p) &&
                // Don't want to copy evento.EventTarget.prototype._evento_listeners object
                // or the evento.EventTarget.prototype._evento_parents object. Want the obj object
                // to have its own listeners and parents and not share listeners and parents
                // with evento.EventTarget.prototype.
                (typeof pt[p] === 'function')) {
                obj[p] = pt[p];
            }
        } 
        evento.EventTarget.call(obj);
    };

}());
