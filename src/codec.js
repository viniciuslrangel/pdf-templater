const pako = require('pako')

module.exports = {}

module.exports.FlateDecode = {
  encode: (data) => pako.deflate(data),
  decode: (stream) => pako.inflate(stream, { to: 'string' })
}
