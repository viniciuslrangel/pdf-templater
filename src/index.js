const { PDFDocument, PDFName, PDFRawStream, PDFNumber } = require('pdf-lib')
const codecs = require('./codec')
const { insertAt, regexForEach } = require('./util')

function decodeStream (stream) {
  let filter = stream.dict.get(PDFName.of('Filter'))
  filter = filter && filter.value()
  const { decode } = codecs[filter.substr(1)] || {}
  if (!decode) {
    throw new Error(`Filter ${filter} is not implemented`)
  }
  return decode(stream.getContents())
}

function encodeStream (baseDict, data, encoding = 'FlateDecode') {
  const dict = baseDict && baseDict.clone()
  const { encode } = codecs[encoding] || {}
  if (!encoding) {
    throw new Error(`Filter ${encoding} is not implemented`)
  }
  const content = encode(data)
  dict.set(PDFName.of('Filter'), PDFName.of(encoding))
  dict.set(PDFName.of('Length'), PDFNumber.of(content.length))
  return PDFRawStream.of(dict, content)
}

function decodeText (str, map) {
  let text = ''
  regexForEach(/<([\da-f]+)>/isg, str, (match) => {
    let data = match[1]
    if (data.length % 2 !== 0) {
      data += '0'
    }
    for (let i = 0, j = data.length / 2; i < j; i++) {
      text += String.fromCharCode(map[parseInt(data[i * 2] + data[i * 2 + 1], 16)])
    }
  })
  console.log(text)
  return text
}

function replaceRawText (text, data) {
  let found = false
  data.forEach(([key, value]) => {
    if (key instanceof RegExp) {
      const regExp = new RegExp(key, key.flags + (key.flags.indexOf('g') !== -1 ? '' : 'g'))
      while (true) {
        const match = regExp.exec(text)
        if (match == null) {
          break
        }
        found = true
        text = insertAt(text, value, match.index, match.index + match[0].length)
        regExp.lastIndex += match[0].length - value.length
      }
    } else if (typeof key === 'string') {
      let lastIndex = 0
      const anchor = `{${key}}`
      while (true) {
        let index = text.substr(lastIndex).indexOf(anchor)
        if (index === -1) {
          break
        }
        found = true
        text = insertAt(text, value, index, index + anchor.length)
        lastIndex = index + value.length - anchor.length
      }
    } else {
      throw new Error('Invalid template type (expected String | RegExp)')
    }
  })
  return [text, found]
}

function replaceFontText (originalText, data, font) {
  const unicodeTableDict = font.context.lookup(font.dict.get(PDFName.of('ToUnicode')))
  let unicodeTableData = decodeStream(unicodeTableDict)
  unicodeTableData = unicodeTableData.substr(unicodeTableData.indexOf('beginbfchar'), unicodeTableData.indexOf('endbfchar'))
  const unicodeRegex = /<([\da-f]+)>\s?<([\da-f]+)>/isg

  const mapping = {}
  const reverseMapping = {}

  regexForEach(unicodeRegex, unicodeTableData, (match) => {
    const key = parseInt(match[1], 16)
    const value = parseInt(match[2], 16)
    mapping[key] = value
    reverseMapping[value] = key
  })
  const [text, found] = replaceRawText(decodeText(originalText, mapping), data)
  if (found) {
    /** @type Array<number> */
    const glyphs = Array.prototype.map.call(text, e => {
      const code = e.charCodeAt(0)
      if (!(code in reverseMapping)) {
        throw new Error(`Char \`${e}\` not found at Unicode table inside ${font.dict.get(PDFName.of('BaseFont'))}`)
      }
      return reverseMapping[code].toString(16).padStart(2, '0')
    })
    return [`<${glyphs.join('')}>`, true]
  }
  return [undefined, false]
}

function processBlock (block, fonts, data) {
  const matches = []
  const results = []
  const textObjectOperator = /(?:\[((?:<[\da-fA-f]+>[+-]?\d*)+)]\s?TJ)|(?:(\(.*\))\s?Tj)|(?:\/(F\d+))/sg
  regexForEach(textObjectOperator, block, (res) => matches.push(res))
  let currentFont = -1
  matches.map(e => {
    let str, found
    if (e[3] != null) {
      currentFont = e[3]
    } else if (e[2] != null) {
      [str, found] = replaceRawText(e[2].slice(0, -1), data)
      str = `(${str})`
    } else {
      [str, found] = replaceFontText(
        e[1],
        data,
        fonts.context.lookup(fonts.dict.get(PDFName.of(currentFont))),
      )
    }
    if (found) {
      results.push({
        match: e,
        data: str,
      })
    }
  })

  if (results.length === 0) {
    return null
  }
  // replace stream
  results.reverse().forEach(({ match, data }) => {
    let begin = match.index
    begin += match[0].indexOf(match[1])
    block = insertAt(block, data, begin, begin + match[1].length)
  })
  return block
}

/**
 * @param doc {PDFDocument}
 * @param data {Array<[string | RegExp, string]>|Object<string | RegExp, string>}
 */
module.exports = function (doc, data) {
  if (typeof data === 'object' && !Array.isArray(data)) {
    data = Object.keys(data).map(k => [k, data[k]])
  }
  const streamSet = doc.getPages().map(page => page.node).map(node => [
    node.get(PDFName.of('Contents')), //node.Contents(),
    node.Resources().dict.get(PDFName.of('Font')),
  ])
  const contentDone = {}
  streamSet.forEach(([contentRef, fontDict]) => {
    if (contentDone[contentRef] === true) {
      return
    }
    contentDone[contentRef] = true
    const stream = doc.context.lookup(contentRef)

    const btRegex = /BT(.*?)ET/isg
    let content = decodeStream(stream)
    let any
    while (true) {
      const match = btRegex.exec(content)
      if (match == null) {
        break
      }
      const res = processBlock(match[1], fontDict && doc.context.lookup(fontDict), data)
      if (res == null) {
        continue
      }
      any = true
      const begin = match.index + match[0].indexOf(match[1])
      content = insertAt(content, res, begin, begin + match[1].length)
      btRegex.lastIndex -= match[0].length - res.length
    }
    if (any) {
      doc.context.assign(contentRef, encodeStream(stream.dict, content))
    }
  })
}
