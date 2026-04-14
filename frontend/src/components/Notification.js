import React, { useState, useEffect } from 'react';



export default function Notification({ message, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message.text) return;
    setVisible(true);
    const hide  = setTimeout(() => setVisible(false), 3500);
    const clear = setTimeout(() => onDone(), 3300);
    return () => { clearTimeout(hide); clearTimeout(clear); };
  }, [message]);

  if (!message.text) return null;

  const isSuccess = message.type === 'success';

  return (
    <div style={{
      position:      'fixed',
      top:           24,
      right:         24,
      zIndex:        9999,
      minWidth:      280,
      maxWidth:      380,
      background:    isSuccess ? '#1e7e34' : '#c0392b',
      color:         '#fff',
      borderRadius:  10,
      padding:       '14px 18px',
      display:       'flex',
      alignItems:    'flex-start',
      gap:           12,
      boxShadow:     '0 8px 32px rgba(0,0,0,0.22)',
      transform:     visible ? 'translateX(0)' : 'translateX(120%)',
      opacity:       visible ? 1 : 0,
      transition:    'transform 0.35s cubic-bezier(.4,0,.2,1), opacity 0.35s ease',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      <span style={{ fontSize: 20, lineHeight: 1 }}>
        {isSuccess ? '✓' : '✕'}
      </span>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
          {isSuccess ? 'Succès' : 'Erreur'}
        </div>
        <div style={{ fontSize: 13, opacity: 0.92 }}>{message.text}</div>
      </div>

      <button
        onClick={() => { setVisible(false); setTimeout(onDone, 350); }}
        style={{
          background: 'none',
          border:     'none',
          color:      '#fff',
          cursor:     'pointer',
          fontSize:   16,
          padding:    0,
          lineHeight: 1,
          opacity:    0.8,
        }}
      >✕</button>
    </div>
  );
}