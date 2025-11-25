
// // // import React from 'react';
// // // import '../styles.css';
// // // import myLogo from '../assets/1.png';

// // // function formatINR(value) {
// // //   return new Intl.NumberFormat('en-IN', {
// // //     style: 'currency',
// // //     currency: 'INR',
// // //     maximumFractionDigits: 2,
// // //   }).format(Number(value || 0));
// // // }

// // // export default function InvoicePrint(props) {
// // //   const invoice = props?.invoice || {};
// // //   const projectData = props?.projectData || {};
// // //   const clientData = props?.clientData || {};

// // //   // ---- basic numbers ----
// // //   const subtotal = Number(invoice.subtotal || 0);
// // //   const gstAmount =
// // //     invoice.gst !== undefined && invoice.gst !== null
// // //       ? Number(invoice.gst)
// // //       : subtotal * 0.18;
// // //   const total =
// // //     invoice.total !== undefined && invoice.total !== null
// // //       ? Number(invoice.total)
// // //       : subtotal + gstAmount;

// // //   // ---- service fee calculations ----
// // //   const serviceFeePct = Number(invoice.serviceFeePct || 0);
// // //   const serviceFeeAmount = Number(invoice.serviceFeeAmount || 0);
// // //   const netEarnings = Number(invoice.netEarnings || 0);

// // //   // ---- top meta ----
// // //   const projectId =
// // //     projectData.projectCode ||
// // //     projectData.projectId ||
// // //     invoice.projectCode ||
// // //     '';

// // //   const clientId =
// // //     clientData.clientCode ||
// // //     clientData.clientId ||
// // //     invoice.clientCode ||
// // //     '';

// // //   const consultantName =
// // //     invoice.consultantName ||
// // //     projectData.consultantName ||
// // //     '';

// // //   const billingAddress =
// // //     invoice.billingAddress ||
// // //     clientData.billingAddress ||
// // //     '';

// // //   const invoiceDate = invoice.date || '';
// // //   const invoiceNo = invoice.invoiceNumber || '';

// // //   const items = invoice.items || [];
// // //   const stages = Array.isArray(invoice.stages) ? invoice.stages : [];

// // //   const totalStageDays = stages.reduce(
// // //     (sum, s) => sum + (Number(s.days || 0) || 0),
// // //     0
// // //   );

// // //   const hasNotes = !!(invoice.notes && invoice.notes.trim());

// // //   // Calculate hours distribution per stage
// // //   const calculateHoursDistribution = () => {
// // //     if (!stages || stages.length === 0) return null;
    
// // //     const distribution = {};
    
// // //     stages.forEach((stage, stageIdx) => {
// // //       const stageName = stage.stage || `Stage ${stageIdx + 1}`;
// // //       distribution[stageName] = {};
      
// // //       items.forEach(item => {
// // //         const memberName = item.name || 'Unknown';
// // //         const hours = item.stageHours?.[stageIdx] || 0;
        
// // //         if (hours > 0) {
// // //           if (!distribution[stageName][memberName]) {
// // //             distribution[stageName][memberName] = 0;
// // //           }
// // //           distribution[stageName][memberName] += Number(hours);
// // //         }
// // //       });
// // //     });
    
// // //     return distribution;
// // //   };

// // //   const hoursDistribution = calculateHoursDistribution();

// // //   return (
// // //     <div className="modern-invoice">
// // //       {/* ---------- TOP HEADER ---------- */}
// // //       <header className="mi-top-header">
// // //         <div>
// // //           <div className="mi-title">Invoice</div>
// // //           {consultantName && (
// // //             <div className="mi-subtitle">{consultantName}</div>
// // //           )}
// // //         </div>

// // //         <div className="mi-top-right">
// // //           {invoiceDate && (
// // //             <div className="mi-top-date">{invoiceDate}</div>
// // //           )}
// // //           <img src={myLogo} alt="hourlx" className="mi-logo" />
// // //         </div>
// // //       </header>

// // //       <hr className="mi-divider" />

// // //       {/* ---------- PROJECT & INVOICE INFO ---------- */}
// // //       <section className="mi-section">
// // //         <div className="mi-info-grid">
// // //           <div className="mi-info-col">
// // //             <div className="mi-section-label">PROJECT DETAILS</div>
// // //             <div className="mi-info-line">
// // //               <span className="mi-info-key">Project ID / Client ID</span>
// // //               <span className="mi-info-value">
// // //                 {projectId || '—'}
// // //                 {clientId ? ` / ${clientId}` : ''}
// // //               </span>
// // //             </div>

// // //             {projectData.projectName && (
// // //               <div className="mi-info-line">
// // //                 <span className="mi-info-key">Project</span>
// // //                 <span className="mi-info-value">
// // //                   {projectData.projectName}
// // //                 </span>
// // //               </div>
// // //             )}

// // //             {billingAddress && (
// // //               <div className="mi-info-line">
// // //                 <span className="mi-info-key">Billing Address</span>
// // //                 <span className="mi-info-value mi-multiline">
// // //                   {billingAddress.split('\n').map((line, i) => (
// // //                     <span key={i}>
// // //                       {line}
// // //                       <br />
// // //                     </span>
// // //                   ))}
// // //                 </span>
// // //               </div>
// // //             )}
// // //           </div>

// // //           <div className="mi-info-col">
// // //   <div className="mi-section-label">INVOICE INFORMATION</div>
// // //   <div className="mi-info-line">
// // //     <span className="mi-info-key">Invoice #</span>
// // //     <span className="mi-info-value">
// // //       {invoiceNo || 'Draft'}
// // //     </span>
// // //   </div>
// // //   <div className="mi-info-line">
// // //     <span className="mi-info-key">Date</span>
// // //     <span className="mi-info-value">
// // //       {invoiceDate || '—'}
// // //     </span>
// // //   </div>
// // //   <div className="mi-info-line">
// // //     <span className="mi-info-key">Consultant</span>
// // //     <span className="mi-info-value">
// // //       {consultantName || '—'}
// // //     </span>
// // //   </div>
// // //   <div className="mi-info-line">
// // //     <span className="mi-info-key">Consultant ID</span>
// // //     <span className="mi-info-value">
// // //       {invoice.consultantId || '—'}
// // //     </span>
// // //   </div>
// // //   <div className="mi-info-line">
// // //     <span className="mi-info-key">Base Hourly Rate</span>
// // //     <span className="mi-info-value">
// // //       {formatINR(invoice.baseHourlyRate || 0)}
// // //     </span>
// // //   </div>
// // // </div>
// // //         </div>
// // //       </section>

// // //       {/* ---------- TEAM SUMMARY WITH COMPLETE BILLING ---------- */}
// // //       <section className="mi-section">
// // //         <div className="mi-section-label">TEAM SUMMARY &amp; BILLING</div>

// // //         <table className="mi-team-table mi-complete-bill-table">
// // //           <thead>
// // //             <tr>
// // //               <th>Team Member</th>
// // //               <th>Mode</th>
// // //               <th className="mi-col-number">Hours</th>
// // //               <th className="mi-col-number">Rate</th>
// // //               <th className="mi-col-number">Amount</th>
// // //             </tr>
// // //           </thead>
// // //           <tbody>
// // //             {items.length === 0 && (
// // //               <tr>
// // //                 <td colSpan={5} className="mi-empty-row">
// // //                   No team members added yet.
// // //                 </td>
// // //               </tr>
// // //             )}

// // //             {items.map((item, idx) => (
// // //               <tr key={idx}>
// // //                 <td>{item.name || ''}</td>
// // //                 <td>
// // //                   <span className={`mi-mode-badge ${
// // //                     item.mode?.toLowerCase().includes('online') ? 'mi-mode-online' :
// // //                     item.mode?.toLowerCase().includes('offline') ? 'mi-mode-offline' : ''
// // //                   }`}>
// // //                     {item.mode || '—'}
// // //                   </span>
// // //                 </td>
// // //                 <td className="mi-col-number">
// // //                   {Number(item.hours || 0).toLocaleString('en-IN')}
// // //                 </td>
// // //                 <td className="mi-col-number">
// // //                   {formatINR(item.rate || 0)}
// // //                 </td>
// // //                 <td className="mi-col-number">
// // //                   {formatINR(item.amount || 0)}
// // //                 </td>
// // //               </tr>
// // //             ))}
// // //           </tbody>
          
// // //           {/* BILLING FOOTER - SUBTOTAL, GST, TOTAL */}
// // //           <tfoot>
// // //             <tr className="mi-bill-subtotal-row">
// // //               <td colSpan={4} className="mi-bill-label">Subtotal</td>
// // //               <td className="mi-col-number mi-bill-value">{formatINR(subtotal)}</td>
// // //             </tr>
// // //             <tr className="mi-bill-gst-row">
// // //               <td colSpan={4} className="mi-bill-label">GST (18%)</td>
// // //               <td className="mi-col-number mi-bill-value">{formatINR(gstAmount)}</td>
// // //             </tr>
// // //             <tr className="mi-bill-total-row">
// // //               <td colSpan={4} className="mi-bill-label">Total Amount (incl. GST)</td>
// // //               <td className="mi-col-number mi-bill-total-value">{formatINR(total)}</td>
// // //             </tr>
// // //           </tfoot>
// // //         </table>
// // //       </section>

// // //       {/* ---------- HOURS DISTRIBUTION BY STAGE ---------- */}
// // //       {hoursDistribution && Object.keys(hoursDistribution).length > 0 && (
// // //         <section className="mi-section">
// // //           <div className="mi-section-label">HOURS DISTRIBUTION BY STAGE</div>
          
// // //           {Object.entries(hoursDistribution).map(([stageName, members]) => {
// // //             // Only show stages that have hours
// // //             const hasHours = Object.values(members).some(h => h > 0);
// // //             if (!hasHours) return null;

// // //             return (
// // //               <div key={stageName} className="mi-hours-stage-block">
// // //                 <div className="mi-hours-stage-name">{stageName}</div>
// // //                 <table className="mi-hours-table">
// // //                   <thead>
// // //                     <tr>
// // //                       <th>Team Member</th>
// // //                       <th className="mi-col-number">Hours</th>
// // //                     </tr>
// // //                   </thead>
// // //                   <tbody>
// // //                     {Object.entries(members).map(([memberName, hours]) => (
// // //                       <tr key={memberName}>
// // //                         <td>{memberName}</td>
// // //                         <td className="mi-col-number">
// // //                           {Number(hours).toLocaleString('en-IN')}
// // //                         </td>
// // //                       </tr>
// // //                     ))}
// // //                   </tbody>
// // //                 </table>
// // //               </div>
// // //             );
// // //           })}
// // //         </section>
// // //       )}

// // //       {/* ---------- STAGES / INCLUSIONS / TIMELINE ---------- */}
// // //       {stages.length > 0 && (
// // //         <section className="mi-section">
// // //           <div className="mi-section-label">
// // //             STAGES, INCLUSIONS &amp; TIMELINE
// // //           </div>

// // //           <table className="mi-stages-table">
// // //             <thead>
// // //               <tr>
// // //                 <th style={{ width: '25%' }}>Stage</th>
// // //                 <th style={{ width: '60%' }}>Inclusions / Description</th>
// // //                 <th className="mi-col-number" style={{ width: '15%' }}>Days</th>
// // //               </tr>
// // //             </thead>
// // //             <tbody>
// // //               {stages.map((s, idx) => {
// // //                 const description = s.description || 
// // //                   (s.subStages || [])
// // //                     .map((sub) => sub.label || sub.name)
// // //                     .filter(Boolean)
// // //                     .join(', ') ||
// // //                   '—';

// // //                 return (
// // //                   <tr key={idx}>
// // //                     <td>{s.stage || `Stage ${idx + 1}`}</td>
// // //                     <td className="mi-stage-description">{description}</td>
// // //                     <td className="mi-col-number">
// // //                       {s.days ? Number(s.days).toLocaleString('en-IN') : '—'}
// // //                     </td>
// // //                   </tr>
// // //                 );
// // //               })}
// // //             </tbody>
// // //           </table>

// // //           {totalStageDays > 0 && (
// // //             <div className="mi-estimate-note">
// // //               Total estimated duration:{' '}
// // //               <strong>{totalStageDays} days</strong>
// // //             </div>
// // //           )}
// // //         </section>
// // //       )}

// // //       {/* ---------- NOTES ---------- */}
// // //       {(hasNotes || true) && (
// // //         <section className="mi-section">
// // //           <div className="mi-section-label">ADDITIONAL NOTES</div>
// // //           <div className="mi-notes-box">
// // //             {hasNotes ? (
// // //               invoice.notes.split('\n').map((line, i) => (
// // //                 <p key={i}>{line || '\u00A0'}</p>
// // //               ))
// // //             ) : (
// // //               <p className="mi-notes-placeholder">
// // //                 Add inclusions, scope of work or special terms in the
// // //                 Notes section of the app.
// // //               </p>
// // //             )}
// // //           </div>
// // //         </section>
// // //       )}

// // //       {/* ---------- INTERNAL EARNINGS BOX (hidden on print) ---------- */}
// // //       <section className="mi-section consultant-only no-print">
// // //         <div className="mi-earnings-box">
// // //           <div className="mi-earnings-header">
// // //             ⚠️ INTERNAL USE ONLY (Not visible to client)
// // //           </div>
// // //           <div className="mi-earnings-grid">
// // //             <div className="mi-earnings-item">
// // //               <span className="mi-earnings-label">
// // //                 Service Fee ({serviceFeePct > 1 ? serviceFeePct : serviceFeePct * 100}%)
// // //               </span>
// // //               <span className="mi-earnings-value">
// // //                 {formatINR(serviceFeeAmount)}
// // //               </span>
// // //             </div>
// // //             <div className="mi-earnings-item mi-earnings-net">
// // //               <span className="mi-earnings-label">Your Net Earnings</span>
// // //               <span className="mi-earnings-value mi-earnings-highlight">
// // //                 {formatINR(netEarnings)}
// // //               </span>
// // //             </div>
// // //           </div>
// // //           <div className="mi-earnings-note">
// // //             This earnings information will not appear in client PDFs or printouts.
// // //           </div>
// // //         </div>
// // //       </section>

// // //       {/* ---------- FOOTER STRIP ---------- */}
// // //       <footer className="invoice-footer-strip">
// // //         <span className="invoice-footer-text">MOM auto-generated on</span>
// // //         <img src={myLogo} alt="hourlx" className="invoice-footer-logo" />
// // //       </footer>
// // //     </div>
// // //   );
// // // }
// // {/* STAGES, INCLUSIONS & TIMELINE - WITH SUBSTAGES */}
// // {stages && stages.length > 0 && (
// //   <section className="mi-stages-section">
// //     <div className="mi-stages-section-header">
// //       STAGES, INCLUSIONS &amp; TIMELINE
// //     </div>
    
// //     <table className="mi-stages-table">
// //       <thead>
// //         <tr>
// //           <th className="mi-stage-name-cell">Stage</th>
// //           <th className="mi-substages-cell">Sub-stages / Tasks</th>
// //           <th className="mi-days-cell">Days</th>
// //         </tr>
// //       </thead>
// //       <tbody>
// //         {stages.map((s, idx) => {
// //           const subStagesText = (s.subStages || [])
// //             .map((sub) => sub.label || sub.name)
// //             .filter(Boolean);
          
// //           return (
// //             <tr key={s.id || idx}>
// //               <td className="mi-stage-name-cell">
// //                 {s.stage || `Stage ${idx + 1}`}
// //               </td>
// //               <td className="mi-substages-cell">
// //                 {subStagesText.length > 0 ? (
// //                   <ul className="mi-substage-list">
// //                     {subStagesText.map((subStage, subIdx) => (
// //                       <li key={subIdx} className="mi-substage-item">
// //                         {subStage}
// //                       </li>
// //                     ))}
// //                   </ul>
// //                 ) : (
// //                   <span style={{ color: '#9ca3af' }}>
// //                     {s.description || '—'}
// //                   </span>
// //                 )}
// //               </td>
// //               <td className="mi-days-cell">
// //                 {s.days ? Number(s.days).toLocaleString('en-IN') : '—'}
// //               </td>
// //             </tr>
// //           );
// //         })}
// //       </tbody>
// //     </table>

// //     {totalStageDays > 0 && (
// //       <div className="mi-stages-footer">
// //         Total estimated duration: <strong>{totalStageDays} days</strong>
// //       </div>
// //     )}
// //   </section>
// // )}
// import React from 'react';

// function formatDate(value) {
//   if (!value) return '—';
//   try {
//     return new Date(value).toLocaleDateString('en-IN', {
//       day: '2-digit',
//       month: 'short',
//       year: 'numeric',
//     });
//   } catch {
//     return value;
//   }
// }

// function formatMoney(value, currencySymbol = '₹') {
//   if (value === null || value === undefined || value === '') return '—';
//   const num = Number(value);
//   if (Number.isNaN(num)) return String(value);
//   return `${currencySymbol} ${num.toLocaleString('en-IN', {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   })}`;
// }

// export default function InvoicePrint({
//   invoice,
//   projectData,
//   clientData,
//   teamSummaryRows,
//   stages,
//   totalStageDays = 0,
//   logoUrl,
//   companyName = 'Your Studio Name',
//   companyAddress,
//   companyGst,
//   companyEmail,
// }) {
//   // --- SAFETY LAYER: normalise all possibly-null props ---
//   const safeInvoice = invoice || {};
//   const safeProject = projectData || {};
//   const safeClient = clientData || {};

//   const safeTeamRows = (teamSummaryRows || []).filter(Boolean);
//   const safeStages = (stages || []).filter(Boolean);

//   // Basic invoice meta
//   const {
//     invoiceNumber,
//     invoiceDate,
//     projectCode,
//     clientCode,
//     platform,
//     currencySymbol = '₹',

//     // billing numbers
//     subtotal,
//     gstAmount,
//     gstLabel = 'GST',
//     total,

//     // extra info
//     billingCity,
//     billingCountry,
//     paymentTerms,
//     notes,
//     projectName,
//     clientName,
//     consultantName,
//     consultantAddress,
//     consultantGst,
//     consultantEmail,
//   } = safeInvoice;

//   const showTeam = safeTeamRows.length > 0;

//   return (
//     <div className="modern-invoice">
//       {/* ===== TOP HEADER ===== */}
//       <header className="mi-top-header">
//         <div>
//           <div className="mi-title">INVOICE</div>
//           {invoiceNumber && (
//             <div className="mi-subtitle">Invoice #{invoiceNumber}</div>
//           )}
//         </div>

//         <div className="mi-top-right">
//           <div className="mi-top-date">
//             {invoiceDate ? `Invoice Date: ${formatDate(invoiceDate)}` : null}
//           </div>
//           {logoUrl ? (
//             <img src={logoUrl} alt={companyName} className="mi-logo" />
//           ) : (
//             <div className="mi-subtitle">{companyName}</div>
//           )}
//         </div>
//       </header>

//       <hr className="mi-divider" />

//       {/* ===== PROJECT / CLIENT / CONSULTANT GRID ===== */}
//       <section className="mi-section">
//         <div className="mi-section-label">Project & Consultant Details</div>

//         <div className="mi-info-grid-card">
//           <div className="mi-info-grid">
//             {/* LEFT: Project & Client */}
//             <div className="mi-info-col">
//               {/* Project details */}
//               <div className="mi-info-line">
//                 <div className="mi-info-key">Project</div>
//                 <div className="mi-info-value">
//                   {safeProject.name || projectName || '—'}
//                 </div>
//               </div>

//               <div className="mi-info-line">
//                 <div className="mi-info-key">Project Code</div>
//                 <div className="mi-info-value">{projectCode || '—'}</div>
//               </div>

//               <div className="mi-info-line">
//                 <div className="mi-info-key">Platform</div>
//                 <div className="mi-info-value">
//                   {platform || safeProject.platform || '—'}
//                 </div>
//               </div>

//               {/* Client details */}
//               <div className="mi-info-line" style={{ marginTop: 8 }}>
//                 <div className="mi-info-key">Client</div>
//                 <div className="mi-info-value">
//                   {safeClient.name || clientName || '—'}
//                 </div>
//               </div>

//               <div className="mi-info-line">
//                 <div className="mi-info-key">Client Code</div>
//                 <div className="mi-info-value">{clientCode || '—'}</div>
//               </div>

//               <div className="mi-info-line">
//                 <div className="mi-info-key">Location</div>
//                 <div className="mi-info-value">
//                   {billingCity ||
//                     safeClient.city ||
//                     safeClient.location ||
//                     '—'}
//                   {billingCountry || safeClient.country
//                     ? `, ${billingCountry || safeClient.country}`
//                     : ''}
//                 </div>
//               </div>
//             </div>

//             {/* RIGHT: Consultant / Studio */}
//             <div className="mi-info-col mi-info-col-right">
//               <div className="mi-info-line">
//                 <div className="mi-info-key">Consultant</div>
//                 <div className="mi-info-value">
//                   {companyName || consultantName || '—'}
//                 </div>
//               </div>

//               <div className="mi-info-line">
//                 <div className="mi-info-key">Address</div>
//                 <div className="mi-info-value mi-multiline">
//                   {companyAddress || consultantAddress || '—'}
//                 </div>
//               </div>

//               <div className="mi-info-line">
//                 <div className="mi-info-key">GSTIN</div>
//                 <div className="mi-info-value">
//                   {companyGst || consultantGst || '—'}
//                 </div>
//               </div>

//               <div className="mi-info-line">
//                 <div className="mi-info-key">Email</div>
//                 <div className="mi-info-value">
//                   {companyEmail || consultantEmail || '—'}
//                 </div>
//               </div>

//               {paymentTerms && (
//                 <div className="mi-info-line" style={{ marginTop: 8 }}>
//                   <div className="mi-info-key">Payment Terms</div>
//                   <div className="mi-info-value mi-multiline">
//                     {paymentTerms}
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* ===== TEAM SUMMARY ===== */}
//       <section className="mi-section">
//         <div className="mi-section-label">Team & Hours</div>

//         <div className="mi-team-section-card">
//           {showTeam ? (
//             <table className="mi-team-table">
//               <thead>
//                 <tr>
//                   <th className="mi-team-col-name">Team Member</th>
//                   <th className="mi-team-col-role">Role</th>
//                   <th className="mi-team-col-mode">Mode</th>
//                   <th className="mi-team-col-hours mi-col-number">Hours</th>
//                   <th className="mi-team-col-rate mi-col-number">Rate</th>
//                   <th className="mi-team-col-amount mi-col-number">Amount</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {safeTeamRows.map((row, idx) => (
//                   <tr key={row.id || idx}>
//                     <td className="mi-team-col-name">
//                       {row?.name || row?.memberName || '—'}
//                     </td>
//                     <td className="mi-team-col-role">
//                       {row?.role || row?.designation || '—'}
//                     </td>
//                     <td className="mi-team-col-mode">
//                       {row?.modeLabel || row?.mode || '—'}
//                     </td>
//                     <td className="mi-team-col-hours mi-col-number">
//                       {row?.totalHours != null
//                         ? Number(row.totalHours).toLocaleString('en-IN', {
//                             maximumFractionDigits: 2,
//                           })
//                         : '—'}
//                     </td>
//                     <td className="mi-team-col-rate mi-col-number">
//                       {row?.rate != null
//                         ? formatMoney(row.rate, currencySymbol)
//                         : '—'}
//                     </td>
//                     <td className="mi-team-col-amount mi-col-number">
//                       {row?.amount != null
//                         ? formatMoney(row.amount, currencySymbol)
//                         : '—'}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           ) : (
//             <div className="mi-empty-row">No team members added yet.</div>
//           )}
//         </div>
//       </section>

//       {/* ===== STAGES, INCLUSIONS & TIMELINE ===== */}
//       {safeStages.length > 0 && (
//         <section className="mi-section">
//           <div className="mi-stages-section">
//             <div className="mi-stages-section-header">
//               STAGES, INCLUSIONS &amp; TIMELINE
//             </div>

//             <table className="mi-stages-table">
//               <thead>
//                 <tr>
//                   <th className="mi-stage-name-cell">Stage</th>
//                   <th className="mi-substages-cell">Sub-stages / Tasks</th>
//                   <th className="mi-days-cell">Days</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {safeStages.map((s, idx) => {
//                   const subStagesText = (s?.subStages || [])
//                     .map((sub) => sub?.label || sub?.name)
//                     .filter(Boolean);

//                   return (
//                     <tr key={s?.id || idx}>
//                       <td className="mi-stage-name-cell">
//                         {s?.stage || `Stage ${idx + 1}`}
//                       </td>
//                       <td className="mi-substages-cell">
//                         {subStagesText.length > 0 ? (
//                           <ul className="mi-substage-list">
//                             {subStagesText.map((subStage, subIdx) => (
//                               <li key={subIdx} className="mi-substage-item">
//                                 {subStage}
//                               </li>
//                             ))}
//                           </ul>
//                         ) : (
//                           <span style={{ color: '#9ca3af' }}>
//                             {s?.description || '—'}
//                           </span>
//                         )}
//                       </td>
//                       <td className="mi-days-cell">
//                         {s?.days
//                           ? Number(s.days).toLocaleString('en-IN')
//                           : '—'}
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>

//             {totalStageDays > 0 && (
//               <div className="mi-stages-footer">
//                 Total estimated duration:{' '}
//                 <strong>{totalStageDays} days</strong>
//               </div>
//             )}
//           </div>
//         </section>
//       )}

//       {/* ===== TOTALS / BILLING ===== */}
//       <section className="mi-section mi-billing-section">
//         <div className="mi-totals-section">
//           <div className="mi-totals-card">
//             <div className="mi-totals-row">
//               <span>Subtotal</span>
//               <span>{formatMoney(subtotal, currencySymbol)}</span>
//             </div>

//             <div className="mi-totals-row">
//               <span>{gstLabel}</span>
//               <span>{formatMoney(gstAmount, currencySymbol)}</span>
//             </div>

//             <div className="mi-totals-divider" />

//             <div className="mi-totals-row mi-totals-row-total">
//               <span>Total</span>
//               <span>{formatMoney(total, currencySymbol)}</span>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* ===== NOTES ===== */}
//       <section className="mi-section">
//         <div className="mi-section-label">Notes</div>
//         <div className="mi-notes-box">
//           {notes ? (
//             <p className="mi-multiline">{notes}</p>
//           ) : (
//             <p className="mi-notes-placeholder">
//               Add payment terms or other important notes here.
//             </p>
//           )}
//         </div>
//       </section>

//       {/* ===== FOOTER STRIP ===== */}
//       <div className="invoice-footer-strip">
//         <span className="invoice-footer-text">
//           Invoice auto-generated on hourlx
//         </span>
//       </div>
//     </div>
//   );
// }
import React from 'react';
import '../styles.css'; // fine to keep, App can also import this

function formatINR(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function InvoicePrint(props) {
  const invoice = props?.invoice || {};
  const projectData = props?.projectData || {};
  const clientData = props?.clientData || {};
  const logoUrl = props?.logoUrl || null; // <-- use prop instead of local file

  // ---- basic numbers ----
  const subtotal = Number(invoice.subtotal || 0);
  const gstAmount =
    invoice.gst !== undefined && invoice.gst !== null
      ? Number(invoice.gst)
      : subtotal * 0.18;
  const total =
    invoice.total !== undefined && invoice.total !== null
      ? Number(invoice.total)
      : subtotal + gstAmount;

  // ---- service fee calculations ----
  const serviceFeePct = Number(invoice.serviceFeePct || 0);
  const serviceFeeAmount = Number(invoice.serviceFeeAmount || 0);
  const netEarnings = Number(invoice.netEarnings || 0);

  // ---- top meta ----
  const projectId =
    projectData.projectCode ||
    projectData.projectId ||
    invoice.projectCode ||
    '';

  const clientId =
    clientData.clientCode ||
    clientData.clientId ||
    invoice.clientCode ||
    '';

  const consultantName =
    invoice.consultantName ||
    projectData.consultantName ||
    '';

  const billingAddress =
    invoice.billingAddress ||
    clientData.billingAddress ||
    '';

  const invoiceDate = invoice.date || '';
  const invoiceNo = invoice.invoiceNumber || '';

  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const stages = Array.isArray(invoice.stages) ? invoice.stages : [];

  const totalStageDays = stages.reduce(
    (sum, s) => sum + (Number(s?.days || 0) || 0),
    0
  );

  const hasNotes = !!(invoice.notes && invoice.notes.trim());

  // ---- hours distribution per stage ----
  const calculateHoursDistribution = () => {
    if (!stages || stages.length === 0) return null;

    const distribution = {};

    stages.forEach((stage, stageIdx) => {
      const stageName = stage?.stage || `Stage ${stageIdx + 1}`;
      distribution[stageName] = {};

      items.forEach((item) => {
        if (!item) return;
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
    <div className="modern-invoice">
      {/* ---------- TOP HEADER ---------- */}
      <header className="mi-top-header">
        <div>
          <div className="mi-title">Invoice Preview</div>
          {consultantName && (
            <div className="mi-subtitle">{consultantName}</div>
          )}
        </div>

        <div className="mi-top-right">
          {invoiceDate && (
            <div className="mi-top-date">{invoiceDate}</div>
          )}
          {logoUrl ? (
            <img src={logoUrl} alt="hourlx" className="mi-logo" />
          ) : (
            <div className="mi-subtitle">hourlx</div>
          )}
        </div>
      </header>

      <hr className="mi-divider" />

      {/* ---------- PROJECT & INVOICE INFO ---------- */}
      <section className="mi-section">
        <div className="mi-info-grid">
          <div className="mi-info-col">
            <div className="mi-section-label">PROJECT DETAILS</div>
            <div className="mi-info-line">
              <span className="mi-info-key">Project ID / Client ID</span>
              <span className="mi-info-value">
                {projectId || '—'}
                {clientId ? ` / ${clientId}` : ''}
              </span>
            </div>

            {projectData.projectName && (
              <div className="mi-info-line">
                <span className="mi-info-key">Project</span>
                <span className="mi-info-value">
                  {projectData.projectName}
                </span>
              </div>
            )}

            {billingAddress && (
              <div className="mi-info-line">
                <span className="mi-info-key">Billing Address</span>
                <span className="mi-info-value mi-multiline">
                  {billingAddress.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      <br />
                    </span>
                  ))}
                </span>
              </div>
            )}
          </div>

          <div className="mi-info-col">
            <div className="mi-section-label">INVOICE INFORMATION</div>
            <div className="mi-info-line">
              <span className="mi-info-key">Invoice #</span>
              <span className="mi-info-value">
                {invoiceNo || 'Draft'}
              </span>
            </div>
            <div className="mi-info-line">
              <span className="mi-info-key">Date</span>
              <span className="mi-info-value">
                {invoiceDate || '—'}
              </span>
            </div>
            <div className="mi-info-line">
              <span className="mi-info-key">Consultant</span>
              <span className="mi-info-value">
                {consultantName || '—'}
              </span>
            </div>
            <div className="mi-info-line">
              <span className="mi-info-key">Base Hourly Rate</span>
              <span className="mi-info-value">
                {formatINR(invoice.baseHourlyRate || 0)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- TEAM SUMMARY WITH COMPLETE BILLING ---------- */}
      <section className="mi-section">
        <div className="mi-section-label">TEAM SUMMARY &amp; BILLING</div>

        <table className="mi-team-table mi-complete-bill-table">
          <thead>
            <tr>
              <th>Team Member</th>
              <th>Mode</th>
              <th className="mi-col-number">Hours</th>
              <th className="mi-col-number">Rate</th>
              <th className="mi-col-number">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="mi-empty-row">
                  No team members added yet.
                </td>
              </tr>
            )}

            {items.map((item, idx) => (
              <tr key={idx}>
                <td>{item?.name || ''}</td>
                <td>
                  <span
                    className={`mi-mode-badge ${
                      item?.mode?.toLowerCase().includes('online')
                        ? 'mi-mode-online'
                        : item?.mode?.toLowerCase().includes('offline')
                        ? 'mi-mode-offline'
                        : ''
                    }`}
                  >
                    {item?.mode || '—'}
                  </span>
                </td>
                <td className="mi-col-number">
                  {Number(item?.hours || 0).toLocaleString('en-IN')}
                </td>
                <td className="mi-col-number">
                  {formatINR(item?.rate || 0)}
                </td>
                <td className="mi-col-number">
                  {formatINR(item?.amount || 0)}
                </td>
              </tr>
            ))}
          </tbody>

          {/* BILLING FOOTER - SUBTOTAL, GST, TOTAL */}
          <tfoot>
            <tr className="mi-bill-subtotal-row">
              <td colSpan={4} className="mi-bill-label">
                Subtotal
              </td>
              <td className="mi-col-number mi-bill-value">
                {formatINR(subtotal)}
              </td>
            </tr>
            <tr className="mi-bill-gst-row">
              <td colSpan={4} className="mi-bill-label">
                GST (18%)
              </td>
              <td className="mi-col-number mi-bill-value">
                {formatINR(gstAmount)}
              </td>
            </tr>
            <tr className="mi-bill-total-row">
              <td colSpan={4} className="mi-bill-label">
                Total Amount (incl. GST)
              </td>
              <td className="mi-col-number mi-bill-total-value">
                {formatINR(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* ---------- HOURS DISTRIBUTION BY STAGE ---------- */}
      {hoursDistribution && Object.keys(hoursDistribution).length > 0 && (
        <section className="mi-section">
          <div className="mi-section-label">HOURS DISTRIBUTION BY STAGE</div>

          {Object.entries(hoursDistribution).map(([stageName, members]) => {
            const hasHours = Object.values(members).some((h) => h > 0);
            if (!hasHours) return null;

            return (
              <div key={stageName} className="mi-hours-stage-block">
                <div className="mi-hours-stage-name">{stageName}</div>
                <table className="mi-hours-table">
                  <thead>
                    <tr>
                      <th>Team Member</th>
                      <th className="mi-col-number">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(members).map(([memberName, hours]) => (
                      <tr key={memberName}>
                        <td>{memberName}</td>
                        <td className="mi-col-number">
                          {Number(hours).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </section>
      )}

      {/* ---------- STAGES / INCLUSIONS / TIMELINE ---------- */}
      {stages.length > 0 && (
        <section className="mi-section">
          <div className="mi-section-label">
            STAGES, INCLUSIONS &amp; TIMELINE
          </div>

          <table className="mi-stages-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Stage</th>
                <th style={{ width: '60%' }}>Inclusions / Description</th>
                <th className="mi-col-number" style={{ width: '15%' }}>
                  Days
                </th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s, idx) => {
                const description =
                  s?.description ||
                  (s?.subStages || [])
                    .map((sub) => sub?.label || sub?.name)
                    .filter(Boolean)
                    .join(', ') ||
                  '—';

                return (
                  <tr key={idx}>
                    <td>{s?.stage || `Stage ${idx + 1}`}</td>
                    <td className="mi-stage-description">{description}</td>
                    <td className="mi-col-number">
                      {s?.days
                        ? Number(s.days).toLocaleString('en-IN')
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {totalStageDays > 0 && (
            <div className="mi-estimate-note">
              Total estimated duration: <strong>{totalStageDays} days</strong>
            </div>
          )}
        </section>
      )}

      {/* ---------- NOTES ---------- */}
      {(hasNotes || true) && (
        <section className="mi-section">
          <div className="mi-section-label">ADDITIONAL NOTES</div>
          <div className="mi-notes-box">
            {hasNotes ? (
              invoice.notes.split('\n').map((line, i) => (
                <p key={i}>{line || '\u00A0'}</p>
              ))
            ) : (
              <p className="mi-notes-placeholder">
                Add inclusions, scope of work or special terms in the
                Notes section of the app.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ---------- INTERNAL EARNINGS BOX (hidden on print) ---------- */}
      <section className="mi-section consultant-only no-print">
        <div className="mi-earnings-box">
          <div className="mi-earnings-header">
            ⚠️ INTERNAL USE ONLY (Not visible to client)
          </div>
          <div className="mi-earnings-grid">
            <div className="mi-earnings-item">
              <span className="mi-earnings-label">
                Service Fee (
                {serviceFeePct > 1 ? serviceFeePct : serviceFeePct * 100}%)
              </span>
              <span className="mi-earnings-value">
                {formatINR(serviceFeeAmount)}
              </span>
            </div>
            <div className="mi-earnings-item mi-earnings-net">
              <span className="mi-earnings-label">Your Net Earnings</span>
              <span className="mi-earnings-value mi-earnings-highlight">
                {formatINR(netEarnings)}
              </span>
            </div>
          </div>
          <div className="mi-earnings-note">
            This earnings information will not appear in client PDFs or printouts.
          </div>
        </div>
      </section>

      {/* ---------- FOOTER STRIP ---------- */}
      <footer className="invoice-footer-strip">
        <span className="invoice-footer-text">MOM auto-generated on</span>
        {logoUrl && (
          <img src={logoUrl} alt="hourlx" className="invoice-footer-logo" />
        )}
      </footer>
    </div>
  );
}
