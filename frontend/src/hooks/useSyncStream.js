// useSyncStream.js
import { useState, useEffect, useRef, useCallback } from "react";
import API_URL from '../api/config';

const MAX_BACKOFF_MS = 30_000;



export function useSyncStream() {
  const [agents, setAgents] = useState([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);
  const retryTimer = useRef(null);
  const retryDelay = useRef(1_000);
  const unmounted = useRef(false);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    clearTimeout(retryTimer.current);
    if (unmounted.current) return;

    const token = localStorage.getItem('token');

    // No token = not logged in yet, retry in 1s
    if (!token) {
      retryTimer.current = setTimeout(connect, 1_000);
      return;
    }

    const es = new EventSource(`${API_URL}/api/sync/stream?token=${token}`);
    esRef.current = es;

    es.onopen = () => {
      if (unmounted.current) return;
      setConnected(true);
      retryDelay.current = 1_000;
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

      const delay = retryDelay.current;
      retryDelay.current = Math.min(delay * 2, MAX_BACKOFF_MS);
      console.warn(`[useSyncStream] disconnected — retrying in ${delay}ms`);
      retryTimer.current = setTimeout(connect, delay);
    };
  }, []);

  useEffect(() => {
    unmounted.current = false;
    connect();

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