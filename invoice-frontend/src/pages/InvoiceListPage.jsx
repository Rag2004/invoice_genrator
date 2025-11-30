// src/pages/InvoiceListPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, paid, pending, overdue

  useEffect(() => {
    // Simulate API call - Replace with actual API
    setTimeout(() => {
      setInvoices([
        {
          id: 'INV-001',
          invoiceNumber: 'INV-2025-001',
          clientName: 'Acme Corp',
          projectCode: 'PRJ_240205',
          amount: 45000,
          date: '2025-11-20',
          dueDate: '2025-12-20',
          status: 'paid'
        },
        {
          id: 'INV-002',
          invoiceNumber: 'INV-2025-002',
          clientName: 'Tech Solutions Inc',
          projectCode: 'PRJ_240210',
          amount: 38000,
          date: '2025-11-22',
          dueDate: '2025-12-22',
          status: 'pending'
        },
        {
          id: 'INV-003',
          invoiceNumber: 'INV-2025-003',
          clientName: 'Digital Ventures',
          projectCode: 'PRJ_240215',
          amount: 52000,
          date: '2025-11-25',
          dueDate: '2025-12-25',
          status: 'paid'
        },
        {
          id: 'INV-004',
          invoiceNumber: 'INV-2025-004',
          clientName: 'StartUp Labs',
          projectCode: 'PRJ_240220',
          amount: 29000,
          date: '2025-10-15',
          dueDate: '2025-11-15',
          status: 'overdue'
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
      overdue: { icon: '⚠️', text: 'Overdue', class: 'status-overdue' }
    };
    return badges[status] || badges.pending;
  };

  const filteredInvoices = invoices.filter(inv => {
    if (filter === 'all') return true;
    return inv.status === filter;
  });

  const stats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'paid').length,
    pending: invoices.filter(i => i.status === 'pending').length,
    overdue: invoices.filter(i => i.status === 'overdue').length
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-large"></div>
        <p>Loading invoices...</p>
      </div>
    );
  }

  return (
    <div className="invoice-list-page">
      {/* Stats Summary */}
      <div className="stats-summary">
        <button 
          className={`stat-filter ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          <div className="stat-number">{stats.total}</div>
          <div className="stat-text">All Invoices</div>
        </button>
        <button 
          className={`stat-filter ${filter === 'paid' ? 'active' : ''}`}
          onClick={() => setFilter('paid')}
        >
          <div className="stat-number">{stats.paid}</div>
          <div className="stat-text">Paid</div>
        </button>
        <button 
          className={`stat-filter ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          <div className="stat-number">{stats.pending}</div>
          <div className="stat-text">Pending</div>
        </button>
        <button 
          className={`stat-filter ${filter === 'overdue' ? 'active' : ''}`}
          onClick={() => setFilter('overdue')}
        >
          <div className="stat-number">{stats.overdue}</div>
          <div className="stat-text">Overdue</div>
        </button>
      </div>

      {/* Invoices Table */}
      <div className="invoices-section">
        <div className="section-header">
          <h2>All Invoices ({filteredInvoices.length})</h2>
          <button 
            className="btn-primary"
            onClick={() => navigate('/dashboard/create-invoice')}
          >
            ➕ Create New
          </button>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h3>No {filter !== 'all' ? filter : ''} invoices found</h3>
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
                <th>Project</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => {
                const statusBadge = getStatusBadge(invoice.status);
                return (
                  <tr key={invoice.id}>
                    <td className="invoice-number">{invoice.invoiceNumber}</td>
                    <td>{invoice.clientName}</td>
                    <td className="project-code">{invoice.projectCode}</td>
                    <td className="amount">{formatCurrency(invoice.amount)}</td>
                    <td>{new Date(invoice.date).toLocaleDateString('en-IN')}</td>
                    <td>{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span className={`status-badge ${statusBadge.class}`}>
                        {statusBadge.icon} {statusBadge.text}
                      </span>
                    </td>
                    <td className="actions">
                      <button className="btn-icon" title="View">👁️</button>
                      <button className="btn-icon" title="Edit">✏️</button>
                      <button className="btn-icon" title="Download">⬇️</button>
                      <button className="btn-icon" title="Delete">🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}