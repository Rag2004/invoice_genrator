// src/pages/DashboardHome.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Dashboard.css';

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mock data - Replace with actual API calls later
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    pendingDrafts: 0,
    paidInvoices: 0
  });

  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call - Replace with actual API
    setTimeout(() => {
      // Mock data
      setStats({
        totalInvoices: 12,
        totalRevenue: 450000,
        pendingDrafts: 3,
        paidInvoices: 9
      });

      setRecentInvoices([
        {
          id: 'INV-001',
          invoiceNumber: 'INV-2025-001',
          clientName: 'Acme Corp',
          projectCode: 'PRJ_240205',
          amount: 45000,
          date: '2025-11-20',
          status: 'paid'
        },
        {
          id: 'INV-002',
          invoiceNumber: 'INV-2025-002',
          clientName: 'Tech Solutions Inc',
          projectCode: 'PRJ_240210',
          amount: 38000,
          date: '2025-11-22',
          status: 'pending'
        },
        {
          id: 'INV-003',
          invoiceNumber: 'INV-2025-003',
          clientName: 'Digital Ventures',
          projectCode: 'PRJ_240215',
          amount: 52000,
          date: '2025-11-25',
          status: 'paid'
        }
      ]);

      setLoading(false);
    }, 500);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
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

  return (
    <div className="dashboard-home">
      {/* Welcome Section */}
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

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            📄
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalInvoices}</div>
            <div className="stat-label">Total Invoices</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            💰
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatCurrency(stats.totalRevenue)}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            💾
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.pendingDrafts}</div>
            <div className="stat-label">Pending Drafts</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            ✅
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.paidInvoices}</div>
            <div className="stat-label">Paid Invoices</div>
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
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
                      <td>{new Date(invoice.date).toLocaleDateString('en-IN')}</td>
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
                        <button 
                          className="btn-icon" 
                          title="Download"
                        >
                          ⬇️
                        </button>
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
          <button 
            className="action-card"
            onClick={() => navigate('/dashboard/create-invoice')}
          >
            <div className="action-icon">📄</div>
            <div className="action-title">New Invoice</div>
            <div className="action-desc">Create a new invoice</div>
          </button>

          <button 
            className="action-card"
            onClick={() => navigate('/dashboard/drafts')}
          >
            <div className="action-icon">💾</div>
            <div className="action-title">View Drafts</div>
            <div className="action-desc">Continue saved drafts</div>
          </button>

          <button 
            className="action-card"
            onClick={() => navigate('/dashboard/invoices')}
          >
            <div className="action-icon">📋</div>
            <div className="action-title">All Invoices</div>
            <div className="action-desc">View all invoices</div>
          </button>

          <button 
            className="action-card"
            onClick={() => navigate('/dashboard/profile')}
          >
            <div className="action-icon">⚙️</div>
            <div className="action-title">Settings</div>
            <div className="action-desc">Update your profile</div>
          </button>
        </div>
      </div>
    </div>
  );
}