
// src/components/SummaryActions.jsx
import React, { useState } from 'react';
import html2canvas from 'html2canvas';
// import { saveInvoice } from '../api/api';

export default function SummaryActions({
  projectCode,
  clientCode,
  consultantName,
  date,
  billingAddress,
  team,
  notes,
  serviceFeePct,
}) {
  const [saving, setSaving] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState(null);

  // Calculate totals
  const subtotal = team.reduce((sum, m) => sum + m.hours * m.rate, 0);
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const handleSaveInvoice = async () => {
    if (!projectCode || !clientCode || team.length === 0) {
      alert('Please fill in project details and add at least one team member.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        projectCode,
        clientCode,
        consultantName,
        date,
        billingAddress,
        items: team.map((m) => ({
          name: m.name,
          mode: m.mode,
          hours: m.hours,
          rate: m.rate,
          amount: m.hours * m.rate,
        })),
        notes,
        subtotal,
        serviceFeePct: serviceFeePct / 100,
      };

      const result = await saveInvoice(payload);
      setInvoiceNumber(result.invoiceNumber);
      alert(`Invoice saved successfully! Invoice #: ${result.invoiceNumber}`);
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Failed to save invoice. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    const element = document.getElementById('invoice-preview-root');
    if (!element) {
      alert('Invoice preview not found');
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `invoice_${projectCode}_${Date.now()}.png`;
      link.click();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handlePreview = () => {
    window.print();
  };

  const handleShare = () => {
    const subject = `Invoice - ${projectCode}`;
    const body = `Please find the invoice for project ${projectCode}.%0D%0A%0D%0ATotal: ${formatCurrency(total)}`;
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="footer-actions">
      <div className="left">
        <button className="btn btn-ghost" onClick={handlePreview}>
          Preview
        </button>
        <button className="btn btn-ghost" onClick={handleGeneratePDF}>
          Generate PDF
        </button>
        <button className="btn btn-ghost" onClick={handleShare}>
          Share with Client
        </button>
      </div>

      <div className="right">
        <div className="footer-total">
          <span className="footer-total-label">Total:</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <button 
          className="btn btn-success" 
          onClick={handleSaveInvoice}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Invoice'}
        </button>
      </div>
    </div>
  );
}