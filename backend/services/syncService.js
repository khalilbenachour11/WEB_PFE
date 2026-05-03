const db = require('../database');

// ── countOpenAnomalies ────────────────────────────────────────────────────────
// Returns the actual number of non_traite heartbeat placeholders per type.

async function countOpenAnomalies(matricule_agent) {
  const [failedRows] = await db.promise().query(
    `SELECT COUNT(*) AS total
     FROM billetterie.ticket_anomalie
     WHERE matricule_agent = ?
       AND erreur LIKE 'Sync failed%'
       AND statut = 'non_traite'`,
    [matricule_agent]
  );
  const [pendingRows] = await db.promise().query(
    `SELECT COUNT(*) AS total
     FROM billetterie.ticket_anomalie
     WHERE matricule_agent = ?
       AND erreur LIKE 'Sync pending%'
       AND statut = 'non_traite'`,
    [matricule_agent]
  );
  return {
    failed:  Number(failedRows[0].total  ?? 0),
    pending: Number(pendingRows[0].total ?? 0),
  };
}

// ── ensurePlaceholderAnomalies ─────────────────────────────────────────────────
// Inserts ONE placeholder row per individual failed/pending ticket.
// Only inserts the difference (never duplicates).

async function ensurePlaceholderAnomalies(matricule_agent, pending_count, failed_count) {
  const types = [];
  if ((failed_count  ?? 0) > 0) types.push({ type: 'failed',  count: failed_count  });
  if ((pending_count ?? 0) > 0) types.push({ type: 'pending', count: pending_count });

  for (const { type, count } of types) {
    const [existing] = await db.promise().query(
      `SELECT COUNT(*) AS total
       FROM billetterie.ticket_anomalie
       WHERE matricule_agent = ?
         AND erreur LIKE ?
         AND statut = 'non_traite'`,
      [matricule_agent, `Sync ${type}%`]
    );

    const alreadyExists = Number(existing[0].total ?? 0);
    const toInsert      = count - alreadyExists;
    if (toInsert <= 0) continue;

    for (let i = 0; i < toInsert; i++) {
      try {
        await db.promise().query(
          `INSERT INTO billetterie.ticket_anomalie
             (matricule_agent,
              id_voyage, id_segment,
              point_depart, point_arrivee, type_tarif,
              quantite, prix_unitaire, montant_total,
              date_heure, erreur, statut,
              created_at, updated_at)
           VALUES
             (?, NULL, NULL, NULL, NULL, NULL,
              0, 0, 0, NOW(),
              ?, 'non_traite', NOW(), NOW())`,
          [matricule_agent, `Sync ${type} — ticket non synchronisé (heartbeat automatique)`]
        );
      } catch (insertErr) {
        console.error(
          `❌ ensurePlaceholderAnomalies insert error (agent ${matricule_agent}):`,
          insertErr.message
        );
      }
    }

    console.log(
      `✅ Agent ${matricule_agent}: ${toInsert} placeholder(s) Sync ${type} insérés ` +
      `(${alreadyExists} existaient déjà, total attendu: ${count})`
    );
  }
}

// ── upsertHeartbeat ───────────────────────────────────────────────────────────

async function upsertHeartbeat(payload) {
  const {
    matricule_agent,
    pending_count,
    failed_count,
    last_sync_at,
    app_version,
  } = payload;

  // ── 1. Count still-open anomaly placeholders BEFORE touching anything ───────
  // This is the ground truth — regardless of what the mobile app reports,
  // we will never let the heartbeat counters drop below the open anomaly count.
  const openCounts = await countOpenAnomalies(matricule_agent);

  // ── 2. Compute the effective counts ─────────────────────────────────────────
  // Use whichever is higher: what the app reports OR what's still open in DB.
  // This prevents a clean heartbeat (0,0) from erasing unresolved anomalies.
  const effectiveFailed  = Math.max(Number(failed_count  ?? 0), openCounts.failed);
  const effectivePending = Math.max(Number(pending_count ?? 0), openCounts.pending);

  // ── 3. Upsert heartbeat row with effective counts ───────────────────────────
  // updated_at = NOW() here is intentional — a real heartbeat from the device
  // proves the agent is alive, so we do want to reset the online/offline clock.
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
    [
      matricule_agent,
      effectivePending,
      effectiveFailed,
      last_sync_at ?? null,
      app_version  ?? null,
    ]
  );

  // ── 4. If app reported new anomalies, ensure placeholders exist ─────────────
  if ((failed_count ?? 0) > 0 || (pending_count ?? 0) > 0) {
    await ensurePlaceholderAnomalies(matricule_agent, pending_count, failed_count);
  }

  // ── NO auto-close logic ─────────────────────────────────────────────────────
  // Anomalies are ONLY resolved when a contrôleur manually clicks
  // "Corriger" or "Ignorer". The mobile app reporting 0 does NOT close anything.
}

// ── syncAllStaleHeartbeats ────────────────────────────────────────────────────
// On stream connect + every 30s: ensure heartbeat counts always reflect
// the actual number of open anomalies, even for stale/offline agents.
//
// IMPORTANT: This function must NEVER touch updated_at on agent_heartbeat.
// updated_at is the sole source of truth for online/offline status.
// Even `SET updated_at = updated_at` is not a no-op — MySQL's
// ON UPDATE CURRENT_TIMESTAMP fires on any UPDATE touching the row,
// overwriting updated_at with NOW() regardless of the assignment.
// The WHERE guard below prevents the UPDATE from executing at all
// unless the counts are genuinely being raised, which is the only
// safe way to suppress the auto-update trigger.

async function syncAllStaleHeartbeats() {
  try {
    // Process agents that have open anomaly placeholders
    const [anomalyAgents] = await db.promise().query(
      `SELECT matricule_agent,
              SUM(erreur LIKE 'Sync failed%')  AS failed_open,
              SUM(erreur LIKE 'Sync pending%') AS pending_open
       FROM billetterie.ticket_anomalie
       WHERE statut = 'non_traite'
         AND erreur LIKE 'Sync %heartbeat automatique%'
       GROUP BY matricule_agent`
    );

    for (const row of anomalyAgents) {
      const failedOpen  = Number(row.failed_open  ?? 0);
      const pendingOpen = Number(row.pending_open ?? 0);

      // Ensure placeholder rows match what's in agent_heartbeat
      await ensurePlaceholderAnomalies(row.matricule_agent, pendingOpen, failedOpen);

      // Raise heartbeat counts if they've fallen below the open anomaly count,
      // but ONLY execute the UPDATE when values actually need to change.
      // This prevents ON UPDATE CURRENT_TIMESTAMP from firing on every 30s tick
      // and resetting updated_at — which would make offline agents appear online.
      await db.promise().query(
        `UPDATE billetterie.agent_heartbeat
         SET failed_count  = GREATEST(failed_count,  ?),
             pending_count = GREATEST(pending_count, ?)
         WHERE matricule_agent = ?
           AND (failed_count < ? OR pending_count < ?)`,
        [failedOpen, pendingOpen, row.matricule_agent, failedOpen, pendingOpen]
      );
    }

    // Also process agents reported by heartbeat with counts > 0
    const [heartbeatAgents] = await db.promise().query(
      `SELECT matricule_agent, pending_count, failed_count
       FROM billetterie.agent_heartbeat
       WHERE failed_count > 0 OR pending_count > 0`
    );

    for (const row of heartbeatAgents) {
      await ensurePlaceholderAnomalies(
        row.matricule_agent,
        row.pending_count,
        row.failed_count
      );
    }

    const total = new Set([
      ...anomalyAgents.map(r => r.matricule_agent),
      ...heartbeatAgents.map(r => r.matricule_agent),
    ]).size;

    if (total > 0) {
      console.log(`✅ syncAllStaleHeartbeats: ${total} agent(s) vérifiés.`);
    }
  } catch (err) {
    console.error('❌ syncAllStaleHeartbeats error:', err.message);
  }
}

// ── getAllAgentsSnapshot ───────────────────────────────────────────────────────

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
       TIMESTAMPDIFF(SECOND, h.updated_at, NOW())  AS seconds_ago,
       COALESCE(s.tickets_today,    0)             AS tickets_today,
       COALESCE(s.quantite_today,   0)             AS quantite_today,
       COALESCE(s.recette_today_ms, 0)             AS recette_today_ms
     FROM billetterie.agent_heartbeat h
     LEFT JOIN base_global.agent a
            ON a.matricule_agent = h.matricule_agent
     LEFT JOIN (
         SELECT
             matricule_agent,
             COUNT(*)           AS tickets_today,
             SUM(quantite)      AS quantite_today,
             SUM(montant_total) AS recette_today_ms
         FROM billetterie.ticket_vendu
         WHERE DATE(date_heure) = CURDATE()
         GROUP BY matricule_agent
     ) s ON s.matricule_agent = h.matricule_agent
     ORDER BY h.updated_at DESC`
  );
  return rows;
}

module.exports = { upsertHeartbeat, getAllAgentsSnapshot, syncAllStaleHeartbeats };