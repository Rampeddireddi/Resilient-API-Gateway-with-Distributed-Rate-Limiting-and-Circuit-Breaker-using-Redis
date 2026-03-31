const circuitBreaker = require("../../src/services/circuit_breaker");

test("should start in CLOSED state", async () => {
  const state = await circuitBreaker.getState();
  expect(state.state).toBe("CLOSED");
});