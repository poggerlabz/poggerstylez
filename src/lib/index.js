import { replaceAmpersand, cssBlockString } from '../../common/index.js';

function styleFromPseudoObj(obj, props) {
  return function(className) {
    let string = '';

    for (let sel in obj) {
      string += cssBlockString(replaceAmpersand(sel, className),
          (typeof obj[sel] === 'function' ? obj[sel](props) : obj[sel]));
    }

    return string;
  };
}

export default function(hashifyName, pragma) {
    return function(Element, style) {
        return function({ children, ...rest }) {
            let actualStyle = typeof style === 'object' ?
                styleFromPseudoObj(style, rest) :
                (typeof style === 'function' ? style(rest) : style),
                className = "fc-" + hashifyName('fc ' +
                (typeof actualStyle === 'function' ? actualStyle('fc') : actualStyle)), addn = '';

            for (let paramName in rest) {
                if (typeof paramName === 'string' && typeof rest[paramName] === 'boolean')
                    addn = ' ' + paramName + (rest[paramName] ? "True" : "False");
            }

            /** @jsx pragma */ 
            return <Element className={className + addn} {...rest}>{children}</Element>;
        };
    }
}