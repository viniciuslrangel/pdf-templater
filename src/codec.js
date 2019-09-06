const pako = require('pako')

module.exports = {}

module.exports.FlateDecode = {
  encode: (data) => pako.deflate(data),
  decode: (stream) => Buffer.from(pako.inflate(stream)).toString('UTF8')
}
