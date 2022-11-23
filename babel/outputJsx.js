let t = require('@babel/types');

let { identifier, objectProperty } = t;

const c_Children = "children",
  c_Rest = identifier("rest"),
  c_NewClassName = identifier("newClassName");

function idemProp(idString) {
  let treeNode = identifier(idString);

  return objectProperty(treeNode, treeNode);
}

module.exports = function spitNewFromCss(element, className, attributes = []) {
  /* TODO(dchan3): use data-* attributes instead
  // The resulting AST is meant to correspond to the following snippet:

  function ({ children, attr, ...rest) {
    let newClassName = className;
    newClassName += attr ? " attrTrue" : " attrFalse";

    return <element className={newClassName} {...rest}>
      {children}
    </element>;
  } */
  return t.functionExpression(null, [
    t.objectPattern([
      idemProp(c_Children),
      ...attributes.map(idemProp),
      t.restElement(c_Rest)
    ])
  ],
    t.blockStatement([
      t.variableDeclaration("let", [t.variableDeclarator(c_NewClassName, t.stringLiteral(className))]),
      ...attributes.map(n =>
        t.expressionStatement(t.assignmentExpression("+=", c_NewClassName, t.conditionalExpression(identifier(n), t.stringLiteral(" " + n + "True"), t.stringLiteral(" " + n + "False"))))
      ),
      t.returnStatement(
        t.jsxElement(
          t.jsxOpeningElement(
            t.jsxIdentifier(element), [
            t.jsxAttribute(t.jsxIdentifier("className"), t.jsxExpressionContainer(c_NewClassName)),
              t.jsxSpreadAttribute(c_Rest)
          ]),
          t.jsxClosingElement(t.jsxIdentifier(element)),
          [t.jsxExpressionContainer(identifier(c_Children))],
          false)
      )
    ]));
}