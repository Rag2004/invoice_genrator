
// src/pages/InvoiceListPage.jsx - JSON PARSE & NAVIGATION FIX
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listInvoices } from "../api/api";
import { useAuth } from "../context/AuthContext";
import "../styles/InvoiceList.css";

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allInvoices, setAllInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    let mounted = true;

    async function loadInvoices() {
      try {
        setLoading(true);
        setError(null);

        const consultantId = user?.consultantId || user?.consultant_id || user?.id;
        
        console.log('🔍 InvoiceList - User:', user);
        console.log('🔍 InvoiceList - ConsultantId:', consultantId);
        
        if (!consultantId) {
          console.error("❌ Missing consultant ID");
          setError("Authentication error: Missing consultant ID");
          setLoading(false);
          return;
        }
        
        console.log("📋 Fetching invoices for:", consultantId);

        const result = await listInvoices(200, consultantId);

        if (!mounted) return;

        console.log("✅ Raw API Response:", result);

        // ✅ FIXED: Safe JSON parsing
        const normalized = (result?.invoices || []).map((inv) => {
          let items = [];
          
          // Safe parse items
          try {
            const itemsData = inv.itemsJson || inv.items;
            
            if (!itemsData) {
              // No items data
              items = [];
            } else if (typeof itemsData === 'string') {
              // String - need to parse
              const trimmed = itemsData.trim();
              if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
                items = [];
              } else {
                items = JSON.parse(trimmed);
              }
            } else if (Array.isArray(itemsData)) {
              // Already an array
              items = itemsData;
            } else {
              // Some other type
              console.warn('Unexpected items type:', typeof itemsData, itemsData);
              items = [];
            }
          } catch (e) {
            console.error("❌ Error parsing items for invoice:", inv.invoiceId || inv.id, e);
            items = [];
          }

          // Determine type from status
          const status = String(inv.status || 'DRAFT').toUpperCase();
          const type = status === 'FINAL' ? 'final' : 'draft';

          const normalized = {
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

          console.log('✅ Normalized invoice:', normalized.id, 'Type:', normalized.type);
          return normalized;
        });

        console.log('📊 Total normalized:', normalized.length);

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

  // ================================
  // HELPERS
  // ================================
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
      ? { icon: "✅", text: "Final", class: "status-final" }
      : { icon: "💾", text: "Draft", class: "status-draft" };
  };

  // ✅ FIXED: Better navigation with validation
  const handleViewInvoice = (invoice) => {
    console.log('🔍 Navigating to invoice:', invoice);
    
    if (!invoice.id) {
      console.error('❌ Invalid invoice: missing ID', invoice);
      alert('Cannot open invoice: Invalid invoice ID');
      return;
    }

    // Construct the path
    let path;
    if (invoice.type === "final") {
      path = `/dashboard/invoice/${invoice.id}`;
      console.log('📄 Opening FINAL invoice (read-only):', path);
    } else {
      path = `/dashboard/create-invoice/${invoice.id}`;
      console.log('✏️ Opening DRAFT invoice (editable):', path);
    }

    // Navigate
    try {
      navigate(path);
    } catch (err) {
      console.error('❌ Navigation failed:', err);
      alert(`Failed to open invoice: ${err.message}`);
    }
  };

  // Filter invoices
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

  // ================================
  // LOADING STATE
  // ================================
  if (loading) {
    return (
      <div className="invoice-list-page">
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading invoices...</p>
          <small style={{ color: '#6b7280', marginTop: '8px' }}>
            This may take a few seconds...
          </small>
        </div>
      </div>
    );
  }

  // ================================
  // ERROR STATE
  // ================================
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
            
            {(error.includes('expired') || error.includes('Access denied')) && (
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                style={{
                  padding: '10px 20px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🚪 Log Out
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ================================
  // MAIN UI
  // ================================
  return (
    <div className="invoice-list-page">
      
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
          <span style={{ fontSize: '14px', color: '#92400e' }}>{error}</span>
        </div>
      )}

      <div className="search-action-bar">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search invoices by number, client, or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          {search && (
            <button className="clear-search" onClick={() => setSearch("")}>
              ✕
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            padding: '4px',
            background: '#f3f4f6',
            borderRadius: '8px'
          }}>
            <button
              onClick={() => setActiveFilter("all")}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                background: activeFilter === "all" ? '#6366f1' : 'transparent',
                color: activeFilter === "all" ? 'white' : '#6b7280',
                fontWeight: activeFilter === "all" ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              All ({allInvoices.length})
            </button>
            <button
              onClick={() => setActiveFilter("final")}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                background: activeFilter === "final" ? '#6366f1' : 'transparent',
                color: activeFilter === "final" ? 'white' : '#6b7280',
                fontWeight: activeFilter === "final" ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Final ({allInvoices.filter(inv => inv.type === "final").length})
            </button>
            <button
              onClick={() => setActiveFilter("draft")}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                background: activeFilter === "draft" ? '#6366f1' : 'transparent',
                color: activeFilter === "draft" ? 'white' : '#6b7280',
                fontWeight: activeFilter === "draft" ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Drafts ({allInvoices.filter(inv => inv.type === "draft").length})
            </button>
          </div>

          <button
            className="btn-create-new"
            onClick={() => navigate("/dashboard/create-invoice")}
          >
            <span>➕</span> Create New Invoice
          </button>
        </div>
      </div>

      <div className="invoices-card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              {activeFilter === "all" ? "All Invoices" : 
               activeFilter === "final" ? "Final Invoices" : "Draft Invoices"}
            </h2>
            <p className="card-subtitle">
              Showing {filteredInvoices.length} of {allInvoices.length} invoices
            </p>
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {search ? "🔍" : activeFilter === "draft" ? "💾" : "📄"}
            </div>
            <h3 className="empty-title">
              {search ? "No invoices found" : 
               activeFilter === "draft" ? "No drafts yet" : "No invoices yet"}
            </h3>
            <p className="empty-description">
              {search ? "Try a different search term" : 
               "Create your first invoice to get started"}
            </p>
            {!search && (
              <button
                className="btn-primary"
                onClick={() => navigate("/dashboard/create-invoice")}
              >
                ➕ Create Invoice
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="invoices-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Project</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="actions-header">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredInvoices.map((inv) => {
                  const badge = getStatusBadge(inv.type);

                  return (
                    <tr key={inv.id} className="invoice-row">
                      <td className="invoice-number">{inv.invoiceNumber}</td>
                      <td className="client-name">{inv.clientName}</td>
                      <td className="project-code">{inv.projectCode}</td>
                      <td className="amount">{formatCurrency(inv.total)}</td>
                      <td className="date">{formatDate(inv.date)}</td>
                      <td>
                        <span className={`status-badge ${badge.class}`}>
                          {badge.icon} {badge.text}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          className={`btn-icon ${inv.type === "draft" ? "btn-edit" : ""}`}
                          title={inv.type === "final" ? "View Invoice" : "Edit Draft"}
                          onClick={() => handleViewInvoice(inv)}
                        >
                          {inv.type === "final" ? "👁️" : "✏️"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}