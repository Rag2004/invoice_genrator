
// components/ui/ShareInvoiceDialog.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const ShareInvoiceDialog = ({ isOpen, onClose, invoiceData, clientEmail, onShare }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
    }
  }, [isOpen]);

  const normalizeShareError = (err) => {
    const msg = String(err?.message || err || 'Failed to send invoice');
    if (msg.toLowerCase().includes('request timeout')) {
      return 'Request timed out while sending. Please check Hourly inbox and try again.';
    }
    return msg;
  };

  const handleShare = async () => {
    setIsLoading(true);

    try {
      // Send for approval (Hourly + consultant). No client email.
      const result = await onShare();

      const invoiceNumber =
        result?.invoiceNumber ||
        invoiceData?.invoiceNumber ||
        invoiceData?.invoiceId ||
        null;
      const sentTo = Array.isArray(result?.sentTo)
        ? result.sentTo.join(', ')
        : (result?.sentTo || null);

      toast.success(
        `Sent for approval${invoiceNumber ? `: ${invoiceNumber}` : ''}${sentTo ? ` • ${sentTo}` : ''}`,
        {
          position: 'top-center',
          autoClose: 3500,
          toastId: `share-success-${invoiceNumber || 'unknown'}`,
        }
      );

      onClose();
    } catch (err) {
      toast.error(`Not sent: ${normalizeShareError(err)}`, {
        position: 'top-center',
        autoClose: 5000,
        toastId: 'share-error',
      });
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

        {/* Recipient Info */}
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
            Recipients
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
            <span>Hourly (ADMIN_CC_EMAIL) + Consultant</span>
          </div>
          <p style={{
            marginTop: '8px',
            fontSize: '12px',
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            margin: '8px 0 0 0',
          }}>
            This sends the invoice for approval. Use the invoice list to send to the client after approval.
          </p>
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
            disabled={isLoading}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'white',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: '140px',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.target.style.backgroundColor = '#2563eb';
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
                Send for approval
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