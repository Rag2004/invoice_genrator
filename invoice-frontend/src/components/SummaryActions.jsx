// import React, { useState } from 'react'
// import html2canvas from 'html2canvas'
// import jsPDF from 'jspdf'

// const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'

// export default function SummaryActions({ invoice, updateInvoice, projectData, clientData }) {
//   const [saving, setSaving] = useState(false)
//   const [exporting, setExporting] = useState(false)

//   // simple toast
//   const showToast = (msg) => window.alert(msg)

//   async function saveInvoiceHandler() {
//     if (!invoice.projectCode) { showToast('Please enter project code'); return }
//     if (!invoice.consultantName) { showToast('Please enter consultant name'); return }
//     // require at least 1 item with hours > 0
//     const anyItem = (invoice.items || []).some(it => Number(it.hours || 0) > 0)
//     if (!anyItem) {
//       if (!window.confirm('No team members/hours added. Save as zero invoice?')) return
//     }

//     setSaving(true)
//     try {
//       const payload = {
//         projectCode: invoice.projectCode,
//         clientCode: invoice.clientCode,
//         consultantName: invoice.consultantName,
//         date: invoice.date,
//         billingAddress: invoice.billingAddress,
//         items: invoice.items || [],
//         subtotal: invoice.subtotal || 0,
//         // convert percent (25) to fraction (0.25) before sending
//         serviceFeePct: (Number(invoice.serviceFeePct) || 0) > 1 ? (Number(invoice.serviceFeePct)/100) : Number(invoice.serviceFeePct || 0),
//         notes: invoice.notes || ''
//       }
//       const res = await fetch(`${API_BASE}/invoices`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload)
//       })
//       const data = await res.json()
//       if (!res.ok) {
//         console.error('save error', data)
//         showToast('Save failed: ' + (data?.error || res.statusText))
//       } else {
//         if (data?.invoiceNumber) updateInvoice({ invoiceNumber: data.invoiceNumber })
//         showToast('Saved: ' + (data?.invoiceNumber || 'OK'))
//       }
//     } catch (err) {
//       console.error(err)
//       showToast('Save failed: ' + String(err))
//     } finally {
//       setSaving(false)
//     }
//   }

//   async function exportPdfHandler() {
//     // requires a DOM node with id 'invoice-preview-root' around the preview
//     setExporting(true)
//     try {
//       const node = document.getElementById('invoice-preview-root')
//       if (!node) { showToast('Preview element not found (wrap preview in #invoice-preview-root)'); setExporting(false); return }
//       const canvas = await html2canvas(node, { scale: 2 })
//       const imgData = canvas.toDataURL('image/png')
//       const pdf = new jsPDF('p', 'mm', 'a4')
//       const pageWidth = 210
//       const imgProps = pdf.getImageProperties(imgData)
//       const pdfHeight = (imgProps.height * pageWidth) / imgProps.width
//       pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pdfHeight)
//       const name = `${invoice.invoiceNumber || 'invoice'}`
//       pdf.save(`${name}.pdf`)
//     } catch (err) {
//       console.error('export pdf failed', err)
//       showToast('Export failed: ' + String(err))
//     } finally {
//       setExporting(false)
//     }
//   }

//   function shareWithClient() {
//     // minimal: open mailto with subject+body (quick demo)
//     const toEmail = clientData?.email || ''
//     const subject = encodeURIComponent(`Invoice: ${invoice.invoiceNumber || 'Draft'}`)
//     const body = encodeURIComponent(`Hi,\nPlease find invoice ${invoice.invoiceNumber || ''}.\n\nRegards.`)
//     window.open(`mailto:${toEmail}?subject=${subject}&body=${body}`, '_blank')
//   }

//   return (
//     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//       <div>
//         <button className="btn btn-outline" onClick={() => window.print()}>Preview Invoice</button>
//         <button className="btn btn-primary" onClick={exportPdfHandler} disabled={exporting} style={{ marginLeft: 8 }}>
//           {exporting ? 'Exporting...' : 'Generate PDF'}
//         </button>
//         <button className="btn btn-success" onClick={shareWithClient} style={{ marginLeft: 8 }}>
//           Share with Client
//         </button>
//       </div>

//       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
//         <div style={{ fontWeight: 600 }}>Total: ₹{invoice.total || 0}</div>
//         <button className="btn btn-primary" onClick={saveInvoiceHandler} disabled={saving}>
//           {saving ? 'Saving...' : 'Save Invoice'}
//         </button>
//       </div>
//     </div>
//   )
// }
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