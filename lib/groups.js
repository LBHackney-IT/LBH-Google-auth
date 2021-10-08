const https = require("https");
const { OAuth2Client } = require("google-auth-library");

const adminOAuth2Client = new OAuth2Client(
  process.env.OAUTH_CLIENT_ID,
  process.env.OAUTH_CLIENT_SECRET,
  process.env.ADMIN_OAUTH_CALLBACK_URL
);

const refresh_token = process.env.ADMIN_REFRESH_TOKEN;

// Fetch the groups for a user by email address
async function getGroups(email) {
  const url = `https://www.googleapis.com/admin/directory/v1/groups?userKey=${email}`;
  adminOAuth2Client.setCredentials({ refresh_token });
  const res = await adminOAuth2Client.request({ url });
  return res.data.groups.map((g) => g.name);
}

module.exports = { getGroups };
