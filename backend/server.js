require('dotenv').config();
process.env.TZ = process.env.TZ || 'Africa/Tunis';

const express = require('express');
const cors    = require('cors');
const app     = express();

app.use(cors({
  origin:         process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
const routes     = require('./routes/index');
const syncRoutes = require('./routes/syncRoutes');

app.use('/api',      routes);
app.use('/api/sync', syncRoutes);

// ── Stale heartbeat sync ──────────────────────────────────────────────────────
// Startup scan + every 30s safety net.
// The primary trigger is now syncStream (on every frontend SSE connect),
// so this is just a backup for agents whose anomalies arrived while
// no frontend was connected.

const { syncAllStaleHeartbeats } = require('./services/syncService');

syncAllStaleHeartbeats();
setInterval(syncAllStaleHeartbeats, 30 * 1000);

// ── Démarrage ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Serveur Node.js démarré sur http://localhost:${PORT}`);
});