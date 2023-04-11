const server = require('restana')()

const files = require('serve-static')
const path = require('path')

server.use(files(path.join(__dirname, 'src')))

module.exports.handler = require('serverless-http')(server)
