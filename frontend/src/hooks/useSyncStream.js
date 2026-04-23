import { useState, useEffect, useRef, useCallback } from "react";

const API = "http://localhost:5000/api";
const MAX_BACKOFF_MS = 30_000;

export function useSyncStream() {
  const [agents,    setAgents]    = useState([]);
  const [connected, setConnected] = useState(false);
  const esRef        = useRef(null);
  const retryTimer   = useRef(null);
  const retryDelay   = useRef(1_000);
  const unmounted    = useRef(false);

  const connect = useCallback(() => {
    // Tear down any existing connection cleanly
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    clearTimeout(retryTimer.current);
    if (unmounted.current) return;

    const es = new EventSource(`${API}/sync/stream`);
    esRef.current = es;

    es.onopen = () => {
      if (unmounted.current) return;
      setConnected(true);
      retryDelay.current = 1_000; // reset backoff on successful connect
    };

    es.onmessage = (event) => {
      if (unmounted.current) return;
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          setAgents(data);
          setConnected(true);
        }
      } catch {
        // malformed frame — ignore
      }
    };

    es.onerror = () => {
      if (unmounted.current) return;
      setConnected(false);
      es.close();
      esRef.current = null;

      // Exponential backoff: 1s → 2s → 4s → … capped at 30s
      const delay = retryDelay.current;
      retryDelay.current = Math.min(delay * 2, MAX_BACKOFF_MS);

      console.warn(`[useSyncStream] disconnected — retrying in ${delay}ms`);
      retryTimer.current = setTimeout(connect, delay);
    };
  }, []);

  useEffect(() => {
    unmounted.current = false;
    connect();

    // Re-connect when the tab becomes visible again (e.g. user switches back)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && !esRef.current) {
        retryDelay.current = 1_000;
        connect();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      unmounted.current = true;
      esRef.current?.close();
      clearTimeout(retryTimer.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [connect]);

  return { agents, connected };
}