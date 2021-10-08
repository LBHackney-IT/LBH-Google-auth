const jwt = require("jsonwebtoken");
const request = require("supertest");
const mockdate = require("mockdate");

const mockGenerateAuthUrl = jest.fn();
const mockGetToken = jest.fn();

class MockOAuth2Client {
  generateAuthUrl() {
    return mockGenerateAuthUrl();
  }

  async getToken() {
    return mockGetToken();
  }
}

jest.mock("google-auth-library", () => ({
  OAuth2Client: MockOAuth2Client,
}));
const { getGroups } = require("../lib/groups");
jest.mock("../lib/groups");

const { generateJWT } = require("../lib/jwt");
jest.mock("../lib/jwt");

const { app } = require("../app");

describe("app", () => {
  describe("GET /auth", () => {
    beforeEach(() => {
      jest.resetAllMocks();
      mockdate.reset();
    });

    it("should return an error message if no redirect_uri query parameter is provided", (done) => {
      request(app).get("/auth").expect("Content-Type", /json/).expect(
        200,
        {
          error: "No redirect_uri parameter set",
        },
        done
      );
    });

    it("should redirect to the Google Auth service", (done) => {
      mockGenerateAuthUrl.mockImplementation(
        () => "https://www.google.com/redirect"
      );
      request(app)
        .get("/auth")
        .query({
          redirect_uri: "https://www.example.com/redirect",
        })
        .expect(302)
        .expect("Location", "https://www.google.com/redirect")
        .end(done);
    });

    it("should store the redirect URL in a cookie", (done) => {
      request(app)
        .get("/auth")
        .query({
          redirect_uri: "https://www.example.com/redirect",
        })
        .expect(
          "set-cookie",
          `redirect_uri=${encodeURIComponent(
            "https://www.example.com/redirect"
          )}; Path=/`,
          done
        );
    });
  });

  describe("GET /auth/callback", () => {
    it("should return an error message if the Google oAuth call fails", (done) => {
      mockGetToken.mockRejectedValue(new Error("Some error"));

      request(app)
        .get("/auth/callback")
        .query({
          code: "some-code",
        })
        .expect("Content-Type", /json/)
        .expect(200, { error: "Error logging in" }, done);
    });

    it("should return an error message if no redirect_uri cookie is found", (done) => {
      mockGetToken.mockImplementation(() => {
        return {
          tokens: {
            id_token: jwt.sign(
              {
                name: "First Last",
                email: "first.last@example.com",
              },
              "some-secret-key"
            ),
          },
        };
      });

      getGroups.mockImplementation(() => {
        return ["group 1", "group 2"];
      });

      generateJWT.mockImplementation(() => {
        return jwt.sign(
          {
            sub: "id",
            email: "first.last@example.com",
            iss: "Hackney",
            name: "First Last",
            groups: ["group 1", "group 2"],
          },
          "some-secret-key"
        );
      });

      request(app)
        .get("/auth/callback")
        .query({
          code: "some-code",
        })
        .expect("Content-Type", /json/)
        .expect(200, { error: "No redirect URI found" }, done);
    });

    it("should store the token in the hackneyToken cookie", (done) => {
      mockdate.set(new Date("2021-01-01"));

      const mockToken = jwt.sign(
        {
          name: "First Last",
          email: "first.last@example.com",
        },
        "some-secret-key"
      );

      mockGetToken.mockImplementation(() => {
        return {
          tokens: {
            id_token: jwt.sign(
              {
                name: "First Last",
                email: "first.last@example.com",
              },
              "some-secret-key"
            ),
          },
        };
      });

      getGroups.mockImplementation(() => {
        return ["group 1", "group 2"];
      });

      const mockHackneyToken = jwt.sign(
        {
          sub: "id",
          email: "first.last@example.com",
          iss: "Hackney",
          name: "First Last",
          groups: ["group 1", "group 2"],
        },
        "some-secret-key"
      );

      generateJWT.mockImplementation(() => {
        return mockHackneyToken;
      });

      request(app)
        .get("/auth/callback")
        .set(
          "Cookie",
          `redirect_uri=${encodeURIComponent(
            "https://www.example.com/redirect"
          )}`
        )
        .query({
          code: "some-code",
        })
        .expect(
          "set-cookie",
          `hackneyToken=${mockHackneyToken}; Max-Age=604800; Path=/; Expires=Fri, 08 Jan 2021 00:00:00 GMT`,
          done
        );
    });

    it("should redirect to the stored redirect_uri URL", (done) => {
      mockGetToken.mockImplementation(() => {
        return {
          tokens: {
            id_token: jwt.sign(
              {
                name: "First Last",
                email: "first.last@example.com",
              },
              "some-secret-key"
            ),
          },
        };
      });

      getGroups.mockImplementation(() => {
        return ["group 1", "group 2"];
      });

      const mockHackneyToken = jwt.sign(
        {
          sub: "id",
          email: "first.last@example.com",
          iss: "Hackney",
          name: "First Last",
          groups: ["group 1", "group 2"],
        },
        "some-secret-key"
      );

      generateJWT.mockImplementation(() => {
        return mockHackneyToken;
      });

      request(app)
        .get("/auth/callback")
        .set(
          "Cookie",
          `redirect_uri=${encodeURIComponent(
            "https://www.example.com/redirect"
          )}`
        )
        .query({
          code: "some-code",
        })
        .expect(302)
        .expect("Location", "https://www.example.com/redirect")
        .end(done);
    });
  });
});
