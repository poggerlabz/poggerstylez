let t = require('@babel/types'), fs = require('fs'),
  { hashifyName } = require('poggerhashez/addon');

function getCssFromTemplateIfTernary(node, str = '') {
  let retval = { consequent: str, alternate: str };
  let attr = node.quasis[0].value.raw,
    {
      consequent: { value: ifTrue },
      alternate: { value: ifFalse }
    } = node.expressions[0];
  retval.consequent +=  `${attr}${ifTrue}`;
  retval.alternate += `${attr}${ifFalse}`;
  return retval;
}

function getCssFromTernary(node, baseStr, paramName) {
  let { consequent, alternate } = node;

  return {
    baseStr,
    paramName,
    consequent: consequent.value,
    alternate: alternate.value
  }
}

function getCssFromBinaryExp({ left, right }, str = '') {
  if (left.type === 'StringLiteral') {
    if (right.type === 'TemplateLiteral' &&
    right.expressions[0].type === 'ConditionalExpression') {
      return getCssFromTemplateIfTernary(right, left.value);
    }
    if (right.type === 'BinaryExpression') {
      return getCssFromBinaryExp(right, str + left.value);
    }
  }
  else if (left.type === 'BinaryExpression') {
    if (right.type === 'StringLiteral') {
      return getCssFromBinaryExp(left, str + right.value);
    }
    if (right.type === 'TemplateLiteral') {
      let c = getCssFromBinaryExp(left),
        d = getCssFromTemplateIfTernary(right);
      if (Object.keys(c).length === Object.keys(d).length) {
        let e = {}
        for (var k in c) {
          e[k] = c[k] + (c[k].endsWith(";") ? '' : ';') + d[k];
        }

        return e;
      }
    }
  }
  else if (left.type === 'TemplateLiteral' &&
    right.type === 'TemplateLiteral') {
    let lft = getCssFromTemplateIfTernary(left),
      rgt = getCssFromTemplateIfTernary(right);

    return {
      "tt": str + lft.consequent + right.consequent,
      "tf": str + lft.consequent + right.alternate,
      "ft": str + lft.alternate + right.consequent,
      "ff": str + lft.alternate + right.alternate
    }
  }
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

function spitNewFromCss(element, className) {
  return t.functionExpression(null, [
    t.objectPattern([
      t.objectProperty(t.identifier("children"), t.identifier("children")), 
      t.restElement(t.identifier('rest'))
    ])
  ],
  t.blockStatement([
    t.returnStatement(
      t.jsxElement(
        t.jsxOpeningElement(
          t.jsxIdentifier(element), [
            t.jsxAttribute(t.jsxIdentifier("className"), t.stringLiteral(className)),
            t.jsxSpreadAttribute(t.identifier("rest"))
          ]),
        t.jsxClosingElement(t.jsxIdentifier(element)), 
        [t.jsxExpressionContainer(t.identifier("children"))], 
      false)
    )
  ]));
}

module.exports = function () {
  let styles = {}, fn = '',
    getCssFromBinaryExp = function({ left, right }, str = '') {
      if (left.type === 'StringLiteral') {
        if (right.type === 'TemplateLiteral' &&
        right.expressions[0].type === 'ConditionalExpression') {
          return getCssFromTemplateIfTernary(right, left.value);
        }
        if (right.type === 'BinaryExpression') {
          return getCssFromBinaryExp(right, str + left.value);
        }
      }
      else if (left.type === 'BinaryExpression') {
        if (right.type === 'StringLiteral') {
          return getCssFromBinaryExp(left, str + right.value);
        }
        if (right.type === 'TemplateLiteral') {
          let c = getCssFromBinaryExp(left),
            d = getCssFromTemplateIfTernary(right);
          if (Object.keys(c).length === Object.keys(d).length) {
            let e = {}
            for (var k in c) {
              e[k] = c[k] + (c[k].endsWith(";") ? '' : ';') + d[k];
            }

            return e;
          }
        }
      }
      else if (left.type === 'TemplateLiteral' &&
        right.type === 'TemplateLiteral') {
        let lft = getCssFromTemplateIfTernary(left),
          rgt = getCssFromTemplateIfTernary(right);

        return {
          "tt": str + lft.consequent + right.consequent,
          "tf": str + lft.consequent + right.alternate,
          "ft": str + lft.alternate + right.consequent,
          "ff": str + lft.alternate + right.alternate
        }
      }
    }

  return {
    visitor: {
      ImportDeclaration(path) {
        if (path.node.specifiers[0].local.name === 'fromCss') {
            path.remove();
        }
      },
      CallExpression(path, { opts }) {
        let { node: { callee, arguments: args } } = path, className;

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
            }] = args, css = '';
          if (styleType === 'StringLiteral') {
            css = styleValue;
          }
          else if (styleType === 'ArrowFunctionExpression') {
            if (styleParams[0].type === 'ObjectPattern') {
              if (styleBody.type === 'BinaryExpression' &&
                styleBody.operator == '+') {
                if (styleBody.left.type === 'StringLiteral') {
                  if (styleBody.right.type === 'ConditionalExpression' ||
                    styleBody.right.type === 'TemplateLiteral') {
                    css = {
                      baseStr: styleBody.left.value,
                      params: [getTernParam(styleBody.right)]
                    }
                  }
                  else if (styleBody.right.type === 'BinaryExpression') {
                    css = {
                      baseStr: styleBody.left.value,
                      params: [getTernParam(styleBody.right.left),
                        getTernParam(styleBody.right.right), ]
                    }
                  }

                  let paramList = styleParams[0].properties.map(({
                    value: { name } }) => name);

                  if (args.length === 2) {
                    path.node.arguments[2] = t.objectExpression([
                      t.objectProperty(t.Identifier('baseStr'),
                        t.stringLiteral(styleBody.left.value)),
                      t.objectProperty(t.Identifier('paramName'),
                        paramList.length === 1 ?
                          t.stringLiteral(paramList[0]) :
                          t.arrayExpression([
                            paramList.map(lit => t.stringLiteral(lit))
                          ])
                      ),
                    ]);
                  }
                }
                else {
                  css = getCssFromBinaryExp(styleBody);
                }
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
            if (Object.keys(css).includes('baseStr')) {
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
          path.replaceWith(spitNewFromCss(element, className));
        }
      }
    },
    post() {
      if (fn.length) {
        let fileStr = '';
        for (let selector in styles) {
          if (styles[selector].length)
          // eslint-disable-next-line prefer-template
            fileStr += selector + '{' + styles[selector] + '}';
        }
        if (typeof fn === 'string') fs.writeFileSync(fn, fileStr);
        else for (let f = 0; f < fn.length; f++) {
          fs.writeFileSync(fn[f], fileStr);
        }
      }
    }
  };
}
