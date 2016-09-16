module.exports = function (w) {
  return {
    files: [
      'src/*.ts'
    ],
    tests: [
      'src/tests/**/*.ts'
    ],
    compilers: {
      "**/*.ts*": w.compilers.typeScript({module: "commonjs", target: "es6"})
    },
    env: {
      type: "node"
    },
    testFramework: "mocha",
    workers: {
       initial: 1,
       regular: 1,
       recycle: false
     },
    delays: {
      run: 500
    },
    preprocessors: {
      '**/*test.js': file => {
        var getSourceMapFromDataUrl = function (code) {
          const sourceMapCommentRegEx = /\/\/[@#] sourceMappingURL=data:application\/json(?:;charset[:=][^;]+)?;base64,(.*)\n/;
          const match = code.match(sourceMapCommentRegEx);
          const sourceMapBase64 = match[1];
          return JSON.parse(new Buffer(sourceMapBase64, 'base64').toString());
        };
        var transformedCode = require('espower-source')(
          file.content.replace('(\'assert\')', '(\'power-assert\')'),
          file.path);

        return {code: transformedCode, sourceMap: getSourceMapFromDataUrl(transformedCode)};
      }
    },
    // preprocessors: {
    //   "**/*.js*": file => require("babel-core").transform(file.content.replace('(\'assert\')', '(\'power-assert\')'), {
    //     sourceMap: true,
    //     presets: ["es2015", "stage-2", "babel-preset-power-assert"]
    //   })
    // }, 
    setup: function(w) {
      // configure sinon
      var sinon = require('sinon');
      var sinonTest = require('sinon-test');

      sinon.test = sinonTest.configureTest(sinon);
      sinon.testCase = sinonTest.configureTestCase(sinon);

      // setup power asssert
      var Module = require('module').Module;
      if (!Module._originalRequire) {
        const modulePrototype = Module.prototype;
        Module._originalRequire = modulePrototype.require;
        modulePrototype.require = function (filePath) {
          if (filePath === 'empower-core') {
            var originalEmpowerCore = Module._originalRequire.call(this, filePath);
            var newEmpowerCore = function () {
              var originalOnError = arguments[1].onError;
              arguments[1].onError = function (errorEvent) {
                errorEvent.originalMessage = errorEvent.error.message + '\n';
                return originalOnError.apply(this, arguments);
              };
              return originalEmpowerCore.apply(this, arguments);
            };
            newEmpowerCore.defaultOptions = originalEmpowerCore.defaultOptions;
            return newEmpowerCore;
          }
          return Module._originalRequire.call(this, filePath);
        };
      }

      // handle db
      global.workerId = w.workerId;
      console.log('setting up ...');
    },
    teardown: function (wallaby) {
      console.log('tearing down');
      if (db) {
        console.log('tearing down db');
        db.dropDatabase();
        db.close();
      }
    }
  };
};