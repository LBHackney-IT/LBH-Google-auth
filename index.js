const serverless = require('serverless-http');
const express = require('express')
const app = express()
 
const {OAuth2Client} = require('google-auth-library');

const userOAuth2Client = new OAuth2Client(
    process.env.OAUTH_CLIENT_ID,
    process.env.OAUTH_CLIENT_SECRET,
    process.env.OAUTH_CALLBACK_URL
  );
  
const adminOAuth2Client = new OAuth2Client(
    process.env.OAUTH_CLIENT_ID,
    process.env.OAUTH_CLIENT_SECRET,
    process.env.ADMIN_OAUTH_CALLBACK_URL
  );

app.get('/', function (req, res) {
  res.send('Hello World!' + process.env.OAUTH_CLIENT_ID)
})
 
module.exports.handler = serverless(app);