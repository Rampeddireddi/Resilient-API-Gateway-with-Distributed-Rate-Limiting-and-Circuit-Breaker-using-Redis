const request = require("supertest");
const app = require("../../src/main");

describe("Proxy Service", () => {

  test("health check", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
  });

  test("proxy success", async () => {
    const res = await request(app).get("/proxy/hello");
    expect(res.statusCode).toBe(200);
  });

});