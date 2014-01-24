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
        loaderMethods,
        current,
        orig,
        len,
        i;

    function getTime () {
        return new Date().getTime();
    }

    // Generic way to instrument a function. Uses sequencing to support
    // multiple invocations during a single `Y.use()` call.
    function instrument (context, name) {
        var orig = context[name];

        context[name] = function () {
            var now     = getTime(),
                key     = name + '__' + sequence++,
                timing  = current[key] = {};

            timing.since_use_start = now - current.start;
            timing.start = now;

            orig.apply(context, arguments);

            timing.end = getTime();
            timing.duration = timing.end - timing.start;
        };
    }

    orig = {
        getjs:  Y.Get.js,
        _use:   Y._use
    };

    // Start of the `Y.use()` invocation
    Y._use = function () {
        var now = getTime(),
            useId;

        // unique id for current `use` invocation
        useId = arguments[0].join(',') + '__' + now;

        current = perf[useId] = { start: now };
        orig._use.apply(Y, arguments);
    };

    // Effective end of the `Y.use()` invocation before things get async
    Y.Get.js = function () {
        current.end = getTime();
        current.duration = current.end - current.start;
        orig.getjs.apply(Y.Get, arguments);
    };

    loaderMethods = [
        '_sort',
        '_reduce',
        '_insert',
        '_explode',
        'calculate'
    ];

    for (i = 0, len = loaderMethods.length; i < len; i += 1) {
        instrument(loader, loaderMethods[i]);
    }

});

// Example output:
// {
//     "stencil-toggle,stencil,stencil-carousel,stencil-bquery,stencil-sticker,stencil-scrollview,af-applets,app-base,af-rapid__1390583569230": {
//         "start": 1390583569230,
//         "calculate__0": {
//             "since_use_start": 0,
//             "start": 1390583569230,
//             "end": 1390583569250,
//             "duration": 20
//         },
//         "_explode__1": {
//             "since_use_start": 3,
//             "start": 1390583569233,
//             "end": 1390583569244,
//             "duration": 11
//         },
//         "_reduce__2": {
//             "since_use_start": 14,
//             "start": 1390583569244,
//             "end": 1390583569244,
//             "duration": 0
//         },
//         "_sort__3": {
//             "since_use_start": 14,
//             "start": 1390583569244,
//             "end": 1390583569250,
//             "duration": 6
//         },
//         "_insert__4": {
//             "since_use_start": 21,
//             "start": 1390583569251,
//             "end": 1390583569267,
//             "duration": 16
//         },
//         "calculate__5": {
//             "since_use_start": 22,
//             "start": 1390583569252,
//             "end": 1390583569260,
//             "duration": 8
//         },
//         "_explode__6": {
//             "since_use_start": 22,
//             "start": 1390583569252,
//             "end": 1390583569254,
//             "duration": 2
//         },
//         "_reduce__7": {
//             "since_use_start": 24,
//             "start": 1390583569254,
//             "end": 1390583569254,
//             "duration": 0
//         },
//         "_sort__8": {
//             "since_use_start": 24,
//             "start": 1390583569254,
//             "end": 1390583569260,
//             "duration": 6
//         },
//         "end": 1390583569262,
//         "duration": 32
//     }
// }

// template engine
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

// creating a page with YUI embeded
app.get('/', expyui.expose(), function (req, res) {
    res.render('page');
});

// listening
app.set('port', process.env.PORT || 8666);
app.listen(app.get('port'), function () {
    console.log("Server listening on port " + app.get('port'));
});
