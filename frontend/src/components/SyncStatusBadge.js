import React from "react";

const OFFLINE_AFTER_SECONDS = 90;

/**
 * Small pill badge showing whether an agent is currently online or offline.
 *
 * Props:
 *   secondsAgo {number}  — how many seconds since the last heartbeat
 *   showLabel  {boolean} — whether to display the text label (default true)
 */
export default function SyncStatusBadge({ secondsAgo, showLabel = true }) {
  const isOnline = secondsAgo != null && secondsAgo < OFFLINE_AFTER_SECONDS;

  const style = {
    display:        "inline-flex",
    alignItems:     "center",
    gap:            5,
    padding:        "2px 10px",
    borderRadius:   20,
    fontSize:       "0.72rem",
    fontWeight:     700,
    whiteSpace:     "nowrap",
    background:     isOnline ? "rgba(27,107,58,0.1)" : "rgba(100,100,100,0.08)",
    color:          isOnline ? "var(--green)"         : "var(--gray-400)",
    border:         isOnline ? "none" : "1px solid var(--gray-100)",
  };

  const dotStyle = {
    width:        7,
    height:       7,
    borderRadius: "50%",
    flexShrink:   0,
    background:   isOnline ? "var(--green)" : "var(--gray-300)",
    animation:    isOnline ? "pulse 1.5s ease-in-out infinite" : "none",
  };

  return (
    <span style={style}>
      <span style={dotStyle} />
      {showLabel && (isOnline ? "En ligne" : "Hors ligne")}
    </span>
  );
}