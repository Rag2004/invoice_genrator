
// import React, { useEffect, useState } from 'react';
// import './styles.css';

// import ProjectDetails from './components/ProjectDetails';
// import TeamSummary from './components/TeamSummary';
// import SummaryActions from './components/SummaryActions'; // still unused – ok
// import InvoicePrint from './components/InvoicePrint';

// import { getTeam, getProject, getClient } from './api/api';

// // ---------------- Debounce hook ----------------
// function useDebouncedValue(value, delay = 400) {
//   const [debounced, setDebounced] = useState(value);
//   useEffect(() => {
//     const t = setTimeout(() => setDebounced(value), delay);
//     return () => clearTimeout(t);
//   }, [value, delay]);
//   return debounced;
// }

// // --------------- Service fee helpers ---------------
// function incomingServiceFeeToPercent(v) {
//   const n = (v === undefined || v === null) ? 0 : Number(v);
//   if (isNaN(n)) return 0;
//   // if value > 1, assume 25 => 25%, else assume 0.25 fraction
//   return n > 1 ? n : Math.round(n * 10000) / 100;
// }

// function percentToFraction(v) {
//   const n = Number(v || 0);
//   if (isNaN(n)) return 0;
//   return n > 1 ? n / 100 : n;
// }

// const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

// // --------------- Currency formatter ---------------
// const formatINR = (value) =>
//   new Intl.NumberFormat('en-IN', {
//     style: 'currency',
//     currency: 'INR',
//     maximumFractionDigits: 2,
//   }).format(Number(value || 0));

// export default function App() {
//   // -------- Team data --------
//   const [teamOptions, setTeamOptions] = useState([]);
//   const [loadingTeam, setLoadingTeam] = useState(false);

//   // -------- Project & Client data --------
//   const [projectData, setProjectData] = useState(null);
//   const [clientData, setClientData] = useState(null);
//   const [loadingProject, setLoadingProject] = useState(false);
//   const [loadingClient, setLoadingClient] = useState(false);
//   const [fetchError, setFetchError] = useState(null);

//   // -------- Main invoice state --------
//   const [invoice, setInvoice] = useState({
//     invoiceId: '',              // NEW: used to update same row on draft saves
//     projectCode: '',
//     clientCode: '',
//     consultantId: '',           // auto-fetched from project sheet
//     consultantName: '',
//     date: new Date().toISOString().slice(0, 10),
//     billingAddress: '',
//     items: [],
//     notes: '',
//     invoiceNumber: '',
//     subtotal: 0,
//     gst: 0,
//     serviceFeePct: 25,          // default 25% (overridden by sheet)
//     serviceFeeAmount: 0,
//     netEarnings: 0,
//     total: 0,
//     baseHourlyRate: 6000,       // default rate (overridden by sheet)
//     stages: [],                 // Stage groups + sub-stages
//   });

//   const debouncedProjectCode = useDebouncedValue(invoice.projectCode, 450);

//   // ==================== FETCH TEAM OPTIONS ====================
//   useEffect(() => {
//     let mounted = true;
//     setLoadingTeam(true);

//     getTeam()
//       .then(t => {
//         if (!mounted) return;
//         const items = Array.isArray(t) ? t : (t?.team || []);
//         const normalized = items.map(x => ({
//           id: x.Id || x.id || x.memberCode || x.code,
//           name: x.Name || x.name || x.label || x.memberName,
//           defaultMode: x.defaultMode || x.mode || 'Online',
//           defaultRate: Number(x.Hourly_rate || x.hourlyRate || x.defaultRate || 0),
//           baseFactor: Number(x.Factor || x.factor || 1),
//         }));
//         setTeamOptions(normalized);
//       })
//       .catch(err => {
//         console.error('getTeam failed', err);
//         setTeamOptions([]);
//       })
//       .finally(() => mounted && setLoadingTeam(false));

//     return () => { mounted = false; };
//   }, []);

//   // ==================== FETCH PROJECT DATA ====================
//   useEffect(() => {
//     const code = (debouncedProjectCode || '').toString().trim();
//     if (!code) {
//       setProjectData(null);
//       setInvoice(prev => ({
//         ...prev,
//         clientCode: '',
//         consultantId: '',
//         baseHourlyRate: 6000,
//         serviceFeePct: 25,
//         billingAddress: '',
//       }));
//       return;
//     }

//     let active = true;
//     setFetchError(null);
//     setLoadingProject(true);

//     getProject(code)
//       .then(res => {
//         if (!active) return;

//         // handle both shapes: { project: {...} } or direct {... }
//         const p = res?.project ? res.project : res || {};
//         setProjectData(p || null);

//         const clientCodeFromProject =
//           p.clientCode ??
//           p.Client_Code ??
//           p.client_code ??
//           p.client;

//         const consultantIdFromProject =
//           p.consultantId ??
//           p.Consultant_id ??
//           p.ConsultantId ??
//           p.consultant_id;

//         const hourlyRateFromProject =
//           p.hourlyRate ??
//           p.Hourly_rate ??
//           p.Hourly_Rate ??
//           p.hourly_rate;

//         const serviceFeePctRaw =
//           p.serviceFeePct ??
//           p.service_fee_pct ??
//           p.ServiceFeePct;

//         const defaultBillingAddress =
//           p.defaultBillingAddress ??
//           p.DefaultBillingAddress ??
//           p.default_billing_address;

//         const svcPct = serviceFeePctRaw !== undefined
//           ? incomingServiceFeeToPercent(serviceFeePctRaw)
//           : invoice.serviceFeePct;

//         setInvoice(prev => ({
//           ...prev,
//           clientCode: clientCodeFromProject || prev.clientCode,
//           consultantId: consultantIdFromProject || prev.consultantId,
//           serviceFeePct: typeof svcPct === 'number' ? svcPct : prev.serviceFeePct,
//           baseHourlyRate:
//             hourlyRateFromProject !== undefined && hourlyRateFromProject !== null
//               ? Number(hourlyRateFromProject || 0)
//               : prev.baseHourlyRate,
//           billingAddress: prev.billingAddress || defaultBillingAddress || '',
//         }));
//       })
//       .catch(err => {
//         console.error('getProject failed', err);
//         setProjectData(null);
//         setFetchError(String(err?.message || err));

//         setInvoice(prev => ({
//           ...prev,
//           clientCode: '',
//           consultantId: '',
//           baseHourlyRate: prev.baseHourlyRate,
//         }));
//       })
//       .finally(() => active && setLoadingProject(false));

//     return () => {
//       active = false;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [debouncedProjectCode]);

//   // ==================== FETCH CLIENT DATA ====================
//   useEffect(() => {
//     const code = (invoice.clientCode || '').toString().trim();
//     if (!code) {
//       setClientData(null);
//       return;
//     }

//     let active = true;
//     setLoadingClient(true);

//     getClient(code)
//       .then(c => {
//         if (!active) return;
//         setClientData(c || null);

//         // Only use client billing address if we *don't* already
//         // have one from the project sheet or manual entry
//         if (c?.billingAddress) {
//           setInvoice(prev => ({
//             ...prev,
//             billingAddress: prev.billingAddress || c.billingAddress,
//           }));
//         }
//       })
//       .catch(err => {
//         console.error('getClient failed', err);
//         setClientData(null);
//       })
//       .finally(() => active && setLoadingClient(false));

//     return () => { active = false; };
//   }, [invoice.clientCode]);

//   // ==================== RECALCULATE AMOUNTS ====================
//   function recalcInvoice(draft) {
//     const base = Number(draft.baseHourlyRate || 0);

//     const items = (draft.items || []).map(it => {
//       const hours = Number(it.hours || 0);

//       const rate = it.userEditedRate
//         ? Number(it.rate || 0)
//         : (Number(it.rate) > 0 ? Number(it.rate) : base) || 0;

//       const amount = Math.round(rate * hours * 100) / 100;
//       return { ...it, rate, amount };
//     });

//     const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
//     const gst = subtotal * 0.18;
//     const total = subtotal + gst;

//     const serviceFeeFraction = percentToFraction(draft.serviceFeePct);
//     const serviceFeeAmount = total * serviceFeeFraction;
//     const netEarnings = total - serviceFeeAmount;

//     return {
//       ...draft,
//       items,
//       subtotal,
//       gst,
//       total,
//       serviceFeeAmount,
//       netEarnings,
//     };
//   }

//   // ==================== UPDATE INVOICE STATE ====================
//   const updateInvoice = (patchOrUpdater) =>
//     setInvoice(prev => {
//       const patch =
//         typeof patchOrUpdater === 'function'
//           ? patchOrUpdater(prev)
//           : patchOrUpdater || {};
//       return recalcInvoice({ ...prev, ...patch });
//     });

//   // ==================== VALIDATION (for final save) ====================
//   const handleValidateInvoice = () => {
//     if (!invoice.projectCode || invoice.projectCode.trim() === '') {
//       return { ok: false, err: 'Please enter a project code.' };
//     }
//     if (!invoice.consultantName || invoice.consultantName.trim() === '') {
//       return { ok: false, err: 'Please enter consultant name.' };
//     }
//     const hasHours = (invoice.items || []).some(it => Number(it.hours || 0) > 0);
//     if (!hasHours) {
//       return { ok: false, err: 'Add at least one team member with hours.' };
//     }
//     return { ok: true };
//   };

//   // ==================== SAVE INVOICE (draft or final) ====================
//   const handleSaveClick = async (mode = 'final') => {
//     const isFinal = mode === 'final';

//     if (isFinal) {
//       const validation = handleValidateInvoice();
//       if (!validation.ok) {
//         alert(validation.err);
//         return;
//       }
//     }

//     try {
//       const payload = {
//         // identify invoice (null for new draft, value for updates)
//         invoiceId: invoice.invoiceId || null,

//         // core fields
//         projectCode: invoice.projectCode,
//         clientCode: invoice.clientCode,
//         consultantId: invoice.consultantId,
//         consultantName: invoice.consultantName,
//         billingAddress: invoice.billingAddress,
//         invoiceDate: invoice.date, // Apps Script expects invoiceDate

//         // money fields
//         subtotal: invoice.subtotal,
//         gst: invoice.gst,
//         serviceFeePct: percentToFraction(invoice.serviceFeePct), // fraction (0.25)
//         serviceFee: invoice.serviceFeeAmount,
//         netEarnings: invoice.netEarnings,

//         // line items
//         items: (invoice.items || []).map(item => ({
//           name: item.name,
//           mode: item.mode,
//           hours: item.hours,
//           rate: item.rate,
//           amount: item.amount,
//         })),

//         // notes
//         notes: invoice.notes,

//         // draft vs final
//         finalize: isFinal,                            // true => FINAL, false => DRAFT
//         status: isFinal ? 'FINAL' : 'DRAFT',
//       };

//       console.log('🚀 Sending invoice payload to backend:', payload);

//       const resp = await fetch(`${API_BASE}/invoices`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//       });

//       if (!resp.ok) {
//         const text = await resp.text();
//         throw new Error(`Save failed: ${resp.status} ${text}`);
//       }

//       const data = await resp.json();
//       console.log('✅ Backend / Apps Script response:', data);

//       const newInvoiceId = data?.invoiceId || data?.invoice_id || null;
//       const invNum =
//         data?.invoiceNumber ||
//         data?.invoice_number ||
//         data?.invoice_id ||
//         data?.id ||
//         null;

//       const patch = {};
//       if (newInvoiceId) patch.invoiceId = newInvoiceId;
//       if (isFinal && invNum) patch.invoiceNumber = invNum;

//       if (Object.keys(patch).length > 0) {
//         updateInvoice(patch);
//       }

//       alert(
//         isFinal
//           ? `✅ Invoice saved successfully!${
//               invNum ? ` Invoice #${invNum}` : ''
//             }`
//           : '✅ Draft saved successfully!'
//       );
//     } catch (err) {
//       console.error('Save invoice error:', err);
//       alert(`❌ Failed to save invoice: ${err.message || err}`);
//     }
//   };

//   // simple row style for totals box
//   const totalsRowStyle = {
//     display: 'flex',
//     justifyContent: 'space-between',
//     fontSize: '0.9rem',
//     padding: '4px 0',
//   };

//   // ==================== RENDER ====================
//   return (
//     <div className="app-container">
//       {/* ---------- Visible app shell (form UI) ---------- */}
//       <div className="app-shell">
//         {/* Header */}
//         <header className="app-header">
//           <h1 className="title">Invoice Generator</h1>
//           <p className="subtitle">Create professional invoices in seconds</p>
//         </header>

//         {/* Main Layout – single column */}
//         <main className="single-column-main">
//           {/* Project Details */}
//           <div className="card mb-2">
//             <div className="card-header">
//               <h2 className="card-title">Project &amp; Client Details</h2>
//             </div>
//             <ProjectDetails
//               invoice={invoice}
//               updateInvoice={updateInvoice}
//               projectData={projectData}
//               clientData={clientData}
//               loadingProject={loadingProject}
//               loadingClient={loadingClient}
//               fetchError={fetchError}
//             />
//           </div>

//           {/* Team + Stages in one section */}
//           <div className="card mb-2">
//             <div className="card-header">
//               <h2 className="card-title">Team Members &amp; Stages</h2>
//             </div>
//             <TeamSummary
//               invoice={invoice}
//               updateInvoice={updateInvoice}
//               teamOptions={teamOptions}
//               loadingTeam={loadingTeam}
//               baseHourlyRate={invoice.baseHourlyRate || 0}
//             />
//           </div>

//           {/* Notes + Billing Summary */}
//           <div className="card mb-2">
//             <div className="card-header">
//               <h2 className="card-title">Notes &amp; Billing Summary</h2>
//             </div>

//             <div
//               style={{
//                 display: 'grid',
//                 gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.2fr)',
//                 gap: '16px',
//                 alignItems: 'flex-start',
//               }}
//             >
//               {/* LEFT: Notes */}
//               <div>
//                 <label className="label">Notes / Inclusions (Optional)</label>
//                 <textarea
//                   className="textarea"
//                   rows={6}
//                   placeholder="Add inclusions, scope of work, payment link or other notes that should appear on the invoice…"
//                   value={invoice.notes}
//                   onChange={e => updateInvoice({ notes: e.target.value })}
//                 />
//               </div>

//               {/* RIGHT: Billing totals */}
//               <div>
//                 <div
//                   style={{
//                     border: '1px solid #e5e7eb',
//                     borderRadius: '8px',
//                     padding: '12px 14px',
//                     background: '#f9fafb',
//                   }}
//                 >
//                   <div
//                     style={{
//                       fontWeight: 600,
//                       fontSize: '0.9rem',
//                       marginBottom: '8px',
//                     }}
//                   >
//                     Billing Total
//                   </div>

//                   <div style={totalsRowStyle}>
//                     <span>Subtotal</span>
//                     <span>{formatINR(invoice.subtotal)}</span>
//                   </div>

//                   <div style={totalsRowStyle}>
//                     <span>GST (18%)</span>
//                     <span>{formatINR(invoice.gst)}</span>
//                   </div>

//                   <div
//                     style={{
//                       ...totalsRowStyle,
//                       fontWeight: 600,
//                       borderTop: '1px solid #e5e7eb',
//                       marginTop: '4px',
//                       paddingTop: '6px',
//                     }}
//                   >
//                     <span>Total (incl. GST)</span>
//                     <span>{formatINR(invoice.total)}</span>
//                   </div>

//                   {/* Consultant-only info: hidden in client preview / print */}
//                   <div
//                     className="consultant-only"
//                     style={{ ...totalsRowStyle, marginTop: '8px' }}
//                   >
//                     <span>Service Fee ({invoice.serviceFeePct || 0}%)</span>
//                     <span>-{formatINR(invoice.serviceFeeAmount)}</span>
//                   </div>

//                   <div
//                     className="consultant-only"
//                     style={{ ...totalsRowStyle, fontWeight: 600 }}
//                   >
//                     <span>Your Net Earnings</span>
//                     <span>{formatINR(invoice.netEarnings)}</span>
//                   </div>

//                   <p
//                     className="consultant-only"
//                     style={{
//                       marginTop: '6px',
//                       fontSize: '0.75rem',
//                       color: '#6b7280',
//                     }}
//                   >
//                     Visible only to you. This net earnings information will not
//                     appear on client previews or generated invoices.
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </main>

//         {/* Footer Actions Bar */}
//         <div className="footer-actions" role="region" aria-label="Invoice actions">
//           <div className="left">
//             <button
//               className="btn btn-ghost"
//               onClick={() => window.print()}
//               title="Preview / Print"
//             >
//               📄 Preview
//             </button>

//             <button
//               className="btn btn-ghost"
//               onClick={() => {
//                 const subject = encodeURIComponent(
//                   `Invoice - ${invoice.projectCode || 'Preview'}`
//                 );
//                 const body = encodeURIComponent(
//                   `Please find the invoice for project ${invoice.projectCode || ''}.\n\n` +
//                   `Total (incl. GST): ₹${Number(invoice.total || 0).toLocaleString('en-IN')}\n\n` +
//                   `Best regards,\n${invoice.consultantName || ''}`
//                 );
//                 window.location.href = `mailto:?subject=${subject}&body=${body}`;
//               }}
//               title="Share via email"
//             >
//               ✉️ Share
//             </button>
//           </div>

//           <div className="right">
//             <div className="footer-total">
//               <span className="footer-total-label">Total:</span>
//               <span>₹{Number(invoice.total || 0).toLocaleString('en-IN')}</span>
//             </div>

//             <button
//               className="btn btn-ghost"
//               onClick={() => handleSaveClick('draft')}
//             >
//               💾 Save as Draft
//             </button>

//             <button
//               className="btn btn-success"
//               onClick={() => handleSaveClick('final')}
//             >
//               ✅ Save Invoice
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* ---------- Hidden print / bill ONLY ---------- */}
//       <div className="hidden-preview-root" aria-hidden="true">
//         <div
//           id="invoice-preview-root"
//           className="invoice-preview-wrapper"
//         >
//           <InvoicePrint
//             invoice={invoice}
//             clientData={clientData}
//             projectData={projectData}
//           />
//         </div>
//       </div>
//     </div>
//   );
// }

// import React, { useEffect, useState } from 'react';
// import './styles.css';

// import ProjectDetails from './components/ProjectDetails';
// import TeamSummary from './components/TeamSummary';
// // import SummaryActions from './components/SummaryActions'; // still unused – ok
// import InvoicePrint from './components/InvoicePrint';

// import { getTeam, getProject, getClient, getInvoiceById } from './api/api';

// // ---------------- Debounce hook ----------------
// function useDebouncedValue(value, delay = 400) {
//   const [debounced, setDebounced] = useState(value);
//   useEffect(() => {
//     const t = setTimeout(() => setDebounced(value), delay);
//     return () => clearTimeout(t);
//   }, [value, delay]);
//   return debounced;
// }

// // --------------- Service fee helpers ---------------
// function incomingServiceFeeToPercent(v) {
//   const n = (v === undefined || v === null) ? 0 : Number(v);
//   if (isNaN(n)) return 0;
//   // if value > 1, assume 25 => 25%, else assume 0.25 fraction
//   return n > 1 ? n : Math.round(n * 10000) / 100;
// }

// function percentToFraction(v) {
//   const n = Number(v || 0);
//   if (isNaN(n)) return 0;
//   return n > 1 ? n / 100 : n;
// }

// const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

// // --------------- Currency formatter ---------------
// const formatINR = (value) =>
//   new Intl.NumberFormat('en-IN', {
//     style: 'currency',
//     currency: 'INR',
//     maximumFractionDigits: 2,
//   }).format(Number(value || 0));

// export default function App() {
//   // -------- Team data --------
//   const [teamOptions, setTeamOptions] = useState([]);
//   const [loadingTeam, setLoadingTeam] = useState(false);

//   // -------- Project & Client data --------
//   const [projectData, setProjectData] = useState(null);
//   const [clientData, setClientData] = useState(null);
//   const [loadingProject, setLoadingProject] = useState(false);
//   const [loadingClient, setLoadingClient] = useState(false);
//   const [fetchError, setFetchError] = useState(null);

//   // -------- Main invoice state --------
//   const [invoice, setInvoice] = useState({
//     invoiceId: '',              // used to update same row on draft saves
//     projectCode: '',
//     clientCode: '',
//     consultantId: '',           // auto-fetched from project sheet
//     consultantName: '',
//     date: new Date().toISOString().slice(0, 10),
//     billingAddress: '',
//     items: [],
//     notes: '',
//     invoiceNumber: '',
//     subtotal: 0,
//     gst: 0,
//     serviceFeePct: 25,          // default 25% (overridden by sheet)
//     serviceFeeAmount: 0,
//     netEarnings: 0,
//     total: 0,
//     baseHourlyRate: 6000,       // default rate (overridden by sheet)
//     stages: [],                 // Stage groups + sub-stages
//   });

//   // -------- Draft load helper state --------
//   const [loadId, setLoadId] = useState(''); // invoiceId to load

//   const debouncedProjectCode = useDebouncedValue(invoice.projectCode, 450);

//   // ==================== FETCH TEAM OPTIONS ====================
//   useEffect(() => {
//     let mounted = true;
//     setLoadingTeam(true);

//     getTeam()
//       .then(t => {
//         if (!mounted) return;
//         const items = Array.isArray(t) ? t : (t?.team || []);
//         const normalized = items.map(x => ({
//           id: x.Id || x.id || x.memberCode || x.code,
//           name: x.Name || x.name || x.label || x.memberName,
//           defaultMode: x.defaultMode || x.mode || 'Online',
//           defaultRate: Number(x.Hourly_rate || x.hourlyRate || x.defaultRate || 0),
//           baseFactor: Number(x.Factor || x.factor || 1),
//         }));
//         setTeamOptions(normalized);
//       })
//       .catch(err => {
//         console.error('getTeam failed', err);
//         setTeamOptions([]);
//       })
//       .finally(() => mounted && setLoadingTeam(false));

//     return () => { mounted = false; };
//   }, []);

//   // ==================== FETCH PROJECT DATA ====================
//   useEffect(() => {
//     const code = (debouncedProjectCode || '').toString().trim();
//     if (!code) {
//       setProjectData(null);
//       setInvoice(prev => ({
//         ...prev,
//         clientCode: '',
//         consultantId: '',
//         baseHourlyRate: 6000,
//         serviceFeePct: 25,
//         billingAddress: '',
//       }));
//       return;
//     }

//     let active = true;
//     setFetchError(null);
//     setLoadingProject(true);

//     getProject(code)
//       .then(res => {
//         if (!active) return;

//         // handle both shapes: { project: {...} } or direct {... }
//         const p = res?.project ? res.project : res || {};
//         setProjectData(p || null);

//         const clientCodeFromProject =
//           p.clientCode ??
//           p.Client_Code ??
//           p.client_code ??
//           p.client;

//         const consultantIdFromProject =
//           p.consultantId ??
//           p.Consultant_id ??
//           p.ConsultantId ??
//           p.consultant_id;

//         const hourlyRateFromProject =
//           p.hourlyRate ??
//           p.Hourly_rate ??
//           p.Hourly_Rate ??
//           p.hourly_rate;

//         const serviceFeePctRaw =
//           p.serviceFeePct ??
//           p.service_fee_pct ??
//           p.ServiceFeePct;

//         const defaultBillingAddress =
//           p.defaultBillingAddress ??
//           p.DefaultBillingAddress ??
//           p.default_billing_address;

//         const svcPct = serviceFeePctRaw !== undefined
//           ? incomingServiceFeeToPercent(serviceFeePctRaw)
//           : invoice.serviceFeePct;

//         setInvoice(prev => ({
//           ...prev,
//           clientCode: clientCodeFromProject || prev.clientCode,
//           consultantId: consultantIdFromProject || prev.consultantId,
//           serviceFeePct: typeof svcPct === 'number' ? svcPct : prev.serviceFeePct,
//           baseHourlyRate:
//             hourlyRateFromProject !== undefined && hourlyRateFromProject !== null
//               ? Number(hourlyRateFromProject || 0)
//               : prev.baseHourlyRate,
//           billingAddress: prev.billingAddress || defaultBillingAddress || '',
//         }));
//       })
//       .catch(err => {
//         console.error('getProject failed', err);
//         setProjectData(null);
//         setFetchError(String(err?.message || err));

//         setInvoice(prev => ({
//           ...prev,
//           clientCode: '',
//           consultantId: '',
//           baseHourlyRate: prev.baseHourlyRate,
//         }));
//       })
//       .finally(() => active && setLoadingProject(false));

//     return () => {
//       active = false;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [debouncedProjectCode]);

//   // ==================== FETCH CLIENT DATA ====================
//   useEffect(() => {
//     const code = (invoice.clientCode || '').toString().trim();
//     if (!code) {
//       setClientData(null);
//       return;
//     }

//     let active = true;
//     setLoadingClient(true);

//     getClient(code)
//       .then(c => {
//         if (!active) return;
//         setClientData(c || null);

//         // Only use client billing address if we *don't* already
//         // have one from the project sheet or manual entry
//         if (c?.billingAddress) {
//           setInvoice(prev => ({
//             ...prev,
//             billingAddress: prev.billingAddress || c.billingAddress,
//           }));
//         }
//       })
//       .catch(err => {
//         console.error('getClient failed', err);
//         setClientData(null);
//       })
//       .finally(() => active && setLoadingClient(false));

//     return () => { active = false; };
//   }, [invoice.clientCode]);

//   // ==================== RECALCULATE AMOUNTS ====================
//   function recalcInvoice(draft) {
//     const base = Number(draft.baseHourlyRate || 0);

//     const items = (draft.items || []).map(it => {
//       const hours = Number(it.hours || 0);

//       const rate = it.userEditedRate
//         ? Number(it.rate || 0)
//         : (Number(it.rate) > 0 ? Number(it.rate) : base) || 0;

//       const amount = Math.round(rate * hours * 100) / 100;
//       return { ...it, rate, amount };
//     });

//     const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
//     const gst = subtotal * 0.18;
//     const total = subtotal + gst;

//     const serviceFeeFraction = percentToFraction(draft.serviceFeePct);
//     const serviceFeeAmount = total * serviceFeeFraction;
//     const netEarnings = total - serviceFeeAmount;

//     return {
//       ...draft,
//       items,
//       subtotal,
//       gst,
//       total,
//       serviceFeeAmount,
//       netEarnings,
//     };
//   }

//   // ==================== UPDATE INVOICE STATE ====================
//   const updateInvoice = (patchOrUpdater) =>
//     setInvoice(prev => {
//       const patch =
//         typeof patchOrUpdater === 'function'
//           ? patchOrUpdater(prev)
//           : patchOrUpdater || {};
//       return recalcInvoice({ ...prev, ...patch });
//     });

//   // ==================== VALIDATION (for final save) ====================
//   const handleValidateInvoice = () => {
//     if (!invoice.projectCode || invoice.projectCode.trim() === '') {
//       return { ok: false, err: 'Please enter a project code.' };
//     }
//     if (!invoice.consultantName || invoice.consultantName.trim() === '') {
//       return { ok: false, err: 'Please enter consultant name.' };
//     }
//     const hasHours = (invoice.items || []).some(it => Number(it.hours || 0) > 0);
//     if (!hasHours) {
//       return { ok: false, err: 'Add at least one team member with hours.' };
//     }
//     return { ok: true };
//   };

//   // ==================== LOAD DRAFT BY INVOICE ID ====================
//   const loadDraftById = async (invoiceId) => {
//     const trimmed = (invoiceId || '').trim();
//     if (!trimmed) {
//       alert('Please enter an Invoice ID to load.');
//       return;
//     }

//     try {
//       const data = await getInvoiceById(trimmed);
//       console.log('🔄 Loaded invoice from backend:', data);

//       const serviceFeePctPercent = incomingServiceFeeToPercent(data.serviceFeePct);

//       updateInvoice(prev => ({
//         ...prev,
//         invoiceId: data.invoiceId || trimmed,
//         invoiceNumber: data.invoiceNumber || '',
//         projectCode: data.projectCode || '',
//         clientCode: data.clientCode || '',
//         consultantId: data.consultantId || '',
//         consultantName: data.consultantName || '',
//         date: data.invoiceDate
//           ? String(data.invoiceDate).slice(0, 10)
//           : prev.date,
//         billingAddress: data.billingAddress || '',
//         subtotal: Number(data.subtotal || 0),
//         gst: Number(data.gst || 0),
//         serviceFeePct: serviceFeePctPercent,
//         serviceFeeAmount: Number(data.serviceFee || 0),
//         netEarnings: Number(data.netEarnings || 0),
//         items: (data.items || []).map(it => ({
//           name: it.name,
//           mode: it.mode,
//           hours: Number(it.hours || 0),
//           rate: Number(it.rate || 0),
//           amount: Number(it.amount || 0),
//         })),
//         notes: data.notes || '',
//       }));

//       alert('✅ Draft loaded successfully');
//     } catch (err) {
//       console.error('loadDraftById error', err);
//       alert(`❌ Failed to load draft: ${err.message || err}`);
//     }
//   };

//   // ==================== SAVE INVOICE (draft or final) ====================
//   const handleSaveClick = async (mode = 'final') => {
//     const isFinal = mode === 'final';

//     if (isFinal) {
//       const validation = handleValidateInvoice();
//       if (!validation.ok) {
//         alert(validation.err);
//         return;
//       }
//     }

//     try {
//       const payload = {
//         // identify invoice (null for new draft, value for updates)
//         invoiceId: invoice.invoiceId || null,

//         // core fields
//         projectCode: invoice.projectCode,
//         clientCode: invoice.clientCode,
//         consultantId: invoice.consultantId,
//         consultantName: invoice.consultantName,
//         billingAddress: invoice.billingAddress,
//         invoiceDate: invoice.date, // Apps Script expects invoiceDate

//         // money fields
//         subtotal: invoice.subtotal,
//         gst: invoice.gst,
//         serviceFeePct: percentToFraction(invoice.serviceFeePct), // fraction (0.25)
//         serviceFee: invoice.serviceFeeAmount,
//         netEarnings: invoice.netEarnings,

//         // line items
//         items: (invoice.items || []).map(item => ({
//           name: item.name,
//           mode: item.mode,
//           hours: item.hours,
//           rate: item.rate,
//           amount: item.amount,
//         })),

//         // notes
//         notes: invoice.notes,

//         // draft vs final
//         finalize: isFinal,                            // true => FINAL, false => DRAFT
//         status: isFinal ? 'FINAL' : 'DRAFT',
//       };

//       console.log('🚀 Sending invoice payload to backend:', payload);

//       const resp = await fetch(`${API_BASE}/invoices`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//       });

//       if (!resp.ok) {
//         const text = await resp.text();
//         throw new Error(`Save failed: ${resp.status} ${text}`);
//       }

//       const data = await resp.json();
//       console.log('✅ Backend / Apps Script response:', data);

//       const newInvoiceId = data?.invoiceId || data?.invoice_id || null;
//       const invNum =
//         data?.invoiceNumber ||
//         data?.invoice_number ||
//         data?.invoice_id ||
//         data?.id ||
//         null;

//       const patch = {};
//       if (newInvoiceId) patch.invoiceId = newInvoiceId;
//       if (isFinal && invNum) patch.invoiceNumber = invNum;

//       if (Object.keys(patch).length > 0) {
//         updateInvoice(patch);
//       }

//       alert(
//         isFinal
//           ? `✅ Invoice saved successfully!${
//               invNum ? ` Invoice #${invNum}` : ''
//             }`
//           : '✅ Draft saved successfully!'
//       );
//     } catch (err) {
//       console.error('Save invoice error:', err);
//       alert(`❌ Failed to save invoice: ${err.message || err}`);
//     }
//   };

//   // simple row style for totals box
//   const totalsRowStyle = {
//     display: 'flex',
//     justifyContent: 'space-between',
//     fontSize: '0.9rem',
//     padding: '4px 0',
//   };

//   // ==================== RENDER ====================
//   return (
//     <div className="app-container">
//       {/* ---------- Visible app shell (form UI) ---------- */}
//       <div className="app-shell">
//         {/* Header */}
//         <header className="app-header">
//           <h1 className="title">Invoice Generator</h1>
//           <p className="subtitle">Create professional invoices in seconds</p>
//         </header>

//         {/* Main Layout – single column */}
//         <main className="single-column-main">
//           {/* Project Details */}
//           <div className="card mb-2">
//             <div className="card-header">
//               <h2 className="card-title">Project &amp; Client Details</h2>
//             </div>
//             <ProjectDetails
//               invoice={invoice}
//               updateInvoice={updateInvoice}
//               projectData={projectData}
//               clientData={clientData}
//               loadingProject={loadingProject}
//               loadingClient={loadingClient}
//               fetchError={fetchError}
//             />
//           </div>

//           {/* Team + Stages in one section */}
//           <div className="card mb-2">
//             <div className="card-header">
//               <h2 className="card-title">Team Members &amp; Stages</h2>
//             </div>
//             <TeamSummary
//               invoice={invoice}
//               updateInvoice={updateInvoice}
//               teamOptions={teamOptions}
//               loadingTeam={loadingTeam}
//               baseHourlyRate={invoice.baseHourlyRate || 0}
//             />
//           </div>

//           {/* Notes + Billing Summary */}
//           <div className="card mb-2">
//             <div className="card-header">
//               <h2 className="card-title">Notes &amp; Billing Summary</h2>
//             </div>

//             <div
//               style={{
//                 display: 'grid',
//                 gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.2fr)',
//                 gap: '16px',
//                 alignItems: 'flex-start',
//               }}
//             >
//               {/* LEFT: Notes */}
//               <div>
//                 <label className="label">Notes / Inclusions (Optional)</label>
//                 <textarea
//                   className="textarea"
//                   rows={6}
//                   placeholder="Add inclusions, scope of work, payment link or other notes that should appear on the invoice…"
//                   value={invoice.notes}
//                   onChange={e => updateInvoice({ notes: e.target.value })}
//                 />
//               </div>

//               {/* RIGHT: Billing totals */}
//               <div>
//                 <div
//                   style={{
//                     border: '1px solid #e5e7eb',
//                     borderRadius: '8px',
//                     padding: '12px 14px',
//                     background: '#f9fafb',
//                   }}
//                 >
//                   <div
//                     style={{
//                       fontWeight: 600,
//                       fontSize: '0.9rem',
//                       marginBottom: '8px',
//                     }}
//                   >
//                     Billing Total
//                   </div>

//                   <div style={totalsRowStyle}>
//                     <span>Subtotal</span>
//                     <span>{formatINR(invoice.subtotal)}</span>
//                   </div>

//                   <div style={totalsRowStyle}>
//                     <span>GST (18%)</span>
//                     <span>{formatINR(invoice.gst)}</span>
//                   </div>

//                   <div
//                     style={{
//                       ...totalsRowStyle,
//                       fontWeight: 600,
//                       borderTop: '1px solid #e5e7eb',
//                       marginTop: '4px',
//                       paddingTop: '6px',
//                     }}
//                   >
//                     <span>Total (incl. GST)</span>
//                     <span>{formatINR(invoice.total)}</span>
//                   </div>

//                   {/* Consultant-only info: hidden in client preview / print */}
//                   <div
//                     className="consultant-only"
//                     style={{ ...totalsRowStyle, marginTop: '8px' }}
//                   >
//                     <span>Service Fee ({invoice.serviceFeePct || 0}%)</span>
//                     <span>-{formatINR(invoice.serviceFeeAmount)}</span>
//                   </div>

//                   <div
//                     className="consultant-only"
//                     style={{ ...totalsRowStyle, fontWeight: 600 }}
//                   >
//                     <span>Your Net Earnings</span>
//                     <span>{formatINR(invoice.netEarnings)}</span>
//                   </div>

//                   <p
//                     className="consultant-only"
//                     style={{
//                       marginTop: '6px',
//                       fontSize: '0.75rem',
//                       color: '#6b7280',
//                     }}
//                   >
//                     Visible only to you. This net earnings information will not
//                     appear on client previews or generated invoices.
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </main>

//         {/* Footer Actions Bar */}
//         <div className="footer-actions" role="region" aria-label="Invoice actions">
//           <div className="left">
//             {/* Load draft by invoiceId */}
//             <input
//               className="input"
//               style={{ marginRight: '8px', maxWidth: '220px' }}
//               placeholder="Enter Invoice ID to load draft"
//               value={loadId}
//               onChange={e => setLoadId(e.target.value)}
//             />
//             <button
//               className="btn btn-ghost"
//               onClick={() => loadDraftById(loadId)}
//               title="Load draft by Invoice ID"
//             >
//               🔄 Load Draft
//             </button>

//             <button
//               className="btn btn-ghost"
//               onClick={() => window.print()}
//               title="Preview / Print"
//             >
//               📄 Preview
//             </button>

//             <button
//               className="btn btn-ghost"
//               onClick={() => {
//                 const subject = encodeURIComponent(
//                   `Invoice - ${invoice.projectCode || 'Preview'}`
//                 );
//                 const body = encodeURIComponent(
//                   `Please find the invoice for project ${invoice.projectCode || ''}.\n\n` +
//                   `Total (incl. GST): ₹${Number(invoice.total || 0).toLocaleString('en-IN')}\n\n` +
//                   `Best regards,\n${invoice.consultantName || ''}`
//                 );
//                 window.location.href = `mailto:?subject=${subject}&body=${body}`;
//               }}
//               title="Share via email"
//             >
//               ✉️ Share
//             </button>
//           </div>

//           <div className="right">
//             <div className="footer-total">
//               <span className="footer-total-label">Total:</span>
//               <span>₹{Number(invoice.total || 0).toLocaleString('en-IN')}</span>
//             </div>

//             <button
//               className="btn btn-ghost"
//               onClick={() => handleSaveClick('draft')}
//             >
//               💾 Save as Draft
//             </button>

//             <button
//               className="btn btn-success"
//               onClick={() => handleSaveClick('final')}
//             >
//               ✅ Save Invoice
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* ---------- Hidden print / bill ONLY ---------- */}
//       <div className="hidden-preview-root" aria-hidden="true">
//         <div
//           id="invoice-preview-root"
//           className="invoice-preview-wrapper"
//         >
//           <InvoicePrint
//             invoice={invoice}
//             clientData={clientData}
//             projectData={projectData}
//           />
//         </div>
//       </div>
//     </div>
//   );
// }
import React, { useEffect, useState } from 'react';
import './styles.css';

import ProjectDetails from './components/ProjectDetails';
import TeamSummary from './components/TeamSummary';
import InvoicePrint from './components/InvoicePrint';

import { getTeam, getProject, getClient, getInvoiceById } from './api/api';

// ---------------- Debounce hook ----------------
function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// --------------- Service fee helpers ---------------
function incomingServiceFeeToPercent(v) {
  const n = (v === undefined || v === null) ? 0 : Number(v);
  if (isNaN(n)) return 0;
  // if value > 1, assume 25 => 25%, else assume 0.25 fraction
  return n > 1 ? n : Math.round(n * 10000) / 100;
}

function percentToFraction(v) {
  const n = Number(v || 0);
  if (isNaN(n)) return 0;
  return n > 1 ? n / 100 : n;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

// --------------- Currency formatter ---------------
const formatINR = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function App() {
  // -------- Team data --------
  const [teamOptions, setTeamOptions] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // -------- Project & Client data --------
  const [projectData, setProjectData] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // -------- Main invoice state --------
  const [invoice, setInvoice] = useState({
    invoiceId: '',              // used to update same row on draft saves
    projectCode: '',
    clientCode: '',
    consultantId: '',           // auto-fetched from project sheet
    consultantName: '',
    date: new Date().toISOString().slice(0, 10),
    billingAddress: '',
    items: [],
    notes: '',
    invoiceNumber: '',
    subtotal: 0,
    gst: 0,
    serviceFeePct: 25,          // default 25% (overridden by sheet)
    serviceFeeAmount: 0,
    netEarnings: 0,
    total: 0,
    baseHourlyRate: 6000,       // default rate (overridden by sheet)
    stages: [],                 // Stage groups + sub-stages
  });

  // -------- Draft load helper state --------
  const [loadId, setLoadId] = useState(''); // invoiceId to load

  const debouncedProjectCode = useDebouncedValue(invoice.projectCode, 450);

  // ==================== FETCH TEAM OPTIONS ====================
  useEffect(() => {
    let mounted = true;
    setLoadingTeam(true);

    getTeam()
      .then(t => {
        if (!mounted) return;
        const items = Array.isArray(t) ? t : (t?.team || []);
        const normalized = items.map(x => ({
          id: x.Id || x.id || x.memberCode || x.code,
          name: x.Name || x.name || x.label || x.memberName,
          defaultMode: x.defaultMode || x.mode || 'Online',
          defaultRate: Number(
            x.Hourly_rate ||
            x.hourlyRate ||
            x.defaultRate ||
            0
          ),
          // 🔥 FIX: read baseFactor from API (0.75, 0.5, 0.7, etc.)
          baseFactor: Number(
            x.baseFactor ??
            x.BaseFactor ??
            x.Factor ??
            x.factor ??
            1
          ),
        }));
        setTeamOptions(normalized);
        // console.log('teamOptions normalized:', normalized);
      })
      .catch(err => {
        console.error('getTeam failed', err);
        setTeamOptions([]);
      })
      .finally(() => mounted && setLoadingTeam(false));

    return () => { mounted = false; };
  }, []);

  // ==================== FETCH PROJECT DATA ====================
  useEffect(() => {
    const code = (debouncedProjectCode || '').toString().trim();
    if (!code) {
      setProjectData(null);
      setInvoice(prev => ({
        ...prev,
        clientCode: '',
        consultantId: '',
        baseHourlyRate: 6000,
        serviceFeePct: 25,
        billingAddress: '',
      }));
      return;
    }

    let active = true;
    setFetchError(null);
    setLoadingProject(true);

    getProject(code)
      .then(res => {
        if (!active) return;

        // handle both shapes: { project: {...} } or direct {... }
        const p = res?.project ? res.project : res || {};
        setProjectData(p || null);

        const clientCodeFromProject =
          p.clientCode ??
          p.Client_Code ??
          p.client_code ??
          p.client;

        const consultantIdFromProject =
          p.consultantId ??
          p.Consultant_id ??
          p.ConsultantId ??
          p.consultant_id;

        const hourlyRateFromProject =
          p.hourlyRate ??
          p.Hourly_rate ??
          p.Hourly_Rate ??
          p.hourly_rate;

        const serviceFeePctRaw =
          p.serviceFeePct ??
          p.service_fee_pct ??
          p.ServiceFeePct;

        const defaultBillingAddress =
          p.defaultBillingAddress ??
          p.DefaultBillingAddress ??
          p.default_billing_address;

        const svcPct = serviceFeePctRaw !== undefined
          ? incomingServiceFeeToPercent(serviceFeePctRaw)
          : invoice.serviceFeePct;

        setInvoice(prev => ({
          ...prev,
          clientCode: clientCodeFromProject || prev.clientCode,
          consultantId: consultantIdFromProject || prev.consultantId,
          serviceFeePct: typeof svcPct === 'number' ? svcPct : prev.serviceFeePct,
          baseHourlyRate:
            hourlyRateFromProject !== undefined && hourlyRateFromProject !== null
              ? Number(hourlyRateFromProject || 0)
              : prev.baseHourlyRate,
          billingAddress: prev.billingAddress || defaultBillingAddress || '',
        }));
      })
      .catch(err => {
        console.error('getProject failed', err);
        setProjectData(null);
        setFetchError(String(err?.message || err));

        setInvoice(prev => ({
          ...prev,
          clientCode: '',
          consultantId: '',
          baseHourlyRate: prev.baseHourlyRate,
        }));
      })
      .finally(() => active && setLoadingProject(false));

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedProjectCode]);

  // ==================== FETCH CLIENT DATA ====================
  useEffect(() => {
    const code = (invoice.clientCode || '').toString().trim();
    if (!code) {
      setClientData(null);
      return;
    }

    let active = true;
    setLoadingClient(true);

    getClient(code)
      .then(c => {
        if (!active) return;
        setClientData(c || null);

        // Only use client billing address if we *don't* already
        // have one from the project sheet or manual entry
        if (c?.billingAddress) {
          setInvoice(prev => ({
            ...prev,
            billingAddress: prev.billingAddress || c.billingAddress,
          }));
        }
      })
      .catch(err => {
        console.error('getClient failed', err);
        setClientData(null);
      })
      .finally(() => active && setLoadingClient(false));

    return () => { active = false; };
  }, [invoice.clientCode]);

  // ==================== RECALCULATE AMOUNTS ====================
  function recalcInvoice(draft) {
    const base = Number(draft.baseHourlyRate || 0);

    const items = (draft.items || []).map(it => {
      const hours = Number(it.hours || 0);

      const rate = it.userEditedRate
        ? Number(it.rate || 0)
        : (Number(it.rate) > 0 ? Number(it.rate) : base) || 0;

      const amount = Math.round(rate * hours * 100) / 100;
      return { ...it, rate, amount };
    });

    const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    const gst = subtotal * 0.18;
    const total = subtotal + gst;

    const serviceFeeFraction = percentToFraction(draft.serviceFeePct);
    const serviceFeeAmount = total * serviceFeeFraction;
    const netEarnings = total - serviceFeeAmount;

    return {
      ...draft,
      items,
      subtotal,
      gst,
      total,
      serviceFeeAmount,
      netEarnings,
    };
  }

  // ==================== UPDATE INVOICE STATE ====================
  const updateInvoice = (patchOrUpdater) =>
    setInvoice(prev => {
      const patch =
        typeof patchOrUpdater === 'function'
          ? patchOrUpdater(prev)
          : patchOrUpdater || {};
      return recalcInvoice({ ...prev, ...patch });
    });

  // ==================== VALIDATION (for final save) ====================
  const handleValidateInvoice = () => {
    if (!invoice.projectCode || invoice.projectCode.trim() === '') {
      return { ok: false, err: 'Please enter a project code.' };
    }
    if (!invoice.consultantName || invoice.consultantName.trim() === '') {
      return { ok: false, err: 'Please enter consultant name.' };
    }
    const hasHours = (invoice.items || []).some(it => Number(it.hours || 0) > 0);
    if (!hasHours) {
      return { ok: false, err: 'Add at least one team member with hours.' };
    }
    return { ok: true };
  };

  // ==================== LOAD DRAFT BY INVOICE ID ====================
  const loadDraftById = async (invoiceId) => {
    const trimmed = (invoiceId || '').trim();
    if (!trimmed) {
      alert('Please enter an Invoice ID to load.');
      return;
    }

    try {
      const data = await getInvoiceById(trimmed);
      console.log('🔄 Loaded invoice from backend:', data);

      const serviceFeePctPercent = incomingServiceFeeToPercent(data.serviceFeePct);

      updateInvoice(prev => ({
        ...prev,
        invoiceId: data.invoiceId || trimmed,
        invoiceNumber: data.invoiceNumber || '',
        projectCode: data.projectCode || '',
        clientCode: data.clientCode || '',
        consultantId: data.consultantId || '',
        consultantName: data.consultantName || '',
        date: data.invoiceDate
          ? String(data.invoiceDate).slice(0, 10)
          : prev.date,
        billingAddress: data.billingAddress || '',
        subtotal: Number(data.subtotal || 0),
        gst: Number(data.gst || 0),
        serviceFeePct: serviceFeePctPercent,
        serviceFeeAmount: Number(data.serviceFee || 0),
        netEarnings: Number(data.netEarnings || 0),
        items: (data.items || []).map(it => ({
          name: it.name,
          mode: it.mode,
          hours: Number(it.hours || 0),
          rate: Number(it.rate || 0),
          amount: Number(it.amount || 0),
        })),
        notes: data.notes || '',
      }));

      alert('✅ Draft loaded successfully');
    } catch (err) {
      console.error('loadDraftById error', err);
      alert(`❌ Failed to load draft: ${err.message || err}`);
    }
  };

  // ==================== SAVE INVOICE (draft or final) ====================
  const handleSaveClick = async (mode = 'final') => {
    const isFinal = mode === 'final';

    if (isFinal) {
      const validation = handleValidateInvoice();
      if (!validation.ok) {
        alert(validation.err);
        return;
      }
    }

    try {
      const payload = {
        // identify invoice (null for new draft, value for updates)
        invoiceId: invoice.invoiceId || null,

        // core fields
        projectCode: invoice.projectCode,
        clientCode: invoice.clientCode,
        consultantId: invoice.consultantId,
        consultantName: invoice.consultantName,
        billingAddress: invoice.billingAddress,
        invoiceDate: invoice.date, // Apps Script expects invoiceDate

        // money fields
        subtotal: invoice.subtotal,
        gst: invoice.gst,
        serviceFeePct: percentToFraction(invoice.serviceFeePct), // fraction (0.25)
        serviceFee: invoice.serviceFeeAmount,
        netEarnings: invoice.netEarnings,

        // line items
        items: (invoice.items || []).map(item => ({
          name: item.name,
          mode: item.mode,
          hours: item.hours,
          rate: item.rate,
          amount: item.amount,
        })),

        // notes
        notes: invoice.notes,

        // draft vs final
        finalize: isFinal,                            // true => FINAL, false => DRAFT
        status: isFinal ? 'FINAL' : 'DRAFT',
      };

      console.log('🚀 Sending invoice payload to backend:', payload);

      const resp = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Save failed: ${resp.status} ${text}`);
      }

      const data = await resp.json();
      console.log('✅ Backend / Apps Script response:', data);

      const newInvoiceId = data?.invoiceId || data?.invoice_id || null;
      const invNum =
        data?.invoiceNumber ||
        data?.invoice_number ||
        data?.invoice_id ||
        data?.id ||
        null;

      const patch = {};
      if (newInvoiceId) patch.invoiceId = newInvoiceId;
      if (isFinal && invNum) patch.invoiceNumber = invNum;

      if (Object.keys(patch).length > 0) {
        updateInvoice(patch);
      }

      alert(
        isFinal
          ? `✅ Invoice saved successfully!${invNum ? ` Invoice #${invNum}` : ''}`
          : '✅ Draft saved successfully!'
      );
    } catch (err) {
      console.error('Save invoice error', err);
      alert(`❌ Failed to save invoice: ${err.message || err}`);
    }
  };

  // simple row style for totals box
  const totalsRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
    padding: '4px 0',
  };

  // ==================== RENDER ====================
  return (
    <div className="app-container">
      {/* ---------- Visible app shell (form UI) ---------- */}
      <div className="app-shell">
        {/* Header */}
        <header className="app-header">
          <h1 className="title">Invoice Generator</h1>
          <p className="subtitle">Create professional invoices in seconds</p>
        </header>

        {/* Main Layout – single column */}
        <main className="single-column-main">
          {/* Project Details */}
          <div className="card mb-2">
            <div className="card-header">
              <h2 className="card-title">Project &amp; Client Details</h2>
            </div>
            <ProjectDetails
              invoice={invoice}
              updateInvoice={updateInvoice}
              projectData={projectData}
              clientData={clientData}
              loadingProject={loadingProject}
              loadingClient={loadingClient}
              fetchError={fetchError}
            />
          </div>

          {/* Team + Stages in one section */}
          <div className="card mb-2">
            <div className="card-header">
              <h2 className="card-title">Team Members &amp; Stages</h2>
            </div>
            <TeamSummary
              invoice={invoice}
              updateInvoice={updateInvoice}
              teamOptions={teamOptions}
              loadingTeam={loadingTeam}
              baseHourlyRate={invoice.baseHourlyRate || 0}
            />
          </div>

          {/* Notes + Billing Summary */}
          <div className="card mb-2">
            <div className="card-header">
              <h2 className="card-title">Notes &amp; Billing Summary</h2>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.2fr)',
                gap: '16px',
                alignItems: 'flex-start',
              }}
            >
              {/* LEFT: Notes */}
              <div>
                <label className="label">Notes / Inclusions (Optional)</label>
                <textarea
                  className="textarea"
                  rows={6}
                  placeholder="Add inclusions, scope of work, payment link or other notes that should appear on the invoice…"
                  value={invoice.notes}
                  onChange={e => updateInvoice({ notes: e.target.value })}
                />
              </div>

              {/* RIGHT: Billing totals */}
              <div>
                <div
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    background: '#f9fafb',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      marginBottom: '8px',
                    }}
                  >
                    Billing Total
                  </div>

                  <div style={totalsRowStyle}>
                    <span>Subtotal</span>
                    <span>{formatINR(invoice.subtotal)}</span>
                  </div>

                  <div style={totalsRowStyle}>
                    <span>GST (18%)</span>
                    <span>{formatINR(invoice.gst)}</span>
                  </div>

                  <div
                    style={{
                      ...totalsRowStyle,
                      fontWeight: 600,
                      borderTop: '1px solid #e5e7eb',
                      marginTop: '4px',
                      paddingTop: '6px',
                    }}
                  >
                    <span>Total (incl. GST)</span>
                    <span>{formatINR(invoice.total)}</span>
                  </div>

                  {/* Consultant-only info: hidden in client preview / print */}
                  <div
                    className="consultant-only"
                    style={{ ...totalsRowStyle, marginTop: '8px' }}
                  >
                    <span>Service Fee ({invoice.serviceFeePct || 0}%)</span>
                    <span>-{formatINR(invoice.serviceFeeAmount)}</span>
                  </div>

                  <div
                    className="consultant-only"
                    style={{ ...totalsRowStyle, fontWeight: 600 }}
                  >
                    <span>Your Net Earnings</span>
                    <span>{formatINR(invoice.netEarnings)}</span>
                  </div>

                  <p
                    className="consultant-only"
                    style={{
                      marginTop: '6px',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                    }}
                  >
                    Visible only to you. This net earnings information will not
                    appear on client previews or generated invoices.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer Actions Bar */}
        <div className="footer-actions" role="region" aria-label="Invoice actions">
          <div className="left">
            {/* Load draft by invoiceId */}
            <input
              className="input"
              style={{ marginRight: '8px', maxWidth: '220px' }}
              placeholder="Enter Invoice ID to load draft"
              value={loadId}
              onChange={e => setLoadId(e.target.value)}
            />
            <button
              className="btn btn-ghost"
              onClick={() => loadDraftById(loadId)}
              title="Load draft by Invoice ID"
            >
              🔄 Load Draft
            </button>

            <button
              className="btn btn-ghost"
              onClick={() => window.print()}
              title="Preview / Print"
            >
              📄 Preview
            </button>

            <button
              className="btn btn-ghost"
              onClick={() => {
                const subject = encodeURIComponent(
                  `Invoice - ${invoice.projectCode || 'Preview'}`
                );
                const body = encodeURIComponent(
                  `Please find the invoice for project ${invoice.projectCode || ''}.\n\n` +
                  `Total (incl. GST): ₹${Number(invoice.total || 0).toLocaleString('en-IN')}\n\n` +
                  `Best regards,\n${invoice.consultantName || ''}`
                );
                window.location.href = `mailto:?subject=${subject}&body=${body}`;
              }}
              title="Share via email"
            >
              ✉️ Share
            </button>
          </div>

          <div className="right">
            <div className="footer-total">
              <span className="footer-total-label">Total:</span>
              <span>₹{Number(invoice.total || 0).toLocaleString('en-IN')}</span>
            </div>

            <button
              className="btn btn-ghost"
              onClick={() => handleSaveClick('draft')}
            >
              💾 Save as Draft
            </button>

            <button
              className="btn btn-success"
              onClick={() => handleSaveClick('final')}
            >
              ✅ Save Invoice
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Hidden print / bill ONLY ---------- */}
      <div className="hidden-preview-root" aria-hidden="true">
        <div
          id="invoice-preview-root"
          className="invoice-preview-wrapper"
        >
          <InvoicePrint
            invoice={invoice}
            clientData={clientData}
            projectData={projectData}
          />
        </div>
      </div>
    </div>
  );
}
