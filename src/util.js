function insertAt (target, value, begin, end = begin) {
  return target.substr(0, begin) + value + target.substr(end)
}

function regexForEach (regex, str, callback) {
  const re = new RegExp(regex, regex.flags + (regex.flags.indexOf('g') !== -1 ? '' : 'g'))
  while (true) {
    const match = re.exec(str)
    if (match == null) {
      break
    }
    callback(match)
  }
}

module.exports = { insertAt, regexForEach }
