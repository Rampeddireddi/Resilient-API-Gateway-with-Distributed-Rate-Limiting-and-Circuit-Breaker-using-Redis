const express = require("express");
const app = express();

const healthRoutes = require("./routes/health_routes");
const proxyRoutes = require("./routes/proxy_routes");
const settings = require("./config/settings");

app.use(express.json());

app.use("/", healthRoutes);
app.use("/", proxyRoutes);

// 🔥 CRITICAL LINE
app.listen(settings.PORT, () => {
  console.log(`Proxy running on port ${settings.PORT}`);
});