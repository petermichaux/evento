evento.create = (function() {
    function F() {}
    return function(o) {
        F.prototype = o;
        return new F();
    };
}());
