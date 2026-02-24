
// // src/pages/InvoiceListPage.jsx - WITH AUTO-SHARE BUTTON
// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { listInvoices, autoShareInvoice } from "../api/api";
// import { useAuth } from "../context/AuthContext";
// import "../styles/InvoiceList.css";

// export default function InvoiceListPage() {
//   const navigate = useNavigate();
//   const { user, logout } = useAuth();

//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [allInvoices, setAllInvoices] = useState([]);
//   const [search, setSearch] = useState("");
//   const [activeFilter, setActiveFilter] = useState("all");

//   // Share state
//   const [sharingInvoiceId, setSharingInvoiceId] = useState(null);
//   const [shareError, setShareError] = useState(null);

//   useEffect(() => {
//     let mounted = true;

//     async function loadInvoices() {
//       try {
//         setLoading(true);
//         setError(null);

//         const consultantId = user?.consultantId || user?.consultant_id || user?.id;

//         if (!consultantId) {
//           console.error("❌ Missing consultant ID");
//           setError("Authentication error: Missing consultant ID");
//           setLoading(false);
//           return;
//         }

//         const result = await listInvoices(200, consultantId);

//         if (!mounted) return;

//         const normalized = (result?.invoices || []).map((inv) => {
//           let items = [];

//           try {
//             const itemsData = inv.itemsJson || inv.items;

//             if (!itemsData) {
//               items = [];
//             } else if (typeof itemsData === 'string') {
//               const trimmed = itemsData.trim();
//               if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
//                 items = [];
//               } else {
//                 items = JSON.parse(trimmed);
//               }
//             } else if (Array.isArray(itemsData)) {
//               items = itemsData;
//             } else {
//               items = [];
//             }
//           } catch (e) {
//             console.error("❌ Error parsing items for invoice:", inv.invoiceId || inv.id, e);
//             items = [];
//           }

//           const status = String(inv.status || 'DRAFT').toUpperCase();
//           const type = status === 'FINAL' ? 'final' : 'draft';

//           return {
//             type,
//             id: inv.invoiceId || inv.id,
//             invoiceNumber: inv.invoiceNumber || (type === 'draft' ? 'DRAFT' : 'N/A'),
//             clientName: inv.clientName || inv.clientCode || 'Unknown',
//             projectCode: inv.projectCode || 'N/A',
//             amount: Number(inv.subtotal || 0),
//             gst: Number(inv.gst || 0),
//             total: Number(inv.subtotal || 0) + Number(inv.gst || 0),
//             date: inv.updatedAt || inv.createdAt || inv.invoice_Date || inv.invoiceDate,
//             status,
//             items,
//           };
//         });

//         if (mounted) {
//           const sorted = normalized.sort(
//             (a, b) => new Date(b.date) - new Date(a.date)
//           );
//           setAllInvoices(sorted);
//         }
//       } catch (err) {
//         if (!mounted) return;

//         console.error("❌ Failed to load invoices:", err);

//         if (err.message?.includes('403') || err.message?.includes('Access denied')) {
//           setError('Access denied. Your session may have expired.');
//         } 
//         else if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
//           setError('Your session has expired. Redirecting to login...');
//           setTimeout(() => {
//             logout();
//             navigate('/login');
//           }, 2000);
//         }
//         else {
//           setError(err.message || "Failed to load invoices");
//         }
//       } finally {
//         if (mounted) {
//           setLoading(false);
//         }
//       }
//     }

//     loadInvoices();

//     return () => {
//       mounted = false;
//     };
//   }, [user, logout, navigate]);

//   // ✅ SIMPLIFIED AUTO-SHARE HANDLER
//   const handleAutoShare = async (invoice) => {

//     // Confirm before sending
//     const confirmed = window.confirm(
//       `Send invoice ${invoice.invoiceNumber} to client?\n\n` +
//       `The invoice will be sent to the client email from project data.`
//     );

//     if (!confirmed) {
//       return;
//     }

//     setSharingInvoiceId(invoice.id);
//     setShareError(null);

//     try {
//       // Call the auto-share API (backend handles everything)
//       const result = await autoShareInvoice(invoice.id);

//       alert(
//         `✅ Invoice ${invoice.invoiceNumber} sent successfully!\n\n` +
//         `Sent to: ${result.sentTo}\n` +
//         `${result.hasPDF ? `PDF attached: ${result.filename}` : 'Sent as HTML email'}`
//       );

//     } catch (error) {
//       console.error('❌ Share error:', error);
//       setShareError(error.message);

//       let errorMessage = error.message;

//       // Provide helpful error messages
//       if (errorMessage.includes('Client email not found')) {
//         errorMessage += '\n\nPlease ensure the client email is added in the project setup.';
//       }

//       alert(`❌ Failed to send invoice:\n\n${errorMessage}`);
//     } finally {
//       setSharingInvoiceId(null);
//     }
//   };

//   const formatCurrency = (amount) => {
//     try {
//       return new Intl.NumberFormat("en-IN", {
//         style: "currency",
//         currency: "INR",
//         maximumFractionDigits: 0,
//       }).format(amount || 0);
//     } catch {
//       return `₹${amount || 0}`;
//     }
//   };

//   const formatDate = (dateString) => {
//     if (!dateString) return 'N/A';
//     try {
//       return new Date(dateString).toLocaleDateString("en-IN", {
//         day: "2-digit",
//         month: "short",
//         year: "numeric",
//       });
//     } catch {
//       return "Invalid Date";
//     }
//   };

//   const getStatusBadge = (type) => {
//     return type === "final"
//       ? { icon: "✅", text: "Final", class: "status-final" }
//       : { icon: "💾", text: "Draft", class: "status-draft" };
//   };

//   const handleViewInvoice = (invoice) => {

//     if (!invoice.id) {
//       console.error('❌ Invalid invoice: missing ID', invoice);
//       alert('Cannot open invoice: Invalid invoice ID');
//       return;
//     }

//     let path;
//     if (invoice.type === "final") {
//       path = `/dashboard/invoice/${invoice.id}`;
//     } else {
//       path = `/dashboard/create-invoice/${invoice.id}`;
//     }

//     try {
//       navigate(path);
//     } catch (err) {
//       console.error('❌ Navigation failed:', err);
//       alert(`Failed to open invoice: ${err.message}`);
//     }
//   };

//   const filteredInvoices = allInvoices.filter((inv) => {
//     if (activeFilter !== "all" && inv.type !== activeFilter) {
//       return false;
//     }

//     if (search.trim()) {
//       const q = search.toLowerCase();
//       return (
//         inv.invoiceNumber?.toLowerCase().includes(q) ||
//         inv.clientName?.toLowerCase().includes(q) ||
//         inv.projectCode?.toLowerCase().includes(q)
//       );
//     }

//     return true;
//   });

//   if (loading) {
//     return (
//       <div className="invoice-list-page">
//         <div className="loading-container">
//           <div className="spinner-large"></div>
//           <p>Loading invoices...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error && allInvoices.length === 0) {
//     return (
//       <div className="invoice-list-page">
//         <div className="error-container">
//           <div className="error-icon">⚠️</div>
//           <h3>Failed to Load Invoices</h3>
//           <p>{error}</p>

//           <div className="error-actions">
//             <button 
//               className="btn-primary" 
//               onClick={() => window.location.reload()}
//             >
//               🔄 Retry
//             </button>
//             <button 
//               className="btn-secondary" 
//               onClick={() => navigate("/dashboard")}
//             >
//               ← Back to Dashboard
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="invoice-list-page">

//       {error && allInvoices.length > 0 && (
//         <div style={{
//           background: '#fef3c7',
//           border: '1px solid #fbbf24',
//           padding: '12px 20px',
//           borderRadius: '12px',
//           marginBottom: '24px',
//           display: 'flex',
//           alignItems: 'center',
//           gap: '12px'
//         }}>
//           <span style={{ fontSize: '20px' }}>⚠️</span>
//           <span style={{ fontSize: '14px', color: '#92400e' }}>{error}</span>
//         </div>
//       )}

//       <div className="search-action-bar">
//         <div className="search-wrapper">
//           <span className="search-icon">🔍</span>
//           <input
//             type="text"
//             placeholder="Search invoices by number, client, or project..."
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="search-input"
//           />
//           {search && (
//             <button className="clear-search" onClick={() => setSearch("")}>
//               ✕
//             </button>
//           )}
//         </div>

//         <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
//           <div style={{ 
//             display: 'flex', 
//             gap: '8px', 
//             padding: '4px',
//             background: '#f3f4f6',
//             borderRadius: '8px'
//           }}>
//             <button
//               onClick={() => setActiveFilter("all")}
//               style={{
//                 padding: '8px 16px',
//                 border: 'none',
//                 borderRadius: '6px',
//                 background: activeFilter === "all" ? '#6366f1' : 'transparent',
//                 color: activeFilter === "all" ? 'white' : '#6b7280',
//                 fontWeight: activeFilter === "all" ? '600' : '500',
//                 cursor: 'pointer',
//                 transition: 'all 0.2s'
//               }}
//             >
//               All ({allInvoices.length})
//             </button>
//             <button
//               onClick={() => setActiveFilter("final")}
//               style={{
//                 padding: '8px 16px',
//                 border: 'none',
//                 borderRadius: '6px',
//                 background: activeFilter === "final" ? '#6366f1' : 'transparent',
//                 color: activeFilter === "final" ? 'white' : '#6b7280',
//                 fontWeight: activeFilter === "final" ? '600' : '500',
//                 cursor: 'pointer',
//                 transition: 'all 0.2s'
//               }}
//             >
//               Final ({allInvoices.filter(inv => inv.type === "final").length})
//             </button>
//             <button
//               onClick={() => setActiveFilter("draft")}
//               style={{
//                 padding: '8px 16px',
//                 border: 'none',
//                 borderRadius: '6px',
//                 background: activeFilter === "draft" ? '#6366f1' : 'transparent',
//                 color: activeFilter === "draft" ? 'white' : '#6b7280',
//                 fontWeight: activeFilter === "draft" ? '600' : '500',
//                 cursor: 'pointer',
//                 transition: 'all 0.2s'
//               }}
//             >
//               Drafts ({allInvoices.filter(inv => inv.type === "draft").length})
//             </button>
//           </div>

//           <button
//             className="btn-create-new"
//             onClick={() => navigate("/dashboard/create-invoice")}
//           >
//             <span>➕</span> Create New Invoice
//           </button>
//         </div>
//       </div>

//       <div className="invoices-card">
//         <div className="card-header">
//           <div>
//             <h2 className="card-title">
//               {activeFilter === "all" ? "All Invoices" : 
//                activeFilter === "final" ? "Final Invoices" : "Draft Invoices"}
//             </h2>
//             <p className="card-subtitle">
//               Showing {filteredInvoices.length} of {allInvoices.length} invoices
//             </p>
//           </div>
//         </div>

//         {filteredInvoices.length === 0 ? (
//           <div className="empty-state">
//             <div className="empty-icon">
//               {search ? "🔍" : activeFilter === "draft" ? "💾" : "📄"}
//             </div>
//             <h3 className="empty-title">
//               {search ? "No invoices found" : 
//                activeFilter === "draft" ? "No drafts yet" : "No invoices yet"}
//             </h3>
//             <p className="empty-description">
//               {search ? "Try a different search term" : 
//                "Create your first invoice to get started"}
//             </p>
//             {!search && (
//               <button
//                 className="btn-primary"
//                 onClick={() => navigate("/dashboard/create-invoice")}
//               >
//                 ➕ Create Invoice
//               </button>
//             )}
//           </div>
//         ) : (
//           <div className="table-wrapper">
//             <table className="invoices-table">
//               <thead>
//                 <tr>
//                   <th>Invoice #</th>
//                   <th>Client</th>
//                   <th>Project</th>
//                   <th>Amount</th>
//                   <th>Date</th>
//                   <th>Status</th>
//                   <th className="actions-header">Actions</th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {filteredInvoices.map((inv) => {
//                   const badge = getStatusBadge(inv.type);
//                   const isSharing = sharingInvoiceId === inv.id;

//                   return (
//                     <tr key={inv.id} className="invoice-row">
//                       <td className="invoice-number">{inv.invoiceNumber}</td>
//                       <td className="client-name">{inv.clientName}</td>
//                       <td className="project-code">{inv.projectCode}</td>
//                       <td className="amount">{formatCurrency(inv.total)}</td>
//                       <td className="date">{formatDate(inv.date)}</td>
//                       <td>
//                         <span className={`status-badge ${badge.class}`}>
//                           {badge.icon} {badge.text}
//                         </span>
//                       </td>
//                       <td className="actions">
//                         <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
//                           {/* View/Edit Button */}
//                           <button
//                             className={`btn-icon ${inv.type === "draft" ? "btn-edit" : ""}`}
//                             title={inv.type === "final" ? "View Invoice" : "Edit Draft"}
//                             onClick={() => handleViewInvoice(inv)}
//                           >
//                             {inv.type === "final" ? "👁️" : "✏️"}
//                           </button>

//                           {/* Share Button - Only for Final Invoices */}
//                           {inv.type === "final" && (
//                             <button
//                               className="btn-icon"
//                               title="Share Invoice via Email"
//                               onClick={() => handleAutoShare(inv)}
//                               disabled={isSharing}
//                               style={{
//                                 opacity: isSharing ? 0.5 : 1,
//                                 cursor: isSharing ? 'not-allowed' : 'pointer',
//                                 background: isSharing ? '#e5e7eb' : '#3b82f6',
//                                 color: 'white',
//                                 border: 'none',
//                                 padding: '6px 12px',
//                                 borderRadius: '6px',
//                                 fontSize: '14px',
//                                 fontWeight: '500',
//                                 transition: 'all 0.2s'
//                               }}
//                             >
//                               {isSharing ? '⏳' : '📧'}
//                             </button>
//                           )}
//                         </div>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
// src/pages/InvoiceListPage.jsx - WITH SHARE DIALOG
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listInvoices, autoShareInvoice, getInvoice, downloadInvoicePDFFromServer } from "../api/api";
import { useAuth } from "../context/AuthContext";
import ShareInvoiceDialog from "../components/ui/ShareInvoiceDialog";
import "../styles/InvoiceList.css";

// ── SVG Icons (matching Dashboard) ─────────────────────────
const EyeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const MailIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allInvoices, setAllInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [clientEmail, setClientEmail] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [sharingInvoiceId, setSharingInvoiceId] = useState(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadInvoices() {
      try {
        setLoading(true);
        setError(null);

        const consultantId = user?.consultantId || user?.consultant_id || user?.id;

        if (!consultantId) {
          console.error("❌ Missing consultant ID");
          setError("Authentication error: Missing consultant ID");
          setLoading(false);
          return;
        }

        const result = await listInvoices(200, consultantId);

        if (!mounted) return;

        const normalized = (result?.invoices || []).map((inv) => {
          let items = [];

          try {
            const itemsData = inv.itemsJson || inv.items;

            if (!itemsData) {
              items = [];
            } else if (typeof itemsData === 'string') {
              const trimmed = itemsData.trim();
              if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
                items = [];
              } else {
                items = JSON.parse(trimmed);
              }
            } else if (Array.isArray(itemsData)) {
              items = itemsData;
            } else {
              console.warn('Unexpected items type:', typeof itemsData, itemsData);
              items = [];
            }
          } catch (e) {
            console.error("❌ Error parsing items for invoice:", inv.invoiceId || inv.id, e);
            items = [];
          }

          const status = String(inv.status || 'DRAFT').toUpperCase();
          const type = status === 'FINAL' ? 'final' : 'draft';

          return {
            type,
            id: inv.invoiceId || inv.id,
            invoiceNumber: inv.invoiceNumber || (type === 'draft' ? 'DRAFT' : 'N/A'),
            clientName: inv.clientName || inv.clientCode || 'Unknown',
            projectCode: inv.projectCode || 'N/A',
            amount: Number(inv.subtotal || 0),
            gst: Number(inv.gst || 0),
            total: Number(inv.subtotal || 0) + Number(inv.gst || 0),
            date: inv.updatedAt || inv.createdAt || inv.invoice_Date || inv.invoiceDate,
            status,
            items,
          };
        });

        if (mounted) {
          const sorted = normalized.sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          );
          setAllInvoices(sorted);
        }
      } catch (err) {
        if (!mounted) return;

        console.error("❌ Failed to load invoices:", err);

        if (err.message?.includes('403') || err.message?.includes('Access denied')) {
          setError('Access denied. Your session may have expired.');
        }
        else if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
          setError('Your session has expired. Redirecting to login...');
          setTimeout(() => {
            logout();
            navigate('/login');
          }, 2000);
        }
        else {
          setError(err.message || "Failed to load invoices");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadInvoices();

    return () => {
      mounted = false;
    };
  }, [user, logout, navigate]);

  // ✅ STEP 1: Open dialog and fetch client email
  const handleShareClick = async (invoice) => {

    setSelectedInvoice(invoice);
    setShareDialogOpen(true);
    setClientEmail(''); // Reset
    setLoadingEmail(true);

    try {
      // Fetch full invoice to get client email from snapshot
      const result = await getInvoice(invoice.id);

      if (result?.ok && result.invoice) {
        const fullInvoice = result.invoice;

        // Extract client email from snapshot
        let email = null;

        if (fullInvoice.snapshot?.client?.email) {
          email = fullInvoice.snapshot.client.email;
        } else if (fullInvoice.client?.email) {
          email = fullInvoice.client.email;
        }
        setClientEmail(email || '');

        if (!email) {
          setError('Client email not found in invoice data');
        }
      } else {
        setClientEmail('');
        setError('Failed to load invoice details');
      }
    } catch (error) {
      console.error('❌ Error fetching client email:', error);
      setClientEmail('');
      setError('Failed to load client email');
    } finally {
      setLoadingEmail(false);
    }
  };

  // ✅ STEP 2: Send invoice via dialog
  const handleShareConfirm = async (email) => {
    if (!selectedInvoice) {
      alert('❌ No invoice selected');
      return;
    }

    if (!email || !email.trim()) {
      alert('❌ Client email not found. Please update the project with client email and regenerate the invoice.');
      return;
    }

    setSharingInvoiceId(selectedInvoice.id);

    try {
      // Call the auto-share API
      const result = await autoShareInvoice(selectedInvoice.id);

      alert(
        `✅ Invoice ${selectedInvoice.invoiceNumber} sent successfully!\n\n` +
        `Sent to: ${result.sentTo}\n` +
        `${result.hasPDF ? `PDF attached: ${result.filename}` : 'Sent as HTML email'}`
      );

      setShareDialogOpen(false);
      setSelectedInvoice(null);
      setClientEmail('');

    } catch (error) {
      console.error('❌ Share error:', error);

      let errorMessage = error.message;

      // Provide helpful error messages
      if (errorMessage.includes('Client email not found')) {
        errorMessage = 'Client email not found in invoice.\n\nPlease update the project with client email and regenerate the invoice.';
      } else if (errorMessage.includes('Can only share finalized')) {
        errorMessage = 'This invoice must be finalized before sharing.';
      } else if (errorMessage.includes('Invalid client email format')) {
        errorMessage = 'The client email in the invoice is invalid.\n\nPlease update the project with a valid email address.';
      }

      alert(`❌ Failed to send invoice:\n\n${errorMessage}`);
    } finally {
      setSharingInvoiceId(null);
    }
  };

  const formatCurrency = (amount) => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(amount || 0);
    } catch {
      return `₹${amount || 0}`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const getStatusBadge = (type) => {
    return type === "final"
      ? { text: "Final", class: "il-badge il-badge--final" }
      : { text: "Draft", class: "il-badge il-badge--draft" };
  };

  const handleViewInvoice = (invoice) => {

    if (!invoice.id) {
      console.error('❌ Invalid invoice: missing ID', invoice);
      alert('Cannot open invoice: Invalid invoice ID');
      return;
    }

    let path;
    if (invoice.type === "final") {
      path = `/dashboard/invoice/${invoice.id}`;
    } else {
      path = `/dashboard/create-invoice/${invoice.id}`;
    }

    try {
      navigate(path);
    } catch (err) {
      console.error('❌ Navigation failed:', err);
      alert(`Failed to open invoice: ${err.message}`);
    }
  };

  // ── PDF Download (Server-side Puppeteer) ───────────────────────────────
  const handleDownloadPDF = async (inv) => {
    if (!inv.id || downloadingPdfId) return;
    try {
      setDownloadingPdfId(inv.id);
      await downloadInvoicePDFFromServer(inv.id, `${inv.invoiceNumber || 'INVOICE'}.pdf`);
    } catch (err) {
      console.error('❌ PDF download failed:', err);
      alert(`Failed to download PDF: ${err.message}`);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const filteredInvoices = allInvoices.filter((inv) => {
    if (activeFilter !== "all" && inv.type !== activeFilter) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.clientName?.toLowerCase().includes(q) ||
        inv.projectCode?.toLowerCase().includes(q)
      );
    }

    return true;
  });

  if (loading) {
    return (
      <div className="invoice-list-page">
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (error && allInvoices.length === 0) {
    return (
      <div className="invoice-list-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Failed to Load Invoices</h3>
          <p>{error}</p>

          <div className="error-actions">
            <button
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              🔄 Retry
            </button>
            <button
              className="btn-secondary"
              onClick={() => navigate("/dashboard")}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalCount = allInvoices.length;
  const finalCount = allInvoices.filter(inv => inv.type === 'final').length;
  const draftCount = allInvoices.filter(inv => inv.type === 'draft').length;

  return (
    <div className="il-page">

      {error && allInvoices.length > 0 && (
        <div className="il-warn-banner">⚠️ {error}</div>
      )}

      {/* ── Title Row ────────────────────────────────────── */}
      <div className="il-header">
        <div>
          <h1 className="il-header__title">My Invoices</h1>
          <p className="il-header__sub">Manage, share &amp; download your invoices</p>
        </div>
        <button className="il-btn il-btn--create" onClick={() => navigate("/dashboard/create-invoice")}>
          + New Invoice
        </button>
      </div>

      {/* ── Stat Cards ───────────────────────────────────── */}
      <div className="il-stats il-stats--3col">
        <div
          className={`stat-card${activeFilter === 'all' ? ' stat-card--active' : ''}`}
          style={activeFilter === 'all' ? { '--accent': '#1d4ed8' } : { '--accent': '#2563eb' }}
          onClick={() => setActiveFilter('all')}
        >
          <div className="stat-card__value">{totalCount}</div>
          <div className="stat-card__label">Total Invoices</div>
          <div className="stat-card__bar" />
        </div>
        <div
          className={`stat-card${activeFilter === 'final' ? ' stat-card--active' : ''}`}
          style={{ '--accent': '#059669' }}
          onClick={() => setActiveFilter('final')}
        >
          <div className="stat-card__value">{finalCount}</div>
          <div className="stat-card__label">Finalized</div>
          <div className="stat-card__bar" />
        </div>
        <div
          className={`stat-card${activeFilter === 'draft' ? ' stat-card--active' : ''}`}
          style={{ '--accent': '#6366f1' }}
          onClick={() => setActiveFilter('draft')}
        >
          <div className="stat-card__value">{draftCount}</div>
          <div className="stat-card__label">Drafts</div>
          <div className="stat-card__bar" />
        </div>
      </div>

      {/* ── Toolbar: Search + Filter Tabs ────────────────── */}
      <div className="il-toolbar">
        <div className="il-search-wrap">
          <span className="il-search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </span>
          <input
            type="text"
            className="il-search"
            placeholder="Search by invoice #, client, or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="il-search-clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>

        <div className="il-filter-tabs">
          <button className={`il-filter-tab${activeFilter === 'all' ? ' il-filter-tab--active' : ''}`} onClick={() => setActiveFilter('all')}>
            All ({totalCount})
          </button>
          <button className={`il-filter-tab${activeFilter === 'final' ? ' il-filter-tab--active' : ''}`} onClick={() => setActiveFilter('final')}>
            Final ({finalCount})
          </button>
          <button className={`il-filter-tab${activeFilter === 'draft' ? ' il-filter-tab--active' : ''}`} onClick={() => setActiveFilter('draft')}>
            Drafts ({draftCount})
          </button>
        </div>
      </div>

      {/* ── Table Card ───────────────────────────────────── */}
      <div className="il-card">
        <div className="il-card__head">
          <div>
            <h2 className="il-card__title">
              {activeFilter === "all" ? "All Invoices" :
                activeFilter === "final" ? "Final Invoices" : "Draft Invoices"}
            </h2>
            <p className="il-card__sub">
              {filteredInvoices.length} of {totalCount} invoices
            </p>
          </div>
          <button className="il-btn il-btn--ghost il-btn--sm" onClick={() => window.location.reload()}>
            ↻ Refresh
          </button>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="il-empty">
            <div className="il-empty__icon">
              {search ? "🔍" : activeFilter === "draft" ? "💾" : "📄"}
            </div>
            <h3 className="il-empty__title">
              {search ? "No invoices found" :
                activeFilter === "draft" ? "No drafts yet" : "No invoices yet"}
            </h3>
            <p className="il-empty__sub">
              {search ? "Try a different search term" :
                "Create your first invoice to get started"}
            </p>
            {!search && (
              <button
                className="il-btn il-btn--primary"
                onClick={() => navigate("/dashboard/create-invoice")}
              >
                + Create Invoice
              </button>
            )}
          </div>
        ) : (
          <div className="il-table-wrap">
            <table className="il-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Project</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="il-th-actions">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredInvoices.map((inv) => {
                  const badge = getStatusBadge(inv.type);
                  const isSharing = sharingInvoiceId === inv.id;

                  return (
                    <tr key={inv.id} className="il-row">
                      <td>
                        <span className={`il-inv-num ${inv.type === 'final' ? 'il-inv-num--final' : 'il-inv-num--draft'}`}>
                          {inv.invoiceNumber}
                        </span>
                      </td>
                      <td className="il-client">{inv.clientName}</td>
                      <td><span className="il-project-tag">{inv.projectCode}</span></td>
                      <td className="il-amount">{formatCurrency(inv.total)}</td>
                      <td className="il-date">{formatDate(inv.date)}</td>
                      <td>
                        <span className={badge.class}>
                          {badge.text}
                        </span>
                      </td>
                      <td className="actions">
                        <div className="il-actions">
                          {/* View / Edit */}
                          <button
                            className={`il-action-btn ${inv.type === 'final' ? 'il-action-btn--view' : 'il-action-btn--edit'}`}
                            title={inv.type === 'final' ? 'View Invoice' : 'Edit Draft'}
                            onClick={() => handleViewInvoice(inv)}
                          >
                            {inv.type === 'final' ? <EyeIcon /> : <EditIcon />}
                            <span className="il-action-label">{inv.type === 'final' ? 'View' : 'Edit'}</span>
                          </button>

                          {/* Share */}
                          <button
                            className={`il-action-btn il-action-btn--share ${inv.type !== 'final' ? 'il-action-btn--locked' : ''}`}
                            title={inv.type === 'final' ? 'Share via Email' : 'Finalize to share'}
                            onClick={inv.type === 'final' ? () => handleShareClick(inv) : undefined}
                            disabled={inv.type !== 'final' || isSharing}
                          >
                            {isSharing ? <span className="il-spin-sm" /> : <MailIcon />}
                            <span className="il-action-label">Share</span>
                          </button>

                          {/* PDF Download */}
                          <button
                            className={`il-action-btn il-action-btn--download ${inv.type !== 'final' ? 'il-action-btn--locked' : ''}`}
                            title={inv.type === 'final' ? 'Download PDF' : 'Finalize to download'}
                            onClick={inv.type === 'final' ? () => handleDownloadPDF(inv) : undefined}
                            disabled={inv.type !== 'final' || downloadingPdfId === inv.id}
                          >
                            {downloadingPdfId === inv.id ? <span className="il-spin-sm" /> : <DownloadIcon />}
                            <span className="il-action-label">PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ✅ SHARE DIALOG */}
      <ShareInvoiceDialog
        isOpen={shareDialogOpen}
        onClose={() => {
          setShareDialogOpen(false);
          setSelectedInvoice(null);
          setClientEmail('');
        }}
        invoiceData={{
          invoiceId: selectedInvoice?.id,
          invoiceNumber: selectedInvoice?.invoiceNumber || "N/A",
          projectCode: selectedInvoice?.projectCode || "N/A",
          subtotal: selectedInvoice?.amount || 0,
          gst: selectedInvoice?.gst || 0,
          total: selectedInvoice?.total || 0,
        }}
        clientEmail={loadingEmail ? 'Loading...' : clientEmail}
        onShare={handleShareConfirm}
      />
    </div>
  );
}