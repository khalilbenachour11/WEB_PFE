import React from 'react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 9) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 5) pages.push('...');
      const start = Math.max(2, currentPage - 3);
      const end   = Math.min(totalPages - 1, currentPage + 3);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 4) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'16px', flexWrap:'wrap' }}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          padding:'8px 12px', borderRadius:'4px', border:'1px solid var(--color-border-tertiary)',
          background: currentPage === 1 ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
          color:'var(--color-text-primary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          fontSize:'14px', fontWeight:500,
        }}
      >← Précédent</button>

      {getPageNumbers().map((page, idx) =>
        page === '...' ? (
          <span key={`dots-${idx}`} style={{ padding:'0 4px', color:'var(--color-text-secondary)' }}>...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            disabled={page === currentPage}
            style={{
              width:'36px', height:'36px', padding:0, borderRadius:'4px',
              border: page === currentPage ? '2px solid #1a73e8' : '1px solid var(--color-border-tertiary)',
              background: page === currentPage ? '#e8f0fe' : 'var(--color-background-primary)',
              color: page === currentPage ? '#1a73e8' : 'var(--color-text-primary)',
              cursor: page === currentPage ? 'default' : 'pointer',
              fontWeight: page === currentPage ? '600' : '500', fontSize:'13px',
            }}
          >{page}</button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          padding:'8px 12px', borderRadius:'4px', border:'1px solid var(--color-border-tertiary)',
          background: currentPage === totalPages ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
          color:'var(--color-text-primary)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          fontSize:'14px', fontWeight:500,
        }}
      >Suivant →</button>
    </div>
  );
}