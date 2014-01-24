/*jslint node:true, nomen: true*/

'use strict';

var express = require('express'),
    exphbs  = require('express3-handlebars'),
    expyui  = require('../../'), // express-yui
    app     = express();

expyui.extend(app);

// normally, production is the default configuration,
// but here is an example of forcing to use CDN
// for yui core modules with a custom root folder
app.yui.setCoreFromCDN({
    root: app.yui.version + '/build/',
    combine: true
});

app.yui.patchClient(function (Y) {
    var YUI      = Y.config.global.YUI,
        perf     = YUI.Env.perf = {},
        loader   = Y.Env._loader,
        sequence = 0,
        current,
        useId,
        orig;

    function getTime () {
        return new Date().getTime();
    }

    function addTimings (name, context, args) {
        var now = getTime(),
            key = name + '__' + sequence++,
            timings = current[key] = {};

        timings.start = now;
        timings.since_use_start = now - current._use.start;

        orig[name].apply(context, args);

        timings.end = getTime();
        timings.duration = timings.end - timings.start;
    }

    orig = {
        get_js:     Y.Get.js,
        _use:       Y._use,

        _sort:      loader._sort,
        _reduce:    loader._reduce,
        _insert:    loader._insert,
        _explode:   loader._explode,
        calculate:  loader.calculate
    };

    Y._use = function () {
        var modules     = arguments[0],
            now         = getTime();

        // unique id for current `use` operation
        useId = modules.join(',') + '__' + now;

        current = perf[useId] = {
            _use: {
                start: now
            }
        };

        orig._use.apply(Y, arguments);
    };

    Y.Get.js = function () {
        var now = getTime();
        current._use.end = now;
        current._use.duration = current._use.end - current._use.start;
        orig.get_js.apply(Y.Get, arguments);
    };

    loader._sort = function () {
        addTimings('_sort', loader, arguments);
    };

    loader._reduce = function () {
        addTimings('_reduce', loader, arguments);
    };

    loader._insert = function () {
        addTimings('_insert', loader, arguments);
    };

    loader._explode = function () {
        addTimings('_explode', loader, arguments);
    };

    loader.calculate = function () {
        addTimings('calculate', loader, arguments);
    };
});

// template engine
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

// creating a page with YUI embeded
app.get('/', expyui.expose(), function (req, res, next) {
    res.render('page');
});

// listening
app.set('port', process.env.PORT || 8666);
app.listen(app.get('port'), function () {
    console.log("Server listening on port " + app.get('port'));
});
