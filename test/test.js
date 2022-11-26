import { expect } from 'chai';
import { parse } from '@babel/parser';
import generator from '@babel/generator';
import { withSemicolon, parseStyleBody } from '../babel/common.js';
import spitNewFromCss from '../babel/outputJsx.js';

describe('correct', function () {
  it('with semicolon', function (done) {
    expect(withSemicolon("display:none;")).to.be.equal("display:none;");
    done();
  });

  it('with no semicolon', function (done) {
    expect(withSemicolon("display:none")).to.be.equal("display:none;");
    done();
  });

  it('parse tree', function (done) {
    let ast = parse('let str = "display:none;"')
    let strNode = ast.program.body[0].declarations[0].init;

    expect(parseStyleBody(strNode, "lol")).to.deep.equal([{
      baseStr: "display:none;",
      className: "lol"
    }]);
    done();
  });
});

describe('JSX output', function () {
  it("no attributes", function (done) {
    let ast = spitNewFromCss("div", "main");

    let code = generator(ast).code;

    expect(code).to.be.equal(`function ({
  children: children,
  ...rest
}) {
  let newClassName = "main";
  return <div className={newClassName} {...rest}>{children}</div>;
}`);
    done();
  });

  it("with attributes", function (done) {
    let ast = spitNewFromCss("div", "main", ["ready"]);

    let code = generator(ast).code;

    expect(code).to.be.equal(`function ({
  children: children,
  ready: ready,
  ...rest
}) {
  let newClassName = "main";
  newClassName += ready ? " readyTrue" : " readyFalse";
  return <div className={newClassName} {...rest}>{children}</div>;
}`);
    done();
  });
});