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

module.exports = { insertAt, regexForEach }
