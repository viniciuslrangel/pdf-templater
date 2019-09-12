function insertAt (target, value, begin, end = begin) {
  return target.substr(0, begin) + value + target.substr(end)
}

function regexForEach (regex, str, callback) {
  while (true) {
    const match = regex.exec(str)
    if (match == null) {
      break
    }
    callback(match)
  }
}

function dictGet(dict, name) {
  return Array.from(dict.entries()).find(e => e[0].encodedName === `/${name}`)[1]
}

module.exports = { insertAt, regexForEach, dictGet }
