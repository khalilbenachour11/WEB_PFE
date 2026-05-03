const {
  upsertHeartbeat,
  getAllAgentsSnapshot,
  syncAllStaleHeartbeats,
} = require("../services/syncService");

const sseClients = new Set();

// ── POST /api/sync/heartbeat ──────────────────────────────────────────────────

async function receiveHeartbeat(req, res) {
  try {
    const payload = req.body;

    if (!payload?.matricule_agent) {
      return res.status(400).json({ success: false, error: "matricule_agent required" });
    }

    await upsertHeartbeat(payload);

    // ✅ Only broadcast on real heartbeat — not on DB changes
    await _broadcastSnapshot();

    return res.json({ success: true });
  } catch (err) {
    console.error("[syncController] receiveHeartbeat error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── GET /api/sync/stream (Server-Sent Events) ─────────────────────────────────

async function syncStream(req, res) {
  res.setHeader("Content-Type",      "text/event-stream");
  res.setHeader("Cache-Control",     "no-cache");
  res.setHeader("Connection",        "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  syncAllStaleHeartbeats().catch((err) =>
    console.error("[syncStream] stale scan error:", err.message)
  );

  // Send initial snapshot on connect
  await _sendSnapshot(res);

  sseClients.add(res);

  // Keep-alive ping every 30s to prevent connection timeout
  const keepAlive = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 30_000);

  // Refresh seconds_ago every 30s so offline detection stays accurate
  // This only recalculates time math — NOT triggered by any DB change
  const refreshInterval = setInterval(async () => {
    await _sendSnapshot(res);
  }, 30_000);

  req.on("close", () => {
    clearInterval(keepAlive);
    clearInterval(refreshInterval);
    sseClients.delete(res);
  });
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function _sendSnapshot(res) {
  try {
    const rows = await getAllAgentsSnapshot();
    res.write(`data: ${JSON.stringify(rows)}\n\n`);
  } catch (err) {
    res.write(`event: error\ndata: ${err.message}\n\n`);
  }
}

async function _broadcastSnapshot() {
  if (sseClients.size === 0) return;
  try {
    const rows = await getAllAgentsSnapshot();
    const msg  = `data: ${JSON.stringify(rows)}\n\n`;
    sseClients.forEach((client) => client.write(msg));
  } catch (err) {
    console.error("[syncController] broadcast error:", err);
  }
}

module.exports = { receiveHeartbeat, syncStream };