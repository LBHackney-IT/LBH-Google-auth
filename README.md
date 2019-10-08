# LBH Google Auth

This is a lightweight service written in Node.js that enables users to log in to the Google Hackney domain and generates a token to use on internal-facing Hackney services that also includes their group information.

## Why?

Because Hackney would like to be able to manage which users can do what via the Google admin console. Simply logging in with the Google OAuth API would validate identity (authentication) but has no information about what the user is allowed to do (authorization). The applications themselves are expected to maintain a mapping between these groups and their permissions.

## How do I use the service as a developer?

The application is quite simple to use from an application:

1. Point the user to the login URL with a parameter letting it know which URL to send the user back to. e.g. 

https://auth.hackney.gov.uk/auth?redirect_url=http://managearrears.hackney.gov.uk/login_callback

2. The user will then log in to Google and then be redirected back to the redirect URL you specified.
3. The JWT token will be set in the "hackneyToken" cookie and can be authenticated using the shared JWT secret. See below for the payload details.

If your application is not on a hackney.gov.uk domain then you won't have access to the cookie, however if you pass the GET parameter token_in_query=true it will add the token as a GET parameter to the redirect URL. This is less ideal because it can show up in logs but should not be required for Hackney apps.

## How does it work?

1. The user is directed to this service from another application, with a redirect_uri parameter passed along with the request
2. We store the redirect_uri in a cookie and send the user to Google to log in
3. Google sends the user back to this service with an OAuth token which is then upgraded to a user token along with requesting the user profile details
4. We use this token to request via the Google Admin API which groups the user is part of
5. We generate a JWT token with the user information and set it in the "hackneyToken" cookie. The payload of the token has the following structure:

```
{
  "sub":"100518888746922116647",
  "email":"hackney.user@test.hackney.gov.uk",
  "iss":"Hackney",
  "name":"Hackney User",
  "groups":["group 1", "group 2"],
  "iat":1570462732
}
```

with the following meanings:

- _sub_: The internal Google ID for the user
- _email_: The Hackney email address for the user
- _iss_: The issuer (always Hackney)
- _name_: The name of the user
- _groups_: An array of the groups the user is a member of
- _iat_: The issued time of the token (to be used for expiry by the applications)

## How do I run it?

Set up the environment variables as in config-sample.env.sh and bring them in to your shell using `. ./config.env.sh`. Then run `npm install` to install the dependencies and finally `node index.js` to run the application.