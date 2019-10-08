const express = require('express');
const app = express();
const passport = require('passport');
const auth = require('./lib/auth');
const {getGroups} = require('./lib/groups');
const {generateJWT} = require('./lib/jwt');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const jwt_secret = process.env.JWT_SECRET

auth(passport);
app.use(passport.initialize());
app.use(cookieParser());

// Redirect to Google auth
app.get('/auth', (req, res) => {
  if(req.query.redirect_uri){
    // Set the redirect url cookie for later use
    res.cookie('redirect_uri', req.query.redirect_uri)
    // Redirect to Google auth
    passport.authenticate('google', {
      scope: ['profile', 'email', 'https://www.googleapis.com/auth/admin.directory.group.readonly'],
      session:false
    })(req, res);
  }else{
    res.send({error: "No redirect_uri parameter set"});
  }
});

// Receives the call back from Google auth on login
app.get('/auth/callback',
  passport.authenticate('google', {
    failureRedirect: '/auth/error'
  }),
  (req, res) => {
    let user = req.user.profile;
    // Fetch the groups from the Google groups API
    getGroups(user.emails[0].value, req.user.token, (err, groups) => {
      if(err){
        res.send({error: err});
      }else{
        if(req.cookies.redirect_uri){
          // Generate the JWT token
          let token = generateJWT(user.id, user.displayName, user.emails[0].value, groups)
          // Set the Hackney cookie (expires in a week)
          res.cookie('hackneyToken', token, {maxAge: 604800, domain: process.env.COOKIE_DOMAIN});
          // Redirect to the redirect URL
          res.redirect(req.cookies.redirect_uri);
        }else{
          res.send({error: "No redirect URI found"});
        }
      }
    });
  }
);

// Redirects back to the redirect url with an error code
app.get('/auth/error', (req, res) => {
  res.redirect(req.cookies.redirect_uri + "?error=login_error");
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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App listening on port ${port}!`));
