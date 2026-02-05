

import React from "react";

function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function InvoiceComplete({
  invoice = {},
  projectData = {},
  clientData = {},
  consultantData = {},
  logoUrl = null,
}) {
  // Data extraction
  const {
    invoiceNumber = "",
    date = "",
    consultantName = "",
    billingAddress = "",
    baseHourlyRate = 0,
    items = [],
    stages = [],
    notes = "",
    subtotal: rawSubtotal = 0,
    gst: rawGst,
    total: rawTotal,
    serviceFeePct = 0,
    serviceFeeAmount: rawServiceFee = 0,
    netEarnings: rawNetEarnings = 0,
    projectCode = "",
    clientCode = "",
    consultantId = "",
    sacCode = "999799",
    supplyDescription = "Professional Services",
  } = invoice;

  const projectId = projectData?.projectCode || projectData?.projectId || projectCode || "";
  const clientId = clientData?.clientCode || clientData?.clientId || clientCode || "";
  const clientName = clientData?.clientName || clientData?.name || "";
  const consultantDisplayName = consultantName || consultantData?.name || "";
  const billingAddr = billingAddress || clientData?.billingAddress || "";

  const consultantBusiness = {
    businessName: consultantData?.businessName || consultantData?.business_name || "",
    businessRegisteredOffice: consultantData?.businessRegisteredOffice || consultantData?.business_registered_office || "",
    businessPan: consultantData?.businessPan || consultantData?.business_pan || "",
    businessGstin: consultantData?.businessGstin || consultantData?.business_gstin || "",
    businessStateCode: consultantData?.businessStateCode || consultantData?.business_state_code || "",
  };

  /* 
   * ✅ DYNAMIC COMPANY DETAILS 
   * (Falls back to defaults ONLY if not provided in props)
   */
  const serviceProvider = {
    registeredOffice: consultantData?.companyDetails?.registered_office || "Not provided",
    stateCode: consultantData?.companyDetails?.state_code || "Not provided",
    email: consultantData?.companyDetails?.email || "Team@Hourly.Design",
    pan: consultantData?.companyDetails?.pan || "Not provided",
    cin: consultantData?.companyDetails?.cin || "Not provided",
    gstin: consultantData?.companyDetails?.gstin || "",
    companyName: consultantData?.companyDetails?.company_name || "Hourly Ventures LLP" // Default fallback
  };

  const customer = {
    name: clientName,
    address: billingAddr,
    gstin: clientData?.gstin || "",
    stateCode: clientData?.stateCode || "",
  };

  const subtotal = Number(rawSubtotal || 0);
  const gstRate = 0.18;
  const gst = rawGst != null ? Number(rawGst) : subtotal * gstRate;
  const total = rawTotal != null ? Number(rawTotal) : subtotal + gst;
  const serviceFeeAmount = rawServiceFee || 0;
  const netEarnings = rawNetEarnings || Math.max(total - serviceFeeAmount, 0);
  const invoiceDate = date || new Date().toISOString().slice(0, 10);
  const totalStageDays = stages.reduce((sum, s) => sum + (Number(s?.days || 0) || 0), 0);
  const hasNotes = !!(notes && notes.trim());

  return (
    <div className="invoice-wrapper">
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .invoice-wrapper {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #f5f5f5;
          padding: 20px;
          min-height: 100vh;
        }

        .invoice-container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          box-shadow: 0 0 30px rgba(0,0,0,0.08);
        }

        /* Header */
        .invoice-header {
          background: #2c3e50;
          padding: 40px 50px;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .invoice-title {
          font-size: 48px;
          font-weight: 900;
          letter-spacing: 8px;
        }

        .invoice-logo img {
          max-height: 60px;
          filter: brightness(0) invert(1);
        }

        /* Main Content */
        .invoice-body {
          padding: 0;
        }

        /* Section Box */
        .section-box {
          border-bottom: 1px solid #e0e0e0;
        }

        .section-box:last-of-type {
          border-bottom: none;
        }

        .section-header {
          background: #f8f9fa;
          padding: 16px 50px;
          border-bottom: 1px solid #e0e0e0;
          font-weight: 700;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #2c3e50;
        }

        .section-content {
          padding: 30px 50px;
          background: white;
        }

        .section-content.alt {
          background: #fafbfc;
        }

        /* Row Grid */
        .row-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px 40px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-label {
          font-size: 11px;
          font-weight: 700;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .field-value {
          font-size: 14px;
          color: #212529;
          font-weight: 500;
          line-height: 1.6;
        }

        .field-value.empty {
          color: #adb5bd;
          font-style: italic;
          font-size: 13px;
        }

        .field-value.large {
          font-size: 15px;
          font-weight: 600;
        }

        /* Two Column Layout */
        .two-col-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px 60px;
        }

        /* Tables */
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          margin-top: 20px;
        }

        .data-table thead {
          background: #f8f9fa;
        }

        .data-table th {
          padding: 14px 16px;
          text-align: left;
          font-weight: 700;
          font-size: 11px;
          color: #495057;
          text-transform: uppercase;
          border: 1px solid #dee2e6;
          letter-spacing: 0.5px;
        }

        .data-table td {
          padding: 14px 16px;
          color: #212529;
          border: 1px solid #e9ecef;
          background: white;
        }

        .data-table tbody tr:nth-child(even) td {
          background: #fafbfc;
        }

        .data-table tbody tr:hover td {
          background: #f1f3f5;
        }

        .data-table th.right,
        .data-table td.right {
          text-align: right;
        }

        .data-table th.center,
        .data-table td.center {
          text-align: center;
        }

        .data-table td.strong {
          font-weight: 600;
          color: #212529;
        }

        /* Totals Section */
        .totals-section {
          margin-top: 30px;
          display: flex;
          justify-content: flex-end;
        }

        .totals-table {
          width: 450px;
          border: 1px solid #dee2e6;
        }

        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid #e9ecef;
        }

        .totals-row:last-child {
          border-bottom: none;
        }

        .totals-label {
          font-size: 13px;
          font-weight: 600;
          color: #495057;
        }

        .totals-value {
          font-size: 14px;
          font-weight: 600;
          color: #212529;
          text-align: right;
          min-width: 140px;
        }

        .totals-row.subtotal {
          background: #fafbfc;
        }

        .totals-row.tax {
          background: #fafbfc;
        }

        .totals-row.total {
          background: #2c3e50;
        }

        .totals-row.total .totals-label,
        .totals-row.total .totals-value {
          color: white;
          font-size: 16px;
          font-weight: 700;
        }

        .totals-row.balance {
          background: #d4edda;
          border: 2px solid #28a745;
        }

        .totals-row.balance .totals-label,
        .totals-row.balance .totals-value {
          color: #155724;
          font-size: 17px;
          font-weight: 800;
        }

        /* Notes */
        .notes-area {
          background: #fafbfc;
          border: 1px solid #e9ecef;
          border-radius: 4px;
          padding: 16px;
          font-size: 13px;
          color: #495057;
          line-height: 1.8;
          min-height: 100px;
          white-space: pre-line;
        }

        /* Terms */
        .terms-text {
          font-size: 12px;
          color: #6c757d;
          line-height: 1.8;
        }

        .terms-text p {
          margin: 0 0 8px 0;
        }

        /* Footer */
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          padding: 40px 50px;
          background: #fafbfc;
          border-top: 2px solid #dee2e6;
        }

        .balance-card {
          background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
          border: 3px solid #28a745;
          border-radius: 8px;
          padding: 30px;
          text-align: center;
        }

        .balance-title {
          font-size: 12px;
          font-weight: 700;
          color: #155724;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }

        .balance-value {
          font-size: 36px;
          font-weight: 900;
          color: #155724;
        }

        .signature-card {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .signature-label {
          font-size: 12px;
          font-weight: 700;
          color: #495057;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 60px;
        }

        .signature-line {
          width: 280px;
          border-top: 2px solid #2c3e50;
          padding-top: 10px;
          text-align: center;
          font-size: 12px;
          color: #6c757d;
          font-weight: 500;
        }

        /* Internal Box */
        .internal-banner {
          background: #fff3cd;
          border-top: 3px solid #ffc107;
          border-bottom: 3px solid #ffc107;
          padding: 24px 50px;
        }

        .internal-title {
          font-size: 13px;
          font-weight: 700;
          color: #856404;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .internal-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .internal-field {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: white;
          border-radius: 4px;
          border: 1px solid #ffc107;
        }

        .internal-label {
          font-size: 13px;
          font-weight: 600;
          color: #856404;
        }

        .internal-value {
          font-size: 18px;
          font-weight: 800;
          color: #155724;
        }

        /* Empty State */
        .empty-message {
          text-align: center;
          padding: 40px;
          color: #adb5bd;
          font-size: 14px;
          font-style: italic;
        }

        /* Print */
        @media print {
          .invoice-wrapper {
            background: white;
            padding: 0;
          }
          .invoice-container {
            box-shadow: none;
          }
          .internal-banner {
            display: none !important;
          }
          .section-content,
          .section-content.alt {
            page-break-inside: avoid;
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .invoice-header {
            padding: 30px 20px;
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }
          .invoice-title {
            font-size: 36px;
            letter-spacing: 4px;
          }
          .section-header,
          .section-content,
          .section-content.alt {
            padding-left: 20px;
            padding-right: 20px;
          }
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 24px;
            padding: 30px 20px;
          }
          .two-col-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .row-grid {
            grid-template-columns: 1fr;
          }
          .totals-section {
            justify-content: stretch;
          }
          .totals-table {
            width: 100%;
          }
        }
      `}</style>

      <div className="invoice-container">
        {/* Header */}
        <div className="invoice-header">
          <div className="invoice-title">INVOICE</div>
          {logoUrl && (
            <div className="invoice-logo">
              <img src={logoUrl} alt="Logo" />
            </div>
          )}
        </div>

        <div className="invoice-body">
          {/* Hourly Ventures LLP */}
          <div className="section-box">
            <div className="section-header">{serviceProvider.companyName}</div>
            <div className="section-content">
              <div className="row-grid">
                <div className="field-group">
                  <div className="field-label">Registered Office:</div>
                  <div className="field-value">{serviceProvider.registeredOffice}</div>
                </div>
                <div className="field-group">
                  <div className="field-label">State Name & Code:</div>
                  <div className="field-value">{serviceProvider.stateCode}</div>
                </div>
                <div className="field-group">
                  <div className="field-label">Email:</div>
                  <div className="field-value">{serviceProvider.email}</div>
                </div>
                <div className="field-group">
                  <div className="field-label">PAN:</div>
                  <div className="field-value large">{serviceProvider.pan}</div>
                </div>
                <div className="field-group">
                  <div className="field-label">CIN:</div>
                  <div className="field-value large">{serviceProvider.cin}</div>
                </div>
                {serviceProvider.gstin && (
                  <div className="field-group">
                    <div className="field-label">GSTIN:</div>
                    <div className="field-value large">{serviceProvider.gstin}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Service Provider */}
          <div className="section-box">
            <div className="section-header">Service Provider</div>
            <div className="section-content alt">
              <div className="row-grid">
                <div className="field-group">
                  <div className="field-label">Business Name:</div>
                  <div className={`field-value ${!consultantBusiness.businessName ? 'empty' : ''}`}>
                    {consultantBusiness.businessName || 'Not provided'}
                  </div>
                </div>
                <div className="field-group">
                  <div className="field-label">Registered Office:</div>
                  <div className={`field-value ${!consultantBusiness.businessRegisteredOffice ? 'empty' : ''}`}>
                    {consultantBusiness.businessRegisteredOffice || 'Not provided'}
                  </div>
                </div>
                <div className="field-group">
                  <div className="field-label">State Name & Code:</div>
                  <div className={`field-value ${!consultantBusiness.businessStateCode ? 'empty' : ''}`}>
                    {consultantBusiness.businessStateCode || 'Not provided'}
                  </div>
                </div>
                <div className="field-group">
                  <div className="field-label">PAN:</div>
                  <div className={`field-value large ${!consultantBusiness.businessPan ? 'empty' : ''}`}>
                    {consultantBusiness.businessPan || 'Not provided'}
                  </div>
                </div>
                <div className="field-group">
                  <div className="field-label">GSTIN:</div>
                  <div className={`field-value large ${!consultantBusiness.businessGstin ? 'empty' : ''}`}>
                    {consultantBusiness.businessGstin || 'Not provided'}
                  </div>
                </div>
                <div className="field-group">
                  <div className="field-label">Consultant ID:</div>
                  <div className={`field-value large ${!consultantId ? 'empty' : ''}`}>
                    {consultantId || 'Not provided'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Project Details */}
          <div className="section-box">
            <div className="section-header">Customer & Project Details</div>
            <div className="section-content">
              <div className="row-grid">
                <div className="field-group">
                  <div className="field-label">Name:</div>
                  <div className={`field-value ${!customer.name ? 'empty' : ''}`}>
                    {customer.name || 'Not provided'}
                  </div>
                </div>
                <div className="field-group">
                  <div className="field-label">Project ID:</div>
                  <div className={`field-value large ${!projectId ? 'empty' : ''}`}>
                    {projectId || 'Not provided'}
                  </div>
                </div>
                <div className="field-group">
                  <div className="field-label">Client ID:</div>
                  <div className={`field-value large ${!clientId ? 'empty' : ''}`}>
                    {clientId || 'Not provided'}
                  </div>
                </div>
                <div className="field-group">
                  <div className="field-label">Address:</div>
                  <div className={`field-value ${!customer.address ? 'empty' : ''}`}>
                    {customer.address || 'Not provided'}
                  </div>
                </div>
                <div className="field-group">
                  <div className="field-label">GSTIN:</div>
                  <div className={`field-value large ${!customer.gstin ? 'empty' : ''}`}>
                    {customer.gstin || 'Not provided'}
                  </div>
                </div>
                <div className="field-group">
                  <div className="field-label">State Name & Code:</div>
                  <div className={`field-value ${!customer.stateCode ? 'empty' : ''}`}>
                    {customer.stateCode || 'Not provided'}
                  </div>
                </div>
                <div className="field-group">
                  <div className="field-label">Consultant Name:</div>
                  <div className={`field-value ${!consultantDisplayName ? 'empty' : ''}`}>
                    {consultantDisplayName || 'Not provided'}
                  </div>
                </div>
                {baseHourlyRate > 0 && (
                  <div className="field-group">
                    <div className="field-label">Consultant Hourly Fee:</div>
                    <div className="field-value large">{formatINR(baseHourlyRate)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Invoice & Service Details */}
          <div className="section-box">
            <div className="section-header">Invoice & Service Details</div>
            <div className="section-content alt">
              <div className="row-grid">
                <div className="field-group">
                  <div className="field-label">Invoice No.:</div>
                  <div className="field-value large">{invoiceNumber || 'Draft'}</div>
                </div>
                <div className="field-group">
                  <div className="field-label">Invoice Date:</div>
                  <div className="field-value large">{invoiceDate}</div>
                </div>
                <div className="field-group">
                  <div className="field-label">SAC code:</div>
                  <div className="field-value large">{sacCode}</div>
                </div>
                <div className="field-group">
                  <div className="field-label">Supply Description:</div>
                  <div className="field-value">{supplyDescription}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stages & Inclusions */}
          <div className="section-box">
            <div className="section-header">Stages & Inclusions</div>
            <div className="section-content">
              {stages.length === 0 ? (
                <div className="empty-message">No stages defined</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>Stage</th>
                      <th style={{ width: '60%' }}>Inclusions / Description</th>
                      <th className="center" style={{ width: '20%' }}>Timeline (Days)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stages.map((stage, idx) => (
                      <tr key={idx}>
                        <td className="strong">{stage?.stage || `Stage ${idx + 1}`}</td>
                        <td>
                          {stage?.description ||
                            (stage?.subStages || []).map(x => x?.label || x?.name).filter(Boolean).join(", ") ||
                            '—'}
                        </td>
                        <td className="center strong">
                          {stage?.days ? Number(stage.days).toLocaleString('en-IN') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {totalStageDays > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="right" style={{ background: '#f8f9fa', fontWeight: 600, padding: 16 }}>
                          Total estimated duration: <strong>{totalStageDays} days</strong>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}
            </div>
          </div>

          {/* Team Summary & Billing */}
          <div className="section-box">
            <div className="section-header">Team Summary & Billing</div>
            <div className="section-content alt">
              {items.length === 0 ? (
                <div className="empty-message">No team members added</div>
              ) : (
                <>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '24%' }}>Team Member</th>
                        <th className="center" style={{ width: '10%' }}>Mode</th>
                        {stages.map((_, idx) => (
                          <th key={idx} className="right">
                            Hours<br />Stage {idx + 1}
                          </th>
                        ))}
                        <th className="right" style={{ width: '12%' }}>Rate</th>
                        <th className="right" style={{ width: '14%' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="strong">{item?.name || '—'}</td>
                          <td className="center">{item?.mode || '—'}</td>
                          {stages.map((_, sIdx) => (
                            <td key={sIdx} className="right">
                              {Number(item?.stageHours?.[sIdx] || 0).toLocaleString('en-IN')}
                            </td>
                          ))}
                          <td className="right">{formatINR(item?.rate || 0)}</td>
                          <td className="right strong">{formatINR(item?.amount || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="totals-section">
                    <div className="totals-table">
                      <div className="totals-row subtotal">
                        <div className="totals-label">Subtotal</div>
                        <div className="totals-value">{formatINR(subtotal)}</div>
                      </div>
                      <div className="totals-row">
                        <div className="totals-label">Adjustment</div>
                        <div className="totals-value">{formatINR(0)}</div>
                      </div>
                      <div className="totals-row tax">
                        <div className="totals-label">Tax (GST 18%)</div>
                        <div className="totals-value">{formatINR(gst)}</div>
                      </div>
                      <div className="totals-row total">
                        <div className="totals-label">Total Amount</div>
                        <div className="totals-value">{formatINR(total)}</div>
                      </div>
                      <div className="totals-row balance">
                        <div className="totals-label">Balance Due</div>
                        <div className="totals-value">{formatINR(total)}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="section-box">
            <div className="section-header">Notes</div>
            <div className="section-content">
              <div className="notes-area">
                {hasNotes ? notes : 'No additional notes.'}
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="section-box">
            <div className="section-header">Terms & Conditions</div>
            <div className="section-content alt">
              <div className="terms-text">
                <p>* Reverse Charge Mechanism not applicable</p>
                <p>Payment terms and conditions as per agreement.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Balance Due & Signature */}
        <div className="footer-grid">
          <div className="balance-card">
            <div className="balance-title">Amount Due</div>
            <div className="balance-value">{formatINR(total)}</div>
          </div>
          <div className="signature-card">
            <div className="signature-label">Authorized Signature</div>
            <div className="signature-line">{serviceProvider.companyName}</div>
          </div>
        </div>

        {/* Internal Section */}
        <div className="internal-banner">
          <div className="internal-title">
            <span>⚠️</span>
            <span>INTERNAL USE ONLY - NOT FOR CLIENT</span>
          </div>
          <div className="internal-grid">
            <div className="internal-field">
              <div className="internal-label">Service Fee ({serviceFeePct || 0}%)</div>
              <div className="internal-value">{formatINR(serviceFeeAmount)}</div>
            </div>
            <div className="internal-field">
              <div className="internal-label">Your Net Earnings</div>
              <div className="internal-value">{formatINR(netEarnings)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}