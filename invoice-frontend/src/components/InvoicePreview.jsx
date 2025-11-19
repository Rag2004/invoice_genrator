import React from 'react';

export default function InvoicePreview({ invoice = {}, clientData, projectData }) {
  const formatCurrency = (amount) => {
    return `₹${Number(amount || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const team = invoice.items || [];
  const subtotal = invoice.subtotal || 0;
  const gst = subtotal * 0.18;
  const totalWithGst = subtotal + gst;
  const serviceFee = ((invoice.serviceFeePct || 0) / 100) * subtotal;
  const earnings = subtotal - serviceFee;

  const clientName = clientData?.name || projectData?.clientName || 'Client';

  const projectCode = invoice.projectCode || projectData?.code || '';
  const clientCode = invoice.clientCode || projectData?.clientCode || '';

  const codeLine =
    projectCode && clientCode
      ? `${projectCode} — ${clientCode}`
      : projectCode || clientCode || '—';

  const projectName =
    projectData?.name && projectData.name !== projectCode
      ? projectData.name
      : '';

  const stages = Array.isArray(invoice.stages) ? invoice.stages : [];
  const totalDays = stages.reduce(
    (sum, s) => sum + (Number(s.days || 0) || 0),
    0
  );

  const modeClass = (mode = '') => {
    if (mode.startsWith('Online')) return 'mode-pill mode-online';
    if (mode.startsWith('Offline')) return 'mode-pill mode-offline';
    return 'mode-pill';
  };

  return (
    <div className="invoice-sheet">
      {/* Header */}
      <div className="invoice-header">
        <div className="invoice-header-top">
          <h3 className="invoice-title">Invoice Preview</h3>
          <div className="invoice-date">{formatDate(invoice.date)}</div>
        </div>
        <p className="invoice-subtitle">
          {invoice.consultantName || 'Consultant Name'}
        </p>
      </div>

      {/* Body */}
      <div className="invoice-body">
        {/* Meta Information */}
        <div className="invoice-meta">
          <div className="invoice-meta-section">
            <h4>Project Details</h4>
            <p className="company-name">{codeLine}</p>

            {projectName && (
              <p style={{ fontWeight: 600, marginBottom: 2 }}>
                {projectName}
              </p>
            )}
            <p style={{ fontWeight: 600, marginBottom: 4 }}>{clientName}</p>
            <p
              style={{
                whiteSpace: 'pre-wrap',
                fontSize: '0.875rem',
                lineHeight: 1.5,
              }}
            >
              {invoice.billingAddress || 'No address provided'}
            </p>
          </div>

          <div className="invoice-meta-section">
            <h4>Invoice Information</h4>
            <p>
              <strong>Invoice #:</strong>{' '}
              {invoice.invoiceNumber || '—'}
            </p>
            <p>
              <strong>Date:</strong> {formatDate(invoice.date)}</p>
            <p>
              <strong>Consultant:</strong>{' '}
              {invoice.consultantName || '—'}
            </p>
          </div>
        </div>

        {/* TEAM SECTION */}
        <section className="invoice-section">
          <div className="invoice-section-header">
            <h4 className="invoice-section-title">Team Summary</h4>
          </div>

          {team.length > 0 ? (
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Team Member</th>
                  <th>Mode</th>
                  <th style={{ textAlign: 'center' }}>Hours</th>
                  <th style={{ textAlign: 'center' }}>Rate</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {team.map((member, index) => (
                  <tr key={member.id || index}>
                    <td>{member.name || '—'}</td>
                    <td>
                      <span className={modeClass(member.mode)}>
                        {member.mode || '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {member.hours || 0}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {formatCurrency(member.rate)}
                    </td>
                    <td
                      className="text-right"
                      style={{ fontWeight: 700 }}
                    >
                      {formatCurrency(
                        member.amount ||
                          (member.hours || 0) * (member.rate || 0)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div
              className="muted"
              style={{
                textAlign: 'center',
                padding: '24px',
                background: 'var(--gray-50)',
                borderRadius: 'var(--radius)',
              }}
            >
              No team members added yet
            </div>
          )}
        </section>

        {/* BOTTOM GRID: TOTALS + STAGES */}
        <div className="invoice-bottom-grid">
          {/* TOTALS + EARNINGS */}
          <section className="invoice-totals-card invoice-bottom-totals">
            <div className="summary-line subtotal">
              <span>Subtotal:</span>
              <span style={{ fontWeight: 600 }}>
                {formatCurrency(subtotal)}
              </span>
            </div>

            <div className="summary-line gst">
              <span>GST (18%):</span>
              <span style={{ fontWeight: 600 }}>
                {formatCurrency(gst)}
              </span>
            </div>

            <div className="summary-line total">
              <span>Total (incl. GST):</span>
              <span className="summary-total-amount">
                {formatCurrency(totalWithGst)}
              </span>
            </div>

            {/* Earnings box (hidden on print / client PDF via CSS) */}
            <div className="earnings-box">
              <div className="service-fee">
                Service Fee ({invoice.serviceFeePct || 0}%):{' '}
                {formatCurrency(serviceFee)}
              </div>
              <div className="earnings">
                Your Earnings: {formatCurrency(earnings)}
              </div>
            </div>
          </section>

          {/* STAGES SECTION */}
          <section className="invoice-section invoice-bottom-stages">
            <div className="invoice-section-header">
              <h4 className="invoice-section-title">
                Stages, Inclusions &amp; Timeline
              </h4>
            </div>

            {stages.length === 0 ? (
              <p className="muted">
                No stages added. Add stages on the left panel to show them here.
              </p>
            ) : (
              <>
                <table className="invoice-table stages-table">
                  <thead>
                    <tr>
                      <th>Stage</th>
                      <th>Inclusions / Description</th>
                      <th style={{ textAlign: 'center' }}>Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stages.map((s) => (
                      <tr key={s.id}>
                        <td>{s.stage || '—'}</td>
                        <td className="stage-description-cell">
                          {s.description || '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {s.days || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalDays > 0 && (
                  <p
                    style={{
                      marginTop: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}
                  >
                    Total estimated duration:{' '}
                    <span>{totalDays} days</span>
                  </p>
                )}
              </>
            )}
          </section>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div
            style={{
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '1px solid var(--gray-200)',
            }}
          >
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: 700,
                marginBottom: '8px',
                color: 'var(--gray-700)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Notes
            </h4>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--gray-600)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {invoice.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
