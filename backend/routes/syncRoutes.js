const express = require("express");
const router  = express.Router();
const { receiveHeartbeat, syncStream } = require("../controllers/syncController");

// POST  /api/sync/heartbeat  — called by Flutter SyncService every 30 s
router.post("/heartbeat", receiveHeartbeat);

// GET   /api/sync/stream     — consumed by React useEventSource hook
router.get("/stream", syncStream);

module.exports = router;