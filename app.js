const express = require("express");
const app = express();
const { getGroups } = require("./lib/groups");
const { generateJWT } = require("./lib/jwt");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const jwt_secret = process.env.JWT_SECRET;

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

// Redirect to Google auth
app.get("/auth", (req, res) => {
  if (req.query.redirect_uri) {
    // Set the redirect url cookie for later use
    res.cookie("redirect_uri", req.query.redirect_uri);
    // Redirect to Google auth
    const authorizeUrl = userOAuth2Client.generateAuthUrl({
      access_type: "online",
      scope: ["profile", "email"],
    });
    res.redirect(authorizeUrl);
  } else {
    res.send({ error: "No redirect_uri parameter set" });
  }
});

// Redirect to Google auth to retrieve the admin refresh token
app.get("/auth/admin", (req, res) => {
  const authorizeUrl = adminOAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/admin.directory.group.readonly",
    ],
    prompt: "consent",
  });
  res.redirect(authorizeUrl);
});

// Receives the call back from Google auth on login
app.get("/auth/callback", async (req, res) => {
  try {
    // Extract the oauth code used to retrieve the token
    let code = req.query.code;

    // Fetch the token
    let r = await userOAuth2Client.getToken(code);

    // Pull the user information out of the JWT ID token
    let userinfo = jwt.decode(r.tokens.id_token);

    // Fetch the groups from the Google groups API
    let groups = await getGroups(userinfo.email);

    // Generate the JWT token
    let token = generateJWT(
      userinfo.sub,
      userinfo.name,
      userinfo.email,
      groups
    );

    // Set the Hackney cookie (expires in a week)
    res.cookie("hackneyToken", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      domain: process.env.COOKIE_DOMAIN,
    });

    // Send the user on their way
    if (req.cookies.redirect_uri) {
      // Redirect to the redirect URL
      res.redirect(req.cookies.redirect_uri);
    } else {
      res.send({ error: "No redirect URI found" });
    }
  } catch (err) {
    res.send({ error: "Error logging in" });
    console.log(err);
  }
});

// Receives the call back from Google auth on login and outputs the refresh token - used for setting up the app
app.get("/auth/admin/callback", async (req, res) => {
  try {
    let code = req.query.code;
    let r = await adminOAuth2Client.getToken(code);
    res.send(r.tokens.refresh_token);
  } catch (err) {
    res.send({ error: "Error logging in as admin" });
    console.log(err);
  }
});

// Print out the content of the JWT token - useful only for debugging
app.get("/auth/check_token", (req, res) => {
  var response;
  if (req.cookies.hackneyToken) {
    // check the token if it is set
    try {
      response = jwt.verify(req.cookies.hackneyToken, jwt_secret);
    } catch (err) {
      response = { error: "Invalid token" };
    }
  } else {
    // no token is set
    response = { error: "No token set in cookies" };
  }
  res.send(response);
});

module.exports.app = app;
