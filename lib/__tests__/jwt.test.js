const jwt = require("jsonwebtoken");
const mockdate = require("mockdate");

describe("#generateJWT()", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockdate.reset();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("should return a signed JSON Web Token", () => {
    process.env.JWT_SECRET = "mock-secret";

    const { generateJWT } = require("../jwt");

    mockdate.set(new Date("2021-01-01"));

    const token = generateJWT("id", "name", "email@example.com", [
      "group 1",
      "group 2",
    ]);

    expect(jwt.verify(token, "mock-secret")).toEqual({
      sub: "id",
      email: "email@example.com",
      iss: "Hackney",
      iat: Date.now() / 1000,
      name: "name",
      groups: ["group 1", "group 2"],
    });
  });
});
