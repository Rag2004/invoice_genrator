
// src/pages/DashboardHome.jsx — Premium UI with proper action buttons
import React, { useState, useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listInvoices, getInvoice, sendInvoiceEmail } from '../api/api';
import InvoiceComplete from '../components/InvoiceComplete';
import { LOGO_URL } from '../config/branding';
import '../styles/Dashboard.css';

// ── SVG Icons ─────────────────────────────────────────
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
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// ── Stat Card ─────────────────────────────────────────
function DashboardCard({ title, value, subtitle, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <div className="stat-value">
          {typeof value === 'number' ? value.toLocaleString() : value ?? '-'}
        </div>
        <div className="stat-label">{title}</div>
        {subtitle && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{subtitle}</div>}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────
export default function DashboardHome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [consultantName, setConsultantName] = useState('');
  const [allInvoices, setAllInvoices] = useState([]);
  const [stats, setStats] = useState({ total: 0, drafts: 0, final: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sharing, setSharing] = useState(null);
  const [shareMessage, setShareMessage] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  // Pre-fetch cache: invoiceId → full invoice object
  const invoiceCache = useRef({});
  const downloadingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);
        const consultantId = user?.consultantId || user?.consultant_id || user?.id;
        if (!consultantId) throw new Error('Missing consultant ID');
        setConsultantName(user?.name || user?.consultantName || 'User');

        const result = await listInvoices(100, consultantId);
        if (!mounted) return;

        const invoices = (result?.invoices || []).map(inv => {
          const status = String(inv.status || 'DRAFT').toUpperCase();
          return {
            id: inv.invoiceId || inv.id,
            invoiceNumber: inv.invoiceNumber || 'DRAFT',
            projectCode: inv.projectCode || 'N/A',
            clientName: inv.clientName || inv.clientCode || 'N/A',
            status,
            updatedAt: inv.updatedAt || inv.createdAt || new Date().toISOString(),
            amount: Number(inv.subtotal || 0),
          };
        });

        const sorted = invoices.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setAllInvoices(sorted);
        setStats({
          total: sorted.length,
          drafts: sorted.filter(i => i.status === 'DRAFT').length,
          final: sorted.filter(i => i.status === 'FINAL').length,
        });
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Failed to load dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadDashboard();
    return () => { mounted = false; };
  }, [user]);

  // ── Pre-warm cache on hover ────────────────────────
  const handlePrefetch = async (invoice) => {
    if (invoice.status !== 'FINAL') return;
    if (invoiceCache.current[invoice.id]) return; // already cached
    try {
      const result = await getInvoice(invoice.id);
      const invoiceObj = result?.invoice;
      if (invoiceObj) invoiceCache.current[invoice.id] = invoiceObj;
    } catch { /* silent prefetch failure */ }
  };

  // ── Download PDF — uses cache so it's instant on click ──
  const handleDownloadPDF = async (invoice) => {
    if (!invoice.id || downloadingRef.current) return;
    downloadingRef.current = true;
    setDownloadingId(invoice.id);

    try {
      // Check cache first (pre-warmed on hover)
      let invoiceObj = invoiceCache.current[invoice.id];
      if (!invoiceObj) {
        const result = await getInvoice(invoice.id);
        invoiceObj = result?.invoice;
        if (invoiceObj) invoiceCache.current[invoice.id] = invoiceObj;
      }
      if (!invoiceObj) throw new Error('Invoice data not found');

      const html = renderToStaticMarkup(
        <InvoiceComplete invoice={invoiceObj} logoUrl={LOGO_URL} />
      );

      const printWindow = window.open('', '_blank', 'width=960,height=800');
      if (!printWindow) {
        alert('Please allow pop-ups to download the invoice PDF.');
        return;
      }

      const invoiceNumber = invoiceObj.invoiceNumber || invoiceObj.snapshot?.meta?.invoiceNumber || 'Invoice';
      printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; }
    @media print { @page { size: A4; margin: 10mm 15mm; } body { background: white; } }
  </style>
</head>
<body>
  ${html}
  <script>window.onload = function () { window.print(); }<\/script>
</body>
</html>`);
      printWindow.document.close();
    } catch (err) {
      console.error('Download failed:', err);
      alert(`Failed to prepare invoice: ${err.message}`);
    } finally {
      downloadingRef.current = false;
      setDownloadingId(null);
    }
  };

  // ── Share ──────────────────────────────────────────
  async function handleShare(invoice) {
    if (invoice.status !== 'FINAL') return;
    try {
      setSharing(invoice.id);
      const fullInvoice = await getInvoice(invoice.id);
      const data = fullInvoice?.invoice?.invoice || fullInvoice?.invoice || fullInvoice;
      if (!data) throw new Error('Could not load invoice data');
      await sendInvoiceEmail({
        invoiceId: invoice.id,
        invoiceNumber: data.invoiceNumber || invoice.invoiceNumber,
        projectCode: data.projectCode || invoice.projectCode,
        toEmail: data.clientEmail || data.toEmail,
        consultantName: data.consultantName,
        subtotal: data.subtotal,
        total: data.total,
      });
      setShareMessage({ type: 'success', text: `Invoice ${invoice.invoiceNumber} shared!` });
      setTimeout(() => setShareMessage(null), 4000);
    } catch (err) {
      setShareMessage({ type: 'error', text: err.message || 'Failed to share' });
      setTimeout(() => setShareMessage(null), 4000);
    } finally {
      setSharing(null);
    }
  }

  function handleAction(invoice) {
    if (invoice.status === 'DRAFT') {
      window.location.href = `/dashboard/create-invoice/${invoice.id}`;
    } else {
      navigate(`/dashboard/invoice/${invoice.id}`);
    }
  }

  function formatDate(d) {
    if (!d) return 'N/A';
    try {
      return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return 'N/A'; }
  }

  function formatCurrency(amount) {
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    } catch { return `₹${amount}`; }
  }

  function getStatusBadge(status) {
    const isDraft = status === 'DRAFT';
    return (
      <span className={isDraft ? 'status-draft status-badge' : 'status-paid status-badge'}>
        {isDraft ? 'Draft' : 'Final'}
      </span>
    );
  }

  // ── Loading ────────────────────────────────────────
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-large" />
        <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '4px' }}>Loading dashboard…</p>
      </div>
    );
  }

  if (error && allInvoices.length === 0) {
    return (
      <div className="dashboard-home">
        <div className="error-box">
          <div style={{ fontSize: '40px', marginBottom: '14px' }}>⚠️</div>
          <h3>Failed to load dashboard</h3>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-home">
      {/* Toast */}
      {shareMessage && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px',
          padding: '12px 20px', borderRadius: '10px', zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '13.5px', fontWeight: '600',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          animation: 'slideIn 0.3s ease',
          background: shareMessage.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
        }}>
          {shareMessage.type === 'success' ? '✓' : '✕'} {shareMessage.text}
        </div>
      )}

      {/* Welcome Banner */}
      <div className="welcome-section">
        <div className="welcome-text">
          <h2>Welcome back, {consultantName.split(' ')[0]}! 👋</h2>
          <p>Manage your invoices and track your work</p>
        </div>
        <button className="btn-create" onClick={() => navigate('/dashboard/create-invoice')}>
          <PlusIcon /> Create Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <DashboardCard title="Total Invoices" value={stats.total} icon="📊" />
        <DashboardCard title="Final Invoices" value={stats.final} subtitle="Ready to share" icon="✅" />
        <DashboardCard title="Drafts" value={stats.drafts} subtitle="In progress" icon="📝" />
      </div>

      {/* Recent Invoices Table */}
      <div className="recent-section">
        <div className="section-header">
          <h3>Recent Invoices</h3>
          <button className="btn-link" onClick={() => navigate('/dashboard/invoices')}>View All →</button>
        </div>

        <div className="invoices-table-container">
          {allInvoices.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h3>No invoices yet</h3>
              <p>Create your first invoice to get started</p>
              <button className="btn-primary" onClick={() => navigate('/dashboard/create-invoice')}>Create Invoice</button>
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
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allInvoices.slice(0, 6).map((invoice) => {
                  const isFinal = invoice.status === 'FINAL';
                  const isDownloading = downloadingId === invoice.id;
                  return (
                    <tr
                      key={invoice.id}
                      onMouseEnter={() => handlePrefetch(invoice)} // 🚀 pre-warm cache on hover
                    >
                      <td><span className="invoice-number">{invoice.invoiceNumber}</span></td>
                      <td style={{ color: '#1e293b', fontWeight: 500 }}>{invoice.clientName}</td>
                      <td><span className="project-code">{invoice.projectCode}</span></td>
                      <td className="amount">{formatCurrency(invoice.amount)}</td>
                      <td style={{ color: '#64748b', fontSize: '13px' }}>{formatDate(invoice.updatedAt)}</td>
                      <td>{getStatusBadge(invoice.status)}</td>
                      <td>
                        <div className="actions">
                          {/* View or Edit */}
                          <button
                            className={`dash-action-btn ${isFinal ? 'dash-action-btn--view' : 'dash-action-btn--edit'}`}
                            onClick={() => handleAction(invoice)}
                            title={isFinal ? 'View Invoice' : 'Edit Draft'}
                          >
                            {isFinal ? <EyeIcon /> : <EditIcon />}
                            <span>{isFinal ? 'View' : 'Edit'}</span>
                          </button>

                          {/* Share — enabled for final, disabled for draft */}
                          <button
                            className="dash-action-btn dash-action-btn--share"
                            onClick={isFinal ? () => handleShare(invoice) : undefined}
                            disabled={!isFinal || sharing === invoice.id}
                            title={isFinal ? 'Share via Email' : 'Finalize to share'}
                            style={!isFinal ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                          >
                            {sharing === invoice.id
                              ? <span className="dash-spin" />
                              : <MailIcon />}
                            <span>Share</span>
                          </button>

                          {/* PDF — enabled for final, disabled for draft */}
                          <button
                            className="dash-action-btn dash-action-btn--pdf"
                            onClick={isFinal ? () => handleDownloadPDF(invoice) : undefined}
                            disabled={!isFinal || isDownloading}
                            title={isFinal ? 'Download PDF' : 'Finalize to download'}
                            style={!isFinal ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                          >
                            {isDownloading
                              ? <span className="dash-spin" />
                              : <DownloadIcon />}
                            <span>PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button className="action-card" onClick={() => navigate('/dashboard/create-invoice')}>
            <span className="action-icon">📄</span>
            <div className="action-title">New Invoice</div>
            <div className="action-desc">Create a new invoice</div>
          </button>
          <button className="action-card" onClick={() => navigate('/dashboard/invoices')}>
            <span className="action-icon">📋</span>
            <div className="action-title">All Invoices</div>
            <div className="action-desc">View and manage all invoices</div>
          </button>
          <button className="action-card" onClick={() => navigate('/dashboard/profile')}>
            <span className="action-icon">⚙️</span>
            <div className="action-title">Settings</div>
            <div className="action-desc">Update your profile</div>
          </button>
        </div>
      </div>
    </div>
  );
}