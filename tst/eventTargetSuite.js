(function() {
    var global = this;

    // BEGIN some interesting objects to play with.

    var tweet1 = 'Great sandwich!';
    var tweet1b = '@bar hey!';
    var tweet2 = 'So tired!';
    var tweet3 = 'Homework sucks!';
    var tweet4 = 'No thoughts lately.';
    var tweet5 = 'My last tweet ever. Bye-bye.';

    var feed1;
    var feed1b;
    var feed2;
    var feed3;
    var feed4;
    var feedAll;

    var listener1 = function(data) {
        feed1.push(data.tweet);
    };

    var listener1b = function(data) {
        feed1b.push(data.tweet);
    };

    var listener2 = function(data) {
        feed2.push(data.tweet);
    };

    var listener3 = function(data) {
        feed3.push(data.tweet);
    };

    var listener4 = function(data) {
        feed4.push(data.tweet);
    };

    var twitter = new evento.EventTarget();

    function APP_Twitter(name) {
        this.name = name;
    };
    evento.EventTarget.mixin(APP_Twitter.prototype);

    var tweetsRUs = new APP_Twitter('Tweets R Us');

    // END some interesting objects to play with.


    buster.testCase("event target test suite", {

        setUp: function() {
            // clear the feeds
            feed1 = [];
            feed1b = [];
            feed2 = [];
            feed3 = [];
            feed4 = [];
            feedAll = [];

            // add some listeners
            evento.EventTarget.prototype.addEventListener('foo', listener1);
            evento.EventTarget.prototype.addEventListener('bar', listener1b);
            twitter.addEventListener('foo', listener2);
            tweetsRUs.addEventListener('foo', listener3);
            APP_Twitter.prototype.addEventListener('foo', listener4);

            // send some tweets
            evento.EventTarget.prototype.dispatchEvent({
                type: 'foo',
                tweet: tweet1
            });

            evento.EventTarget.prototype.dispatchEvent({
                type: 'bar',
                tweet: tweet1b
            });

            twitter.dispatchEvent({
                type: 'foo',
                tweet: tweet2
            });

            tweetsRUs.dispatchEvent({
                type: 'foo',
                tweet: tweet3
            });

            APP_Twitter.prototype.dispatchEvent({
                type: 'foo',
                tweet: tweet4
            });

            APP_Twitter.prototype.dispatchEvent({
                type: 'foo',
                tweet: tweet5
            });

        },

        tearDown: function() {
            // remove the listeners
            evento.EventTarget.prototype.removeEventListener('foo', listener1);
            evento.EventTarget.prototype.removeEventListener('bar', listener1b);
            twitter.removeEventListener('foo', listener2);
            tweetsRUs.removeEventListener('foo', listener3);
            APP_Twitter.prototype.removeEventListener('foo', listener4);
        },

        "test evento.EventTarget.prototype constructor": function() {
            assert.same(evento.EventTarget, evento.EventTarget.prototype.constructor, "evento.EventTarget.prototype's constructor should be Object.");
        },

        "test evento.EventTarget instance's constructor": function() {
            assert.same(evento.EventTarget, evento.EventTarget.prototype.constructor, "evento.EventTarget.prototype should have Object as its constructor.");
            assert.same(evento.EventTarget, (new evento.EventTarget()).constructor, "an instance of evento.EventTarget should have evento.EventTarget as its constructor.");
        },

        "test evento.EventTarget.mixin does not change constructor": function() {
            function F() {}
            var obj = new F();
            var constructorBefore = obj.constructor;
            assert.same(F, constructorBefore, "sanity check");
            evento.EventTarget.mixin(obj);
            assert.same(constructorBefore, obj.constructor, "the constructor should not have changed");
        },

        "test event lists of listeners are separate for one subject": function() {
            assert.arrayEquals([tweet1], feed1);
            assert.arrayEquals([tweet1b], feed1b);
        },

        "test lists of listeners for same event are separate for multiple subjects": function() {
            assert.arrayEquals([tweet1], feed1);
            assert.arrayEquals([tweet2], feed2);
            assert.arrayEquals([tweet3], feed3);
            assert.arrayEquals([tweet4, tweet5], feed4);
        },

        "test methodName defaults to \"handleEvent\"": function() {
            var s = new evento.EventTarget();
            var called = false;
            var listener = {
                handleEvent: function() {
                    called = true;
                }
            };
            s.addEventListener('foo', listener);
            s.dispatchEvent({type:'foo'});
            assert.same(true, called);
            called = false;
            s.removeEventListener('foo', listener);
            s.dispatchEvent({type:'foo'});
            assert.same(false, called);
        },

        "test thisObj not supplied is event target object": function() {
            var s = new evento.EventTarget();
            var thisObj = null;
            var f = function() {
                thisObj = this;
            };
            s.addEventListener('foo', f);
            refute.same(s, thisObj);
            s.dispatchEvent({type:'foo'});
            assert.same(s, thisObj);
            thisObj = null;
            s.removeEventListener('foo', f);
            s.dispatchEvent({type:'foo'});
            assert.same(null, thisObj);
        },

        "test trying to add same listener function twice only adds it once": function() {
            var s = new evento.EventTarget();
            var f = function() {
                f.count++;
            };
            var reset = function() {
                f.count = 0;
            };
            reset();
            assert.same(0, f.count, 'start with zero');
            s.addEventListener('foo', f);
            s.addEventListener('foo', f);
            s.dispatchEvent({type: 'foo'});
            assert.same(1, f.count, 'f should only have been called once');
        },

        "test adding same listener function with different type parameters adds it twice": function() {
            var s = new evento.EventTarget();
            var f = function() {
                f.count++;
            };
            var reset = function() {
                f.count = 0;
            };
            reset();
            assert.same(0, f.count, 'start with zero');
            s.addEventListener('foo', f);
            s.addEventListener('bar', f);
            s.dispatchEvent({type: 'foo'});
            s.dispatchEvent({type: 'bar'});
            assert.same(2, f.count, 'f should only have been called twice');
        },

        "test that bubbling while handling an event does not alter the original event and currentTarget changes": function() {

            var child0 = new evento.EventTarget();
            var child1 = new evento.EventTarget();
            var child2 = new evento.EventTarget();

            child2.addParentEventTarget(child1);
            child1.addParentEventTarget(child0);

            var result0;
            var result1;
            var result2;

            child0.addEventListener('foo', function(ev) {
                result0 = ev;
            });

            child1.addEventListener('foo', function(ev) {
                result1 = ev;
            });

            child2.addEventListener('foo', function(ev) {
                result2 = ev;
            });

            child2.dispatchEvent({type:'foo'});

            assert.same(child2, result0.target, 'assertion 1: The target should be child0.');
            assert.same(child0, result0.currentTarget, 'assertion 2: The currentTarget should be child0.');
            assert.same(child2, result1.target, 'assertion 3: The target should be child1.');
            assert.same(child1, result1.currentTarget, 'assertion 4: The currentTarget should be child0.');
            assert.same(child2, result2.target, 'assertion 5: The target should be child2.');
            assert.same(child2, result2.currentTarget, 'assertion 6: The currentTarget should be child1.');
        },

        "test remove parent event target": function() {
            var child = new evento.EventTarget();
            var parent0 = new evento.EventTarget();
            var parent1 = new evento.EventTarget();
            var parent2 = new evento.EventTarget();

            var result = false;
            var result0 = false;
            var result1 = false;
            var result2 = false;

            child.addEventListener('foo', function() {
                result = true;
            });

            parent0.addEventListener('foo', function() {
                result0 = true;
            });

            parent1.addEventListener('foo', function() {
                result1 = true;
            });

            parent2.addEventListener('foo', function() {
                result2 = true;
            });

            child.addParentEventTarget(parent0);
            child.addParentEventTarget(parent1);
            child.addParentEventTarget(parent2);

            assert.same(false, result);
            assert.same(false, result0);
            assert.same(false, result1);
            assert.same(false, result2);

            child.dispatchEvent({type:'foo'});

            assert.same(true, result);
            assert.same(true, result0);
            assert.same(true, result1);
            assert.same(true, result2);

            result = false;
            result0 = false;
            result1 = false;
            result2 = false;

            child.removeParentEventTarget(parent1);

            child.dispatchEvent({type:'foo'});

            assert.same(true, result);
            assert.same(true, result0);
            assert.same(false, result1);
            assert.same(true, result2);

        },

        "test stopPropagation": function() {

            var child0 = new evento.EventTarget();
            var child1 = new evento.EventTarget();

            child1.addParentEventTarget(child0);

            var result0 = false;
            var result1 = false;

            child0.addEventListener('foo', function() {
                result0 = true;
            });

            child1.addEventListener('foo', function(evt) {
                result1 = true;
                evt.stopPropagation();
            });

            child1.addParentEventTarget(child0);

            assert.same(false, result0);
            assert.same(false, result1);

            child1.dispatchEvent({type:'foo'});

            assert.same(false, result0);
            assert.same(true, result1);
        },

        "test bubbles event property": function() {

            var child0 = new evento.EventTarget();
            var child1 = new evento.EventTarget();

            var result0 = false;
            var result1 = false;

            child0.addEventListener('foo', function() {
                result0 = true;
            });

            child1.addEventListener('foo', function(evt) {
                result1 = true;
            });

            child1.addParentEventTarget(child0);

            assert.same(false, result0);
            assert.same(false, result1);

            child1.dispatchEvent({type:'foo', bubbles:false});

            assert.same(false, result0);
            assert.same(true, result1);
        },

        "test all parents called even when one removes itself as a parent when handling the event": function() {
            // a possible bug is that parent2 will not be called assuming the parents would
            // be called in order of attachment to the child: parent0, parent1, parent2.

            var child = new evento.EventTarget();
            var parent0 = new evento.EventTarget();
            var parent1 = new evento.EventTarget();
            var parent2 = new evento.EventTarget();

            var called0 = false;
            var called1 = false;
            var called2 = false;

            parent0.addEventListener('foo', function() {
                called0 = true;
            });

            parent1.addEventListener('foo', function() {
                called1 = true;
                child.removeParentEventTarget(parent1);
            });

            parent2.addEventListener('foo', function() {
                called2 = true;
            });

            child.addParentEventTarget(parent0);
            child.addParentEventTarget(parent1);
            child.addParentEventTarget(parent2);

            child.dispatchEvent({type: 'foo'});

            assert.same(true, called0);
            assert.same(true, called1);
            assert.same(true, called2);
        },

        "test EventTarget has superConstructor Object": function() {
            assert.same(Object, evento.EventTarget.superConstructor);
        }

    });

}());
