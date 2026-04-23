const { upsertHeartbeat, getAllAgentsSnapshot } = require("../services/syncService");

// Keep track of all active SSE clients so we can broadcast immediately
// when a new heartbeat arrives (in addition to the 2-second poll).
const sseClients = new Set();

// ── POST /api/sync/heartbeat ──────────────────────────────────────────────────

/**
 * Receives a heartbeat from the Flutter mobile app.
 * Upserts the agent_heartbeat row then immediately pushes a fresh
 * snapshot to every connected SSE client so the dashboard updates instantly.
 */
async function receiveHeartbeat(req, res) {
  try {
    const payload = req.body;

    if (!payload?.matricule_agent) {
      return res.status(400).json({ success: false, error: "matricule_agent required" });
    }

    await upsertHeartbeat(payload);

    // Push fresh data to all SSE listeners right away
    _broadcastSnapshot();

    return res.json({ success: true });
  } catch (err) {
    console.error("[syncController] receiveHeartbeat error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── GET /api/sync/stream  (Server-Sent Events) ────────────────────────────────

/**
 * Opens a persistent SSE connection.
 * - Sends an initial snapshot immediately on connect.
 * - Polls the DB every 2 seconds for clients that miss a broadcast.
 * - Cleans up on client disconnect.
 */
async function syncStream(req, res) {
  // SSE headers
  res.setHeader("Content-Type",     "text/event-stream");
  res.setHeader("Cache-Control",    "no-cache");
  res.setHeader("Connection",       "keep-alive");
  res.setHeader("X-Accel-Buffering","no"); // disable nginx buffering
  res.flushHeaders();

  // Send initial snapshot immediately
  await _sendSnapshot(res);

  // Register client
  sseClients.add(res);

  // Poll fallback every 2 s in case a heartbeat was missed
  const interval = setInterval(async () => {
    await _sendSnapshot(res);
  }, 2000);

  // Clean up when client disconnects
  req.on("close", () => {
    clearInterval(interval);
    sseClients.delete(res);
  });
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function _sendSnapshot(res) {
  try {
    const rows = await getAllAgentsSnapshot();
    const data = JSON.stringify(rows);
    res.write(`data: ${data}\n\n`);
  } catch (err) {
    res.write(`event: error\ndata: ${err.message}\n\n`);
  }
}

async function _broadcastSnapshot() {
  if (sseClients.size === 0) return;
  try {
    const rows = await getAllAgentsSnapshot();
    const data = JSON.stringify(rows);
    const msg  = `data: ${data}\n\n`;
    sseClients.forEach((client) => client.write(msg));
  } catch (err) {
    console.error("[syncController] broadcast error:", err);
  }
}
exports.getHeartbeatQueue = async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit  || 500), 2000);
    const offset = parseInt(req.query.offset || 0);
    const matricule = req.query.matricule || null;

    let sql = `
      SELECT
        l.id,
        l.matricule_agent,
        a.prenom,
        a.nom,
        l.pending_count,
        l.failed_count,
        l.app_version,
        l.recorded_at,
        TIMESTAMPDIFF(SECOND, l.recorded_at, NOW()) AS seconds_ago
      FROM billetterie.agent_heartbeat_log l
      LEFT JOIN base_global.agent a ON a.matricule_agent = l.matricule_agent
    `;
    const params = [];
    if (matricule) {
      sql += " WHERE l.matricule_agent = ?";
      params.push(matricule);
    }
    sql += " ORDER BY l.recorded_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [rows] = await db.promise().query(sql, params);
    res.json({ queue: rows, limit, offset });
  } catch (err) {
    console.error("getHeartbeatQueue error:", err);
    res.status(500).json({ error: err.message });
  }
};
module.exports = { receiveHeartbeat, syncStream };