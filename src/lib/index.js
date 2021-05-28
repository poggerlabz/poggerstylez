function styleFromPseudoObj(obj, props) {
  return function(className) {
    let string = '';

    for (let sel in obj) {
      string += sel.replace(/&/g, '.' + className) + '{' +
          (typeof obj[sel] === 'function' ? obj[sel](props) : obj[sel]) + '}';
    }

    return string;
  };
}

export default function(hashifyName, pragma) {
    return function(Element, style, lol = { paramName: null, baseStr: null }) {
        return function({ children, ...rest }) {
            let actualStyle = '', className = '', { paramName, baseStr } = lol;
            if (paramName && baseStr) {
            className = "fc-" + hashifyName('fc ' + baseStr);
            }
            else {
            actualStyle = typeof style === 'object' ?
                styleFromPseudoObj(style, rest) :
                (typeof style === 'function' ? style(rest) : style);

            className = "fc-" + hashifyName('fc ' +
            (typeof actualStyle === 'function' ? actualStyle('fc') : actualStyle));
            }

            var addn = '';
            if (paramName) {
                if (typeof paramName === 'string') addn = rest[paramName] ?
                    (' ' + paramName + "True") : (' '  + paramName + "False");
                else {
                    for (var p = 0; p < paramName.length; p++) {
                    addn += rest[paramName[p]] ?
                        (' ' + paramName[p] + "True") : (' '  + paramName[p] + "False");
                    }
                }
            }

            /** @jsx pragma */ 
            return <Element className={className + addn} {...rest}>{children}</Element>;
        };
    }
}