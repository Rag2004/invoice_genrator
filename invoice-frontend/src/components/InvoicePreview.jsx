// // src/components/InvoicePreview.jsx
// import React from 'react'
// import { formatCurrency } from '../utils/format'

// export default function InvoicePreview({ invoice = {}, projectData = {}, clientData = {} }) {
//   // prefer DB values
//   const packageName = projectData?.package || '-'
//   const baseRate = Number(projectData?.hourlyRate ?? invoice.baseHourlyRate ?? 0)
//   const serviceFeePct = Number(projectData?.serviceFeePct ?? invoice.serviceFeePct ?? 0)
//   // GST: allow project-defined or default 18% if not provided (adjust as needed)
//   const gstPct = (typeof projectData?.gstPct !== 'undefined') ? Number(projectData.gstPct) : 18

//   // Prepare rows with computed rate/amount (rate might be stored on item or computed)
//   const rows = (invoice.items || []).map(it => {
//     const factor = Number(it.factor || 1)
//     const hours = Number(it.hours || 0)
//     // If UI allowed manual override it will be in it.rate; otherwise compute from baseRate * factor
//     const rate = typeof it.rate !== 'undefined' && it._manualRate ? Number(it.rate || 0) : (baseRate * factor)
//     const amount = Math.round(hours * rate * 100) / 100
//     // some invoices show "Total Hours" (if there are day/hours splits) — for now equal to hours
//     const totalHours = hours
//     return { ...it, rate, amount, factor, hours, totalHours }
//   })

//   const subtotal = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
//   const gstAmount = Math.round(subtotal * (gstPct / 100) * 100) / 100
//   const clientBill = Math.round((subtotal + gstAmount) * 100) / 100
//   const serviceFeeAmount = Math.round(subtotal * (serviceFeePct / 100) * 100) / 100
//   const yourEarnings = Math.round((subtotal - serviceFeeAmount) * 100) / 100

//   return (
//     <div id="invoice-preview" style={{padding:12}}>
//       <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12}}>
//         <div>
//           <h3 style={{margin:0}}>Invoice Preview</h3>
//           <div style={{fontSize:12, color:'#6b7280'}}>{invoice.date}</div>
//         </div>

//         <div style={{textAlign:'right'}}>
//           <div style={{fontSize:12, color:'#6b7280'}}>Consultant</div>
//           <div style={{fontWeight:700}}>{invoice.consultantName}</div>
//           <div style={{marginTop:8, fontSize:12, color:'#374151'}}>Invoice #: <span style={{fontWeight:600}}>{invoice.invoiceNumber || '—'}</span></div>
//         </div>
//       </div>

//       {/* Platform / Package details (DB sourced) */}
//       <div style={{display:'flex', justifyContent:'space-between', marginBottom:12}}>
//         <div>
//           <div style={{fontSize:13, color:'#6b7280'}}>Project</div>
//           <div style={{fontWeight:700}}>{invoice.projectCode} — {invoice.clientCode}</div>
//           <div style={{fontSize:13, color:'#6b7280'}}>Client</div>
//           <div style={{fontWeight:600}}>{clientData?.name || '-'}</div>
//           <div style={{fontSize:12, color:'#6b7280', marginTop:6}}>{clientData?.billingAddress || ''}</div>
//         </div>

//         <div style={{textAlign:'right'}}>
//           <div style={{fontSize:13, color:'#6b7280'}}>Package</div>
//           <div style={{fontWeight:700}}>{packageName}</div>

//           <div style={{marginTop:8, fontSize:13, color:'#6b7280'}}>Platform Details</div>
//           <div style={{fontSize:13}}><strong>Hourly Rate:</strong> {formatCurrency(baseRate)}</div>
//           <div style={{fontSize:13}}><strong>Service Fee:</strong> {serviceFeePct}%</div>
//           <div style={{fontSize:13}}><strong>GST:</strong> {gstPct}%</div>
//         </div>
//       </div>

//       {/* Items table */}
//       <div style={{overflowX:'auto', marginBottom:12}}>
//         <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
//           <thead>
//             <tr style={{textAlign:'left', color:'#6b7280', borderBottom:'1px solid #e6e6e6'}}>
//               <th style={{padding:'8px 6px'}}>Team Member</th>
//               <th style={{padding:'8px 6px'}}>Consultation Mode</th>
//               <th style={{padding:'8px 6px'}}>Hours</th>
//               <th style={{padding:'8px 6px'}}>Total Hours</th>
//               <th style={{padding:'8px 6px'}}>Factor</th>
//               <th style={{padding:'8px 6px'}}>Rate</th>
//               <th style={{padding:'8px 6px', textAlign:'right'}}>Price</th>
//             </tr>
//           </thead>
//           <tbody>
//             {rows.map((r, idx) => (
//               <tr key={r.id || idx} style={{borderBottom:'1px solid #f3f4f6'}}>
//                 <td style={{padding:'8px 6px'}}>{r.name || '-'}</td>
//                 <td style={{padding:'8px 6px'}}>{r.mode || '-'}</td>
//                 <td style={{padding:'8px 6px'}}>{r.hours}</td>
//                 <td style={{padding:'8px 6px'}}>{r.totalHours}</td>
//                 <td style={{padding:'8px 6px'}}>{r.factor}</td>
//                 <td style={{padding:'8px 6px'}}>{formatCurrency(r.rate)}</td>
//                 <td style={{padding:'8px 6px', textAlign:'right'}}>{formatCurrency(r.amount)}</td>
//               </tr>
//             ))}

//             {rows.length === 0 && (
//               <tr>
//                 <td colSpan={7} style={{padding:12, color:'#6b7280'}}>No team members added</td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Summary block like your screenshot */}
//       <div style={{display:'flex', gap:20, justifyContent:'space-between', alignItems:'flex-start'}}>
//         <div style={{flex:'1 1 60%'}}>
//           <div style={{fontSize:13, color:'#6b7280'}}>Notes:</div>
//           <div style={{marginTop:8, background:'#f8fafc', padding:8, borderRadius:6}}>{invoice.notes || '-'}</div>
//         </div>

//         <div style={{width:320}}>
//           <div style={{display:'flex', justifyContent:'space-between', padding:'6px 0'}}><div>Subtotal:</div><div>{formatCurrency(subtotal)}</div></div>
//           <div style={{display:'flex', justifyContent:'space-between', padding:'6px 0'}}><div>GST ({gstPct}%):</div><div>{formatCurrency(gstAmount)}</div></div>
//           <div style={{display:'flex', justifyContent:'space-between', padding:'8px 0', fontWeight:700, fontSize:16}}><div>Client Bill (incl. GST):</div><div>{formatCurrency(clientBill)}</div></div>

//           <div style={{height:12}} />

//           <div style={{display:'flex', justifyContent:'space-between', padding:'6px 0', color:'#6b7280'}}><div>Service Fee ({serviceFeePct}%):</div><div>{formatCurrency(serviceFeeAmount)}</div></div>
//           <div style={{display:'flex', justifyContent:'space-between', padding:'8px 0', fontWeight:700, fontSize:15}}><div>Your Earnings (post service fee):</div><div>{formatCurrency(yourEarnings)}</div></div>
//         </div>
//       </div>
//     </div>
//   )
// }
// src/components/InvoicePreview.jsx
// src/components/InvoicePreview.jsx
// src/components/InvoicePreview.jsx
import React from 'react';

export default function InvoicePreview({ invoice = {}, clientData, projectData }) {
  
  const formatCurrency = (amount) => {
    return `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const team = invoice.items || [];
  const subtotal = invoice.subtotal || 0;
  const gst = subtotal * 0.18;
  const totalWithGst = subtotal + gst;
  const serviceFee = ((invoice.serviceFeePct || 0) / 100) * subtotal;
  const earnings = subtotal - serviceFee;

  const clientName = clientData?.name || projectData?.clientName || 'Client';
  const projectName = projectData?.name || invoice.projectCode || 'Project';

  return (
    <div className="invoice-sheet">
      {/* Header with gradient */}
      <div className="invoice-header">
        <div className="invoice-header-top">
          <h3 className="invoice-title">Invoice Preview</h3>
          <div className="invoice-date">{formatDate(invoice.date)}</div>
        </div>
        <p className="invoice-subtitle" style={{ margin: 0, fontSize: '0.938rem' }}>
          {invoice.consultantName || 'Consultant Name'}
        </p>
      </div>

      {/* Body */}
      <div className="invoice-body">
        {/* Meta Information */}
        <div className="invoice-meta">
          <div className="invoice-meta-section">
            <h4>Project Details</h4>
            <p className="company-name">
              {invoice.projectCode || '—'} — {invoice.clientCode || '—'}
            </p>
            <p style={{ fontWeight: 600, marginBottom: '4px' }}>{clientName}</p>
            <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', lineHeight: 1.5 }}>
              {invoice.billingAddress || 'No address provided'}
            </p>
          </div>

          <div className="invoice-meta-section">
            <h4>Invoice Information</h4>
            <p>
              <strong>Invoice #:</strong>{' '}
              {invoice.invoiceNumber || '—'}
            </p>
            <p><strong>Date:</strong> {formatDate(invoice.date)}</p>
            <p><strong>Consultant:</strong> {invoice.consultantName || '—'}</p>
          </div>
        </div>

        {/* Team Table */}
        {team.length > 0 ? (
          <table className="invoice-table">
            <thead>
              <tr>
                <th>TEAM MEMBER</th>
                <th>MODE</th>
                <th style={{ textAlign: 'center' }}>HOURS</th>
                <th style={{ textAlign: 'center' }}>FACTOR</th>
                <th className="text-right">RATE</th>
                <th className="text-right">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {team.map((member, index) => (
                <tr key={member.id || index}>
                  <td>{member.name || '—'}</td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: member.mode === 'Online' ? '#dbeafe' : 
                                 member.mode === 'Offline' ? '#fef3c7' : '#e9d5ff',
                      color: member.mode === 'Online' ? '#1e40af' : 
                             member.mode === 'Offline' ? '#92400e' : '#6b21a8'
                    }}>
                      {member.mode || 'Online'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{member.hours || 0}</td>
                  <td style={{ textAlign: 'center' }}>{member.factor || 1}</td>
                  <td className="text-right">{formatCurrency(member.rate)}</td>
                  <td className="text-right" style={{ fontWeight: 700 }}>
                    {formatCurrency(member.amount || ((member.hours || 0) * (member.rate || 0)))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="muted" style={{ textAlign: 'center', padding: '32px', background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
            No team members added yet
          </div>
        )}

        {/* Totals */}
        {team.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ 
              maxWidth: '400px', 
              marginLeft: 'auto',
              padding: '20px',
              background: 'var(--gray-50)',
              borderRadius: 'var(--radius)'
            }}>
              <div className="summary-line subtotal">
                <span>Subtotal:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
              </div>

              <div className="summary-line gst">
                <span>GST (18%):</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(gst)}</span>
              </div>

              <div className="summary-line total" style={{
                borderTop: '3px solid var(--gray-900)',
                marginTop: '12px',
                paddingTop: '12px'
              }}>
                <span>Total (incl. GST):</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {formatCurrency(totalWithGst)}
                </span>
              </div>
            </div>

            {/* Earnings Box */}
            <div className="earnings-box" style={{ marginTop: '20px' }}>
              <div className="service-fee" style={{ marginBottom: '8px' }}>
                Service Fee ({invoice.serviceFeePct || 0}%): {formatCurrency(serviceFee)}
              </div>
              <div className="earnings" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>
                Your Earnings: {formatCurrency(earnings)}
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div style={{ 
            marginTop: '32px', 
            paddingTop: '24px', 
            borderTop: '2px solid var(--gray-200)' 
          }}>
            <h4 style={{ 
              fontSize: '0.875rem', 
              fontWeight: 700, 
              marginBottom: '8px', 
              color: 'var(--gray-700)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Notes
            </h4>
            <p style={{ 
              fontSize: '0.875rem', 
              color: 'var(--gray-600)', 
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              margin: 0
            }}>
              {invoice.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}