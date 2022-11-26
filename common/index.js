function replaceAmpersand(str, className) {
  str.replace(/&/g, "." + className)
}

function cssBlockString(selector, block) {
  return selector + '{' + block + '}';
}

module.exports = {
  replaceAmpersand,
  cssBlockString
};