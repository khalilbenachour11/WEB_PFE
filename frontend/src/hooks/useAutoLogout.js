import { useEffect, useCallback } from 'react';

export default function useAutoLogout(onLogout, timeoutMinutes = 15) {
  const resetTimer = useCallback(() => {
    clearTimeout(window._logoutTimer);
    window._logoutTimer = setTimeout(() => {
      onLogout();
    }, timeoutMinutes * 60 * 1000);
  }, [onLogout, timeoutMinutes]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      clearTimeout(window._logoutTimer);
    };
  }, [resetTimer]);
}