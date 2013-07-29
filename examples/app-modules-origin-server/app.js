/*jslint node:true, nomen: true*/

'use strict';

var express = require('express'),
    exphbs  = require('express3-handlebars'),
    yui     = require('../../'), // express-yui
    app     = express();

app.configure('development', function () {

    // when using `yui.debug()` middleware you will get debug,
    // filter and logLevel set accordingly or customized
    app.use(yui.debug({ filter: 'raw' }));

    // to get YUI Core modules from the app origin.
    app.yui.setCoreFromAppOrigin({
        // any special loader group configuration
    });

});

app.configure('production', function () {

    // to get YUI Core modules from the app origin.
    app.yui.setCoreFromAppOrigin();

    // when running in production to use a custom CDN that
    // uses the app as origin server
    app.yui.applyGroupConfig('metas', {
        // special loader group configuration
        base: 'http://flickrcdn.com/app/',
        comboBase: 'http://flickrcdn.com/combo?',
        comboSep: '&',
        root: 'app/'
    });

});

// registering the group information for a group named `metas`
app.yui.registerGroup('metas', './build');

// template engine
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

// serving static yui modules
app.use(yui['static']({
    maxAge: 100
}));

// creating a page with YUI embeded
app.get('/', yui.expose(), function (req, res, next) {
    res.render('page');
});

// listening
app.set('port', process.env.PORT || 8666);
app.listen(app.get('port'), function () {
    console.log("Server listening on port " +
        app.get('port') + " in " + app.get('env') + " mode");
});
