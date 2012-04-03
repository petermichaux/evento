// Build a big string that can be used to create
// big memory garbage.
var bigString = (function() {
    var littleString = 'abcdefghijklmnopqrstuvwxyz';
    var growingString = '';
    for (var i = 0; i < 10000; i++) {
        growingString += littleString;
    }
    return growingString;
}());

var throbber = '.';
function updateRunningReporter(i) {
     // Don't want to update reporter every iteration. That is 
     // unnecessary, too much
     // DOM manipulation and to frantic for a human to watch.
    if (i % 10 === 0) {
        var reporter = document.getElementById('runningReporter');
        // Don't want the reporter to grow indefinitely so occasionally
        // clear it and start growing again.
        throbber = (i % 500 === 0) ? '.' : (throbber + '.');
        reporter.innerHTML = throbber;
    }
}

var timeout;
function iterate(i) {
    mainLoop(i);
    updateRunningReporter(i);
    // Use setTimeout to avoid long running script warning alerts
    // since we specifically want this to just keep going and going.
    //
    // Use a string as the first argument to setTimeout to avoid
    // any unknown closure issues the browser may have.
    timeout = setTimeout('iterate('+(i+1)+')', 10);
}

function start() {
    iterate(0);
}

function stop() {
    if (timeout) {
        clearTimeout(timeout);
        timeout = null;
    }
}
