import { expect } from 'chai';
import { parse } from '@babel/parser';
import { withSemicolon, parseStyleBody } from '../babel/common.js';

describe('correct', function () {
  it('semicolon', function (done) {
    expect(withSemicolon("display:none;")).to.be.equal("display:none;");
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