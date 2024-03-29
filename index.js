const serverless = require('serverless-http');
const express = require('express')
const app = express()
const cookieParser = require('cookie-parser');
const {OAuth2Client} = require('google-auth-library');
const {generateJWT} = require('./src/jwt');
const jwt = require('jsonwebtoken');
const {getGroups} = require('./src/groups');

const jwt_secret = process.env.JWT_SECRET

app.use(cookieParser());

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
  console.log('Google LBH Auth is running on an AWS Lambda!')
  res.send('Google LBH Auth is running on an AWS Lambda!')
})

// Redirect to Google auth
app.get('/auth', (req, res) => {
    if(req.query.redirect_uri){
      // Set the redirect url cookie for later use
      res.cookie('redirect_uri', req.query.redirect_uri)
      // Redirect to Google auth
      const authorizeUrl = userOAuth2Client.generateAuthUrl({
        access_type: 'online',
        scope: ['profile', 'email']
      });
      res.redirect(authorizeUrl)
    }else{
      res.send({error: "No redirect_uri parameter set"});
    }
  });
  
  // Redirect to Google auth to retrieve the admin refresh token
  app.get('/auth/admin', (req, res) => {
    const authorizeUrl = adminOAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['profile', 'email', 'https://www.googleapis.com/auth/admin.directory.group.readonly'],
      prompt: 'consent'
    });
    res.redirect(authorizeUrl);
  });
  
  // Receives the call back from Google auth on login
  app.get('/auth/callback', async (req, res) => {

    // Used to correlate logs
    const timestampId = Date.now();

    console.log(`Processing endpoint /auth/callback [${timestampId}]`)

    try{
      // Extract the oauth code used to retrieve the token
      const code = req.query.code;
  
      // Fetch the token
      console.log(`Fetching access token with provided code [${timestampId}]`)
      const r = await userOAuth2Client.getToken(code);
  
      // Pull the user information out of the JWT ID token
      console.log(`Parsing user information from access token [${timestampId}]`)
      const userinfo = jwt.decode(r.tokens.id_token)
  
      // Fetch the groups from the Google groups API
      console.log(`Fetching Google groups from API [${timestampId}]`)
      const groups = await getGroups(userinfo.email);
  
      // Generate the JWT
      console.log(`Generating JWT [${timestampId}]`)
      const token = generateJWT(userinfo.sub, userinfo.name, userinfo.email, groups)
  
      // Set the Hackney cookie (expires in a week)
      console.log(`Set token in response cookie [${timestampId}]`)
      res.cookie('hackneyToken', token, {maxAge: (7 * 24 * 60 * 60 * 1000), domain: process.env.COOKIE_DOMAIN});
  
      // Send the user on their way
      if(req.cookies.redirect_uri){
        // Redirect to the redirect URL
        console.log(`Redirecting to redirect URL [${timestampId}]`)
        res.redirect(req.cookies.redirect_uri);
      } else {
        console.log(`No redirect URL found [${timestampId}]`)
        res.send({error: "No redirect URI found"});
      }

    }catch(err){
      res.send({error: `Error logging in: ${err}`});
      console.log(err);
    }
  });
  
  // Receives the call back from Google auth on login and outputs the refresh token - used for setting up the app
  app.get('/auth/admin/callback', async (req, res) => {
    try{
      let code = req.query.code;
      let r = await adminOAuth2Client.getToken(code);
      res.send(r.tokens.refresh_token)
    }catch(err){
      res.send({error: "Error logging in as admin"});
      console.log(err);
    }
  });
  
  // Print out the content of the JWT token - useful only for debugging
  app.get('/auth/check_token', (req, res) => {
    var response;
    if(req.cookies.hackneyToken){
      // check the token if it is set
      try{
        response = jwt.verify(req.cookies.hackneyToken, jwt_secret);
      }catch(err){
        response = {error: "Invalid token"};
      }
    }else{
      // no token is set
      response = {error: "No token set in cookies"};
    }
    res.send(response);
  });
 
module.exports.handler = serverless(app);