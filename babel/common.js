function getTernParam(node, attr = '') {
  if (node.type === 'TemplateLiteral') {
    return getTernParam(node.expressions[0], node.quasis[0].value.raw);
  }
  else if (node.type === 'ConditionalExpression') {
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
  withSemicolon(css) {
    if (!css.endsWith(";")) return css + ";";
    return css;
  },
  parseStyleBody(node, className = '') {
    let retval = [];
    switch (node.type) {
      case "BinaryExpression":
        if (node.operator === "+") {
          retval.push(...parseStyleBody(node.left, className));
          retval.push(...parseStyleBody(node.right, className));
        }
        break;
      case 'StringLiteral':
        retval.push({
          baseStr: node.value,
          className
        });
        break;
      case 'TemplateLiteral':
        retval.push({
          className,
          params: [getTernParam(node)]
        });
        break;
      case 'ObjectExpression':
        let themKeys = [], themVals = [];
        let mash = '';
        let num = 0;

        for (var { key: { value: keyVal }, value: { value: valVal } } of node.properties) {
          themKeys.push(keyVal);
          themVals.push(valVal);
          num++;
          mash += keyVal.replace(/&/g, '.fc') + '{' + valVal + '}';
        }

        className = `fc-${hashifyName(`fc ${mash}`)}`;
        for (; num > 0; num--) {
          retval.push({
            className: themKeys[num].replace(/&/g, `.${className}`),
            baseStr: themVals[num]
          })
        }
        break;
      case 'ArrowFunctionExpression':
        if (node.params[0].type === 'ObjectPattern') {
          node.params[0].properties.forEach((node) => {
            attrs.push(node.value.name);
          });

          retval.push(...parseStyleBody(styleBody));
        }
        break;
    }

    return retval;
  }
}