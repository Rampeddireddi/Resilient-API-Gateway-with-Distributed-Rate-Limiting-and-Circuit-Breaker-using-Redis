const express = require("express");
const router = express.Router();
const { forwardRequest } = require("../services/proxy_service");

// ✅ Handle all /proxy requests manually
router.use("/proxy", async (req, res) => {
  try {
    // extract path manually
    req.proxyPath = req.originalUrl.replace(/^\/proxy\/?/, "");

    const result = await forwardRequest(req);

    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }

    if (typeof result.body === "object") {
      return res.status(result.status).json(result.body);
    }

    return res.status(result.status).send(result.body);
  } catch (err) {
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

module.exports = router;