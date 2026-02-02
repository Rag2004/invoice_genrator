
import React, { useRef, useEffect } from 'react';
import InvoiceComplete from './InvoiceComplete';
import { buildInvoiceSnapshot } from '../utils/buildInvoiceSnapshot';

/**
 * ============================================================================
 * INVOICE PREVIEW MODAL
 * ============================================================================
 * 
 * Displays invoice preview using canonical snapshot structure.
 * 
 * CRITICAL: For FINAL invoices, uses existing snapshot
 *           For DRAFT invoices, builds snapshot from flat state
 * ============================================================================
 */

export default function InvoicePreviewModal({
  isOpen,
  onClose,
  invoice = {},
  projectData = {},
  clientData = {},
  consultantData = {},
  logoUrl = ""
}) {
  const modalRef = useRef(null);

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // ============================================================================
  // BACKDROP CLICK HANDLER
  // ============================================================================
  const handleBackdropClick = (e) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  // ============================================================================
  // EARLY RETURN IF NOT OPEN
  // ============================================================================
  if (!isOpen) return null;

  // ============================================================================
  // BUILD OR USE EXISTING SNAPSHOT
  // ============================================================================
  let snapshot;
  
  if (invoice.status === 'FINAL' && invoice.snapshot) {
    // ✅ For FINAL invoices, use the hydrated snapshot directly
    snapshot = invoice.snapshot;
  } else {
    // ✅ For DRAFT invoices, build snapshot from flat state
    snapshot = buildInvoiceSnapshot(
      invoice,
      projectData,
      clientData,
      consultantData
    );
  }

  // ============================================================================
  // ============================================================================

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div
      ref={modalRef}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        overflow: 'auto'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '210mm',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* ==================== HEADER ==================== */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: 'white',
            padding: '16px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            {invoice.status === 'FINAL' ? 'Final Invoice' : 'Invoice Preview'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px 8px',
              color: '#6b7280',
              lineHeight: 1
            }}
            aria-label="Close preview"
          >
            ×
          </button>
        </div>

        {/* ==================== INVOICE CONTENT ==================== */}
        <div style={{ padding: '24px' }}>
          <InvoiceComplete
            invoice={{ snapshot }}
            logoUrl={logoUrl}
          />
        </div>

        {/* ==================== FOOTER ==================== */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            background: 'white',
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 10
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              backgroundColor: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}