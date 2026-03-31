const redis = require("./redis_client");
const settings = require("../config/settings");

class CircuitBreaker {
  constructor() {
    this.key = "circuit_breaker:upstream";
  }

  // ✅ SAFE get state
  async getState() {
    try {
      const data = await redis.hGetAll(this.key);

      if (!data || Object.keys(data).length === 0) {
        return {
          state: "CLOSED",
          failure_count: 0,
          success_count: 0,
          half_open_requests: 0,
          last_state_change_time: Math.floor(Date.now() / 1000),
        };
      }

      return {
        state: data.state || "CLOSED",
        failure_count: parseInt(data.failure_count || 0),
        success_count: parseInt(data.success_count || 0),
        half_open_requests: parseInt(data.half_open_requests || 0),
        last_state_change_time: parseInt(
          data.last_state_change_time || Math.floor(Date.now() / 1000)
        ),
      };
    } catch (err) {
      console.error("❌ getState error:", err);

      // fallback safe state
      return {
        state: "CLOSED",
        failure_count: 0,
        success_count: 0,
        half_open_requests: 0,
        last_state_change_time: Math.floor(Date.now() / 1000),
      };
    }
  }

  // ✅ SAFE set state
  async setState(state, failure = 0, success = 0, halfOpen = 0) {
    try {
      await redis.hSet(this.key, {
        state,
        failure_count: failure,
        success_count: success,
        half_open_requests: halfOpen,
        last_state_change_time: Math.floor(Date.now() / 1000),
      });
    } catch (err) {
      console.error("❌ setState error:", err);
    }
  }

  // ✅ BEFORE REQUEST (CORE LOGIC)
  async beforeRequest() {
    let state;

    try {
      state = await this.getState();
    } catch (err) {
      console.error("❌ beforeRequest getState failed:", err);
      return true; // fail-open
    }

    // safety fallback
    if (!state || !state.state) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);

    try {
      if (state.state === "OPEN") {
        const elapsed = now - state.last_state_change_time;

        if (elapsed > settings.CIRCUIT_BREAKER_RESET_TIMEOUT_SECONDS) {
          await this.setState("HALF_OPEN");
          return true;
        }
        return false;
      }

      if (state.state === "HALF_OPEN") {
        if (
          state.half_open_requests >=
          settings.CIRCUIT_BREAKER_HALF_OPEN_SUCCESS_THRESHOLD
        ) {
          return false;
        }

        await this.setState(
          "HALF_OPEN",
          state.failure_count,
          state.success_count,
          state.half_open_requests + 1
        );

        return true;
      }

      return true; // CLOSED state
    } catch (err) {
      console.error("❌ beforeRequest error:", err);
      return true; // fail-open
    }
  }

  // ✅ SUCCESS HANDLER
  async onSuccess() {
    try {
      const state = await this.getState();

      if (state.state === "HALF_OPEN") {
        const success = state.success_count + 1;

        if (
          success >=
          settings.CIRCUIT_BREAKER_HALF_OPEN_SUCCESS_THRESHOLD
        ) {
          await this.setState("CLOSED");
        } else {
          await this.setState(
            "HALF_OPEN",
            0,
            success,
            state.half_open_requests
          );
        }
      } else {
        await this.setState("CLOSED");
      }
    } catch (err) {
      console.error("❌ onSuccess error:", err);
    }
  }

  // ✅ FAILURE HANDLER
  async onFailure() {
    try {
      const state = await this.getState();

      const failures = state.failure_count + 1;

      if (
        failures >= settings.CIRCUIT_BREAKER_FAILURE_THRESHOLD
      ) {
        await this.setState("OPEN");
      } else {
        await this.setState(
          state.state || "CLOSED",
          failures,
          state.success_count,
          state.half_open_requests
        );
      }
    } catch (err) {
      console.error("❌ onFailure error:", err);
    }
  }
}

module.exports = new CircuitBreaker();