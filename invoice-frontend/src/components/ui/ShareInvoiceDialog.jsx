// components/ui/ShareInvoiceDialog.jsx
import React, { useState } from 'react';

const ShareInvoiceDialog = ({ isOpen, onClose, invoiceData, onShare }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setError('');
      setSuccess(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleShare = async () => {
    // Validation
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Call the parent's onShare function
      await onShare(email);
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleShare();
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
              Invoice sent successfully!
            </p>
          </div>
        )}

        {/* Invoice Info */}
        <div style={{
          marginBottom: '16px',
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '14px',
            marginBottom: '8px',
          }}>
            <span style={{ color: '#6b7280' }}>Invoice ID:</span>
            <span style={{ fontWeight: '500', color: '#111827' }}>
              {invoiceData?.invoiceId || 'DRAFT'}
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
            <span style={{ fontWeight: '500', color: '#111827' }}>
              ₹{((invoiceData?.subtotal || 0) + (invoiceData?.gst || 0)).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Email Input */}
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px',
            }}
          >
            Recipient Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            onKeyPress={handleKeyPress}
            placeholder="example@email.com"
            disabled={isLoading || success}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: error ? '1px solid #fca5a5' : '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: error ? '#fef2f2' : (isLoading || success ? '#f9fafb' : 'white'),
              cursor: isLoading || success ? 'not-allowed' : 'text',
              outline: 'none',
              transition: 'all 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              if (!error && !isLoading && !success) {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = error ? '#fca5a5' : '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
          />
          {error && (
            <p style={{
              marginTop: '8px',
              fontSize: '14px',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              margin: '8px 0 0 0',
            }}>
              <svg
                style={{ width: '16px', height: '16px' }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </p>
          )}
        </div>

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
            disabled={isLoading || success}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'white',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading || success ? 'not-allowed' : 'pointer',
              opacity: isLoading || success ? 0.5 : 1,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: '120px',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (!isLoading && !success) e.target.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#3b82f6';
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