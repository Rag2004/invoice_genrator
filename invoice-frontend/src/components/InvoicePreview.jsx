
// import React from 'react';

// // Local helper – same idea as in App.jsx
// function percentToFraction(v) {
//   const n = Number(v || 0);
//   if (isNaN(n)) return 0;
//   return n > 1 ? n / 100 : n;
// }

// export default function InvoicePreview({ invoice = {}, projectData, clientData }) {
//   const {
//     projectCode,
//     clientCode,
//     consultantName,
//     date,
//     billingAddress,
//     items = [],
//     stages = [],
//     notes = '',
//     subtotal: rawSubtotal,
//     gst: rawGst,
//     total: rawTotal,
//     serviceFeePct = 0,
//     invoiceNumber,
//   } = invoice;

//   // ----- Numbers & calculations -----
//   const subtotal = Number(rawSubtotal || 0);
//   const gstRate = 0.18;
//   const gst = rawGst != null ? Number(rawGst) : subtotal * gstRate;
//   const total = rawTotal != null ? Number(rawTotal) : subtotal + gst;

//   const svcFraction = percentToFraction(serviceFeePct);
//   const serviceFeeAmount = Math.round(total * svcFraction);
//   const consultantEarnings = Math.max(total - serviceFeeAmount, 0);

//   const formatMoney = (v) =>
//     `₹${Number(v || 0).toLocaleString('en-IN', {
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 2,
//     })}`;

//   const safeDate = date || new Date().toISOString().slice(0, 10);

//   const projectName = projectData?.name || projectData?.projectName || '';
//   const clientName = clientData?.name || clientData?.clientName || '';

//   // Total days from stages (optional helper)
//   const totalStageDays = stages.reduce(
//     (sum, s) => sum + (Number(s.days || 0) || 0),
//     0
//   );

//   return (
//     <div className="invoice-sheet">
//       {/* HEADER */}
//       <header className="invoice-header">
//         <div className="invoice-header-top">
//           <h2 className="invoice-title">Tax Invoice</h2>
//           <div className="invoice-date">Date: {safeDate}</div>
//         </div>
//         <p className="invoice-subtitle">
//           {consultantName || 'Consultant Name'}
//         </p>
//       </header>

//       {/* BODY */}
//       <div className="invoice-body">
//         {/* Meta blocks */}
//         <section className="invoice-meta">
//           <div className="invoice-meta-section">
//             <h4>Project Details</h4>
//             <p>
//               <strong>Project Code:</strong> {projectCode || '—'}
//             </p>
//             {projectName && (
//               <p>
//                 <strong>Project:</strong> {projectName}
//               </p>
//             )}
//             <p>
//               <strong>Client Code:</strong> {clientCode || '—'}
//             </p>
//             {clientName && (
//               <p>
//                 <strong>Client:</strong> {clientName}
//               </p>
//             )}
//             {billingAddress && (
//               <p>
//                 <strong>Billing Address:</strong>
//                 <br />
//                 {billingAddress}
//               </p>
//             )}
//           </div>

//           <div className="invoice-meta-section">
//             <h4>Invoice Information</h4>
//             <p>
//               <strong>Invoice #:</strong> {invoiceNumber || '—'}
//             </p>
//             <p>
//               <strong>Date:</strong> {safeDate}
//             </p>
//             <p>
//               <strong>Consultant:</strong> {consultantName || '—'}
//             </p>
//             <p>
//               <strong>Service Fee %:</strong>{' '}
//               {serviceFeePct ? `${serviceFeePct}%` : '—'}
//             </p>
//           </div>
//         </section>

//         {/* TEAM SUMMARY */}
//         <section className="invoice-section">
//           <div className="invoice-section-header">
//             <h4 className="invoice-section-title">Team Summary</h4>
//           </div>

//           <table className="invoice-table">
//             <thead>
//               <tr>
//                 <th>Team Member</th>
//                 <th>Mode</th>
//                 <th className="text-right">Hours</th>
//                 <th className="text-right">Rate (₹/hr)</th>
//                 <th className="text-right">Amount (₹)</th>
//               </tr>
//             </thead>
//             <tbody>
//               {items.length === 0 && (
//                 <tr>
//                   <td colSpan={5} className="muted">
//                     No team members added yet.
//                   </td>
//                 </tr>
//               )}
//               {items.map((it, idx) => (
//                 <tr key={it.id || idx}>
//                   <td>{it.name || '—'}</td>
//                   <td>
//                     {it.mode ? (
//                       <span
//                         className={`mode-pill ${
//                           it.mode.toLowerCase().includes('online')
//                             ? 'mode-online'
//                             : it.mode.toLowerCase().includes('offline')
//                             ? 'mode-offline'
//                             : ''
//                         }`}
//                       >
//                         {it.mode}
//                       </span>
//                     ) : (
//                       '—'
//                     )}
//                   </td>
//                   <td className="text-right">
//                     {Number(it.hours || 0).toLocaleString('en-IN')}
//                   </td>
//                   <td className="text-right">
//                     {formatMoney(it.rate || 0)}
//                   </td>
//                   <td className="text-right">
//                     {formatMoney(it.amount || 0)}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </section>

//         {/* STAGES TABLE (optional, above notes/summary) */}
//         {stages && stages.length > 0 && (
//           <section className="invoice-section">
//             <div className="invoice-section-header">
//               <h4 className="invoice-section-title">
//                 Stages, Inclusions &amp; Timeline
//               </h4>
//               {totalStageDays > 0 && (
//                 <span className="small-text">
//                   Total Days (all stages): {totalStageDays}
//                 </span>
//               )}
//             </div>

//             <table className="invoice-table stages-table">
//               <thead>
//                 <tr>
//                   <th style={{ width: '22%' }}>Stage</th>
//                   <th style={{ width: '60%' }}>Inclusions / Description</th>
//                   <th style={{ width: '18%' }} className="text-right">
//                     Days
//                   </th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {stages.map((s, idx) => (
//                   <tr key={s.id || idx}>
//                     <td>{s.stage || `Stage ${idx + 1}`}</td>
//                     <td className="stage-description-cell">
//                       {s.description || '—'}
//                     </td>
//                     <td className="text-right">
//                       {s.days ? Number(s.days).toLocaleString('en-IN') : '—'}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </section>
//         )}

//         {/* THIRD SECTION: NOTES + BILL SUMMARY + YOUR EARNINGS */}
//         <section className="invoice-section">
//           <div className="invoice-section-header">
//             <h4 className="invoice-section-title">Notes &amp; Summary</h4>
//           </div>

//           <div className="invoice-bottom-grid">
//             {/* LEFT: Notes */}
//             <div className="invoice-bottom-stages">
//               <div
//                 style={{
//                   border: '1px solid var(--gray-200)',
//                   borderRadius: 'var(--radius-lg)',
//                   padding: '16px',
//                   minHeight: '100px',
//                   background: '#ffffff',
//                 }}
//               >
//                 <div
//                   style={{
//                     fontSize: '0.8rem',
//                     textTransform: 'uppercase',
//                     letterSpacing: '0.06em',
//                     color: 'var(--gray-600)',
//                     marginBottom: '8px',
//                     fontWeight: 600,
//                   }}
//                 >
//                   Notes (Optional)
//                 </div>
//                 <div
//                   style={{
//                     fontSize: '0.9rem',
//                     color: 'var(--gray-800)',
//                     whiteSpace: 'pre-wrap',
//                   }}
//                 >
//                   {notes && notes.trim().length > 0
//                     ? notes
//                     : 'No additional notes.'}
//                 </div>
//               </div>
//             </div>

//             {/* RIGHT: Bill summary + internal earnings box */}
//             <div className="invoice-bottom-totals">
//               <div className="invoice-totals-card">
//                 {/* Bill summary visible to client */}
//                 <div className="summary-line subtotal">
//                   <span>Subtotal</span>
//                   <span>{formatMoney(subtotal)}</span>
//                 </div>
//                 <div className="summary-line gst">
//                   <span>GST (18%)</span>
//                   <span>{formatMoney(gst)}</span>
//                 </div>
//                 <div className="summary-line total">
//                   <span>Total Amount</span>
//                   <span className="summary-total-amount">
//                     {formatMoney(total)}
//                   </span>
//                 </div>

//                 {/* Internal-only earnings box (hidden on print / client PDF) */}
//                 <div className="earnings-box" style={{ marginTop: '18px' }}>
//                   <div className="service-fee">
//                     Platform / Service Fee ({serviceFeePct || 0}
//                     %): <strong>{formatMoney(serviceFeeAmount)}</strong>
//                   </div>
//                   <div className="earnings">
//                     Your Earnings:{' '}
//                     <span>{formatMoney(consultantEarnings)}</span>
//                   </div>
//                   <div
//                     style={{
//                       fontSize: '0.75rem',
//                       color: 'var(--gray-500)',
//                       marginTop: '4px',
//                     }}
//                   >
//                     (Shown only to you; hidden in client PDFs / printouts.)
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </section>
//       </div>
//     </div>
//   );
// }
import React from 'react';

// Local helper – same idea as in App.jsx
function percentToFraction(v) {
  const n = Number(v || 0);
  if (isNaN(n)) return 0;
  return n > 1 ? n / 100 : n;
}

export default function InvoicePreview({ invoice = {}, projectData, clientData }) {
  const {
    projectCode,
    clientCode,
    consultantName,
    date,
    billingAddress,
    items = [],
    stages = [],
    notes = '',
    subtotal: rawSubtotal,
    gst: rawGst,
    total: rawTotal,
    serviceFeePct = 0,
    invoiceNumber,
  } = invoice;

  // ----- Numbers & calculations -----
  const subtotal = Number(rawSubtotal || 0);
  const gstRate = 0.18;
  const gst = rawGst != null ? Number(rawGst) : subtotal * gstRate;
  const total = rawTotal != null ? Number(rawTotal) : subtotal + gst;

  const svcFraction = percentToFraction(serviceFeePct);
  const serviceFeeAmount = Math.round(total * svcFraction);
  const consultantEarnings = Math.max(total - serviceFeeAmount, 0);

  const formatMoney = (v) =>
    `₹${Number(v || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  const safeDate = date || new Date().toISOString().slice(0, 10);

  const projectName = projectData?.name || projectData?.projectName || '';
  const clientName = clientData?.name || clientData?.clientName || '';

  // Calculate hours distribution per stage
  const calculateHoursDistribution = () => {
    if (!stages || stages.length === 0) return null;
    
    const distribution = {};
    
    stages.forEach((stage, stageIdx) => {
      const stageName = stage.stage || `Stage ${stageIdx + 1}`;
      distribution[stageName] = {};
      
      items.forEach(item => {
        const memberName = item.name || 'Unknown';
        const hours = item.stageHours?.[stageIdx] || 0;
        
        if (hours > 0) {
          if (!distribution[stageName][memberName]) {
            distribution[stageName][memberName] = 0;
          }
          distribution[stageName][memberName] += Number(hours);
        }
      });
    });
    
    return distribution;
  };

  const hoursDistribution = calculateHoursDistribution();

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      background: '#fff',
      padding: '40px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      color: '#1a1a1a',
      lineHeight: '1.6'
    }}>
      
      {/* HEADER */}
      <header style={{
        borderBottom: '3px solid #2563eb',
        paddingBottom: '24px',
        marginBottom: '32px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '12px'
        }}>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              margin: '0 0 8px 0',
              color: '#1a1a1a'
            }}>TAX INVOICE</h1>
            <p style={{
              fontSize: '18px',
              fontWeight: '500',
              margin: 0,
              color: '#4b5563'
            }}>{consultantName || 'Consultant Name'}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#2563eb',
              marginBottom: '4px'
            }}>
              {invoiceNumber || 'DRAFT'}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Date: {safeDate}
            </div>
          </div>
        </div>
      </header>

      {/* PROJECT & CLIENT INFO */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        marginBottom: '32px',
        padding: '20px',
        background: '#f9fafb',
        borderRadius: '8px'
      }}>
        <div>
          <h3 style={{
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#6b7280',
            fontWeight: '600',
            marginBottom: '12px'
          }}>Project Details</h3>
          <p style={{ margin: '6px 0' }}>
            <strong>Project Code:</strong> {projectCode || '—'}
          </p>
          {projectName && <p style={{ margin: '6px 0' }}><strong>Project:</strong> {projectName}</p>}
          <p style={{ margin: '6px 0' }}>
            <strong>Client Code:</strong> {clientCode || '—'}
          </p>
          {clientName && <p style={{ margin: '6px 0' }}><strong>Client:</strong> {clientName}</p>}
        </div>
        
        <div>
          <h3 style={{
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#6b7280',
            fontWeight: '600',
            marginBottom: '12px'
          }}>Billing Address</h3>
          <p style={{ 
            margin: 0, 
            whiteSpace: 'pre-line',
            lineHeight: '1.6'
          }}>
            {billingAddress || '—'}
          </p>
        </div>
      </section>

      {/* TEAM SUMMARY WITH BILLING */}
      <section style={{ marginBottom: '32px' }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1a1a1a',
          marginBottom: '16px',
          paddingBottom: '8px',
          borderBottom: '2px solid #e5e7eb'
        }}>Team Summary & Billing</h3>
        
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '16px'
        }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: '#4b5563',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                border: '1px solid #e5e7eb'
              }}>Team Member</th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: '#4b5563',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                border: '1px solid #e5e7eb'
              }}>Mode</th>
              <th style={{
                padding: '12px',
                textAlign: 'right',
                fontSize: '12px',
                fontWeight: '600',
                color: '#4b5563',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                border: '1px solid #e5e7eb'
              }}>Hours</th>
              <th style={{
                padding: '12px',
                textAlign: 'right',
                fontSize: '12px',
                fontWeight: '600',
                color: '#4b5563',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                border: '1px solid #e5e7eb'
              }}>Rate (₹/hr)</th>
              <th style={{
                padding: '12px',
                textAlign: 'right',
                fontSize: '12px',
                fontWeight: '600',
                color: '#4b5563',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                border: '1px solid #e5e7eb'
              }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: '#9ca3af',
                  border: '1px solid #e5e7eb'
                }}>
                  No team members added yet.
                </td>
              </tr>
            )}
            {items.map((it, idx) => (
              <tr key={it.id || idx}>
                <td style={{
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  fontWeight: '500'
                }}>{it.name || '—'}</td>
                <td style={{
                  padding: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '500',
                    background: it.mode?.toLowerCase().includes('online') ? '#dbeafe' : 
                               it.mode?.toLowerCase().includes('offline') ? '#fef3c7' : '#f3f4f6',
                    color: it.mode?.toLowerCase().includes('online') ? '#1e40af' : 
                           it.mode?.toLowerCase().includes('offline') ? '#92400e' : '#4b5563'
                  }}>
                    {it.mode || '—'}
                  </span>
                </td>
                <td style={{
                  padding: '12px',
                  textAlign: 'right',
                  border: '1px solid #e5e7eb'
                }}>
                  {Number(it.hours || 0).toLocaleString('en-IN')}
                </td>
                <td style={{
                  padding: '12px',
                  textAlign: 'right',
                  border: '1px solid #e5e7eb'
                }}>
                  {formatMoney(it.rate || 0)}
                </td>
                <td style={{
                  padding: '12px',
                  textAlign: 'right',
                  border: '1px solid #e5e7eb',
                  fontWeight: '600'
                }}>
                  {formatMoney(it.amount || 0)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f9fafb' }}>
              <td colSpan={4} style={{
                padding: '12px',
                textAlign: 'right',
                fontWeight: '600',
                border: '1px solid #e5e7eb'
              }}>Subtotal</td>
              <td style={{
                padding: '12px',
                textAlign: 'right',
                fontWeight: '700',
                border: '1px solid #e5e7eb',
                fontSize: '15px'
              }}>
                {formatMoney(subtotal)}
              </td>
            </tr>
            <tr style={{ background: '#f9fafb' }}>
              <td colSpan={4} style={{
                padding: '12px',
                textAlign: 'right',
                fontWeight: '600',
                border: '1px solid #e5e7eb'
              }}>GST (18%)</td>
              <td style={{
                padding: '12px',
                textAlign: 'right',
                fontWeight: '700',
                border: '1px solid #e5e7eb',
                fontSize: '15px'
              }}>
                {formatMoney(gst)}
              </td>
            </tr>
            <tr style={{ background: '#2563eb', color: '#fff' }}>
              <td colSpan={4} style={{
                padding: '12px',
                textAlign: 'right',
                fontWeight: '700',
                border: '1px solid #1e40af',
                fontSize: '16px'
              }}>Total Amount (incl. GST)</td>
              <td style={{
                padding: '12px',
                textAlign: 'right',
                fontWeight: '700',
                border: '1px solid #1e40af',
                fontSize: '18px'
              }}>
                {formatMoney(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* HOURS DISTRIBUTION BY STAGE */}
      {hoursDistribution && Object.keys(hoursDistribution).length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1a1a1a',
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '2px solid #e5e7eb'
          }}>Hours Distribution by Stage</h3>
          
          {Object.entries(hoursDistribution).map(([stageName, members]) => (
            <div key={stageName} style={{ marginBottom: '16px' }}>
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#4b5563',
                marginBottom: '8px'
              }}>{stageName}</h4>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: '8px'
              }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#6b7280',
                      border: '1px solid #e5e7eb'
                    }}>Team Member</th>
                    <th style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#6b7280',
                      border: '1px solid #e5e7eb'
                    }}>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(members).map(([memberName, hours]) => (
                    <tr key={memberName}>
                      <td style={{
                        padding: '8px 12px',
                        border: '1px solid #e5e7eb'
                      }}>{memberName}</td>
                      <td style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        border: '1px solid #e5e7eb',
                        fontWeight: '500'
                      }}>{Number(hours).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      )}

      {/* STAGES, INCLUSIONS & TIMELINE */}
      {stages && stages.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1a1a1a',
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '2px solid #e5e7eb'
          }}>Stages, Inclusions & Timeline</h3>
          
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#4b5563',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  border: '1px solid #e5e7eb',
                  width: '25%'
                }}>Stage</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#4b5563',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  border: '1px solid #e5e7eb',
                  width: '60%'
                }}>Inclusions / Description</th>
                <th style={{
                  padding: '12px',
                  textAlign: 'right',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#4b5563',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  border: '1px solid #e5e7eb',
                  width: '15%'
                }}>Days</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s, idx) => (
                <tr key={s.id || idx}>
                  <td style={{
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    fontWeight: '500',
                    verticalAlign: 'top'
                  }}>{s.stage || `Stage ${idx + 1}`}</td>
                  <td style={{
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    verticalAlign: 'top',
                    whiteSpace: 'pre-line'
                  }}>
                    {s.description || '—'}
                  </td>
                  <td style={{
                    padding: '12px',
                    textAlign: 'right',
                    border: '1px solid #e5e7eb',
                    fontWeight: '600',
                    verticalAlign: 'top'
                  }}>
                    {s.days ? Number(s.days).toLocaleString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* NOTES */}
      {notes && notes.trim().length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1a1a1a',
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '2px solid #e5e7eb'
          }}>Additional Notes</h3>
          <div style={{
            padding: '16px',
            background: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            whiteSpace: 'pre-wrap'
          }}>
            {notes}
          </div>
        </section>
      )}

      {/* INTERNAL EARNINGS BOX (hide on print with @media print) */}
      <section className="no-print" style={{
        marginTop: '32px',
        padding: '20px',
        background: '#fef3c7',
        border: '2px solid #fbbf24',
        borderRadius: '8px'
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#92400e',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>⚠️ Internal Use Only (Not visible to client)</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          fontSize: '14px',
          color: '#78350f'
        }}>
          <div>
            <strong>Service Fee ({serviceFeePct || 0}%):</strong> {formatMoney(serviceFeeAmount)}
          </div>
          <div style={{ textAlign: 'right' }}>
            <strong>Your Earnings:</strong> <span style={{ 
              fontSize: '18px', 
              fontWeight: '700', 
              color: '#15803d' 
            }}>{formatMoney(consultantEarnings)}</span>
          </div>
        </div>
        <div style={{
          marginTop: '8px',
          fontSize: '11px',
          color: '#92400e',
          fontStyle: 'italic'
        }}>
          This section will not appear in client PDFs or printouts.
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        marginTop: '48px',
        paddingTop: '24px',
        borderTop: '2px solid #e5e7eb',
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: '12px'
      }}>
        <p style={{ margin: '4px 0' }}>Thank you for your business!</p>
        <p style={{ margin: '4px 0' }}>For any queries, please contact {consultantName || 'us'}.</p>
      </footer>

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}