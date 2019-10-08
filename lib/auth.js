const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

oauthConfig = {
  clientID: process.env.OAUTH_CLIENT_ID,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
  callbackURL: process.env.OAUTH_CALLBACK_URL
}

module.exports = (passport) => {
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  passport.use(new GoogleStrategy(oauthConfig,
  (token, refreshToken, profile, done) => {
    return done(null, {
      profile: profile,
      token: token
    });
  }));
};