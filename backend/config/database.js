const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               parseInt(process.env.DB_PORT),
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  multipleStatements: true,
  timezone:           '+01:00',        // ← client-side Africa/Tunis
  dateStrings:        true,            // ← CRITICAL: return DATETIME as "YYYY-MM-DD HH:MM:SS" strings
                                       
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  enableKeepAlive:    true,
  keepAliveInitialDelay: 0,
});

// Force server-side time_zone on every new connection so that
// NOW() / created_at / updated_at are stored in local Tunis time.
db.on('connection', (connection) => {
  connection.query("SET time_zone = '+01:00'");
});

// Tester la connexion au démarrage
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Erreur connexion MySQL:', err);
  } else {
    console.log('✅ MySQL connecté (pool) — time_zone +01:00, dateStrings ON');
    connection.release();
  }
});

module.exports = db;