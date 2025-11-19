// // src/App.jsx
// import React, { useEffect, useState } from 'react'
// import ProjectDetails from './components/ProjectDetails'
// import TeamSummary from './components/TeamSummary'
// import InvoicePreview from './components/InvoicePreview'
// import SummaryActions from './components/SummaryActions'
// import { getTeam, getProject, getClient } from './api/api'

// /**
//  * Helper: debounce a value -> returns debounced value
//  */
// function useDebouncedValue(value, delay = 400) {
//   const [debounced, setDebounced] = useState(value)
//   useEffect(() => {
//     const t = setTimeout(() => setDebounced(value), delay)
//     return () => clearTimeout(t)
//   }, [value, delay])
//   return debounced
// }

// /**
//  * incoming serviceFee may be 0.25 (fraction) or 25 (percent).
//  * Return percent form (e.g. 25)
//  */
// function incomingServiceFeeToPercent(v) {
//   const n = (v === undefined || v === null) ? 0 : Number(v)
//   if (isNaN(n)) return 0
//   return n > 1 ? n : Math.round(n * 10000) / 100 // 0.25 -> 25.00
// }

// /**
//  * convert percent to fraction for sending to backend (25 -> 0.25)
//  */
// function percentToFraction(v) {
//   const n = Number(v || 0)
//   if (isNaN(n)) return 0
//   return n > 1 ? n / 100 : n
// }

// const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'

// export default function App() {
//   // lists & loaders
//   const [teamOptions, setTeamOptions] = useState([])
//   const [loadingTeam, setLoadingTeam] = useState(false)

//   // fetched project/client details
//   const [projectData, setProjectData] = useState(null)
//   const [clientData, setClientData] = useState(null)
//   const [loadingProject, setLoadingProject] = useState(false)
//   const [loadingClient, setLoadingClient] = useState(false)
//   const [fetchError, setFetchError] = useState(null)

//   // main invoice state (single source of truth)
//   const [invoice, setInvoice] = useState({
//     projectCode: '',
//     clientCode: '',
//     consultantName: '',
//     date: new Date().toISOString().slice(0, 10),
//     billingAddress: '',
//     items: [], // team rows
//     notes: '',
//     invoiceNumber: '',
//     subtotal: 0,
//     serviceFeePct: 0, // percent (e.g., 25)
//     total: 0,
//     baseHourlyRate: 0,
//   })

//   // debounced projectCode to avoid fetching on every keystroke
//   const debouncedProjectCode = useDebouncedValue(invoice.projectCode, 450)

//   // --- load team options once ---
//   useEffect(() => {
//     let mounted = true
//     setLoadingTeam(true)
//     getTeam()
//       .then(t => {
//         if (!mounted) return
//         // normalize to expected template fields for TeamSummary
//         const items = Array.isArray(t) ? t : (t?.team || [])
//         const normalized = items.map(x => ({
//           id: x.Id || x.id || x.memberCode || x.code,
//           name: x.Name || x.name || x.label || x.memberName,
//           factor: typeof x.factor !== 'undefined' ? Number(x.factor) : 1,
//           defaultMode: x.defaultMode || x.mode || 'Online',
//           defaultRate: Number(x.Hourly_rate || x.hourlyRate || x.defaultRate || 0),
//         }))
//         setTeamOptions(normalized)
//       })
//       .catch(err => {
//         console.error('getTeam failed', err)
//         setTeamOptions([])
//       })
//       .finally(() => mounted && setLoadingTeam(false))

//     return () => { mounted = false }
//   }, [])

//   // --- when debounced projectCode changes, fetch project details ---
//   useEffect(() => {
//     const code = (debouncedProjectCode || '').toString().trim()
//     if (!code) {
//       setProjectData(null)
//       // do not wipe user-edited client/billing fields
//       return
//     }

//     let active = true
//     setFetchError(null)
//     setLoadingProject(true)
//     getProject(code)
//       .then(p => {
//         if (!active) return
//         setProjectData(p || null)

//         // Normalize incoming service fee to percent form (25)
//         const svcPct = (p && typeof p.serviceFeePct !== 'undefined')
//           ? incomingServiceFeeToPercent(p.serviceFeePct)
//           : invoice.serviceFeePct

//         // Set baseHourlyRate and serviceFeePct on invoice state (percent form)
//         setInvoice(prev => ({
//           ...prev,
//           serviceFeePct: typeof svcPct === 'number' ? svcPct : prev.serviceFeePct,
//           baseHourlyRate: (p && (typeof p.hourlyRate !== 'undefined')) ? Number(p.hourlyRate || 0) : prev.baseHourlyRate,
//         }))

//         // If project has a clientCode, set it (this triggers client fetch)
//         if (p?.clientCode) {
//           setInvoice(prev => ({ ...prev, clientCode: p.clientCode }))
//         } else {
//           // If project has defaultBillingAddress and user hasn't entered one, set it
//           if (p?.defaultBillingAddress) {
//             setInvoice(prev => ({ ...prev, billingAddress: prev.billingAddress || p.defaultBillingAddress }))
//           }
//         }
//       })
//       .catch(err => {
//         console.error('getProject failed', err)
//         setProjectData(null)
//         setFetchError(String(err?.message || err))
//       })
//       .finally(() => active && setLoadingProject(false))

//     return () => { active = false }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [debouncedProjectCode])

//   // --- fetch client when clientCode is set ---
//   useEffect(() => {
//     const code = (invoice.clientCode || '').toString().trim()
//     if (!code) { setClientData(null); return }

//     let active = true
//     setLoadingClient(true)
//     getClient(code)
//       .then(c => {
//         if (!active) return
//         setClientData(c || null)
//         if (c?.billingAddress) {
//           // fill billing address only if user hasn't typed one
//           setInvoice(prev => ({ ...prev, billingAddress: prev.billingAddress || c.billingAddress }))
//         }
//       })
//       .catch(err => {
//         console.error('getClient failed', err)
//         setClientData(null)
//       })
//       .finally(() => active && setLoadingClient(false))

//     return () => { active = false }
//   }, [invoice.clientCode])

//   // --- Recalculate item rate & amount when baseHourlyRate changes OR items structure changes ---
//   useEffect(() => {
//     setInvoice(prev => {
//       const base = Number(prev.baseHourlyRate || 0)
//       const items = (prev.items || []).map(it => {
//         const factor = Number(it.factor || 1)
//         const hours = Number(it.hours || 0)
//         const computedRate = Math.round((base * factor) * 100) / 100
//         const rate = (it.userEditedRate ? Number(it.rate || 0) : computedRate) || 0
//         const amount = Math.round((rate * hours) * 100) / 100
//         return { ...it, rate, amount }
//       })
//       const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
//       // serviceFeePct is percent form in invoice (e.g., 25). Convert to fraction for calc.
//       const total = Math.round((subtotal + (subtotal * (Number(prev.serviceFeePct || 0) / 100))) * 100) / 100
//       const changed = JSON.stringify(items) !== JSON.stringify(prev.items) || subtotal !== prev.subtotal || total !== prev.total
//       if (!changed) return prev
//       return { ...prev, items, subtotal, total }
//     })
//     // run when baseHourlyRate, items length or serviceFeePct change
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [invoice.baseHourlyRate, invoice.items.length, invoice.serviceFeePct])

//   // --- When items change (deep) recalc totals — covers manual edits from TeamSummary ---
//   useEffect(() => {
//     setInvoice(prev => {
//       const items = (prev.items || []).map(it => {
//         const rate = Number(it.rate || 0)
//         const hours = Number(it.hours || 0)
//         const amount = Math.round((rate * hours) * 100) / 100
//         return { ...it, amount }
//       })
//       const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
//       const total = Math.round((subtotal + (subtotal * (Number(prev.serviceFeePct || 0) / 100))) * 100) / 100
//       if (prev.subtotal === subtotal && prev.total === total && JSON.stringify(prev.items) === JSON.stringify(items)) return prev
//       return { ...prev, items, subtotal, total }
//     })
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [invoice.items])

//   // small helper to update invoice partially
//   const updateInvoice = (patch) => setInvoice(prev => ({ ...prev, ...patch }))

//   // ---- Validation + Save handlers for footer ----
//   const handleValidateInvoice = () => {
//     if (!invoice.projectCode || invoice.projectCode.trim() === '') return { ok: false, err: 'Please enter a project code.' }
//     if (!invoice.consultantName || invoice.consultantName.trim() === '') return { ok: false, err: 'Please enter consultant name.' }
//     const hasHours = (invoice.items || []).some(it => Number(it.hours || 0) > 0)
//     if (!hasHours) return { ok: false, err: 'Add at least one team member and set hours.' }
//     return { ok: true }
//   }

//   const handleSaveClick = async () => {
//     const v = handleValidateInvoice()
//     if (!v.ok) {
//       alert(v.err)
//       return
//     }

//     try {
//       const payload = {
//         projectCode: invoice.projectCode,
//         clientCode: invoice.clientCode,
//         consultantName: invoice.consultantName,
//         date: invoice.date,
//         billingAddress: invoice.billingAddress,
//         items: invoice.items,
//         notes: invoice.notes,
//         subtotal: invoice.subtotal,
//         serviceFeePct: percentToFraction(invoice.serviceFeePct), // backend may expect fraction
//       }
//       const resp = await fetch(`${API_BASE}/invoices`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//       })
//       if (!resp.ok) {
//         const text = await resp.text()
//         throw new Error(`Save failed: ${resp.status} ${text}`)
//       }
//       const data = await resp.json()
//       const invNum = data?.invoiceNumber || data?.invoice_id || data?.id || null
//       if (invNum) updateInvoice({ invoiceNumber: invNum })
//       alert('Invoice saved successfully' + (invNum ? ` — ${invNum}` : ''))
//     } catch (err) {
//       console.error('save invoice error', err)
//       alert('Failed to save invoice: ' + (err.message || err))
//     }
//   }

//   // quick PDF/preview handler (basic image-open fallback)
//   const handleGeneratePDF = async () => {
//     const root = document.getElementById('invoice-preview-root')
//     if (!root) { alert('Invoice preview not available'); return }
//     if (typeof html2canvas === 'undefined') {
//       alert('html2canvas not loaded. Use Preview (print) or Save instead.')
//       return
//     }
//     try {
//       const canvas = await html2canvas(root, { scale: 2 })
//       const imgData = canvas.toDataURL('image/png')
//       const w = window.open('')
//       if (w) {
//         w.document.write(`<img src="${imgData}" style="width:100%"/>`)
//       } else {
//         alert('Popup blocked — open in a new tab to view the generated preview.')
//       }
//     } catch (e) {
//       console.error('pdf gen error', e)
//       alert('PDF generation failed: ' + e.message)
//     }
//   }

//   return (
//     <div className="app-container">
//       <header className="app-header">
//         <h1 className="title">Consultant Invoice Builder — Draft</h1>
//       </header>

//       <main className="main-grid">
//         <section>
//           <div className="card mb-2">
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

//           <div className="card mb-2">
//             <TeamSummary
//               invoice={invoice}
//               updateInvoice={updateInvoice}
//               teamOptions={teamOptions}
//               loadingTeam={loadingTeam}
//               baseHourlyRate={invoice.baseHourlyRate || 0}
//             />
//           </div>

//           <div className="card mb-2">
//             <label className="label">Notes</label>
//             <textarea
//               className="textarea"
//               value={invoice.notes}
//               onChange={e => updateInvoice({ notes: e.target.value })}
//             />
//           </div>

//           <div className="card">
//             <SummaryActions
//               invoice={invoice}
//               updateInvoice={updateInvoice}
//               projectData={projectData}
//               clientData={clientData}
//               apiBase={API_BASE}
//               percentToFraction={percentToFraction} // helper for sending
//             />
//           </div>
//         </section>

//         <aside>
//           <div id="invoice-preview-root" className="card sticky invoice-preview-wrapper">
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
//               <div style={{ fontSize: 14, fontWeight: 700 }}>Invoice Preview</div>
//               <div style={{ fontSize: 12, color: '#666' }}>{invoice.date}</div>
//             </div>

//             <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
//               <InvoicePreview invoice={invoice} clientData={clientData} projectData={projectData} />
//             </div>
//           </div>
//         </aside>
//       </main>

//       {/* Footer actions */}
//       <div className="footer-actions" role="region" aria-label="Invoice actions">
//         <div className="left">
//           <button
//             className="btn btn-ghost"
//             onClick={() => window.print()}
//             title="Preview / Print"
//           >
//             Preview
//           </button>

//           <button
//             className="btn btn-ghost"
//             onClick={handleGeneratePDF}
//             title="Generate PDF (image preview)"
//           >
//             Generate PDF
//           </button>

//           <button
//             className="btn btn-ghost"
//             onClick={() => {
//               const subject = encodeURIComponent(`Invoice preview — ${invoice.projectCode || ''}`)
//               const body = encodeURIComponent('Please find the invoice preview. Use Save to generate official invoice.')
//               window.location.href = `mailto:?subject=${subject}&body=${body}`
//             }}
//             title="Share via email"
//           >
//             Share
//           </button>
//         </div>

//         <div className="right" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
//           <div className="footer-total">Total: ₹{Number(invoice.total || 0).toLocaleString()}</div>
//           <button className="btn btn-primary" onClick={handleSaveClick}>Save Invoice</button>
//         </div>
//       </div>
//     </div>
//   )
// }
// src/App.jsx
// import React, { useEffect, useState } from 'react'
// import ProjectDetails from './components/ProjectDetails'
// import TeamSummary from './components/TeamSummary'
// import InvoicePreview from './components/InvoicePreview'
// import SummaryActions from './components/SummaryActions'
// import { getTeam, getProject, getClient } from './api/api'

// function useDebouncedValue(value, delay = 400) {
//   const [debounced, setDebounced] = useState(value)
//   useEffect(() => {
//     const t = setTimeout(() => setDebounced(value), delay)
//     return () => clearTimeout(t)
//   }, [value, delay])
//   return debounced
// }

// function incomingServiceFeeToPercent(v) {
//   const n = (v === undefined || v === null) ? 0 : Number(v)
//   if (isNaN(n)) return 0
//   return n > 1 ? n : Math.round(n * 10000) / 100
// }

// function percentToFraction(v) {
//   const n = Number(v || 0)
//   if (isNaN(n)) return 0
//   return n > 1 ? n / 100 : n
// }

// const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'

// export default function App() {
//   const [teamOptions, setTeamOptions] = useState([])
//   const [loadingTeam, setLoadingTeam] = useState(false)

//   const [projectData, setProjectData] = useState(null)
//   const [clientData, setClientData] = useState(null)
//   const [loadingProject, setLoadingProject] = useState(false)
//   const [loadingClient, setLoadingClient] = useState(false)
//   const [fetchError, setFetchError] = useState(null)

//   const [invoice, setInvoice] = useState({
//     projectCode: '',
//     clientCode: '',
//     consultantName: '',
//     date: new Date().toISOString().slice(0, 10),
//     billingAddress: '',
//     items: [],
//     notes: '',
//     invoiceNumber: '',
//     subtotal: 0,
//     serviceFeePct: 0,
//     total: 0,
//     baseHourlyRate: 0,
//   })

//   const debouncedProjectCode = useDebouncedValue(invoice.projectCode, 450)

//   useEffect(() => {
//     let mounted = true
//     setLoadingTeam(true)
//     getTeam()
//       .then(t => {
//         if (!mounted) return
//         const items = Array.isArray(t) ? t : (t?.team || [])
//         const normalized = items.map(x => ({
//           id: x.Id || x.id || x.memberCode || x.code,
//           name: x.Name || x.name || x.label || x.memberName,
//           defaultMode: x.defaultMode || x.mode || 'Online',
//           defaultRate: Number(x.Hourly_rate || x.hourlyRate || x.defaultRate || 0),
//         }))
//         setTeamOptions(normalized)
//       })
//       .catch(err => {
//         console.error('getTeam failed', err)
//         setTeamOptions([])
//       })
//       .finally(() => mounted && setLoadingTeam(false))
//     return () => { mounted = false }
//   }, [])

//   useEffect(() => {
//     const code = (debouncedProjectCode || '').toString().trim()
//     if (!code) {
//       setProjectData(null)
//       return
//     }

//     let active = true
//     setFetchError(null)
//     setLoadingProject(true)
//     getProject(code)
//       .then(p => {
//         if (!active) return
//         setProjectData(p || null)
//         const svcPct = (p && typeof p.serviceFeePct !== 'undefined')
//           ? incomingServiceFeeToPercent(p.serviceFeePct)
//           : invoice.serviceFeePct

//         setInvoice(prev => ({
//           ...prev,
//           serviceFeePct: typeof svcPct === 'number' ? svcPct : prev.serviceFeePct,
//           baseHourlyRate: (p && (typeof p.hourlyRate !== 'undefined')) ? Number(p.hourlyRate || 0) : prev.baseHourlyRate,
//         }))

//         if (p?.clientCode) {
//           setInvoice(prev => ({ ...prev, clientCode: p.clientCode }))
//         } else if (p?.defaultBillingAddress) {
//           setInvoice(prev => ({ ...prev, billingAddress: prev.billingAddress || p.defaultBillingAddress }))
//         }
//       })
//       .catch(err => {
//         console.error('getProject failed', err)
//         setProjectData(null)
//         setFetchError(String(err?.message || err))
//       })
//       .finally(() => active && setLoadingProject(false))

//     return () => { active = false }
//   }, [debouncedProjectCode])

//   useEffect(() => {
//     const code = (invoice.clientCode || '').toString().trim()
//     if (!code) { setClientData(null); return }

//     let active = true
//     setLoadingClient(true)
//     getClient(code)
//       .then(c => {
//         if (!active) return
//         setClientData(c || null)
//         if (c?.billingAddress) {
//           setInvoice(prev => ({ ...prev, billingAddress: prev.billingAddress || c.billingAddress }))
//         }
//       })
//       .catch(err => {
//         console.error('getClient failed', err)
//         setClientData(null)
//       })
//       .finally(() => active && setLoadingClient(false))

//     return () => { active = false }
//   }, [invoice.clientCode])

//   // Recalc amounts -- NOTE: factor removed. Use baseHourlyRate (or manual rate)
//   useEffect(() => {
//     setInvoice(prev => {
//       const base = Number(prev.baseHourlyRate || 0)
//       const items = (prev.items || []).map(it => {
//         const hours = Number(it.hours || 0)
//         const rate = (it.userEditedRate ? Number(it.rate || 0) : (Number(it.rate) > 0 ? Number(it.rate) : base)) || 0
//         const amount = Math.round((rate * hours) * 100) / 100
//         return { ...it, rate, amount }
//       })
//       const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
//       const total = Math.round((subtotal + (subtotal * (Number(prev.serviceFeePct || 0) / 100))) * 100) / 100
//       const changed = JSON.stringify(items) !== JSON.stringify(prev.items) || subtotal !== prev.subtotal || total !== prev.total
//       if (!changed) return prev
//       return { ...prev, items, subtotal, total }
//     })
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [invoice.baseHourlyRate, invoice.items.length, invoice.serviceFeePct])

//   useEffect(() => {
//     setInvoice(prev => {
//       const items = (prev.items || []).map(it => {
//         const rate = Number(it.rate || 0)
//         const hours = Number(it.hours || 0)
//         const amount = Math.round((rate * hours) * 100) / 100
//         return { ...it, amount }
//       })
//       const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
//       const total = Math.round((subtotal + (subtotal * (Number(prev.serviceFeePct || 0) / 100))) * 100) / 100
//       if (prev.subtotal === subtotal && prev.total === total && JSON.stringify(prev.items) === JSON.stringify(items)) return prev
//       return { ...prev, items, subtotal, total }
//     })
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [invoice.items])

//   const updateInvoice = (patch) => setInvoice(prev => ({ ...prev, ...patch }))

//   // Validation & Save
//   const handleValidateInvoice = () => {
//     if (!invoice.projectCode || invoice.projectCode.trim() === '') return { ok: false, err: 'Please enter a project code.' }
//     if (!invoice.consultantName || invoice.consultantName.trim() === '') return { ok: false, err: 'Please enter consultant name.' }
//     const hasHours = (invoice.items || []).some(it => Number(it.hours || 0) > 0)
//     if (!hasHours) return { ok: false, err: 'Add at least one team member and set hours.' }
//     return { ok: true }
//   }

//   const handleSaveClick = async () => {
//     const v = handleValidateInvoice()
//     if (!v.ok) { alert(v.err); return }
//     try {
//       const payload = {
//         projectCode: invoice.projectCode,
//         clientCode: invoice.clientCode,
//         consultantName: invoice.consultantName,
//         date: invoice.date,
//         billingAddress: invoice.billingAddress,
//         items: invoice.items,
//         notes: invoice.notes,
//         subtotal: invoice.subtotal,
//         serviceFeePct: percentToFraction(invoice.serviceFeePct),
//       }
//       const resp = await fetch(`${API_BASE}/invoices`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//       })
//       if (!resp.ok) {
//         const text = await resp.text()
//         throw new Error(`Save failed: ${resp.status} ${text}`)
//       }
//       const data = await resp.json()
//       const invNum = data?.invoiceNumber || data?.invoice_id || data?.id || null
//       if (invNum) updateInvoice({ invoiceNumber: invNum })
//       alert('Invoice saved successfully' + (invNum ? ` — ${invNum}` : ''))
//     } catch (err) {
//       console.error('save invoice error', err)
//       alert('Failed to save invoice: ' + (err.message || err))
//     }
//   }

//   // PDF generation (image preview fallback)
//   const handleGeneratePDF = async () => {
//     const root = document.getElementById('invoice-preview-root')
//     if (!root) { alert('Invoice preview not available'); return }
//     if (typeof html2canvas === 'undefined') {
//       alert('html2canvas not loaded. Use Preview (print) or Save instead.')
//       return
//     }
//     try {
//       const canvas = await html2canvas(root, { scale: 2 })
//       const imgData = canvas.toDataURL('image/png')
//       const w = window.open('')
//       if (w) w.document.write(`<img src="${imgData}" style="width:100%"/>`)
//       else alert('Popup blocked — open in a new tab to view the generated preview.')
//     } catch (e) {
//       console.error('pdf gen error', e)
//       alert('PDF generation failed: ' + e.message)
//     }
//   }

//   return (
//     <div className="app-container">
//       <header className="app-header">
//         <h1 className="title">Invoice Generator</h1>
//       </header>

//       <main className="main-grid">
//         <section>
//           <div className="card mb-2">
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

//           <div className="card mb-2">
//             <TeamSummary
//               invoice={invoice}
//               updateInvoice={updateInvoice}
//               teamOptions={teamOptions}
//               loadingTeam={loadingTeam}
//               baseHourlyRate={invoice.baseHourlyRate || 0}
//             />
//           </div>

//           <div className="card mb-2">
//             <label className="label">Notes</label>
//             <textarea
//               className="textarea"
//               value={invoice.notes}
//               onChange={e => updateInvoice({ notes: e.target.value })}
//             />
//           </div>

//           <div className="card">
//             <SummaryActions
//               invoice={invoice}
//               updateInvoice={updateInvoice}
//               projectData={projectData}
//               clientData={clientData}
//               apiBase={API_BASE}
//               percentToFraction={percentToFraction}
//             />
//           </div>
//         </section>

//         <aside>
//           <div id="invoice-preview-root" className="card sticky invoice-preview-wrapper">
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
//               <div style={{ fontSize: 14, fontWeight: 700 }}>Invoice Preview</div>
//               <div style={{ fontSize: 12, color: '#666' }}>{invoice.date}</div>
//             </div>

//             <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
//               <InvoicePreview invoice={invoice} clientData={clientData} projectData={projectData} />
//             </div>
//           </div>
//         </aside>
//       </main>

//       <div className="footer-actions" role="region" aria-label="Invoice actions">
//         <div className="left">
//           <button className="btn btn-ghost" onClick={() => window.print()} title="Preview / Print">Preview</button>
//           <button className="btn btn-ghost" onClick={handleGeneratePDF} title="Generate PDF (image preview)">Generate PDF</button>
//           <button className="btn btn-ghost" onClick={() => { const s = encodeURIComponent(`Invoice preview — ${invoice.projectCode || ''}`); const b = encodeURIComponent('Please find the invoice preview. Use Save to generate official invoice.'); window.location.href = `mailto:?subject=${s}&body=${b}` }} title="Share via email">Share</button>
//         </div>

//         <div className="right" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
//           <div className="footer-total">Total: ₹{Number(invoice.total || 0).toLocaleString()}</div>
//           <button className="btn btn-primary" onClick={handleSaveClick}>Save Invoice</button>
//         </div>
//       </div>
//     </div>
//   )
// }
// src/App.jsx
import React, { useEffect, useState } from 'react';
import './styles.css';
import ProjectDetails from './components/ProjectDetails';
import TeamSummary from './components/TeamSummary';
import InvoicePreview from './components/InvoicePreview';
import SummaryActions from './components/SummaryActions';
import { getTeam, getProject, getClient } from './api/api';

// Debounce hook
function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Service fee conversion helpers
function incomingServiceFeeToPercent(v) {
  const n = (v === undefined || v === null) ? 0 : Number(v);
  if (isNaN(n)) return 0;
  return n > 1 ? n : Math.round(n * 10000) / 100;
}

function percentToFraction(v) {
  const n = Number(v || 0);
  if (isNaN(n)) return 0;
  return n > 1 ? n / 100 : n;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export default function App() {
  // Team data
  const [teamOptions, setTeamOptions] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Project & Client data
  const [projectData, setProjectData] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Main invoice state
  const [invoice, setInvoice] = useState({
    projectCode: '',
    clientCode: '',
    consultantName: '',
    date: new Date().toISOString().slice(0, 10),
    billingAddress: '',
    items: [],
    notes: '',
    invoiceNumber: '',
    subtotal: 0,
    serviceFeePct: 25, // Default 25%
    total: 0,
    baseHourlyRate: 6000, // Default rate
  });

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
          defaultRate: Number(x.Hourly_rate || x.hourlyRate || x.defaultRate || 0),
        }));
        setTeamOptions(normalized);
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
      return;
    }

    let active = true;
    setFetchError(null);
    setLoadingProject(true);

    getProject(code)
      .then(p => {
        if (!active) return;
        setProjectData(p || null);

        // Update service fee percentage
        const svcPct = (p && typeof p.serviceFeePct !== 'undefined')
          ? incomingServiceFeeToPercent(p.serviceFeePct)
          : invoice.serviceFeePct;

        setInvoice(prev => ({
          ...prev,
          serviceFeePct: typeof svcPct === 'number' ? svcPct : prev.serviceFeePct,
          baseHourlyRate: (p && (typeof p.hourlyRate !== 'undefined')) 
            ? Number(p.hourlyRate || 0) 
            : prev.baseHourlyRate,
        }));

        // Auto-fill client code if available
        if (p?.clientCode) {
          setInvoice(prev => ({ ...prev, clientCode: p.clientCode }));
        }

        // Auto-fill billing address from project
        if (p?.defaultBillingAddress && !invoice.billingAddress) {
          setInvoice(prev => ({ 
            ...prev, 
            billingAddress: prev.billingAddress || p.defaultBillingAddress 
          }));
        }
      })
      .catch(err => {
        console.error('getProject failed', err);
        setProjectData(null);
        setFetchError(String(err?.message || err));
      })
      .finally(() => active && setLoadingProject(false));

    return () => { active = false; };
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

        // Auto-fill billing address from client
        if (c?.billingAddress && !invoice.billingAddress) {
          setInvoice(prev => ({ 
            ...prev, 
            billingAddress: prev.billingAddress || c.billingAddress 
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
  useEffect(() => {
    setInvoice(prev => {
      const base = Number(prev.baseHourlyRate || 0);
      
      const items = (prev.items || []).map(it => {
        const hours = Number(it.hours || 0);
        const rate = it.userEditedRate 
          ? Number(it.rate || 0) 
          : (Number(it.rate) > 0 ? Number(it.rate) : base) || 0;
        const amount = Math.round((rate * hours) * 100) / 100;
        return { ...it, rate, amount };
      });

      const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
      const gst = subtotal * 0.18;
      const totalWithGst = subtotal + gst;

      const changed = 
        JSON.stringify(items) !== JSON.stringify(prev.items) || 
        subtotal !== prev.subtotal || 
        totalWithGst !== prev.total;

      if (!changed) return prev;

      return { 
        ...prev, 
        items, 
        subtotal, 
        gst,
        total: totalWithGst 
      };
    });
  }, [invoice.baseHourlyRate, invoice.items.length, invoice.serviceFeePct]);

  // ==================== UPDATE INVOICE STATE ====================
  const updateInvoice = (patch) => setInvoice(prev => ({ ...prev, ...patch }));

  // ==================== VALIDATION ====================
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

  // ==================== SAVE INVOICE ====================
  const handleSaveClick = async () => {
    const validation = handleValidateInvoice();
    if (!validation.ok) {
      alert(validation.err);
      return;
    }

    try {
      const payload = {
        projectCode: invoice.projectCode,
        clientCode: invoice.clientCode,
        consultantName: invoice.consultantName,
        date: invoice.date,
        billingAddress: invoice.billingAddress,
        items: invoice.items.map(item => ({
          name: item.name,
          mode: item.mode,
          hours: item.hours,
          rate: item.rate,
          amount: item.amount,
        })),
        notes: invoice.notes,
        subtotal: invoice.subtotal,
        serviceFeePct: percentToFraction(invoice.serviceFeePct),
      };

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
      const invNum = data?.invoiceNumber || data?.invoice_id || data?.id || null;

      if (invNum) {
        updateInvoice({ invoiceNumber: invNum });
      }

      alert(`✅ Invoice saved successfully!${invNum ? ` Invoice #${invNum}` : ''}`);
    } catch (err) {
      console.error('Save invoice error:', err);
      alert(`❌ Failed to save invoice: ${err.message || err}`);
    }
  };

  // In App.jsx - Update handleGeneratePDF function

const handleGeneratePDF = async () => {
  const root = document.getElementById('invoice-preview-root');
  if (!root) {
    alert('Invoice preview not available');
    return;
  }

  // Check if html2canvas is available
  if (typeof window.html2canvas === 'undefined') {
    alert('⚠️ PDF generation library not loaded. Please use Preview (Print) instead.');
    return;
  }

  try {
    // Show loading state
    const originalText = root.innerHTML;
    
    const canvas = await window.html2canvas(root, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: root.scrollWidth,
      windowHeight: root.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Create download link
    const link = document.createElement('a');
    link.href = imgData;
    link.download = `invoice_${invoice.projectCode || 'preview'}_${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('✅ Invoice downloaded successfully!');
  } catch (err) {
    console.error('PDF generation error:', err);
    alert(`❌ PDF generation failed: ${err.message}`);
  }
};

  // ==================== RENDER ====================
  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="title">Invoice Generator</h1>
        <p className="subtitle">Create professional invoices in seconds</p>
      </header>

      {/* Main Layout */}
      <main className="main-grid">
        {/* Left Column - Forms */}
        <section>
          {/* Project Details Card */}
          <div className="card mb-2">
            <div className="card-header">
              <h2 className="card-title">Project & Client Details</h2>
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

          {/* Team Summary Card */}
          <div className="card mb-2">
            <div className="card-header">
              <h2 className="card-title">Team & Hours</h2>
            </div>
            <TeamSummary
              invoice={invoice}
              updateInvoice={updateInvoice}
              teamOptions={teamOptions}
              loadingTeam={loadingTeam}
              baseHourlyRate={invoice.baseHourlyRate || 0}
            />
          </div>

          {/* Notes Card */}
          <div className="card mb-2">
            <label className="label">Notes (Optional)</label>
            <textarea
              className="textarea"
              placeholder="Add any additional notes or comments..."
              value={invoice.notes}
              onChange={e => updateInvoice({ notes: e.target.value })}
            />
          </div>
        </section>

        {/* Right Column - Invoice Preview */}
        <aside className="sticky">
          <div id="invoice-preview-root" className="invoice-preview-wrapper">
            <InvoicePreview 
              invoice={invoice} 
              clientData={clientData} 
              projectData={projectData} 
            />
          </div>
        </aside>
      </main>

      {/* Footer Actions Bar */}
      <div className="footer-actions" role="region" aria-label="Invoice actions">
        <div className="left">
          <button 
            className="btn btn-ghost" 
            onClick={() => window.print()} 
            title="Preview / Print"
          >
            📄 Preview
          </button>
          
          <button 
            className="btn btn-ghost" 
            onClick={handleGeneratePDF} 
            title="Generate PDF image preview"
          >
            📥 Generate PDF
          </button>
          
          <button 
            className="btn btn-ghost" 
            onClick={() => {
              const subject = encodeURIComponent(
                `Invoice - ${invoice.projectCode || 'Preview'}`
              );
              const body = encodeURIComponent(
                `Please find the invoice for project ${invoice.projectCode}.\n\nTotal: ₹${Number(invoice.total || 0).toLocaleString('en-IN')}`
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
            className="btn btn-success" 
            onClick={handleSaveClick}
          >
            💾 Save Invoice
          </button>
        </div>
      </div>
    </div>
  );
}