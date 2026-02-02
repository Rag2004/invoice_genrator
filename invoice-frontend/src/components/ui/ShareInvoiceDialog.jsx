
// components/ui/ShareInvoiceDialog.jsx
import React, { useState, useEffect } from 'react';

const ShareInvoiceDialog = ({ isOpen, onClose, invoiceData, clientEmail, onShare }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setError('');
      setSuccess(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleShare = async () => {
    // Validation
    if (!clientEmail || !clientEmail.trim()) {
      setError('Client email not found. Please check project configuration.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Call the parent's onShare function with client email
      await onShare(clientEmail);
      setSuccess(true);
      
      // Auto-close after 2 seconds on success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to send invoice. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1,
        }}
      />

      {/* Dialog */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 2,
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          maxWidth: '500px',
          width: '90%',
          padding: '24px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#111827',
            margin: 0,
          }}>
            Share Invoice
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.color = '#6b7280'}
            onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
          >
            <svg
              style={{ width: '24px', height: '24px' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div style={{
            marginBottom: '16px',
            padding: '16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <svg
              style={{
                width: '20px',
                height: '20px',
                color: '#16a34a',
                flexShrink: 0,
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p style={{
              fontSize: '14px',
              color: '#15803d',
              fontWeight: '500',
              margin: 0,
            }}>
              Invoice sent successfully to {clientEmail}!
            </p>
          </div>
        )}

        {/* Invoice Info */}
        <div style={{
          marginBottom: '16px',
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '14px',
            marginBottom: '8px',
          }}>
            <span style={{ color: '#6b7280' }}>Invoice Number:</span>
            <span style={{ fontWeight: '600', color: '#111827' }}>
              {invoiceData?.invoiceNumber || invoiceData?.invoiceId || 'DRAFT'}
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '14px',
            marginBottom: '8px',
          }}>
            <span style={{ color: '#6b7280' }}>Project:</span>
            <span style={{ fontWeight: '500', color: '#111827' }}>
              {invoiceData?.projectCode || 'N/A'}
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '14px',
          }}>
            <span style={{ color: '#6b7280' }}>Total:</span>
            <span style={{ fontWeight: '600', color: '#111827' }}>
              ₹{invoiceData?.total?.toLocaleString('en-IN') || '0.00'}
            </span>
          </div>
        </div>

        {/* Client Email Display */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px',
            }}
          >
            Recipient (Client Email)
          </label>
          <div
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: '#f9fafb',
              color: '#111827',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxSizing: 'border-box',
            }}
          >
            <svg
              style={{ width: '16px', height: '16px', color: '#6b7280', flexShrink: 0 }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span>{clientEmail || 'No client email found'}</span>
          </div>
          {clientEmail && (
            <p style={{
              marginTop: '8px',
              fontSize: '12px',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              margin: '8px 0 0 0',
            }}>
              <svg
                style={{ width: '14px', height: '14px' }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              Invoice will be sent to client email from project data
            </p>
          )}
          {!clientEmail && (
            <p style={{
              marginTop: '8px',
              fontSize: '12px',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              margin: '8px 0 0 0',
            }}>
              <svg
                style={{ width: '14px', height: '14px' }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Client email not available in project data
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <svg
              style={{ width: '16px', height: '16px', color: '#dc2626', flexShrink: 0 }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>
              {error}
            </p>
          </div>
        )}

        {/* Footer Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.target.style.backgroundColor = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'white';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={isLoading || success || !clientEmail}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'white',
              backgroundColor: !clientEmail ? '#9ca3af' : '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading || success || !clientEmail ? 'not-allowed' : 'pointer',
              opacity: isLoading || success || !clientEmail ? 0.6 : 1,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: '140px',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (!isLoading && !success && clientEmail) e.target.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              if (clientEmail) e.target.style.backgroundColor = '#3b82f6';
            }}
          >
            {isLoading ? (
              <>
                <svg
                  style={{
                    animation: 'spin 1s linear infinite',
                    height: '16px',
                    width: '16px',
                  }}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    style={{ opacity: 0.25 }}
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    style={{ opacity: 0.75 }}
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Sending...
              </>
            ) : success ? (
              <>
                <svg
                  style={{ width: '16px', height: '16px' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Sent!
              </>
            ) : (
              <>
                <svg
                  style={{ width: '16px', height: '16px' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Send Invoice
              </>
            )}
          </button>
        </div>

        {/* Add keyframes for spinner animation */}
        <style>
          {`
            @keyframes spin {
              from {
                transform: rotate(0deg);
              }
              to {
                transform: rotate(360deg);
              }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default ShareInvoiceDialog;