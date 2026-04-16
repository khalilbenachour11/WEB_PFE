import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import "../styles/global.css";

const API = "http://localhost:5000/api";

const toDay = (str) => (str || "").slice(0, 10);
const fmtDT = (v) => `${Number(v || 0).toLocaleString("fr-FR")} DT`;
const fmtDate = (str) =>
  str ? new Date(str).toLocaleDateString("fr-FR") : "—";

function KpiStrip({ total, nbVoyages, nbAnomalies }) {
  const cards = [
    { icon: "💰", label: "Recette totale", value: fmtDT(total), hi: true },
    { icon: "🚌", label: "Voyages", value: nbVoyages },
    { icon: "⚠", label: "Anomalies", value: nbAnomalies, red: nbAnomalies > 0 },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 12,
        marginBottom: 24,
      }}
    >
      {cards.map((c) => (
        <div
          key={c.label}
          style={{
            background: c.hi ? "#EFF6FF" : "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: "16px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ fontSize: "1.3rem", marginBottom: 6 }}>{c.icon}</div>
          <div
            style={{ fontSize: "0.75rem", color: "#8A94A6", marginBottom: 4 }}
          >
            {c.label}
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: "1.1rem",
              color: c.red ? "#C0392B" : c.hi ? "#1D4ED8" : "#1A2332",
            }}
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function PeriodFilter({ startDate, endDate, onStart, onEnd, onReset }) {
  const active = startDate || endDate;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        padding: "14px 20px",
        marginBottom: 20,
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        alignItems: "flex-end",
      }}
    >
      <div>
        <div style={{ fontSize: "0.75rem", color: "#8A94A6", marginBottom: 4 }}>
          Date début
        </div>
        <input
          type="date"
          className="form-input"
          value={startDate}
          max={endDate || undefined}
          onChange={(e) => onStart(e.target.value)}
        />
      </div>
      <div>
        <div style={{ fontSize: "0.75rem", color: "#8A94A6", marginBottom: 4 }}>
          Date fin
        </div>
        <input
          type="date"
          className="form-input"
          value={endDate}
          min={startDate || undefined}
          onChange={(e) => onEnd(e.target.value)}
        />
      </div>
      {active && (
        <>
          <button
            className="btn btn-gray"
            onClick={onReset}
            style={{ alignSelf: "flex-end" }}
          >
            ✕ Réinitialiser
          </button>
          <span
            style={{
              alignSelf: "flex-end",
              fontSize: "0.8rem",
              color: "#2563EB",
              fontWeight: 600,
              paddingBottom: 8,
            }}
          >
            {startDate && endDate
              ? `${startDate} → ${endDate}`
              : startDate
                ? `À partir du ${startDate}`
                : `Jusqu'au ${endDate}`}
          </span>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: "0.9rem",
          color: "#1A2332",
          marginBottom: 16,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div
      style={{
        textAlign: "center",
        color: "#8A94A6",
        padding: "40px 0",
        fontSize: "0.88rem",
      }}
    >
      Aucune donnée sur cette période
    </div>
  );
}

export default function RecettesController() {
  const [voyages, setVoyages] = useState([]);
  const [segments, setSegments] = useState([]);
  const [journal, setJournal] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = async (start = "", end = "") => {
    try {
      setLoading(true);
      const params = {};
      if (start) params.start = start;
      if (end) params.end = end;

      const [resVoyage, resSegment] = await Promise.all([
        axios.get(`${API}/recettes_voyage`, { params }),
        axios.get(`${API}/recettes_segment`, { params }),
      ]);

      setVoyages(resVoyage.data?.data || []);
      setSegments(resSegment.data?.data || []);

      axios
        .get(`${API}/journal_ventes`, { params })
        .then((res) => setJournal(res.data?.data || []))
        .catch(() => setJournal([]));

      axios
        .get(`${API}/anomalies_recettes`, { params })
        .then((res) => setAnomalies(res.data?.data || []))
        .catch(() => setAnomalies([]));
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  useEffect(() => {
    fetchData(startDate, endDate);
  }, [startDate, endDate]);

  const safeDate = (d) => new Date(d).getTime() || 0;

  const filtered = useMemo(() => {
    return voyages.filter((v) => {
      const d = safeDate(v.date_heure);
      return (
        (!startDate || d >= safeDate(startDate)) &&
        (!endDate || d <= safeDate(endDate))
      );
    });
  }, [voyages, startDate, endDate]);

  const totalRecette = useMemo(
    () => filtered.reduce((s, v) => s + Number(v.total_recette || 0), 0),
    [filtered],
  );

  const revenueByLine = useMemo(() => {
    const map = {};
    filtered.forEach((v) => {
      const key = v.nom_ligne || "Inconnu";
      map[key] = (map[key] || 0) + Number(v.total_recette || 0);
    });
    return Object.entries(map)
      .map(([ligne, recette]) => ({ ligne, recette }))
      .sort((a, b) => b.recette - a.recette);
  }, [filtered]);

  const evolutionByDay = useMemo(() => {
    const map = {};
    filtered.forEach((v) => {
      const day = toDay(v.date_heure);
      if (!day) return;
      map[day] = (map[day] || 0) + Number(v.total_recette || 0);
    });
    return Object.keys(map)
      .sort()
      .map((date) => ({ date, recette: map[date] }));
  }, [filtered]);

  const top5 = revenueByLine.slice(0, 5);

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-title">📊 Contrôleur des Recettes</div>
        <div style={{ color: "#8A94A6", marginTop: 40, textAlign: "center" }}>
          Chargement…
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="breadcrumb">
        SRTB › <span>Contrôleur des recettes</span>
      </div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <div className="page-title">📊 Contrôleur des Recettes</div>
          <div className="page-subtitle">Vue analytique des performances</div>
        </div>
      </div>

      <PeriodFilter
        startDate={startDate}
        endDate={endDate}
        onStart={setStartDate}
        onEnd={setEndDate}
        onReset={() => {
          setStartDate("");
          setEndDate("");
        }}
      />

      <KpiStrip
        total={totalRecette}
        nbVoyages={filtered.length}
        nbAnomalies={anomalies.length}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <ChartCard title="📊 Recettes par ligne">
          {revenueByLine.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByLine} margin={{ bottom: 30 }}>
                <XAxis
                  dataKey="ligne"
                  tick={{ fontSize: 10 }}
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={fmtDT} />
                <Bar dataKey="recette" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="📈 Évolution journalière">
          {evolutionByDay.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={evolutionByDay}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={fmtDT} />
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <Line
                  type="monotone"
                  dataKey="recette"
                  stroke="#28B463"
                  strokeWidth={2}
                  dot={evolutionByDay.length <= 31}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="🏆 Top 5 lignes">
        {top5.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={top5}
              layout="vertical"
              margin={{ left: 10, right: 30 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${Number(v).toLocaleString("fr-FR")} DT`}
              />
              <YAxis
                type="category"
                dataKey="ligne"
                tick={{ fontSize: 11 }}
                width={110}
              />
              <Tooltip formatter={fmtDT} />
              <Bar dataKey="recette" fill="#2E86C1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="⚠ Anomalies de recettes">
        {anomalies.length === 0 ? (
          <div style={{ color: "#1B6B3A", fontSize: "0.88rem" }}>
            ✓ Aucune anomalie détectée
          </div>
        ) : (
          <table className="recettes-table">
            <thead>
              <tr>
                <th>Voyage</th>
                <th>Ligne</th>
                <th>Receveur</th>
                <th>Date</th>
                <th>Écart</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a) => (
                <tr key={a.id_voyage}>
                  <td>
                    <span className="badge-matricule">{a.id_voyage}</span>
                  </td>
                  <td>{a.nom_ligne || "—"}</td>
                  <td>
                    {a.prenom} {a.nom}
                  </td>
                  <td style={{ fontSize: "0.82rem" }}>
                    {fmtDate(a.date_heure)}
                  </td>
                  <td style={{ color: "#C0392B", fontWeight: 700 }}>
                    {fmtDT(a.ecart)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ChartCard>
    </div>
  );
}
