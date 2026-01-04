// src/components/Dashboard/DashboardCard.jsx
import React from 'react';

export default function DashboardCard({ title, value, subtitle }) {
  return (
    <div
      className="shadow rounded-xl p-4 bg-white"
      style={{ minWidth: 180, minHeight: 80 }}
    >
      <div style={{ color: '#6b7280', fontSize: 13 }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700 }}>
        {typeof value === 'number' ? value.toLocaleString() : value ?? '-'}
      </div>
      {subtitle ? <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 6 }}>{subtitle}</div> : null}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// DASHBOARD CARD COMPONENT
// ============================================================================
function DashboardCard({ title, value, subtitle, icon }) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        minWidth: '180px',
        minHeight: '80px'
      }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        marginBottom: '12px'
      }}>
        {icon && <span style={{ fontSize: '20px' }}>{icon}</span>}
        <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500' }}>
          {title}
        </div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937' }}>
        {typeof value === 'number' ? value.toLocaleString() : value ?? '-'}
      </div>
      {subtitle && (
        <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '8px' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================
export default function Dashboard() {
  const navigate = useNavigate();
  
  // State
  const [consultantName, setConsultantName] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    drafts: 0,
    final: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with your actual API calls
      // Example:
      // const consultantId = getCurrentUserId();
      // const consultant = await getConsultant(consultantId);
      // const invoiceList = await getInvoices(consultantId);

      // MOCK DATA - Replace with real API calls
      const mockConsultant = { consultantName: 'Raghav Mangla' };
      const mockInvoices = [
        {
          invoiceId: 'INV_00054',
          invoiceNumber: 'INV-00054',
          projectCode: 'PRJ_123',
          status: 'DRAFT',
          updatedAt: '2025-01-01T10:00:00Z'
        },
        {
          invoiceId: 'INV_00053',
          invoiceNumber: 'INV-00053',
          projectCode: 'PRJ_122',
          status: 'FINAL',
          updatedAt: '2024-12-28T14:30:00Z'
        }
      ];

      // Set consultant name
      setConsultantName(mockConsultant.consultantName || 'User');

      // Sort invoices by date (newest first)
      const sorted = mockInvoices.sort((a, b) => 
        new Date(b.updatedAt) - new Date(a.updatedAt)
      );
      setInvoices(sorted);

      // Calculate stats
      const drafts = sorted.filter(inv => inv.status === 'DRAFT').length;
      const final = sorted.filter(inv => inv.status === 'FINAL').length;
      
      setStats({
        total: sorted.length,
        drafts,
        final
      });

    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  }

  function getStatusBadge(status) {
    const isDraft = status === 'DRAFT';
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        background: isDraft ? '#fef3c7' : '#d1fae5',
        color: isDraft ? '#92400e' : '#065f46'
      }}>
        {isDraft ? '💾' : '✅'} {status}
      </span>
    );
  }

  function handleAction(invoice) {
    if (invoice.status === 'DRAFT') {
      // Edit draft
      navigate(`/invoice/${invoice.invoiceId}`);
    } else {
      // View final (read-only)
      navigate(`/invoice/${invoice.invoiceId}?mode=view`);
    }
  }

  // ============================================================================
  // RENDER: LOADING
  // ============================================================================
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading dashboard...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // ============================================================================
  // RENDER: ERROR
  // ============================================================================
  if (error) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '400px',
          margin: '0 auto',
          padding: '32px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ marginBottom: '8px', color: '#991b1b' }}>Failed to load dashboard</h3>
          <p style={{ color: '#7f1d1d', fontSize: '14px', marginBottom: '20px' }}>{error}</p>
          <button
            onClick={loadDashboard}
            style={{
              padding: '10px 20px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: MAIN DASHBOARD
  // ============================================================================
  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#1f2937',
            marginBottom: '4px'
          }}>
            Welcome, {consultantName.split(' ')[0]} 👋
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Manage your invoices and track your work
          </p>
        </div>
        
        <button
          onClick={() => navigate('/invoice')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(99, 102, 241, 0.25)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#4f46e5';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#6366f1';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          <span style={{ fontSize: '18px' }}>➕</span>
          Create Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <DashboardCard
          title="Total Invoices"
          value={stats.total}
          icon="📊"
        />
        <DashboardCard
          title="Draft Invoices"
          value={stats.drafts}
          subtitle="Editable"
          icon="💾"
        />
        <DashboardCard
          title="Final Invoices"
          value={stats.final}
          subtitle="Read-only"
          icon="✅"
        />
      </div>

      {/* Invoices List */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            All Invoices
          </h2>
        </div>

        {invoices.length === 0 ? (
          // Empty State
          <div style={{
            padding: '60px 20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📄</div>
            <h3 style={{ marginBottom: '8px', color: '#374151' }}>No invoices yet</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
              Create your first invoice to get started
            </p>
            <button
              onClick={() => navigate('/invoice')}
              style={{
                padding: '10px 20px',
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Create Invoice
            </button>
          </div>
        ) : (
          // Invoice Table
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={tableHeaderStyle}>Invoice Number</th>
                  <th style={tableHeaderStyle}>Project Code</th>
                  <th style={tableHeaderStyle}>Status</th>
                  <th style={tableHeaderStyle}>Last Updated</th>
                  <th style={tableHeaderStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice, index) => (
                  <tr
                    key={invoice.invoiceId}
                    style={{
                      borderBottom: index < invoices.length - 1 ? '1px solid #e5e7eb' : 'none'
                    }}
                  >
                    <td style={tableCellStyle}>
                      <span style={{ fontWeight: '600', color: '#1f2937' }}>
                        {invoice.invoiceNumber || 'Draft'}
                      </span>
                    </td>
                    <td style={tableCellStyle}>
                      <span style={{ 
                        color: '#6b7280',
                        fontFamily: 'monospace',
                        fontSize: '13px'
                      }}>
                        {invoice.projectCode}
                      </span>
                    </td>
                    <td style={tableCellStyle}>
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td style={tableCellStyle}>
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>
                        {formatDate(invoice.updatedAt)}
                      </span>
                    </td>
                    <td style={tableCellStyle}>
                      <button
                        onClick={() => handleAction(invoice)}
                        style={{
                          padding: '6px 16px',
                          background: invoice.status === 'DRAFT' ? '#f3f4f6' : '#e0e7ff',
                          color: invoice.status === 'DRAFT' ? '#374151' : '#4338ca',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = invoice.status === 'DRAFT' ? '#e5e7eb' : '#c7d2fe';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = invoice.status === 'DRAFT' ? '#f3f4f6' : '#e0e7ff';
                        }}
                      >
                        {invoice.status === 'DRAFT' ? '✏️ Edit' : '👁️ View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TABLE STYLES
// ============================================================================
const tableHeaderStyle = {
  padding: '12px 24px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const tableCellStyle = {
  padding: '16px 24px',
  fontSize: '14px'
};