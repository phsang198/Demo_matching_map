const express = require("express");
const bodyParser = require("body-parser");
const WebSocket = require("ws");
const querystring = require("querystring");

const app = express();
const PORT = 6666;
const HOST = "10.225.0.240";

// Config cho WebSocket
const WS_HOST = "10.225.0.240";
const WS_PORT = 8765;
const instanceId_ = "demo_instance";
const type_ = "bot";
const user_ = "admin";

// Tạo đường dẫn WebSocket có query params
const wsPath = `/chat?${querystring.stringify({
  instanceId: instanceId_,
  type: type_,
  user: user_,
})}`;

const wsUrl = `ws://${WS_HOST}:${WS_PORT}${wsPath}`;

// Kết nối WebSocket client
const ws = new WebSocket(wsUrl);

ws.on("open", () => {
  console.log("✅ WebSocket connected to:", wsUrl);
});

ws.on("error", (err) => {
  console.error("❌ WebSocket error:", err);
});

ws.on("close", () => {
  console.log("⚠️ WebSocket disconnected");
});

// Middleware
app.use(bodyParser.json());

// Endpoint webhook
app.post("/v1/webhook", (req, res) => {
  console.log("📩 Received webhook data:", req.body);

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(req.body));
    console.log("➡️ Sent message to WebSocket");
  } else {
    console.warn("⚠️ WebSocket not connected, message not sent");
  }

  res.json({ status: "ok" });
});

// Khởi động server
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}/v1/webhook`);
});
