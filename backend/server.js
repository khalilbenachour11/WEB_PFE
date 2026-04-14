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

// ── Routes ──
const routes = require('./routes/index');
app.use('/api', routes);

// ── Démarrage ──
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Serveur Node.js démarré sur http://localhost:${PORT}`);
});
