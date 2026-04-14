const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host:               process.env.DB_HOST,
  port:               parseInt(process.env.DB_PORT),
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  multipleStatements: true,
  timezone:           process.env.DB_TIMEZONE || 'local',
});

db.connect(err => {
  if (err) {
    console.error('❌ Erreur connexion MySQL:', err);
  } else {
    console.log('✅ MySQL connecté');
  }
});

module.exports = db;
