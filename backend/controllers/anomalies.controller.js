const db = require('../database');

// ── helper: decrement heartbeat count by 1 after fixing one anomalie ──────────
// Determines which type (failed/pending) by reading the anomalie's erreur field,
// then decrements that specific counter by 1 (min 0).
// Only resets to 0 if no more non_traite placeholders remain for that agent.

async function decrementHeartbeatCount(matricule_agent, anomalie_id) {
  if (!matricule_agent) return;

  // Read the erreur of the anomalie being fixed to know which counter to touch
  const [anomRows] = await db.promise().query(
    `SELECT erreur FROM billetterie.ticket_anomalie WHERE id = ?`,
    [anomalie_id]
  );

  const erreur = anomRows[0]?.erreur || '';
  const isFailed  = erreur.toLowerCase().includes('failed');
  const isPending = erreur.toLowerCase().includes('pending');

  // Count remaining non_traite failed placeholders for this agent
  const [failedRows] = await db.promise().query(
    `SELECT COUNT(*) AS total
     FROM billetterie.ticket_anomalie
     WHERE matricule_agent = ?
       AND erreur LIKE 'Sync failed%'
       AND statut = 'non_traite'
       AND id != ?`,
    [parseInt(matricule_agent), anomalie_id]
  );

  // Count remaining non_traite pending placeholders for this agent
  const [pendingRows] = await db.promise().query(
    `SELECT COUNT(*) AS total
     FROM billetterie.ticket_anomalie
     WHERE matricule_agent = ?
       AND erreur LIKE 'Sync pending%'
       AND statut = 'non_traite'
       AND id != ?`,
    [parseInt(matricule_agent), anomalie_id]
  );

  const remainingFailed  = Number(failedRows[0].total  ?? 0);
  const remainingPending = Number(pendingRows[0].total ?? 0);

  // Update heartbeat: set each counter to the actual remaining count
  // This is precise — no guessing, just count what's still open
  await db.promise().query(
    `UPDATE billetterie.agent_heartbeat
     SET failed_count  = ?,
         pending_count = ?,
         updated_at    = NOW()
     WHERE matricule_agent = ?`,
    [
      remainingFailed,
      remainingPending,
      parseInt(matricule_agent),
    ]
  );
}

// ── GET /api/anomalies ────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT
        ta.*,
        a.nom, a.prenom,
        l.nom_ligne
      FROM billetterie.ticket_anomalie ta
      LEFT JOIN base_global.agent a ON ta.matricule_agent = a.matricule_agent
      LEFT JOIN billetterie.voyage v ON ta.id_voyage = v.id_voyage
      LEFT JOIN base_global.ligne l ON v.id_ligne = l.id_ligne
      ORDER BY ta.created_at DESC
    `);
    res.json({ success: true, anomalies: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/anomalies/importer ──────────────────────────────────────────────
exports.importer = async (req, res) => {
  const { tickets } = req.body;
  if (!tickets || !Array.isArray(tickets) || tickets.length === 0)
    return res.json({ success: false, message: 'Aucun ticket fourni' });

  try {
    let inserted = 0;
    let skipped  = 0;

    for (const t of tickets) {
      // Guard: skip if already in ticket_vendu
      const [venduRows] = await db.promise().query(
        `SELECT id_ticket FROM billetterie.ticket_vendu
         WHERE id_voyage       = ?
           AND matricule_agent = ?
           AND type_tarif      = ?
           AND date_heure      = ?
         LIMIT 1`,
        [t.id_voyage || null, t.matricule_agent || null, t.type_tarif || null, t.date_heure || null]
      );
      if (venduRows.length > 0) { skipped++; continue; }

      // Guard: skip if already in ticket_anomalie
      const [anomalieRows] = await db.promise().query(
        `SELECT id FROM billetterie.ticket_anomalie
         WHERE id_voyage       = ?
           AND matricule_agent = ?
           AND type_tarif      = ?
           AND date_heure      = ?
         LIMIT 1`,
        [t.id_voyage || null, t.matricule_agent || null, t.type_tarif || null, t.date_heure || null]
      );
      if (anomalieRows.length > 0) { skipped++; continue; }

      await db.promise().query(
        `INSERT INTO billetterie.ticket_anomalie
           (matricule_agent, id_voyage, id_segment, point_depart, point_arrivee,
            type_tarif, quantite, prix_unitaire, montant_total, date_heure, erreur, statut)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'non_traite')`,
        [
          t.matricule_agent || null,
          t.id_voyage       || null,
          t.id_segment      || null,
          t.point_depart    || null,
          t.point_arrivee   || null,
          t.type_tarif      || null,
          parseInt(t.quantite)      || 0,
          parseInt(t.prix_unitaire) || 0,
          parseInt(t.montant_total) || 0,
          t.date_heure      || null,
          t.erreur          || null,
        ]
      );
      inserted++;
    }

    res.json({
      success: true,
      inserted,
      skipped,
      message: skipped > 0
        ? `${inserted} importé(s), ${skipped} doublon(s) ignoré(s).`
        : `${inserted} ticket(s) importé(s) avec succès.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/anomalies/verifier ──────────────────────────────────────────────
exports.verifier = async (req, res) => {
  const { tickets } = req.body;
  if (!tickets || !Array.isArray(tickets) || tickets.length === 0)
    return res.json({ success: false, message: 'Aucun ticket fourni' });

  try {
    const results = [];

    for (const t of tickets) {
      const [venduRows] = await db.promise().query(
        `SELECT id_ticket FROM billetterie.ticket_vendu
         WHERE id_voyage       = ?
           AND matricule_agent = ?
           AND type_tarif      = ?
           AND date_heure      = ?
         LIMIT 1`,
        [t.id_voyage || null, t.matricule_agent || null, t.type_tarif || null, t.date_heure || null]
      );

      const excludeId = t.exclude_id ? parseInt(t.exclude_id) : null;

      const [anomalieRows] = await db.promise().query(
        `SELECT id FROM billetterie.ticket_anomalie
         WHERE id_voyage       = ?
           AND matricule_agent = ?
           AND type_tarif      = ?
           AND date_heure      = ?
           AND (? IS NULL OR id != ?)
         LIMIT 1`,
        [
          t.id_voyage || null, t.matricule_agent || null,
          t.type_tarif || null, t.date_heure || null,
          excludeId, excludeId,
        ]
      );

      results.push({
        index:          t._index,
        existeVendu:    venduRows.length    > 0,
        existeAnomalie: anomalieRows.length > 0,
        existe:         venduRows.length > 0 || anomalieRows.length > 0,
      });
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/anomalies/:id/enregistrer ────────────────────────────────────────
exports.enregistrer = async (req, res) => {
  const { id } = req.params;
  const {
    id_voyage, point_depart, point_arrivee,
    type_tarif, quantite, prix_unitaire, montant_total,
    date_heure, matricule_agent,
  } = req.body;

  try {
    // 1. Vérifier que le voyage existe
    const [voyageRows] = await db.promise().query(
      'SELECT id_voyage FROM billetterie.voyage WHERE id_voyage = ?',
      [id_voyage]
    );
    if (!voyageRows.length) {
      return res.status(400).json({
        success: false,
        message: `Voyage #${id_voyage} introuvable dans la base — vérifiez l'ID voyage.`,
      });
    }

    // 2. Récupérer un id_segment valide pour ce voyage
    const [segRows] = await db.promise().query(
      'SELECT id_segment FROM billetterie.segment_voyage WHERE id_voyage = ? ORDER BY id_segment LIMIT 1',
      [id_voyage]
    );
    if (!segRows.length) {
      return res.status(400).json({
        success: false,
        message: `Aucun segment trouvé pour le voyage #${id_voyage}. Impossible d'insérer le ticket.`,
      });
    }
    const id_segment = segRows[0].id_segment;

    // 3. Vérifier doublon dans ticket_vendu
    const [existingVendu] = await db.promise().query(
      `SELECT id_ticket FROM billetterie.ticket_vendu
       WHERE id_voyage       = ?
         AND matricule_agent = ?
         AND type_tarif      = ?
         AND date_heure      = ?
       LIMIT 1`,
      [
        parseInt(id_voyage),
        matricule_agent ? parseInt(matricule_agent) : null,
        type_tarif || null,
        date_heure || null,
      ]
    );
    if (existingVendu.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Ce ticket existe déjà dans la base (ticket_vendu #${existingVendu[0].id_ticket}). Enregistrement annulé pour éviter un doublon.`,
      });
    }

    await db.promise().query('START TRANSACTION');

    // 4. Insérer dans ticket_vendu
    await db.promise().query(
      `INSERT INTO billetterie.ticket_vendu
         (id_voyage, id_segment, point_depart, point_arrivee,
          type_tarif, quantite, prix_unitaire, montant_total,
          date_heure, matricule_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parseInt(id_voyage), id_segment,
        point_depart  || null, point_arrivee || null,
        type_tarif    || null,
        parseInt(quantite)      || 1,
        parseInt(prix_unitaire) || 0,
        parseInt(montant_total) || 0,
        date_heure    || null,
        matricule_agent ? parseInt(matricule_agent) : null,
      ]
    );

    // 5. Passer le statut à "enregistre"
    await db.promise().query(
      `UPDATE billetterie.ticket_anomalie
       SET statut = 'enregistre', updated_at = NOW()
       WHERE id = ?`,
      [id]
    );

    await db.promise().query('COMMIT');

    // 6. Decrement heartbeat by 1 — only this ticket is fixed, not all of them
    await decrementHeartbeatCount(matricule_agent, id);

    res.json({ success: true, message: 'Ticket enregistré avec succès' });

  } catch (err) {
    await db.promise().query('ROLLBACK');
    console.error('❌ enregistrer error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/anomalies/:id/ignorer ────────────────────────────────────────────
exports.ignorer = async (req, res) => {
  try {
    const anomalieId = req.params.id;

    // 1. Fetch agent before updating so we can decrement correctly
    const [anomRows] = await db.promise().query(
      `SELECT matricule_agent FROM billetterie.ticket_anomalie WHERE id = ?`,
      [anomalieId]
    );

    // 2. Mark as ignoré
    await db.promise().query(
      `UPDATE billetterie.ticket_anomalie
       SET statut = 'ignore', updated_at = NOW()
       WHERE id = ?`,
      [anomalieId]
    );

    // 3. Decrement heartbeat by 1 — only this ticket is resolved, not all of them
    if (anomRows.length > 0) {
      await decrementHeartbeatCount(anomRows[0].matricule_agent, anomalieId);
    }

    res.json({ success: true, message: 'Anomalie ignorée' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/anomalies/:id ─────────────────────────────────────────────────
exports.supprimer = async (req, res) => {
  try {
    await db.promise().query(
      'DELETE FROM billetterie.ticket_anomalie WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true, message: 'Anomalie supprimée' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};