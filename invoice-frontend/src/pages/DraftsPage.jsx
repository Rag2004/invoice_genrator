
// src/pages/DraftsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export default function DraftsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ==================== FETCH DRAFTS ====================
  // useEffect(() => {
  //   const fetchDrafts = async () => {
  //     try {
  //       setLoading(true);
  //       setError(null);

  //       const consultantId = user?.consultantId || user?.consultant_id || '';

  //       if (!consultantId) {
  //         throw new Error('Consultant ID not found');
  //       }

  //       const resp = await fetch(`${API_BASE}/drafts?consultantId=${consultantId}`, {
  //         method: 'GET',
  //         headers: {
  //           'Content-Type': 'application/json',
  //           'x-consultant-id': consultantId,
  //         },
  //       });

  //       if (!resp.ok) {
  //         throw new Error(`Failed to fetch drafts: ${resp.status}`);
  //       }

  //       const data = await resp.json();
  //       console.log('📋 Drafts loaded:', data);

  //       const draftList = data.drafts || [];
        
  //       // Sort by most recent first
  //       const sorted = draftList.sort((a, b) => {
  //         const dateA = new Date(a.updatedAt || a.createdAt || 0);
  //         const dateB = new Date(b.updatedAt || b.createdAt || 0);
  //         return dateB - dateA;
  //       });

  //       setDrafts(sorted);
  //     } catch (err) {
  //       console.error('❌ Error fetching drafts:', err);
  //       setError(err.message);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchDrafts();
  // }, [user]);
     // In DraftsPage.jsx, make sure you're fetching with consultantId header:

useEffect(() => {
  const fetchDrafts = async () => {
    try {
      setLoading(true);
      setError(null);

      const consultantId = user?.consultantId || user?.consultant_id;
      
      if (!consultantId) {
        throw new Error('No consultant ID found');
      }

      const response = await fetch(`${API_BASE}/drafts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-consultant-id': consultantId,  // ✅ Pass consultant ID
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch drafts: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Drafts fetched:', data);

      // ✅ Filter again on frontend for extra security
      const myDrafts = (data.drafts || []).filter(draft => 
        draft.consultantId === consultantId
      );

      setDrafts(myDrafts);
      
    } catch (err) {
      console.error('Error fetching drafts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    fetchDrafts();
  }
}, [user]);
  // ==================== FORMAT HELPERS ====================
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Less than an hour ago';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-IN');
  };

  const getClientName = (draft) => {
    // Try to get client name from different possible fields
    if (draft.clientName) return draft.clientName;
    if (draft.clientCode) return draft.clientCode;
    
    // Try to parse from invoiceData
    if (draft.invoiceData) {
      const data = typeof draft.invoiceData === 'string' 
        ? JSON.parse(draft.invoiceData) 
        : draft.invoiceData;
      
      if (data.clientName) return data.clientName;
    }
    
    return 'Untitled Invoice';
  };

  const getAmount = (draft) => {
    // Try to get amount from different possible fields
    if (draft.total) return Number(draft.total);
    if (draft.amount) return Number(draft.amount);
    
    // Try to parse from invoiceData
    if (draft.invoiceData) {
      const data = typeof draft.invoiceData === 'string' 
        ? JSON.parse(draft.invoiceData) 
        : draft.invoiceData;
      
      if (data.total) return Number(data.total);
      if (data.amount) return Number(data.amount);
    }
    
    return 0;
  };

  // ==================== HANDLERS ====================
  const handleContinueDraft = (invoiceId) => {
    navigate(`/dashboard/create-invoice/${invoiceId}`);
  };

  const handleDeleteDraft = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this draft?')) {
      return;
    }

    try {
      // For now, just remove from UI
      // You can implement DELETE endpoint later
      setDrafts(drafts.filter(d => d.invoiceId !== invoiceId));
      alert('✅ Draft deleted successfully');
    } catch (err) {
      console.error('❌ Error deleting draft:', err);
      alert(`❌ Failed to delete draft: ${err.message}`);
    }
  };

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-large"></div>
        <p>Loading drafts...</p>
      </div>
    );
  }

  // ==================== ERROR STATE ====================
  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h3>Failed to load drafts</h3>
        <p>{error}</p>
        <button 
          className="btn-primary"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  // ==================== RENDER ====================
  return (
    <div className="drafts-page">
      <div className="page-header">
        <div>
          <h2>Saved Drafts</h2>
          <p>Continue working on your incomplete invoices</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => navigate('/dashboard/create-invoice')}
        >
          ➕ New Invoice
        </button>
      </div>

      {drafts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💾</div>
          <h3>No drafts saved</h3>
          <p>Start creating an invoice and it will auto-save as a draft</p>
          <button 
            className="btn-primary"
            onClick={() => navigate('/dashboard/create-invoice')}
          >
            Create Invoice
          </button>
        </div>
      ) : (
        <div className="drafts-grid">
          {drafts.map((draft) => (
            <div key={draft.invoiceId} className="draft-card">
              <div className="draft-header">
                <div className="draft-icon">💾</div>
                <button 
                  className="btn-delete-draft"
                  onClick={() => handleDeleteDraft(draft.invoiceId)}
                  title="Delete draft"
                >
                  🗑️
                </button>
              </div>

              <div className="draft-content">
                <h3>{getClientName(draft)}</h3>
                <div className="draft-info">
                  <span className="project-code">
                    {draft.projectCode || 'No project code'}
                  </span>
                  {getAmount(draft) > 0 && (
                    <span className="draft-amount">
                      {formatCurrency(getAmount(draft))}
                    </span>
                  )}
                </div>
                
                <div className="draft-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${draft.completionPercentage || 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="progress-text">
                    {draft.completionPercentage || 0}% complete
                  </span>
                </div>

                <div className="draft-meta">
                  <span>🕐 {formatDate(draft.updatedAt || draft.createdAt)}</span>
                </div>
              </div>

              <button 
                className="btn-continue"
                onClick={() => handleContinueDraft(draft.invoiceId)}
              >
                Continue Editing →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}