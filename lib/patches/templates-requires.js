/*
 * Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node:true, nomen: true */

/**
Patches `Y.Loader` to support `templates` requirements, which enables you to
require templates easily without having to know the name of the module
generated by the build transpiler/plugin/task while define modules.

You can write your modules like this:

    YUI.add('name', function (Y) {
        // module code...
    }, '0.1', { requires: [], templates: ['foo'] });

And you can enable the patch like this:

    app.yui.patch(require('express-yui/lib/patches/templates-bundles-requires'));

This will guarantee, that the template denotated by the logical name `foo`
will be loaded. Of course, it will be loaded based on the transpiler
output, which generates a more complex module name. If you don't use this patch, you will
have to use the full name of the generated module.

@module express-yui/lib/patches/templates-bundles-requires
**/
module.exports = function (Y) {
    var getRequires = Y.Env._loader.getRequires;
    Y.Env._loader.getRequires = function (mod) {
        var i, len, m,
            r = getRequires.apply(this, arguments);
        // expanding requirements with templates required
        if (mod.templates) {
            len = mod.templates.length;
            for (i = 0; i < len; i += 1) {
                m = this.getModule(mod.group + '-template-' + mod.templates[i]);
                if (m) {
                    r = [].concat(this.getRequires(m), r);
                }
            }
        }
        return r;
    };
};