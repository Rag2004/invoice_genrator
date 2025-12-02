
// // src/pages/DashboardHome.jsx
// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
// import '../styles/Dashboard.css';
// import { getDashboardSummary } from '../api/api';

// export default function DashboardHome() {
//   const { user } = useAuth();
//   const navigate = useNavigate();

//   const [stats, setStats] = useState({
//     totalInvoices: 0,
//     totalRevenue: 0,
//     pendingDrafts: 0,
//     paidInvoices: 0,
//   });
//   const [recentInvoices, setRecentInvoices] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     let mounted = true;
//     async function load() {
//       setLoading(true);
//       setError(null);
//       try {
//         const res = await getDashboardSummary();
//         if (!res || res.ok === false) {
//           throw new Error(res?.error || 'Failed to load dashboard data');
//         }
//         const s = res.summary || {};
//         const last = s.lastInvoices || [];

//         if (!mounted) return;

//         setStats({
//           totalInvoices: Number(s.totalInvoices || 0),
//           totalRevenue: Number(s.totalAmount || 0),
//           pendingDrafts: last.filter(i => String(i.status || '').toLowerCase() === 'draft').length || 0,
//           paidInvoices: last.filter(i => String(i.status || '').toLowerCase() === 'paid').length || 0,
//         });

//         setRecentInvoices(last.map(inv => ({
//           id: inv.invoiceId || inv.id || inv.invoice_id || inv.invoiceId || String(inv.invoiceNumber || inv.invoice_number || inv.id || ''),
//           invoiceNumber: inv.invoiceNumber || inv.invoiceNumber || inv.invoice_number || inv.invoiceNumber || inv.id,
//           clientName: inv.clientCode || inv.clientCode || inv.client || inv.clientName || '',
//           projectCode: inv.projectCode || inv.projectCode || inv.project || inv.projectCode || '',
//           amount: Number(inv.totalAmount || inv.total || inv.amount || 0),
//           date: inv.createdAt || inv.created_at || inv.date || '',
//           status: (inv.status || '').toLowerCase()
//         })));

//       } catch (err) {
//         console.error('dashboard load error', err);
//         setError(err.message || 'Failed to load dashboard');
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     }
//     load();
//     return () => { mounted = false; };
//   }, []);

//   const formatCurrency = (amount) => {
//     try {
//       return new Intl.NumberFormat('en-IN', {
//         style: 'currency',
//         currency: 'INR',
//         maximumFractionDigits: 0
//       }).format(amount);
//     } catch {
//       return amount;
//     }
//   };

//   const getStatusBadge = (status) => {
//     const badges = {
//       paid: { icon: '✅', text: 'Paid', class: 'status-paid' },
//       pending: { icon: '⏳', text: 'Pending', class: 'status-pending' },
//       draft: { icon: '💾', text: 'Draft', class: 'status-draft' },
//       overdue: { icon: '⚠️', text: 'Overdue', class: 'status-overdue' }
//     };
//     return badges[status] || badges.draft;
//   };

//   if (loading) {
//     return (
//       <div className="loading-container">
//         <div className="spinner-large"></div>
//         <p>Loading dashboard...</p>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="dashboard-home">
//         <div className="error-box">
//           <h3>Failed to load dashboard</h3>
//           <p>{error}</p>
//           <button onClick={() => window.location.reload()}>Retry</button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="dashboard-home">
//       <div className="welcome-section">
//         <div className="welcome-text">
//           <h2>Welcome back, {user?.name?.split(' ')[0] || 'there'}! 👋</h2>
//           <p>Here's what's happening with your invoices today.</p>
//         </div>
//         <button
//           className="btn-primary btn-create"
//           onClick={() => navigate('/dashboard/create-invoice')}
//         >
//           <span>➕</span> Create New Invoice
//         </button>
//       </div>

//       <div className="stats-grid">
//         <div className="stat-card">
//           <div className="stat-icon">📄</div>
//           <div className="stat-content">
//             <div className="stat-value">{stats.totalInvoices}</div>
//             <div className="stat-label">Total Invoices</div>
//           </div>
//         </div>

//         <div className="stat-card">
//           <div className="stat-icon">💰</div>
//           <div className="stat-content">
//             <div className="stat-value">{formatCurrency(stats.totalRevenue)}</div>
//             <div className="stat-label">Total Revenue</div>
//           </div>
//         </div>

//         <div className="stat-card">
//           <div className="stat-icon">💾</div>
//           <div className="stat-content">
//             <div className="stat-value">{stats.pendingDrafts}</div>
//             <div className="stat-label">Pending Drafts</div>
//           </div>
//         </div>

//         <div className="stat-card">
//           <div className="stat-icon">✅</div>
//           <div className="stat-content">
//             <div className="stat-value">{stats.paidInvoices}</div>
//             <div className="stat-label">Paid Invoices</div>
//           </div>
//         </div>
//       </div>

//       <div className="recent-section">
//         <div className="section-header">
//           <h3>Recent Invoices</h3>
//           <button
//             className="btn-link"
//             onClick={() => navigate('/dashboard/invoices')}
//           >
//             View All →
//           </button>
//         </div>

//         <div className="invoices-table-container">
//           {recentInvoices.length === 0 ? (
//             <div className="empty-state">
//               <div className="empty-icon">📄</div>
//               <h3>No invoices yet</h3>
//               <p>Create your first invoice to get started</p>
//               <button
//                 className="btn-primary"
//                 onClick={() => navigate('/dashboard/create-invoice')}
//               >
//                 Create Invoice
//               </button>
//             </div>
//           ) : (
//             <table className="invoices-table">
//               <thead>
//                 <tr>
//                   <th>Invoice #</th>
//                   <th>Client</th>
//                   <th>Project Code</th>
//                   <th>Amount</th>
//                   <th>Date</th>
//                   <th>Status</th>
//                   <th>Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {recentInvoices.map((invoice) => {
//                   const statusBadge = getStatusBadge(invoice.status);
//                   return (
//                     <tr key={invoice.id}>
//                       <td className="invoice-number">{invoice.invoiceNumber}</td>
//                       <td>{invoice.clientName}</td>
//                       <td className="project-code">{invoice.projectCode}</td>
//                       <td className="amount">{formatCurrency(invoice.amount)}</td>
//                       <td>{invoice.date ? new Date(invoice.date).toLocaleDateString('en-IN') : ''}</td>
//                       <td>
//                         <span className={`status-badge ${statusBadge.class}`}>
//                           {statusBadge.icon} {statusBadge.text}
//                         </span>
//                       </td>
//                       <td className="actions">
//                         <button
//                           className="btn-icon"
//                           title="View"
//                           onClick={() => navigate(`/dashboard/invoices/${invoice.id}`)}
//                         >
//                           👁️
//                         </button>
//                         <button
//                           className="btn-icon"
//                           title="Edit"
//                           onClick={() => navigate(`/dashboard/edit-invoice/${invoice.id}`)}
//                         >
//                           ✏️
//                         </button>
//                         <button className="btn-icon" title="Download">⬇️</button>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           )}
//         </div>
//       </div>

//       <div className="quick-actions">
//         <h3>Quick Actions</h3>
//         <div className="actions-grid">
//           <button className="action-card" onClick={() => navigate('/dashboard/create-invoice')}>
//             <div className="action-icon">📄</div>
//             <div className="action-title">New Invoice</div>
//             <div className="action-desc">Create a new invoice</div>
//           </button>

//           <button className="action-card" onClick={() => navigate('/dashboard/drafts')}>
//             <div className="action-icon">💾</div>
//             <div className="action-title">View Drafts</div>
//             <div className="action-desc">Continue saved drafts</div>
//           </button>

//           <button className="action-card" onClick={() => navigate('/dashboard/invoices')}>
//             <div className="action-icon">📋</div>
//             <div className="action-title">All Invoices</div>
//             <div className="action-desc">View all invoices</div>
//           </button>

//           <button className="action-card" onClick={() => navigate('/dashboard/profile')}>
//             <div className="action-icon">⚙️</div>
//             <div className="action-title">Settings</div>
//             <div className="action-desc">Update your profile</div>
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
// src/pages/DashboardHome.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Dashboard.css';
import { getDashboardSummary } from '../api/api';

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    pendingDrafts: 0,
    paidInvoices: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getDashboardSummary();

        if (!res) throw new Error('Empty response from server');

        // Support shapes:
        // 1) { ok: true, summary: { totalInvoices, totalAmount, pendingDrafts, paidInvoices, recentInvoices } }
        // 2) { totalInvoices, totalAmount, pendingDrafts, paidInvoices, recentInvoices }
        const s = res.summary ? res.summary : res;

        // recent invoices array may exist as recentInvoices or lastInvoices or invoices
        const recent = s.recentInvoices || s.lastInvoices || s.invoices || [];

        // If Apps Script returned only last 5 invoices, there may be counts missing: compute where possible
        // Compute totals from the returned invoices (best-effort) if counts are missing
        const computedTotals = (recent && recent.length) ? recent.reduce((acc, inv) => {
          const st = String(inv.status || '').toLowerCase();
          if (st === 'final' || st === 'paid' || st === 'completed') acc.totalInvoices++;
          if (st === 'draft') acc.pendingDrafts++;
          if (st === 'paid') acc.paidInvoices++;
          const amt = Number(inv.totalAmount ?? inv.total ?? inv.amount ?? inv.netEarnings ?? inv.subtotal ?? 0);
          acc.totalRevenue += (isNaN(amt) ? 0 : amt);
          return acc;
        }, { totalInvoices: 0, totalRevenue: 0, pendingDrafts: 0, paidInvoices: 0 }) : { totalInvoices: 0, totalRevenue: 0, pendingDrafts: 0, paidInvoices: 0 };

        // Prefer server-provided totals but fallback to computed ones
        const totalInvoices = Number(s.totalInvoices ?? s.totalInvoicesCount ?? computedTotals.totalInvoices ?? 0);
        const totalRevenue = Number(s.totalAmount ?? s.totalRevenue ?? computedTotals.totalRevenue ?? 0);
        const pendingDrafts = Number(s.pendingDrafts ?? s.drafts ?? computedTotals.pendingDrafts ?? 0);
        const paidInvoices = Number(s.paidInvoices ?? s.paid ?? computedTotals.paidInvoices ?? 0);

        const mappedRecent = (recent || []).map(inv => ({
          id: inv.invoiceId || inv.id || inv.invoice_id || String(inv.invoiceNumber || inv.invoice_number || inv.id || ''),
          invoiceNumber: inv.invoiceNumber || inv.invoice_number || inv.invoiceId || inv.id || '',
          clientName: inv.clientName || inv.clientCode || inv.client || '',
          projectCode: inv.projectCode || inv.project || '',
          amount: Number(inv.totalAmount ?? inv.total ?? inv.amount ?? inv.netEarnings ?? inv.subtotal ?? 0),
          date: inv.createdAt || inv.created_at || inv.date || inv.invoiceDate || '',
          status: (inv.status || '').toLowerCase()
        }));

        if (!mounted) return;

        setStats({ totalInvoices, totalRevenue, pendingDrafts, paidInvoices });
        setRecentInvoices(mappedRecent);
      } catch (err) {
        console.error('dashboard load error', err);
        setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const formatCurrency = (amount) => {
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(amount);
    } catch {
      return amount;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      paid: { icon: '✅', text: 'Paid', class: 'status-paid' },
      pending: { icon: '⏳', text: 'Pending', class: 'status-pending' },
      draft: { icon: '💾', text: 'Draft', class: 'status-draft' },
      overdue: { icon: '⚠️', text: 'Overdue', class: 'status-overdue' }
    };
    return badges[status] || badges.draft;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-large"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-home">
        <div className="error-box">
          <h3>Failed to load dashboard</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-home">
      <div className="welcome-section">
        <div className="welcome-text">
          <h2>Welcome back, {user?.name?.split(' ')[0] || 'there'}! 👋</h2>
          <p>Here's what's happening with your invoices today.</p>
        </div>
        <button
          className="btn-primary btn-create"
          onClick={() => navigate('/dashboard/create-invoice')}
        >
          <span>➕</span> Create New Invoice
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalInvoices}</div>
            <div className="stat-label">Total Invoices</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">{formatCurrency(stats.totalRevenue)}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💾</div>
          <div className="stat-content">
            <div className="stat-value">{stats.pendingDrafts}</div>
            <div className="stat-label">Pending Drafts</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.paidInvoices}</div>
            <div className="stat-label">Paid Invoices</div>
          </div>
        </div>
      </div>

      <div className="recent-section">
        <div className="section-header">
          <h3>Recent Invoices</h3>
          <button
            className="btn-link"
            onClick={() => navigate('/dashboard/invoices')}
          >
            View All →
          </button>
        </div>

        <div className="invoices-table-container">
          {recentInvoices.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h3>No invoices yet</h3>
              <p>Create your first invoice to get started</p>
              <button
                className="btn-primary"
                onClick={() => navigate('/dashboard/create-invoice')}
              >
                Create Invoice
              </button>
            </div>
          ) : (
            <table className="invoices-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Project Code</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((invoice) => {
                  const statusBadge = getStatusBadge(invoice.status);
                  return (
                    <tr key={invoice.id}>
                      <td className="invoice-number">{invoice.invoiceNumber}</td>
                      <td>{invoice.clientName}</td>
                      <td className="project-code">{invoice.projectCode}</td>
                      <td className="amount">{formatCurrency(invoice.amount)}</td>
                      <td>{invoice.date ? new Date(invoice.date).toLocaleDateString('en-IN') : ''}</td>
                      <td>
                        <span className={`status-badge ${statusBadge.class}`}>
                          {statusBadge.icon} {statusBadge.text}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          className="btn-icon"
                          title="View"
                          onClick={() => navigate(`/dashboard/invoices/${invoice.id}`)}
                        >
                          👁️
                        </button>
                        <button
                          className="btn-icon"
                          title="Edit"
                          onClick={() => navigate(`/dashboard/edit-invoice/${invoice.id}`)}
                        >
                          ✏️
                        </button>
                        <button className="btn-icon" title="Download">⬇️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button className="action-card" onClick={() => navigate('/dashboard/create-invoice')}>
            <div className="action-icon">📄</div>
            <div className="action-title">New Invoice</div>
            <div className="action-desc">Create a new invoice</div>
          </button>

          <button className="action-card" onClick={() => navigate('/dashboard/drafts')}>
            <div className="action-icon">💾</div>
            <div className="action-title">View Drafts</div>
            <div className="action-desc">Continue saved drafts</div>
          </button>

          <button className="action-card" onClick={() => navigate('/dashboard/invoices')}>
            <div className="action-icon">📋</div>
            <div className="action-title">All Invoices</div>
            <div className="action-desc">View all invoices</div>
          </button>

          <button className="action-card" onClick={() => navigate('/dashboard/profile')}>
            <div className="action-icon">⚙️</div>
            <div className="action-title">Settings</div>
            <div className="action-desc">Update your profile</div>
          </button>
        </div>
      </div>
    </div>
  );
}
