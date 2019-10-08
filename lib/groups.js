const https = require('https');

// Fetch the groups for a user by email address
function getGroups(email, token, cb){
  const options = {
    hostname: 'www.googleapis.com',
    port: 443,
    path: `/admin/directory/v1/groups?userKey=${email}`,
    method: 'GET',
    headers: {
      "Authorization": "Bearer " + token
    }
  }

  const req = https.get(options, res => {
    let body = '';

    res.on('data', chunk => body += chunk);

    res.on('end', () => {
      var parsed;
      try{
        parsed = JSON.parse(body);
        if(parsed.groups){
          cb(null, parsed.groups.map(g => g.name));
        }else{
          cb(null, []);
        }
      }catch(err){
        cb(err);
      }
    })
  })

  req.on('error', err => {
    cb(err)
  })
}

module.exports = {getGroups};