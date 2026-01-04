import React from 'react';

/**
 * ============================================================================
 * INVOICE PREVIEW COMPONENT
 * ============================================================================
 * 
 * REFACTORED to work with canonical snapshot structure
 * 
 * Expects: { invoice: { snapshot: {...} } }
 * OR flat invoice data (with automatic conversion)
 * ============================================================================
 */

function percentToFraction(v) {
  const n = Number(v || 0);
  if (isNaN(n)) return 0;
  return n > 1 ? n / 100 : n;
}

export default function InvoicePreview({ invoice = {}, projectData, clientData }) {
  // ============================================================================
  // DETECT DATA STRUCTURE
  // ============================================================================
  const hasSnapshot = !!invoice.snapshot;
  
  let data;
  
  if (hasSnapshot) {
    // ✅ NEW: Extract from snapshot structure
    const snapshot = invoice.snapshot;
    data = {
      projectCode: snapshot.project?.projectCode || '',
      clientCode: snapshot.client?.code || '',
      consultantName: snapshot.consultant?.name || '',
      date: snapshot.meta?.invoiceDate || invoice.date || '',
      billingAddress: snapshot.client?.billingAddress || '',
      items: snapshot.work?.items || [],
      stages: snapshot.work?.stages || [],
      notes: snapshot.notes || '',
      subtotal: snapshot.totals?.subtotal || 0,
      gst: snapshot.totals?.gst || 0,
      total: snapshot.totals?.total || 0,
      serviceFeePct: snapshot.totals?.serviceFeePct || 0,
      invoiceNumber: snapshot.meta?.invoiceNumber || invoice.invoiceNumber || '',
    };
  } else {
    // ✅ FALLBACK: Use flat structure (legacy support)
    data = {
      projectCode: invoice.projectCode || '',
      clientCode: invoice.clientCode || '',
      consultantName: invoice.consultantName || '',
      date: invoice.date || '',
      billingAddress: invoice.billingAddress || '',
      items: invoice.items || [],
      stages: invoice.stages || [],
      notes: invoice.notes || '',
      subtotal: invoice.subtotal || 0,
      gst: invoice.gst || 0,
      total: invoice.total || 0,
      serviceFeePct: invoice.serviceFeePct || 0,
      invoiceNumber: invoice.invoiceNumber || '',
    };
  }

  // ============================================================================
  // CALCULATIONS
  // ============================================================================
  const subtotal = Number(data.subtotal || 0);
  const gst = Number(data.gst || 0);
  const total = Number(data.total || 0);
  
  const svcFraction = percentToFraction(data.serviceFeePct);
  const serviceFeeAmount = Math.round(total * svcFraction);
  const consultantEarnings = Math.max(total - serviceFeeAmount, 0);

  const formatMoney = (v) =>
    `₹${Number(v || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  const safeDate = data.date || new Date().toISOString().slice(0, 10);

  const projectName = projectData?.name || projectData?.projectName || '';
  const clientName = clientData?.name || clientData?.clientName || '';

  // Total days from stages
  const totalStageDays = data.stages.reduce(
    (sum, s) => sum + (Number(s.days || 0) || 0),
    0
  );

  return (
    <div className="invoice-sheet">
      {/* HEADER */}
      <header className="invoice-header">
        <div className="invoice-header-top">
          <h2 className="invoice-title">Tax Invoice</h2>
          <div className="invoice-date">Date: {safeDate}</div>
        </div>
        <p className="invoice-subtitle">
          {data.consultantName || 'Consultant Name'}
        </p>
      </header>

      {/* BODY */}
      <div className="invoice-body">
        {/* Meta blocks */}
        <section className="invoice-meta">
          <div className="invoice-meta-section">
            <h4>Project Details</h4>
            <p>
              <strong>Project Code:</strong> {data.projectCode || '—'}
            </p>
            {projectName && (
              <p>
                <strong>Project:</strong> {projectName}
              </p>
            )}
            <p>
              <strong>Client Code:</strong> {data.clientCode || '—'}
            </p>
            {clientName && (
              <p>
                <strong>Client:</strong> {clientName}
              </p>
            )}
            {data.billingAddress && (
              <p>
                <strong>Billing Address:</strong>
                <br />
                {data.billingAddress}
              </p>
            )}
          </div>

          <div className="invoice-meta-section">
            <h4>Invoice Information</h4>
            <p>
              <strong>Invoice #:</strong> {data.invoiceNumber || '—'}
            </p>
            <p>
              <strong>Date:</strong> {safeDate}
            </p>
            <p>
              <strong>Consultant:</strong> {data.consultantName || '—'}
            </p>
            <p>
              <strong>Service Fee %:</strong>{' '}
              {data.serviceFeePct ? `${data.serviceFeePct}%` : '—'}
            </p>
          </div>
        </section>

        {/* TEAM SUMMARY */}
        <section className="invoice-section">
          <div className="invoice-section-header">
            <h4 className="invoice-section-title">Team Summary</h4>
          </div>

          <table className="invoice-table">
            <thead>
              <tr>
                <th>Team Member</th>
                <th>Mode</th>
                <th className="text-right">Hours</th>
                <th className="text-right">Rate (₹/hr)</th>
                <th className="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No team members added yet.
                  </td>
                </tr>
              )}
              {data.items.map((it, idx) => (
                <tr key={it.id || idx}>
                  <td>{it.name || '—'}</td>
                  <td>
                    {it.mode ? (
                      <span
                        className={`mode-pill ${
                          it.mode.toLowerCase().includes('online')
                            ? 'mode-online'
                            : it.mode.toLowerCase().includes('offline')
                            ? 'mode-offline'
                            : ''
                        }`}
                      >
                        {it.mode}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="text-right">
                    {Number(it.hours || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="text-right">
                    {formatMoney(it.rate || 0)}
                  </td>
                  <td className="text-right">
                    {formatMoney(it.amount || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* STAGES TABLE */}
        {data.stages && data.stages.length > 0 && (
          <section className="invoice-section">
            <div className="invoice-section-header">
              <h4 className="invoice-section-title">
                Stages, Inclusions &amp; Timeline
              </h4>
              {totalStageDays > 0 && (
                <span className="small-text">
                  Total Days (all stages): {totalStageDays}
                </span>
              )}
            </div>

            <table className="invoice-table stages-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Stage</th>
                  <th style={{ width: '60%' }}>Inclusions / Description</th>
                  <th style={{ width: '18%' }} className="text-right">
                    Days
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.stages.map((s, idx) => {
                  // Build description from subStages if description is empty
                  let description = s.description || '';
                  if (!description && s.subStages?.length > 0) {
                    description = s.subStages
                      .map(sub => sub.label || sub.name)
                      .filter(Boolean)
                      .join(', ');
                  }
                  
                  return (
                    <tr key={s.id || idx}>
                      <td>{s.stage || `Stage ${idx + 1}`}</td>
                      <td className="stage-description-cell">
                        {description || '—'}
                      </td>
                      <td className="text-right">
                        {s.days ? Number(s.days).toLocaleString('en-IN') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* NOTES + BILL SUMMARY + EARNINGS */}
        <section className="invoice-section">
          <div className="invoice-section-header">
            <h4 className="invoice-section-title">Notes &amp; Summary</h4>
          </div>

          <div className="invoice-bottom-grid">
            {/* LEFT: Notes */}
            <div className="invoice-bottom-stages">
              <div
                style={{
                  border: '1px solid var(--gray-200)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  minHeight: '100px',
                  background: '#ffffff',
                }}
              >
                <div
                  style={{
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--gray-600)',
                    marginBottom: '8px',
                    fontWeight: 600,
                  }}
                >
                  Notes (Optional)
                </div>
                <div
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--gray-800)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {data.notes && data.notes.trim().length > 0
                    ? data.notes
                    : 'No additional notes.'}
                </div>
              </div>
            </div>

            {/* RIGHT: Bill summary + internal earnings box */}
            <div className="invoice-bottom-totals">
              <div className="invoice-totals-card">
                {/* Bill summary visible to client */}
                <div className="summary-line subtotal">
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                <div className="summary-line gst">
                  <span>GST (18%)</span>
                  <span>{formatMoney(gst)}</span>
                </div>
                <div className="summary-line total">
                  <span>Total Amount</span>
                  <span className="summary-total-amount">
                    {formatMoney(total)}
                  </span>
                </div>

                {/* Internal-only earnings box */}
                <div className="earnings-box" style={{ marginTop: '18px' }}>
                  <div className="service-fee">
                    Platform / Service Fee ({data.serviceFeePct || 0}
                    %): <strong>{formatMoney(serviceFeeAmount)}</strong>
                  </div>
                  <div className="earnings">
                    Your Earnings:{' '}
                    <span>{formatMoney(consultantEarnings)}</span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--gray-500)',
                      marginTop: '4px',
                    }}
                  >
                    (Shown only to you; hidden in client PDFs / printouts.)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}