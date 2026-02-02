
// src/pages/DashboardHome.jsx - FIXED WITH EXPLICIT CONSULTANT ID
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listInvoices, getInvoice, sendInvoiceEmail } from '../api/api';
import '../styles/Dashboard.css';

function DashboardCard({ title, value, subtitle, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <div className="stat-value">
          {typeof value === 'number' ? value.toLocaleString() : value ?? '-'}
        </div>
        <div className="stat-label">{title}</div>
        {subtitle && (
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [consultantName, setConsultantName] = useState('');
  const [allInvoices, setAllInvoices] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    drafts: 0,
    final: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sharing, setSharing] = useState(null); // Track which invoice is being shared
  const [shareMessage, setShareMessage] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        // ✅ Extract consultantId with detailed logging
        const consultantId = user?.consultantId || user?.consultant_id || user?.id;

        if (!consultantId) {
          throw new Error('Missing consultant ID from user object');
        }

        setConsultantName(user?.name || user?.consultantName || 'User');



        // ✅ Pass consultantId explicitly to the API
        const result = await listInvoices(100, consultantId);

        if (!mounted) return;



        // Normalize invoices
        const invoices = (result?.invoices || []).map(inv => {
          const status = String(inv.status || 'DRAFT').toUpperCase();

          return {
            id: inv.invoiceId || inv.id,
            invoiceNumber: inv.invoiceNumber || 'DRAFT',
            projectCode: inv.projectCode || 'N/A',
            clientName: inv.clientName || inv.clientCode || 'N/A',
            status,
            updatedAt: inv.updatedAt || inv.createdAt || new Date().toISOString(),
            amount: Number(inv.subtotal || 0)
          };
        });



        // Sort by date (newest first)
        const sorted = invoices.sort((a, b) =>
          new Date(b.updatedAt) - new Date(a.updatedAt)
        );

        setAllInvoices(sorted);

        // Calculate stats
        const drafts = sorted.filter(i => i.status === 'DRAFT');
        const finals = sorted.filter(i => i.status === 'FINAL');



        setStats({
          total: sorted.length,
          drafts: drafts.length,
          final: finals.length
        });

      } catch (err) {
        if (!mounted) return;

        setError(err.message || 'Failed to load dashboard');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [user]);

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  }

  function formatCurrency(amount) {
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(amount);
    } catch {
      return `₹${amount}`;
    }
  }

  function getStatusBadge(status) {
    const isDraft = status === 'DRAFT';
    return (
      <span className={isDraft ? 'status-draft' : 'status-paid'}>
        {isDraft ? '💾' : '✅'} {status}
      </span>
    );
  }

  function handleAction(invoice) {
    if (invoice.status === 'DRAFT') {
      navigate(`/dashboard/create-invoice/${invoice.id}`);
    } else {
      navigate(`/dashboard/invoice/${invoice.id}`);
    }
  }

  // ✅ Share invoice via email
  async function handleShare(invoice) {
    if (invoice.status !== 'FINAL') {
      setShareMessage({ type: 'error', text: 'Only finalized invoices can be shared' });
      setTimeout(() => setShareMessage(null), 3000);
      return;
    }

    try {
      setSharing(invoice.id);
      setShareMessage(null);

      // Fetch full invoice data
      const fullInvoice = await getInvoice(invoice.id);
      const data = fullInvoice?.invoice?.invoice || fullInvoice?.invoice || fullInvoice;

      if (!data) {
        throw new Error('Could not load invoice data');
      }

      // Send email
      await sendInvoiceEmail({
        invoiceId: invoice.id,
        invoiceNumber: data.invoiceNumber || invoice.invoiceNumber,
        projectCode: data.projectCode || invoice.projectCode,
        toEmail: data.clientEmail || data.toEmail,
        consultantName: data.consultantName,
        subtotal: data.subtotal,
        total: data.total,
      });

      setShareMessage({ type: 'success', text: `Invoice ${invoice.invoiceNumber} shared successfully!` });
      setTimeout(() => setShareMessage(null), 4000);

    } catch (err) {
      setShareMessage({ type: 'error', text: err.message || 'Failed to share invoice' });
      setTimeout(() => setShareMessage(null), 4000);
    } finally {
      setSharing(null);
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-large" />
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '12px' }}>
          Loading dashboard...
        </p>
      </div>
    );
  }

  if (error && allInvoices.length === 0) {
    return (
      <div className="dashboard-home">
        <div className="error-box">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h3>Failed to load dashboard</h3>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-home">
      {shareMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          padding: '14px 24px',
          borderRadius: '12px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          animation: 'slideIn 0.3s ease',
          background: shareMessage.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
        }}>
          {shareMessage.type === 'success' ? '✅' : '❌'} {shareMessage.text}
        </div>
      )}

      {error && allInvoices.length > 0 && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          padding: '12px 20px',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span style={{ fontSize: '14px', color: '#92400e' }}>
            Some data couldn't be loaded: {error}
          </span>
        </div>
      )}

      <div className="welcome-section">
        <div className="welcome-text">
          <h2>Welcome back, {consultantName.split(' ')[0]}! 👋</h2>
          <p>Manage your invoices and track your work</p>
        </div>
        <button
          className="btn-create"
          onClick={() => navigate('/dashboard/create-invoice')}
        >
          <span style={{ fontSize: '18px' }}>➕</span>
          Create Invoice
        </button>
      </div>

      <div className="stats-grid">
        <DashboardCard title="Total Invoices" value={stats.total} icon="📊" />
        <DashboardCard title="Draft Invoices" value={stats.drafts} subtitle="Editable" icon="💾" />
        <DashboardCard title="Final Invoices" value={stats.final} subtitle="Read-only" icon="✅" />
      </div>

      <div className="recent-section">
        <div className="section-header">
          <h3>Recent Invoices</h3>
          <button className="btn-link" onClick={() => navigate('/dashboard/invoices')}>
            View All →
          </button>
        </div>

        <div className="invoices-table-container">
          {allInvoices.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h3>No invoices yet</h3>
              <p>Create your first invoice to get started</p>
              <button className="btn-primary" onClick={() => navigate('/dashboard/create-invoice')}>
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
                {allInvoices.slice(0, 5).map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="invoice-number">{invoice.invoiceNumber}</td>
                    <td>{invoice.clientName}</td>
                    <td className="project-code">{invoice.projectCode}</td>
                    <td className="amount">{formatCurrency(invoice.amount)}</td>
                    <td>{formatDate(invoice.updatedAt)}</td>
                    <td>{getStatusBadge(invoice.status)}</td>
                    <td className="actions">
                      <button
                        className="btn-icon"
                        title={invoice.status === 'DRAFT' ? 'Edit' : 'View'}
                        onClick={() => handleAction(invoice)}
                      >
                        {invoice.status === 'DRAFT' ? '✏️' : '👁️'}
                      </button>
                      {invoice.status === 'FINAL' && (
                        <button
                          className="btn-icon btn-share"
                          title="Share via Email"
                          onClick={() => handleShare(invoice)}
                          disabled={sharing === invoice.id}
                          style={{
                            background: sharing === invoice.id ? '#e0e7ff' : '#f3f4f6',
                            opacity: sharing === invoice.id ? 0.7 : 1,
                          }}
                        >
                          {sharing === invoice.id ? '⏳' : '📧'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
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