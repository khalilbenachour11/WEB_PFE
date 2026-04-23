const db = require("../database");

async function upsertHeartbeat(payload) {
  const { matricule_agent, pending_count, failed_count, last_sync_at, app_version } = payload;

  await db.promise().query(
    `INSERT INTO billetterie.agent_heartbeat
       (matricule_agent, pending_count, failed_count, last_sync_at, app_version, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       pending_count = VALUES(pending_count),
       failed_count  = VALUES(failed_count),
       last_sync_at  = VALUES(last_sync_at),
       app_version   = VALUES(app_version),
       updated_at    = NOW()`,
    [matricule_agent, pending_count ?? 0, failed_count ?? 0, last_sync_at ?? null, app_version ?? null]
  );
}

async function getAllAgentsSnapshot() {
  const [rows] = await db.promise().query(
    `SELECT
       h.matricule_agent,
       a.prenom,
       a.nom,
       h.pending_count,
       h.failed_count,
       h.last_sync_at,
       h.app_version,
       h.updated_at,
       TIMESTAMPDIFF(SECOND, h.updated_at, NOW())     AS seconds_ago,
       COALESCE(s.tickets_today,    0)                AS tickets_today,
       COALESCE(s.recette_today_ms, 0)                AS recette_today_ms
     FROM billetterie.agent_heartbeat h
     LEFT JOIN base_global.agent a
            ON a.matricule_agent = h.matricule_agent
     LEFT JOIN (
         SELECT
             matricule_agent,
             COUNT(*)           AS tickets_today,
             SUM(montant_total) AS recette_today_ms
         FROM billetterie.ticket_vendu
         WHERE DATE(date_heure) = CURDATE()
         GROUP BY matricule_agent
     ) s ON s.matricule_agent = h.matricule_agent
     ORDER BY h.updated_at DESC`
  );
  return rows;
}

module.exports = { upsertHeartbeat, getAllAgentsSnapshot };