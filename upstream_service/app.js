const express = require("express");
const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/hello", (req, res) => {
  res.json({ message: "Hello from upstream" });
});

// simulate failure
app.get("/fail", (req, res) => {
  res.status(500).json({ error: "Simulated failure" });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Upstream running on port ${PORT}`);
});