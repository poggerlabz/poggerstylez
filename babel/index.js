let fs = require('fs'), spitNewFromCss = require("./outputJsx.js"),
  { cssBlockString } = require('../common/index.js'),
  { hashifyName } = require('poggerhashez/addon'),
  { withSemicolon, parseStyleBody } = require('./common.js');

module.exports = function () {
  var styles = {}, fn = '';

  function outputStyles(obj) {
    if (obj.length) {
      for (let obs in obj) {
        outputStyles(obs);
      }
    }

    let { baseStr, className, params } = obj;

    if (baseStr !== undefined && baseStr !== null) {
      let baseStrWithSemi = withSemicolon(baseStr);

      className = `fc-${hashifyName(`fc ${baseStrWithSemi}`)}`;
      selector = `.${className}`;
      styles[selector] = baseStrWithSemi;
    }
    if (params) {
      for (let { paramName, ifTrue, ifFalse } of params) {
        styles[`${selector}.${paramName}True`] = ifTrue;
        styles[`${selector}.${paramName}False`] = ifFalse;
      }
    }
    return className;
  }

  return {
    visitor: {
      ImportDeclaration(path) {
        if (path.node.specifiers[0].local.name === 'fromCss') {
            path.remove();
        }
      },
      CallExpression(path, { opts }) {
        let { node: { callee, arguments: args } } = path, attrs = [];

        if (fn === '') {
          if (opts && opts.toFile) fn = opts.toFile;
        }
        if (callee.name === 'fromCss') {
          let [{ value: element }, arg] = args;
          path.replaceWith(spitNewFromCss(element, outputStyles(parseStyleBody(arg)), attrs));
        }
      }
    },
    post() {
      if (fn.length) {
        let fileStr = '';
        for (let selector in styles) {
          let entry = styles[selector];
          if (entry && entry.length > 3) {
            fileStr += cssBlockString(selector, entry);
          }
        }
        if (typeof fn === 'string') fs.writeFileSync(fn, fileStr);
        else for (f of fn) {
          fs.writeFileSync(f, fileStr);
        }
      }
    }
  };
}