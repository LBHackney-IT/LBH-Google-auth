const server = require('restana')()

const files = require('serve-static')
const path = require('path')

server.use(files(path.join(__dirname, 'src')))

console.log('Setting up restana....')

module.exports.handler = require('serverless-http')(server)