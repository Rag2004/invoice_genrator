// src/pages/DraftsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DraftsPage() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call - Replace with actual API
    setTimeout(() => {
      setDrafts([
        {
          id: 'DRAFT-001',
          clientName: 'Future Corp',
          projectCode: 'PRJ_240301',
          amount: 0,
          lastModified: '2025-11-24T10:30:00',
          completionPercent: 60
        },
        {
          id: 'DRAFT-002',
          clientName: 'Innovation Inc',
          projectCode: 'PRJ_240305',
          amount: 25000,
          lastModified: '2025-11-23T15:45:00',
          completionPercent: 80
        },
        {
          id: 'DRAFT-003',
          clientName: 'New Business Ltd',
          projectCode: 'PRJ_240310',
          amount: 0,
          lastModified: '2025-11-20T09:15:00',
          completionPercent: 30
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

  const formatDate = (dateString) => {
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

  const handleContinueDraft = (draftId) => {
    // Navigate to create invoice with draft data
    navigate(`/dashboard/create-invoice?draft=${draftId}`);
  };

  const handleDeleteDraft = (draftId) => {
    if (window.confirm('Are you sure you want to delete this draft?')) {
      setDrafts(drafts.filter(d => d.id !== draftId));
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-large"></div>
        <p>Loading drafts...</p>
      </div>
    );
  }

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
          <p>Start creating an invoice and save it as draft</p>
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
            <div key={draft.id} className="draft-card">
              <div className="draft-header">
                <div className="draft-icon">💾</div>
                <button 
                  className="btn-delete-draft"
                  onClick={() => handleDeleteDraft(draft.id)}
                  title="Delete draft"
                >
                  🗑️
                </button>
              </div>

              <div className="draft-content">
                <h3>{draft.clientName || 'Untitled Invoice'}</h3>
                <div className="draft-info">
                  <span className="project-code">{draft.projectCode}</span>
                  {draft.amount > 0 && (
                    <span className="draft-amount">{formatCurrency(draft.amount)}</span>
                  )}
                </div>
                
                <div className="draft-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${draft.completionPercent}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{draft.completionPercent}% complete</span>
                </div>

                <div className="draft-meta">
                  <span>🕐 {formatDate(draft.lastModified)}</span>
                </div>
              </div>

              <button 
                className="btn-continue"
                onClick={() => handleContinueDraft(draft.id)}
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