
import React from "react";
import { LOGO_URL } from "../config/branding";


function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function InvoiceComplete({ invoice = {}, logoUrl = "" }) {
  // ============================================================================
  // EXTRACT SNAPSHOT (SINGLE SOURCE OF TRUTH)
  // ============================================================================
  const snapshot = invoice.snapshot || invoice;

  if (!snapshot) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
        <h2>❌ Error: Invalid Invoice Data</h2>
        <p>Snapshot structure is missing. Invoice cannot be rendered.</p>
        <pre style={{ textAlign: 'left', background: '#fef2f2', padding: '16px', marginTop: '16px' }}>
          Expected: {`{ invoice: { snapshot: {...} } }`}
        </pre>
      </div>
    );
  }

  // ============================================================================
  // DESTRUCTURE SNAPSHOT
  // ============================================================================
  const meta = snapshot.meta || {};
  const work = snapshot.work || {};
  const stages = work.stages || [];
  const items = work.items || [];
  const totals = snapshot.totals || {};
  const compliance = snapshot.compliance || {};
  const consultant = snapshot.consultant || {};
  const client = snapshot.client || {};
  const hourlyVentures = snapshot.serviceProvider || {};
  const project = snapshot.project || {};
  const notes = snapshot.notes || "";

  // ============================================================================
  // DISPLAY VALUES
  // ============================================================================
  const invoiceNumber = meta.invoiceNumber || "";
  const invoiceDate = meta.invoiceDate || "";
  const consultantId = consultant.id || "";
  const projectId = project.projectCode || "";
  const clientId = client.code || "";
  const consultantDisplayName = consultant.name || "";
  
  // ✅ FIX: Show hourly rate, not subtotal
  const consultantHourlyRate = consultant.hourlyRate || items[0]?.rate || 0;
  const consultantFee = formatINR(consultantHourlyRate);
  
  const sacCode = compliance.sacCode || "";
  const supplyDescription = compliance.supplyDescription || "";
  const subtotal = totals.subtotal || 0;
  const gst = totals.gst || 0;
  const total = totals.total || 0;
  
  // ✅ Helper to check if value is truly empty (handles "", null, undefined)
  const isEmpty = (val) => val === "" || val === null || val === undefined;

  // ============================================================================
  // CONSULTANT BUSINESS INFO
  // ============================================================================
  const consultantBusiness = {
    businessName: consultant.businessName || "",
    businessRegisteredOffice: consultant.registeredOffice || "",
    businessPan: consultant.pan || "",
    businessGstin: consultant.gstin || "",
    businessStateCode: consultant.stateCode || "",
  };
  
  // ✅ Check if fields are truly empty (not just falsy)
  const hasConsultantOffice = !isEmpty(consultantBusiness.businessRegisteredOffice);
  const hasConsultantState = !isEmpty(consultantBusiness.businessStateCode);
  const hasConsultantPan = !isEmpty(consultantBusiness.businessPan);
  const hasConsultantGstin = !isEmpty(consultantBusiness.businessGstin);
  
  const hasClientAddress = !isEmpty(client.billingAddress);
  const hasClientState = !isEmpty(client.stateCode);
  const hasClientPan = !isEmpty(client.pan);
  const hasClientGstin = !isEmpty(client.gstin);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="invoice-wrapper-modern">
      <style>{`
        /* ==================== RESET & BASE ==================== */
        .invoice-wrapper-modern * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        .invoice-wrapper-modern {
          font-family: 'Helvetica', 'Helvetica Neue', Arial, sans-serif;
          background: #ffffff;
          width: 100%;
          max-width: 210mm;
          margin: 0 auto;
          color: #2d3748;
          font-size: 10pt;
          line-height: 1.4;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* ==================== INVOICE CONTAINER - NO BORDER ==================== */
        .invoice-container-modern {
          background: #ffffff;
        }

        /* ==================== HEADER - SEPARATE FROM CONTENT ==================== */
        .invoice-header-modern {
          background: #e8e8e8;
          padding: 20px 30px;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 20px;
        }

        .invoice-title-modern {
          font-size: 36pt;
          font-weight: 700;
          letter-spacing: 4px;
          color: #2d3748;
          font-family: 'Helvetica', 'Helvetica Neue', Arial, sans-serif;
        }

        /* ==================== SECTIONS ==================== */
        .section-modern {
          border-bottom: 1px solid #e2e8f0;
        }

        .section-header-modern {
          background: #e8e8e8;
          padding: 6px 30px;
          font-size: 8pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #4a5568;
          border-bottom: 1px solid #e2e8f0;
        }

        .section-body-modern {
          padding: 16px 30px;
        }

        .section-body-modern.compact {
          padding: 12px 30px;
        }

        /* ==================== INFO GRID ==================== */
        .info-grid-modern {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 40px;
          font-size: 9pt;
        }

        .info-grid-modern.triple {
          grid-template-columns: repeat(3, 1fr);
          gap: 10px 30px;
        }

        .info-item-modern {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .info-label-modern {
          font-size: 7.5pt;
          font-weight: 700;
          text-transform: uppercase;
          color: #718096;
          letter-spacing: 0.5px;
        }

        .info-value-modern {
          font-size: 9pt;
          color: #2d3748;
          font-weight: 400;
          line-height: 1.3;
          word-wrap: break-word;
        }

        .info-value-modern.empty {
          color: #a0aec0;
          font-style: italic;
        }

        .info-value-modern.strong {
          font-weight: 700;
        }

        /* ==================== STAGES GRID ==================== */
        .stages-grid-modern {
          display: grid;
          grid-template-columns: 70px 1fr 140px;
          gap: 0;
          border: 1px solid #cbd5e0;
          font-size: 9pt;
        }

        .stages-grid-header {
          background: #e8e8e8;
          padding: 10px 12px;
          font-size: 7.5pt;
          font-weight: 700;
          text-transform: uppercase;
          color: #4a5568;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #cbd5e0;
          border-right: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
        }

        .stages-grid-header:last-child {
          border-right: none;
        }

        .stages-grid-header.center {
          justify-content: center;
        }

        .stages-grid-cell {
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
          border-right: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          font-size: 9pt;
          color: #2d3748;
        }

        .stages-grid-cell:nth-child(3n) {
          border-right: none;
        }

        .stages-grid-cell.center {
          justify-content: center;
        }

        .stages-grid-cell.strong {
          font-weight: 700;
        }

        .stages-grid-cell:last-child,
        .stages-grid-cell:nth-last-child(2),
        .stages-grid-cell:nth-last-child(3) {
          border-bottom: none;
        }

        /* ==================== TEAM BILLING TABLE ==================== */
        .billing-table-modern {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0;
          font-size: 9pt;
          border: 1px solid #cbd5e0;
        }

        .billing-table-modern thead th {
          background: #e8e8e8;
          padding: 10px 12px;
          text-align: left;
          font-size: 7.5pt;
          font-weight: 700;
          text-transform: uppercase;
          color: #4a5568;
          border-bottom: 2px solid #cbd5e0;
          letter-spacing: 0.5px;
          border-right: 1px solid #e2e8f0;
        }

        .billing-table-modern thead th:last-child {
          border-right: none;
        }

        .billing-table-modern thead th.right {
          text-align: right;
        }

        .billing-table-modern thead th.center {
          text-align: center;
        }

        .billing-table-modern tbody td {
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
          border-right: 1px solid #e2e8f0;
          font-size: 9pt;
          color: #2d3748;
          vertical-align: middle;
        }

        .billing-table-modern tbody td:last-child {
          border-right: none;
        }

        .billing-table-modern tbody tr:last-child td {
          border-bottom: none;
        }

        .billing-table-modern tbody td.center {
          text-align: center;
        }

        .billing-table-modern tbody td.right {
          text-align: right;
          font-weight: 600;
        }

        .billing-table-modern .stage-col {
          text-align: center;
          width: 70px;
          font-weight: 600;
        }

        /* ==================== TOTALS SECTION - SIDE BY SIDE GRID ==================== */
        .totals-section-modern {
          margin-top: 20px;
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 20px;
          border: 1px solid #cbd5e0;
        }

        .notes-in-totals-modern {
          padding: 16px;
          border-right: 1px solid #cbd5e0;
          display: flex;
          flex-direction: column;
        }

        .notes-in-totals-modern .notes-label-modern {
          font-size: 7.5pt;
          font-weight: 700;
          text-transform: uppercase;
          color: #4a5568;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .notes-empty-modern {
          color: #a0aec0;
          font-style: italic;
          font-size: 9pt;
        }

        .totals-box-modern {
          display: flex;
          flex-direction: column;
        }

        .totals-row-modern {
          display: grid;
          grid-template-columns: 1fr auto;
          padding: 12px 16px;
          border-bottom: 1px solid #cbd5e0;
          font-size: 9pt;
          align-items: center;
          gap: 30px;
        }

        .totals-row-modern:last-child {
          border-bottom: none;
        }

        .totals-label-modern {
          font-size: 9pt;
          color: #2d3748;
          font-weight: 600;
        }

        .totals-value-modern {
          font-size: 9pt;
          font-weight: 600;
          color: #2d3748;
          text-align: right;
          white-space: nowrap;
        }

        .totals-row-modern.total {
          background: #2d3748;
          border: none;
        }

        .totals-row-modern.total .totals-label-modern,
        .totals-row-modern.total .totals-value-modern {
          color: #ffffff;
          font-size: 10pt;
          font-weight: 700;
        }

        .totals-row-modern.balance {
          background: #2d3748;
          border: none;
        }

        .totals-row-modern.balance .totals-label-modern,
        .totals-row-modern.balance .totals-value-modern {
          color: #ffffff;
          font-size: 10pt;
          font-weight: 700;
        }

        /* ==================== TERMS SECTION ==================== */
        .terms-text-modern {
          font-size: 8pt;
          color: #4a5568;
          line-height: 1.6;
        }

        .terms-text-modern p {
          margin: 0 0 6px 0;
        }

        /* ==================== FOOTER ==================== */
        .footer-section-modern {
          padding: 20px 30px;
          border-top: 2px solid #cbd5e0;
          text-align: center;
        }

        .footer-content {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .footer-text-modern {
          font-size: 7pt;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .footer-logo-link {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
        }

        .footer-logo-link img {
          height: 25px;
          width: auto;
          object-fit: contain;
          vertical-align: middle;
        }

        /* ==================== EMPTY STATE ==================== */
        .empty-state-modern {
          text-align: center;
          padding: 30px;
          color: #a0aec0;
          font-style: italic;
          font-size: 10pt;
        }

        /* ==================== PAGE BREAK FOR TEAM SUMMARY ==================== */
        .page-break-before {
          page-break-before: always;
        }

        /* ==================== PRINT STYLES ==================== */
        @media print {
          .invoice-wrapper-modern {
            max-width: 100%;
            font-size: 9pt;
          }
          
          .section-body-modern {
            page-break-inside: avoid;
          }
          
          .stages-grid-modern,
          .billing-table-modern {
            page-break-inside: auto;
          }

          .page-break-before {
            page-break-before: always;
          }

          @page {
            size: A4;
            margin: 15mm;
          }
        }

        /* ==================== RESPONSIVE ==================== */
        @media (max-width: 768px) {
          .invoice-header-modern {
            padding: 16px 20px;
          }
          
          .invoice-title-modern {
            font-size: 28pt;
          }
          
          .section-header-modern,
          .section-body-modern {
            padding-left: 20px;
            padding-right: 20px;
          }
          
          .info-grid-modern {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          
          .info-grid-modern.triple {
            grid-template-columns: 1fr;
          }

          .stages-grid-modern {
            grid-template-columns: 50px 1fr 100px;
          }

          .totals-section-modern {
            grid-template-columns: 1fr;
          }

          .notes-in-totals-modern {
            border-right: none;
            border-bottom: 1px solid #cbd5e0;
          }

          .totals-box-modern {
            width: 100%;
          }

          .billing-table-modern {
            font-size: 8pt;
          }

          .billing-table-modern thead th,
          .billing-table-modern tbody td {
            padding: 8px;
          }
        }
      `}</style>

      <div className="invoice-container-modern">
        {/* ==================== HEADER - NO LOGO ==================== */}
        <div className="invoice-header-modern">
          <div className="invoice-title-modern">INVOICE</div>
        </div>

        {/* ==================== HOURLY VENTURES LLP ==================== */}
        <div className="section-modern">
          <div className="section-header-modern">HOURLY VENTURES LLP</div>
          <div className="section-body-modern compact">
            <div className="info-grid-modern triple">
              <div className="info-item-modern">
                <div className="info-label-modern">Registered Office</div>
                <div className="info-value-modern">{hourlyVentures.registeredOffice}</div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">State Name & Code</div>
                <div className="info-value-modern">{hourlyVentures.stateCode}</div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">Email ID</div>
                <div className="info-value-modern">{hourlyVentures.email}</div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">PAN</div>
                <div className="info-value-modern">{hourlyVentures.pan}</div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">CIN</div>
                <div className="info-value-modern">{hourlyVentures.cin}</div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">GSTIN</div>
                <div className="info-value-modern">{hourlyVentures.gstin}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== SERVICE PROVIDER ==================== */}
        <div className="section-modern">
          <div className="section-header-modern">SERVICE PROVIDER</div>
          <div className="section-body-modern compact">
            <div className="info-grid-modern triple">
              <div className="info-item-modern">
                <div className="info-label-modern">Business Name</div>
                <div className={`info-value-modern ${!consultantBusiness.businessName ? 'empty' : ''}`}>
                  {consultantBusiness.businessName || 'Not provided'}
                </div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">Registered Office</div>
                <div className={`info-value-modern ${!hasConsultantOffice ? 'empty' : ''}`}>
                  {hasConsultantOffice ? consultantBusiness.businessRegisteredOffice : 'Not provided'}
                </div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">State Name & Code</div>
                <div className={`info-value-modern ${!hasConsultantState ? 'empty' : ''}`}>
                  {hasConsultantState ? consultantBusiness.businessStateCode : 'Not provided'}
                </div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">PAN</div>
                <div className={`info-value-modern ${!hasConsultantPan ? 'empty' : ''}`}>
                  {hasConsultantPan ? consultantBusiness.businessPan : 'Not provided'}
                </div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">GSTIN</div>
                <div className={`info-value-modern ${!hasConsultantGstin ? 'empty' : ''}`}>
                  {hasConsultantGstin ? consultantBusiness.businessGstin : 'Not provided'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== CLIENT ==================== */}
        <div className="section-modern">
          <div className="section-header-modern">CLIENT</div>
          <div className="section-body-modern compact">
            <div className="info-grid-modern triple">
              <div className="info-item-modern">
                <div className="info-label-modern">Name (ID)</div>
                <div className={`info-value-modern ${!client.name ? 'empty' : ''}`}>
                  {client.name ? `${client.name} (${clientId || 'N/A'})` : 'Not provided'}
                </div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">Billing Address</div>
                <div className={`info-value-modern ${!hasClientAddress ? 'empty' : ''}`}>
                  {hasClientAddress ? client.billingAddress : 'Not provided'}
                </div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">State Name & Code</div>
                <div className={`info-value-modern ${!hasClientState ? 'empty' : ''}`}>
                  {hasClientState ? client.stateCode : 'Not provided'}
                </div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">PAN</div>
                <div className={`info-value-modern ${!hasClientPan ? 'empty' : ''}`}>
                  {hasClientPan ? client.pan : 'Not provided'}
                </div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">GSTIN</div>
                <div className={`info-value-modern ${!hasClientGstin ? 'empty' : ''}`}>
                  {hasClientGstin ? client.gstin : 'Not provided'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== INVOICE & SERVICE DETAILS ==================== */}
        <div className="section-modern">
          <div className="section-header-modern">INVOICE AND SERVICE DETAILS</div>
          <div className="section-body-modern compact">
            <div className="info-grid-modern triple">
              <div className="info-item-modern">
                <div className="info-label-modern">Invoice No.</div>
                <div className="info-value-modern strong">{invoiceNumber || '—'}</div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">Invoice Date</div>
                <div className="info-value-modern strong">{invoiceDate}</div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">SAC Code</div>
                <div className="info-value-modern">{sacCode}</div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">Supply Description</div>
                <div className="info-value-modern">{supplyDescription}</div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">Consultant Name</div>
                <div className="info-value-modern">{consultantDisplayName || 'Not provided'}</div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">Consultant ID</div>
                <div className="info-value-modern strong">{consultantId || 'Not provided'}</div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">Consultant Fee (Hourly)</div>
                <div className="info-value-modern strong">{consultantFee}/hr</div>
              </div>
              <div className="info-item-modern">
                <div className="info-label-modern">Project ID</div>
                <div className="info-value-modern strong">{projectId || 'Not provided'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== STAGES & INCLUSIONS ==================== */}
        {stages.length > 0 && (
          <div className="section-modern">
            <div className="section-header-modern">STAGES AND INCLUSIONS</div>
            <div className="section-body-modern">
              <div className="stages-grid-modern">
                <div className="stages-grid-header">Sr. No.</div>
                <div className="stages-grid-header">Inclusions / Description</div>
                <div className="stages-grid-header center">Timeline (Days)</div>
                
                {stages.map((stage, idx) => {
                  const subStagesText = (stage?.subStages || [])
                    .map(x => x?.label || x?.name)
                    .filter(Boolean)
                    .join(", ");
                  
                  return (
                    <React.Fragment key={idx}>
                      <div className="stages-grid-cell center strong">{idx + 1}.</div>
                      <div className="stages-grid-cell">
                        {stage?.stage && <strong>{stage.stage}: </strong>}
                        {stage?.description || subStagesText || '—'}
                      </div>
                      <div className="stages-grid-cell center strong">
                        {stage?.days ? Number(stage.days) : '—'}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TEAM SUMMARY AND BILLING ==================== */}
        <div className="section-modern page-break-before">
          <div className="section-header-modern">TEAM SUMMARY AND BILLING</div>
          <div className="section-body-modern">
            {items.length === 0 ? (
              <div className="empty-state-modern">No team members added</div>
            ) : (
              <>
                <table className="billing-table-modern">
                  <thead>
                    <tr>
                      <th style={{ width: '5%' }}>#</th>
                      <th style={{ width: '25%' }}>Team Member</th>
                      <th className="center" style={{ width: '20%' }}>Mode</th>
                      {stages.length > 0 && stages.slice(0, 6).map((stage, idx) => (
                        <th key={idx} className="center stage-col">
                          Stage {idx + 1}
                        </th>
                      ))}
                      <th className="right" style={{ width: '12%' }}>Rate</th>
                      <th className="right" style={{ width: '15%' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const stageHours = item?.stageHours || {};
                      
                      return (
                        <tr key={idx}>
                          <td className="center">{idx + 1}</td>
                          <td>{item?.name || '—'}</td>
                          <td className="center">{item?.mode || '—'}</td>
                          {stages.length > 0 && stages.slice(0, 6).map((stage) => {
                            const sid = stage.id ?? "";
                            const subMap = stageHours?.[sid] || {};
                            const total = Object.values(subMap).reduce((sum, v) => sum + (Number(v) || 0), 0);
                            return (
                              <td key={sid} className="center stage-col">
                                {total > 0 ? total : '—'}
                              </td>
                            );
                          })}
                          <td className="right">{formatINR(item?.rate || 0)}</td>
                          <td className="right">{formatINR(item?.amount || 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="totals-section-modern">
                  <div className="notes-in-totals-modern">
                    <div className="notes-label-modern">NOTES</div>
                    <div style={{ flex: 1 }}>
                      {notes ? (
                        <div>{notes}</div>
                      ) : (
                        <div className="notes-empty-modern">No additional notes</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="totals-box-modern">
                    <div className="totals-row-modern">
                      <div className="totals-label-modern">Subtotal</div>
                      <div className="totals-value-modern">{formatINR(subtotal)}</div>
                    </div>
                    <div className="totals-row-modern">
                      <div className="totals-label-modern">Adjustment</div>
                      <div className="totals-value-modern">{formatINR(0)}</div>
                    </div>
                    <div className="totals-row-modern">
                      <div className="totals-label-modern">Tax</div>
                      <div className="totals-value-modern">{formatINR(gst)}</div>
                    </div>
                    <div className="totals-row-modern total">
                      <div className="totals-label-modern">Total Amount</div>
                      <div className="totals-value-modern">{formatINR(total)}</div>
                    </div>
                    <div className="totals-row-modern balance">
                      <div className="totals-label-modern">Balance Due</div>
                      <div className="totals-value-modern">{formatINR(total)}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
             {/* ==================== TERMS & CONDITIONS ==================== */}
         <div className="section-modern">
           <div className="section-header-modern">TERMS AND CONDITIONS</div>
           <div className="section-body-modern compact">
             <div className="terms-text-modern">
               <p>As per Agreement</p>
               <p>* Reverse Charge Mechanism not applicable</p>
             </div>
           </div>
         </div>

       {/* ==================== FOOTER WITH LOGO AND TEXT ==================== */}
         <div className="footer-section-modern">
          <div className="footer-content">
             <span className="footer-text-modern">INVOICE GENERATED ON </span>
             <a href="https://www.hourly.design/" target="_blank" rel="noopener noreferrer" className="footer-logo-link">
               <img src={LOGO_URL} alt="Hourly Design" />
             </a>
           </div>
         </div>
      </div>
    </div>
  );
}