// APRÈS
const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               parseInt(process.env.DB_PORT),
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  multipleStatements: true,
  timezone:           process.env.DB_TIMEZONE || 'local',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  enableKeepAlive:    true,
  keepAliveInitialDelay: 0,
});

// Tester la connexion au démarrage
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Erreur connexion MySQL:', err);
  } else {
    console.log('✅ MySQL connecté (pool)');
    connection.release();
  }
});

module.exports = db;