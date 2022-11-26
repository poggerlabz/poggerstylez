import { replaceAmpersand, cssBlockString } from '../common/index.js';

function getTernParam(node, attr = '') {
  switch (node.type) {
    case 'TemplateLiteral':
      return getTernParam(node.expressions[0], node.quasis[0].value.raw);
    case 'ConditionalExpression':
      return {
        paramName: node.test.name,
        ifTrue: attr + node.consequent.value,
        ifFalse: attr + node.alternate.value
      }
  }
  return {};
}

module.exports = {
  getTernParam,
  cssBlockString,
  withSemicolon(css) {
    if (!css.endsWith(";")) return css + ";";
    return css;
  },
  parseStyleBody(node, className = '') {
    switch (node.type) {
      case "BinaryExpression":
        if (node.operator === "+") {
          return [parseStyleBody(node.left, className), parseStyleBody(node.right, className)].flat();
        }
      case 'StringLiteral':
        return [{
          baseStr: node.value,
          className
        }];
      case 'TemplateLiteral':
        return [{
          className,
          params: [getTernParam(node)]
        }];
      case 'ObjectExpression':
        let keyValMap = {};
        let mash = '';

        for (let { key: { value: keyVal }, value: { value: valVal } } of node.properties) {
          keyValMap[keyVal] = valVal;
          mash += cssBlockString(replaceAmpersand(keyVal, 'fc'), valVal);
        }

        className = `fc-${hashifyName(`fc ${mash}`)}`;
        return Object.keys(keyValMap).map(kVal => ({
            className: replaceAmpersand(kVal, className),
            baseStr: keyValMap[kVal]
          }));
      case 'ArrowFunctionExpression':
        if (node.params[0].type === 'ObjectPattern') {
          node.params[0].properties.forEach((node) => {
            attrs.push(node.value.name);
          });

          return parseStyleBody(styleBody);
        }
    }

    return [];
  }
}