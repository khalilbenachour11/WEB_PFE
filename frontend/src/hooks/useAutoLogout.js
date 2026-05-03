import { useEffect, useRef } from 'react';

export default function useAutoLogout(onLogout, timeoutMinutes = 15) {
  const onLogoutRef = useRef(onLogout);

  useEffect(() => {
    onLogoutRef.current = onLogout;
  }, [onLogout]);

  useEffect(() => {
    const ms = timeoutMinutes * 60 * 1000;
    let timer;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onLogoutRef.current(), ms);
    };

    const startOnFirstInteraction = () => {
      reset();
      events.forEach(e => window.removeEventListener(e, startOnFirstInteraction));
      events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e =>
      window.addEventListener(e, startOnFirstInteraction, { once: true, passive: true })
    );

    console.log('✅ useAutoLogout mounted — timer will start on first interaction');

    return () => {
      console.log('🔴 useAutoLogout UNMOUNTED — this should not happen on reload');
      clearTimeout(timer);
      events.forEach(e => {
        window.removeEventListener(e, reset);
        window.removeEventListener(e, startOnFirstInteraction);
      });
    };
  }, [timeoutMinutes]);
}