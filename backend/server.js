require('dotenv').config();
process.env.TZ = process.env.TZ || 'Africa/Tunis';

const express = require('express');
const cors    = require('cors');
const app     = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqué: ${origin}`));
  },
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}));

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
const syncRoutes = require('./routes/syncRoutes');
const routes     = require('./routes/index');

// ✅ /api/sync MUST come before /api
// Otherwise Express matches /api/sync/stream against /api first,
// hits the global requireAuth in index.js, and returns 401
// before syncRoutes ever sees the request.
app.use('/api/sync', syncRoutes);
app.use('/api',      routes);

// ── Stale heartbeat sync ──────────────────────────────────────────────────────
const { syncAllStaleHeartbeats } = require('./services/syncService');

syncAllStaleHeartbeats();
setInterval(syncAllStaleHeartbeats, 30 * 1000);

// ── Démarrage ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Serveur Node.js démarré sur http://localhost:${PORT}`);
});