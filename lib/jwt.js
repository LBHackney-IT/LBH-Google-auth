const jwt = require("jsonwebtoken");
const jwt_secret = process.env.JWT_SECRET;

// Simple wrapper to generate a JWT token from user info
function generateJWT(id, name, email, groups) {
  let body = {
    sub: id,
    email: email,
    iss: "Hackney",
    name: name,
    groups: groups,
  };
  return jwt.sign(body, jwt_secret);
}

module.exports = { generateJWT };
