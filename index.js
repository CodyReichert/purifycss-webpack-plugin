var purify = require("purify-css");
var merge = require("array-merger").merge;
var glob = require("glob").sync;
var path = require("path");
var ConcatSource = require("webpack/lib/ConcatSource");

module.exports = function PurifyPlugin(options) {
    // Base path
    this.basePath = options.basePath || process.cwd();
    // Purify options
    this.purifyOptions = options.purifyOptions || {minify:true, info:true};
    // Path/files to check. If none supplied, an empty array will do.
    this.paths = options.paths || [];
    // Additional extensions to scan for. This is kept minimal, for obvious reasons.
    // We are not opinionated...
    var exts = ["js"];
    options.scanForExts = options.scanForExts || [];
    this.scanForExts = merge(exts, options.scanForExts);
}

module.exports.prototype.apply = function(compiler) {
    var files=[], self=this;
    self.paths.forEach(function(p){
        files = merge(files, glob(path.join(self.basePath, p)));
    });

    compiler.plugin("this-compilation", function(compilation) {
        compilation.plugin("additional-assets", function(cb){
            // Look for additional JS/HTML stuff.
            for(var key in compilation.fileDependencies) {
                var file = compilation.fileDependencies[key];
                var ext = path.extname(file).substr(1);
                var isScannable = false;
                for(var i=0; i<self.scanForExts.length; i++) {
                    if(self.scanForExts[i] == ext) {
                        isScannable = true;
                        break;
                    }
                }
                if(isScannable) {
                    // Add the file.
                    files.push(file);
                }
            }

            // Look for purifyable CSs...
            for(var key in compilation.assets) {
                if(/\.css$/i.test(key)) {
                    // We found a CSS. So purify it.
                    var asset = compilation.assets[key];
                    var css = asset.source();
                    var newCss = new ConcatSource();
                    newCss.add(purify(files, css, self.purifyOptions));
                    compilation.assets[key] = newCss;
                }
            }
            cb();
        });
    });
}
