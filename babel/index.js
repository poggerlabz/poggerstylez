let fs = require('fs'), spitNewFromCss = require("./outputJsx.js"),
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
          if (styles[selector] && styles[selector].length > 3)
          // eslint-disable-next-line prefer-template
            fileStr += selector + '{' + styles[selector] +  '}';
        }
        if (typeof fn === 'string') fs.writeFileSync(fn, fileStr);
        else for (f of fn) {
          fs.writeFileSync(f, fileStr);
        }
      }
    }
  };
}