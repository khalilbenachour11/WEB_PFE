const express  = require("express");
const router   = express.Router();
const { receiveHeartbeat, syncStream } = require("../controllers/syncController");
const { verifyToken }                  = require("../services/auth.service");

// ── SSE-specific auth ─────────────────────────────────────────────────────────
// EventSource cannot send custom headers, so the JWT arrives as ?token=
function requireStreamAuth(req, res, next) {
  const token = req.query.token;
  if (!token)
    return res.status(401).json({ success: false, message: "Token manquant" });
  try {
    req.agent = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Token invalide ou expiré" });
  }
}

// POST /api/sync/heartbeat — Flutter SyncService
// No JWT auth — Flutter device ping, validated by matricule_agent presence only
router.post("/heartbeat", receiveHeartbeat);

// GET  /api/sync/stream   — React useSyncStream (token in query param)
router.get("/stream", requireStreamAuth, syncStream);

module.exports = router;