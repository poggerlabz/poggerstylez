let t = require('@babel/types'), fs = require('fs'),
  { hashifyName } = require('poggerhashez/addon');

function getCssFromTemplateIfTernary(node, str = '') {
  let retval = { consequent: str, alternate: str };
  let attr = node.quasis[0].value.raw,
    {
      test,
      consequent: { value: ifTrue },
      alternate: { value: ifFalse }
    } = node.expressions[0];
  retval.paramName = test && test.name; 
  retval.consequent +=  `${attr}${ifTrue}`;
  retval.alternate += `${attr}${ifFalse}`;
  return retval;
}

function getTernParam(node) {
  if (node.type === 'TemplateLiteral') {
    let attr = node.quasis[0].value.raw,
      {
        test: { name: paramName },
        consequent: { value: ifTrue },
        alternate: { value: ifFalse }
      } = node.expressions[0];
    return {
      paramName,
      ifTrue: attr + ifTrue,
      ifFalse: attr + ifFalse
    }
  }
  else if (node.type === 'ConditionalExpression') {
    var paramName = node.test.name;
    return {
      paramName,
      ifTrue: node.consequent.value,
      ifFalse: node.alternate.value
    }
  }
}

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
  let styles = {}, fn = '';

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
          let [{ value: element }, {
              type: styleType,
              value: styleValue,
              params: styleParams,
              body: styleBody,
              properties: styleProperties
            }] = args, css = '', parseStyleBody = function(node, depth = 0) {
              if (node.type === "BinaryExpression" && node.operator === "+") {
                if (node.left.type === 'StringLiteral') {
                  if (typeof css === 'string') css = [];
                  css.push({
                    baseStr: node.left.value
                  });
                }
                else if (node.left.type === 'TemplateLiteral') {
                  if (typeof css === 'string') css = [];
                    css.push({
                      params: [getTernParam(node.left)]
                    });
                }
                else if (node.left.type === "BinaryExpression") parseStyleBody(node.left, depth + 1);

                if (node.right.type === 'TemplateLiteral' || node.right.type === 'ConditionalExpression') {
                  if (typeof css === 'string') css = [];
                  css.push({
                    params: [getTernParam(node.right)]
                  });
                }
                else if (node.right.type === "BinaryExpression") parseStyleBody(node.right, depth + 1);
              }
              else if (node.type === 'TemplateLiteral') {
                if (typeof css === 'string') css = [];
                css.push({ 
                  params: [getCssFromTemplateIfTernary(node)]
                });
              }
            };
          if (styleType === 'StringLiteral') {
            css = styleValue;
          }
          else if (styleType === 'ArrowFunctionExpression') {
            if (styleParams[0].type === 'ObjectPattern') {
              styleParams[0].properties.forEach((node) => {
                attrs.push(node.value.name);
              });

              if (styleBody.type === 'BinaryExpression' && styleBody.operator == '+') {
                parseStyleBody(styleBody);
              }
            }
          }
          else if (styleType === 'ObjectExpression') {
            css = {};
            for (var i = 0; i < styleProperties.length; i++) {
              css[styleProperties[i].key.value] =
                styleProperties[i].value.value;
            }
          }

          if (typeof css === 'string') {
            if (!css.endsWith(";")) css += ';';
            className = `fc-${hashifyName(`fc ${css}`)}`;
            styles[`.${className}`] = css;
          }
          else {
            if (css.length) {
              for (let { baseStr, params } of css) {
                if (baseStr !== undefined && baseStr !== null) {
                  className = `fc-${hashifyName(`fc ${baseStr}`)}`;
                  styles[`.${className}`] = baseStr;
                }
                if (params) {
                  for (var p = 0; p < params.length; p++) {
                    console.log(params[p]);
                    let { paramName, ifTrue, ifFalse, consequent, alternate } = params[p];
                    styles[`.${className}.${paramName}True`] = ifTrue || consequent;
                    styles[`.${className}.${paramName}False`] = ifFalse || alternate;
                  }
                }
              }
            } else if (Object.keys(css).includes('baseStr')) {
              let { baseStr, params } = css;
              className = `fc-${hashifyName(`fc ${baseStr}`)}`;
              styles[`.${className}`] = baseStr;
              for (var p = 0; p < params.length; p++) {
                let { paramName, ifTrue, ifFalse } = params[p];
                styles[`.${className}.${paramName}True`] = ifTrue;
                styles[`.${className}.${paramName}False`] = ifFalse;
              }
            }
            else if (Object.keys(css).includes('&')) {
              // First aggregate all selectors
              let mash = '';
              for (let k in css) {
                let ac = css[k].endsWith(";") ? css[k] : (css[k] + ';')
                mash += k.replace(/&/g, '.fc') + '{' + css[k] + '}';
              }
              className = `fc-${hashifyName(`fc ${mash}`)}`;
              for (let o in css) {
                styles[o.replace(/&/g, `.${className}`)] = css[o];
              }
            }
            else {
              for (let i in css) {
                let ac = css[i].endsWith(";") ? css[i] : (css[i] + ';');
                className = `fc-${hashifyName(`fc ${ac}`)}`;
                styles[`.${className}`] = ac;
              }
            }
          }
          path.replaceWith(spitNewFromCss(element, className, attrs));
        }
      }
    },
    post() {
      if (fn.length) {
        let fileStr = '';
        for (let selector in styles) {
          if (styles[selector] && styles[selector].length > 3)
          // eslint-disable-next-line prefer-template
            fileStr += selector + '{' + styles[selector] + (styles[selector].endsWith(";") ? "" : ";") +  '}';
        }
        if (typeof fn === 'string') fs.writeFileSync(fn, fileStr);
        else for (f of fn) {
          fs.writeFileSync(f, fileStr);
        }
      }
    }
  };
}
