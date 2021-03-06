/*
* Copyright (c) 2013, Yahoo! Inc. All rights reserved.
* Copyrights licensed under the New BSD License.
* See the accompanying LICENSE file for terms.
*/

/*jslint node:true, nomen:true*/

"use strict";

var YUITest = require('yuitest'),
    A = YUITest.Assert,
    OA = YUITest.ObjectAssert,
    mockery = require('mockery'),
    middleware,
    suite,
    expressCombo,
    origin;

suite = new YUITest.TestSuite("middleware-test suite");

suite.add(new YUITest.TestCase({
    name: "middleware-test",

    _should: {
        error: {
            "test setCoreFromAppOrigin without calling yui()": true
        }
    },

    setUp: function () {
        mockery.enable({
            useCleanCache: true,
            warnOnReplace: false,
            warnOnUnregistered: false
        });
        expressCombo = {};
        mockery.registerMock('express-combo', expressCombo);
        middleware = require('../../lib/middleware.js');
    },

    tearDown: function () {
        expressCombo = null;
        middleware = null;
        mockery.disable();
    },

    "test static": function () {

        var mid,
            options,
            config,
            combineCalled,
            req = {
                app: {
                    yui: {
                        _groupFolderMap: {
                            'testgroup': 'path/to/testgroup-1.2.3'
                        },
                        path: 'path/to/yui',
                        version: 'a.b.c',
                        config: function () { return config; }
                    },
                    get: function () {}
                }
            },
            res = {},
            folders,
            counter = 0;

        options = {
            foo: 1
        };
        config = {
            root: "http://foo.yahoo.com",
            comboBase: "/samba~",
            comboSep: "$",
            local: true,
            combine: true,
            groups: {
                "testgroup": {
                    root: "http://foo.yahoo.com",
                    comboBase: "/samba~",
                    comboSep: "$",
                    local: true
                }
            }
        };

        expressCombo.combine = function (o) {
            combineCalled = true;
            A.areEqual(1, o.foo, 'options should be propagated');
            return function (req, res, next) {
                counter += 1;
                next();
            };
        };

        folders = [function (name, path, o) {
            // console.log(o);
            A.areEqual('yui-a.b.c', name, 'yui group should be added to static.folder()');
            A.areEqual('path/to/yui', path, 'yui path should be collected from app.yui.version');
            A.areEqual(1, o.foo, 'options should be propagated');

            return function (req, res, next) {
                counter += 1;
                next();
            };
        }, function (name, path, o) {
            // console.log(o);
            A.areEqual('testgroup-1.2.3', name, 'testgroup group should be added to static.folder()');
            A.areEqual('path/to/testgroup-1.2.3', path, 'testgroup path should be collected from _groupFolderMap basename value');
            A.areEqual(1, o.foo, 'options should be propagated');

            return function (req, res, next) {
                counter += 1;
                next();
            };
        }];

        expressCombo.folder = function () {
            return folders.shift().apply(this, arguments);
        };

        mid = middleware['static'](options);

        mid(req, res, function (err, data) {
            counter += 1;
        });

        A.areEqual(true, combineCalled, 'static.combine() was not called');
        A.isFunction(mid, 'static() should return a middleware');
        A.areEqual(4, counter, 'not all middleware were called');
    },

    "test exposeSeed": function () {
        var mid,
            req = { app: { yui: { } } },
            res = { locals: { } },
            nextCalled = false;

        YUITest.Mock.expect(req.app.yui, {
            method: 'getSeedUrls',
            args: [],
            run: function () {
                return ['url1', 'url2'];
            }
        });

        YUITest.Mock.expect(res, {
            method: 'expose',
            args: [YUITest.Mock.Value.Any, 'window.YUI_config.seed'],
            run: function (seed) {
                // [ 'url1',
                //      'url2' ]
                // console.log(seed);
                A.areEqual(2, seed.length, 'only 2 seed expected');
                A.areEqual('url1',
                            seed[0],
                            'seed[0] does not match');
                A.areEqual('url2',
                            seed[1],
                            'seed[1] does not match');
            }
        });

        mid = middleware.exposeSeed();
        mid(req, res, function () {
            nextCalled = true;
        });

        A.isFunction(mid, 'middleware should be a function');
        A.areEqual(true, nextCalled, 'next() was not called from the middleware');

        YUITest.Mock.verify(req.app.yui);
        YUITest.Mock.verify(res);
    },

    "test exposeConfig": function () {
        var req,
            res,
            fixture,
            configFn,
            mid,
            called = false,
            config = {
                root: '/foo/bar',
                extendedCore: [ 'my-module' ]
            };

        fixture = '(function(){YUI.Env.core.push.apply(YUI.Env.core,["my-module"]);YUI.applyConfig({"root":"/foo/bar","extendedCore":["my-module"]});}())';
        req = { app: { yui: { config: function () {
            return config;
        } } } };
        res = { locals: { yui: { } } };

        YUITest.Mock.expect(res, {
            method: 'expose',
            args: [YUITest.Mock.Value.Object, YUITest.Mock.Value.String],
            callCount: 2,
            run: function (data, ns) {
                if (ns === 'window.YUI_config') {
                    console.log(data);
                    A.areEqual(config, data, 'exposed data should');
                } else {
                    A.areEqual('window.app.yui', ns, 'exposed data should');
                }
            }
        });

        mid = middleware.exposeConfig();
        mid(req, res, function () {
            called = true;
        });

        A.isFunction(mid, 'return value should be a middleware');
        A.areEqual(true, called, 'next() was not called');
        YUITest.Mock.verify(res);
    },

    "test expose": function () {
        var fn1,
            fn2,
            mid,
            counter = 0;

        fn1 = middleware.exposeConfig;
        fn2 = middleware.exposeSeed;
        middleware.exposeConfig = middleware.exposeSeed  = function() {
            return function (req, res, next) {
                counter++;
                next();
            };
        };

        mid = middleware.expose();

        A.isFunction(mid, 'expose middleware is missing');

        mid({}, {}, function () { counter++; });
        A.areEqual(3, counter, 'exposeSeed and exposeConfig should be invoked as part of expose');

        middleware.exposeConfig = fn1;
        middleware.exposeSeed = fn2;
    },

    "test debug": function () {
        var mid,
            req = { app: { yui: {} } },
            res = {},
            output = {};

        YUITest.Mock.expect(res, {
            method: 'expose',
            args: [YUITest.Mock.Value.Any, YUITest.Mock.Value.String],
            callCount: 3,
            run: function (data, ns) {
                output[ns] = data;
            }
        });
        YUITest.Mock.expect(req.app.yui, {
            method: 'getSeedUrls',
            args: [YUITest.Mock.Value.Object],
            run: function (config) {
                output.config = config;
                return 'final-seed';
            }
        });

        mid = middleware.debug();

        A.isFunction(mid, 'debug middleware is missing');

        mid(req, res, function () { output.ok = 1; });

        A.areEqual(1, output.ok, 'debug middleware should never stop the flow');
        A.areEqual('debug', output.config.filter, 'default filter');
        A.areEqual(false, output.config.combine, 'default combine');
        A.areEqual('debug', output['window.YUI_config.filter'], 'exposed filter');
        A.areEqual(false, output['window.YUI_config.combine'], 'exposed combine');
        A.areEqual('final-seed', output['window.YUI_config.seed'], 'seed shoudl be recomputed');

        YUITest.Mock.verify(res.expose);
        YUITest.Mock.verify(req.app.yui);
    },

    "test debug with params": function () {
        var mid,
            req = { app: { yui: {} } },
            res = {},
            output = {};

        YUITest.Mock.expect(res, {
            method: 'expose',
            args: [YUITest.Mock.Value.Any, YUITest.Mock.Value.String],
            callCount: 3,
            run: function (data, ns) {
                output[ns] = data;
            }
        });
        YUITest.Mock.expect(req.app.yui, {
            method: 'getSeedUrls',
            args: [YUITest.Mock.Value.Object],
            run: function (config) {
                output.config = config;
                return 'final-seed';
            }
        });

        mid = middleware.debug({
            filter: 'raw',
            combine: true
        });

        mid(req, res, function () { output.ok = 1; });

        A.areEqual('raw', output.config.filter, 'custom filter');
        A.areEqual(true, output.config.combine, 'custom combine');
        A.areEqual('raw', output['window.YUI_config.filter'], 'custom filter');
        A.areEqual(true, output['window.YUI_config.combine'], 'custom combine');

        YUITest.Mock.verify(res.expose);
        YUITest.Mock.verify(req.app.yui);
    }

}));

YUITest.TestRunner.add(suite);
