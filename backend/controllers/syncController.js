const {
  upsertHeartbeat,
  getAllAgentsSnapshot,
  syncAllStaleHeartbeats,
} = require("../services/syncService");

const db = require("../database");

// Keep track of all active SSE clients
const sseClients = new Set();

// ── POST /api/sync/heartbeat ──────────────────────────────────────────────────

async function receiveHeartbeat(req, res) {
  try {
    const payload = req.body;

    if (!payload?.matricule_agent) {
      return res.status(400).json({ success: false, error: "matricule_agent required" });
    }

    await upsertHeartbeat(payload);

    // Push fresh data to all SSE listeners immediately
    _broadcastSnapshot();

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

  // ── On every new frontend connection: scan stale heartbeats immediately ────
  // This means as soon as anyone opens Sync Monitor or Gestion Anomalies,
  // the placeholder anomalies are guaranteed to exist — no backend restart needed.
  syncAllStaleHeartbeats().catch((err) =>
    console.error("[syncStream] stale scan error:", err.message)
  );

  // Send initial snapshot immediately
  await _sendSnapshot(res);

  // Register client
  sseClients.add(res);

  // Poll every 2s as fallback
  const interval = setInterval(async () => {
    await _sendSnapshot(res);
  }, 2000);

  // Clean up on disconnect
  req.on("close", () => {
    clearInterval(interval);
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