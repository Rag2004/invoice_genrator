
// import React, { useEffect, useState } from 'react';
// import './styles.css';
// import ProjectDetails from './components/ProjectDetails';
// import TeamSummary from './components/TeamSummary';
// import InvoicePreview from './components/InvoicePreview';
// import SummaryActions from './components/SummaryActions';
// import { getTeam, getProject, getClient } from './api/api';
// import ScopeDetails from './components/ScopeDetails'; // 🔹 NEW

// // Debounce hook
// function useDebouncedValue(value, delay = 400) {
//   const [debounced, setDebounced] = useState(value);
//   useEffect(() => {
//     const t = setTimeout(() => setDebounced(value), delay);
//     return () => clearTimeout(t);
//   }, [value, delay]);
//   return debounced;
// }

// // Service fee conversion helpers
// function incomingServiceFeeToPercent(v) {
//   const n = (v === undefined || v === null) ? 0 : Number(v);
//   if (isNaN(n)) return 0;
//   return n > 1 ? n : Math.round(n * 10000) / 100;
// }

// function percentToFraction(v) {
//   const n = Number(v || 0);
//   if (isNaN(n)) return 0;
//   return n > 1 ? n / 100 : n;
// }

// const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

// export default function App() {
//   // Team data
//   const [teamOptions, setTeamOptions] = useState([]);
//   const [loadingTeam, setLoadingTeam] = useState(false);

//   // Project & Client data
//   const [projectData, setProjectData] = useState(null);
//   const [clientData, setClientData] = useState(null);
//   const [loadingProject, setLoadingProject] = useState(false);
//   const [loadingClient, setLoadingClient] = useState(false);
//   const [fetchError, setFetchError] = useState(null);

//   // Main invoice state
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
//     serviceFeePct: 25, // Default 25%
//     total: 0,
//     baseHourlyRate: 6000, // Default rate

//     // 🔹 NEW FIELDS FOR STAGES + INCLUSIONS + DAYS
//     stagesText: '',
//     inclusionsText: '',
//     numDays: '',
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
//       return;
//     }

//     let active = true;
//     setFetchError(null);
//     setLoadingProject(true);

//     getProject(code)
//       .then(p => {
//         if (!active) return;
//         setProjectData(p || null);

//         // Update service fee percentage
//         const svcPct = (p && typeof p.serviceFeePct !== 'undefined')
//           ? incomingServiceFeeToPercent(p.serviceFeePct)
//           : invoice.serviceFeePct;

//         setInvoice(prev => ({
//           ...prev,
//           serviceFeePct: typeof svcPct === 'number' ? svcPct : prev.serviceFeePct,
//           baseHourlyRate: (p && (typeof p.hourlyRate !== 'undefined'))
//             ? Number(p.hourlyRate || 0)
//             : prev.baseHourlyRate,
//         }));

//         // Auto-fill client code if available
//         if (p?.clientCode) {
//           setInvoice(prev => ({ ...prev, clientCode: p.clientCode }));
//         }

//         // Auto-fill billing address from project
//         if (p?.defaultBillingAddress && !invoice.billingAddress) {
//           setInvoice(prev => ({
//             ...prev,
//             billingAddress: prev.billingAddress || p.defaultBillingAddress
//           }));
//         }
//       })
//       .catch(err => {
//         console.error('getProject failed', err);
//         setProjectData(null);
//         setFetchError(String(err?.message || err));
//       })
//       .finally(() => active && setLoadingProject(false));

//     return () => { active = false; };
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

//         // Auto-fill billing address from client
//         if (c?.billingAddress && !invoice.billingAddress) {
//           setInvoice(prev => ({
//             ...prev,
//             billingAddress: prev.billingAddress || c.billingAddress
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
//   useEffect(() => {
//     setInvoice(prev => {
//       const base = Number(prev.baseHourlyRate || 0);

//       const items = (prev.items || []).map(it => {
//         const hours = Number(it.hours || 0);
//         const rate = it.userEditedRate
//           ? Number(it.rate || 0)
//           : (Number(it.rate) > 0 ? Number(it.rate) : base) || 0;
//         const amount = Math.round((rate * hours) * 100) / 100;
//         return { ...it, rate, amount };
//       });

//       const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
//       const gst = subtotal * 0.18;
//       const totalWithGst = subtotal + gst;

//       const changed =
//         JSON.stringify(items) !== JSON.stringify(prev.items) ||
//         subtotal !== prev.subtotal ||
//         totalWithGst !== prev.total;

//       if (!changed) return prev;

//       return {
//         ...prev,
//         items,
//         subtotal,
//         gst,
//         total: totalWithGst
//       };
//     });
//   }, [invoice.baseHourlyRate, invoice.items.length, invoice.serviceFeePct]);

//   // ==================== UPDATE INVOICE STATE ====================
//   const updateInvoice = (patch) => setInvoice(prev => ({ ...prev, ...patch }));

//   // ==================== VALIDATION ====================
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

//   // ==================== SAVE INVOICE ====================
//   const handleSaveClick = async () => {
//     const validation = handleValidateInvoice();
//     if (!validation.ok) {
//       alert(validation.err);
//       return;
//     }

//     try {
//       const payload = {
//         projectCode: invoice.projectCode,
//         clientCode: invoice.clientCode,
//         consultantName: invoice.consultantName,
//         date: invoice.date,
//         billingAddress: invoice.billingAddress,
//         items: invoice.items.map(item => ({
//           name: item.name,
//           mode: item.mode,
//           hours: item.hours,
//           rate: item.rate,
//           amount: item.amount,
//         })),
//         notes: invoice.notes,
//         subtotal: invoice.subtotal,
//         serviceFeePct: percentToFraction(invoice.serviceFeePct),

//         // 🔹 NEW: send stages / inclusions / days
//         stagesText: invoice.stagesText || '',
//         inclusionsText: invoice.inclusionsText || '',
//         numDays: invoice.numDays || '',
//       };

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
//       const invNum = data?.invoiceNumber || data?.invoice_id || data?.id || null;

//       if (invNum) {
//         updateInvoice({ invoiceNumber: invNum });
//       }

//       alert(`✅ Invoice saved successfully!${invNum ? ` Invoice #${invNum}` : ''}`);
//     } catch (err) {
//       console.error('Save invoice error:', err);
//       alert(`❌ Failed to save invoice: ${err.message || err}`);
//     }
//   };

//   // ==================== GENERATE PDF (PNG DOWNLOAD) ====================
//   const handleGeneratePDF = async () => {
//     const root = document.getElementById('invoice-preview-root');
//     if (!root) {
//       alert('Invoice preview not available');
//       return;
//     }

//     if (typeof window.html2canvas === 'undefined') {
//       alert('⚠️ PDF generation library not loaded. Please use Preview (Print) instead.');
//       return;
//     }

//     try {
//       const canvas = await window.html2canvas(root, {
//         scale: 2,
//         useCORS: true,
//         logging: false,
//         backgroundColor: '#ffffff',
//         windowWidth: root.scrollWidth,
//         windowHeight: root.scrollHeight,
//       });

//       const imgData = canvas.toDataURL('image/png');

//       const link = document.createElement('a');
//       link.href = imgData;
//       link.download = `invoice_${invoice.projectCode || 'preview'}_${new Date().getTime()}.png`;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);

//       alert('✅ Invoice downloaded successfully!');
//     } catch (err) {
//       console.error('PDF generation error:', err);
//       alert(`❌ PDF generation failed: ${err.message}`);
//     }
//   };

//   // ==================== RENDER ====================
//   return (
//     <div className="app-container">
//       {/* Header */}
//       <header className="app-header">
//         <h1 className="title">Invoice Generator</h1>
//         <p className="subtitle">Create professional invoices in seconds</p>
//       </header>

//       {/* Main Layout */}
//       <main className="main-grid">
//         {/* Left Column - Forms */}
//         <section>
//           {/* Project Details Card */}
//           <div className="card mb-2">
//             <div className="card-header">
//               <h2 className="card-title">Project & Client Details</h2>
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

//           {/* Team Summary Card */}
//           <div className="card mb-2">
//             <div className="card-header">
//               <h2 className="card-title">Team & Hours</h2>
//             </div>
//             <TeamSummary
//               invoice={invoice}
//               updateInvoice={updateInvoice}
//               teamOptions={teamOptions}
//               loadingTeam={loadingTeam}
//               baseHourlyRate={invoice.baseHourlyRate || 0}
//             />
//           </div>

//           {/* 🔹 NEW: Stages & Inclusions Card */}
//           <div className="card mb-2">
//             <div className="card-header">
//               <h2 className="card-title">Stages, Inclusions & Timeline</h2>
//             </div>
//             <ScopeDetails
//               invoice={invoice}
//               updateInvoice={updateInvoice}
//             />
//           </div>

//           {/* Notes Card */}
//           <div className="card mb-2">
//             <label className="label">Notes (Optional)</label>
//             <textarea
//               className="textarea"
//               placeholder="Add any additional notes or comments..."
//               value={invoice.notes}
//               onChange={e => updateInvoice({ notes: e.target.value })}
//             />
//           </div>
//         </section>

//         {/* Right Column - Invoice Preview */}
//         <aside className="sticky">
//           <div id="invoice-preview-root" className="invoice-preview-wrapper">
//             <InvoicePreview
//               invoice={invoice}
//               clientData={clientData}
//               projectData={projectData}
//             />
//           </div>
//         </aside>
//       </main>

//       {/* Footer Actions Bar */}
//       <div className="footer-actions" role="region" aria-label="Invoice actions">
//         <div className="left">
//           <button
//             className="btn btn-ghost"
//             onClick={() => window.print()}
//             title="Preview / Print"
//           >
//             📄 Preview
//           </button>

//           <button
//             className="btn btn-ghost"
//             onClick={handleGeneratePDF}
//             title="Generate PDF image preview"
//           >
//             📥 Generate PDF
//           </button>

//           <button
//             className="btn btn-ghost"
//             onClick={() => {
//               const subject = encodeURIComponent(
//                 `Invoice - ${invoice.projectCode || 'Preview'}`
//               );
//               const body = encodeURIComponent(
//                 `Please find the invoice for project ${invoice.projectCode}.\n\nTotal: ₹${Number(invoice.total || 0).toLocaleString('en-IN')}`
//               );
//               window.location.href = `mailto:?subject=${subject}&body=${body}`;
//             }}
//             title="Share via email"
//           >
//             ✉️ Share
//           </button>
//         </div>

//         <div className="right">
//           <div className="footer-total">
//             <span className="footer-total-label">Total:</span>
//             <span>₹{Number(invoice.total || 0).toLocaleString('en-IN')}</span>
//           </div>

//           <button
//             className="btn btn-success"
//             onClick={handleSaveClick}
//           >
//             💾 Save Invoice
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
import React, { useEffect, useState } from 'react';
import './styles.css';
import ProjectDetails from './components/ProjectDetails';
import TeamSummary from './components/TeamSummary';
import InvoicePreview from './components/InvoicePreview';
import SummaryActions from './components/SummaryActions';
import { getTeam, getProject, getClient } from './api/api';
import ScopeDetails from './components/ScopeDetails'; // NEW / UPDATED IMPORT
import html2canvas from 'html2canvas';

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

    // NEW: structured stages (Stage + Inclusion + Days)
    stages: [],
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
          baseFactor: Number(x.Factor || x.factor || 1),
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

        // NEW: stages payload
        stages: (invoice.stages || []).map(s => ({
          stage: s.stage,
          description: s.description,
          days: s.days,
        })),
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

  // ==================== GENERATE PDF (PNG DOWNLOAD) ====================
  const handleGeneratePDF = async () => {
  const root = document.getElementById('invoice-preview-root');
  if (!root) {
    alert('Invoice preview not available');
    return;
  }

  try {
    // 👇 mark we're generating a client PDF
    document.body.classList.add('client-pdf');

    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: root.scrollWidth,
      windowHeight: root.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = imgData;
    link.download = `invoice_${invoice.projectCode || 'preview'}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert('✅ Invoice downloaded successfully!');
  } catch (err) {
    console.error('PDF generation error:', err);
    alert(`❌ PDF generation failed: ${err.message}`);
  } finally {
    // 👈 always remove the flag
    document.body.classList.remove('client-pdf');
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

          {/* Stages & Inclusions Card */}
          <div className="card mb-2">
            <div className="card-header">
              <h2 className="card-title">Stages, Inclusions & Timeline</h2>
            </div>
            <ScopeDetails invoice={invoice} updateInvoice={updateInvoice} />
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
