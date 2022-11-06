let t = require('@babel/types'), fs = require('fs'),
  { hashifyName } = require('poggerhashez/addon'),
  { withSemicolon, parseStyleBody } = require('./common.js');

function spitNewFromCss(element, className, attributes = []) {
  return t.functionExpression(null, [
    t.objectPattern([
      t.objectProperty(t.identifier("children"), t.identifier("children")), 
      ...attributes.map(n => t.objectProperty(t.identifier(n), t.identifier(n))),
      t.restElement(t.identifier('rest'))
    ])
  ],
  t.blockStatement([
    t.variableDeclaration("let", [t.variableDeclarator(t.identifier("newClassName"), t.stringLiteral(className))]),
    ...attributes.map(n =>
        t.expressionStatement(t.assignmentExpression("+=", t.identifier("newClassName"), t.conditionalExpression(t.identifier(n), t.stringLiteral(" " + n + "True"), t.stringLiteral(" " + n + "False"))))
    ),
    t.returnStatement(
      t.jsxElement(
        t.jsxOpeningElement(
          t.jsxIdentifier(element), [
            t.jsxAttribute(t.jsxIdentifier("className"), t.jsxExpressionContainer(t.identifier("newClassName"))),
            t.jsxSpreadAttribute(t.identifier("rest"))
          ]),
        t.jsxClosingElement(t.jsxIdentifier(element)), 
        [t.jsxExpressionContainer(t.identifier("children"))], 
      false)
    )
  ]));
}

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
      className = `fc-${hashifyName(`fc ${withSemicolon(baseStr)}`)}`;
      styles[`.${className}`] = withSemicolon(baseStr);
    }
    if (params) {
      for (let { paramName, ifTrue, ifFalse } of params) {
        styles[`.${className}.${paramName}True`] = ifTrue;
        styles[`.${className}.${paramName}False`] = ifFalse;
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
        let { node: { callee, arguments: args } } = path, className, attrs = [];

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