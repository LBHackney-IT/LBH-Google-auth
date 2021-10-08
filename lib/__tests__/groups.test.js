const mockSetCredentials = jest.fn();
const mockRequest = jest.fn(() => ({
  data: {
    groups: [],
  },
}));
class MockOAuth2Client {
  setCredentials(credentials) {
    return mockSetCredentials(credentials);
  }

  async request(params) {
    return mockRequest(params);
  }
}

jest.mock("google-auth-library", () => ({
  OAuth2Client: MockOAuth2Client,
}));

describe("#getGroups()", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("should authenticate the request with the refresh token", async () => {
    process.env.ADMIN_REFRESH_TOKEN = "some-refresh-token";

    const { getGroups } = require("../groups");

    await getGroups("test@example.com");

    expect(mockSetCredentials).toHaveBeenCalledWith({
      refresh_token: "some-refresh-token",
    });
  });

  it("should pass the provided email in the Google Auth API request", async () => {
    const { getGroups } = require("../groups");

    await getGroups("test@example.com");

    expect(mockRequest).toHaveBeenCalledWith({
      url: "https://www.googleapis.com/admin/directory/v1/groups?userKey=test@example.com",
    });
  });

  it("should return a list of groups after calling the Google Auth API", async () => {
    const { getGroups } = require("../groups");

    mockRequest.mockImplementation(() => {
      return {
        data: {
          groups: [
            {
              name: "group 1",
            },
            {
              name: "group 2",
            },
          ],
        },
      };
    });

    const groups = await getGroups("test@example.com");

    expect(groups).toEqual(["group 1", "group 2"]);
  });
});
