
// src/components/ProjectDetails.jsx
import React from 'react';

export default function ProjectDetails({
  invoice,
  updateInvoice,
  projectData,
  clientData,
  loadingProject = false,
  loadingClient = false,
  fetchError,
}) {
  const handleChange = (field, value) => {
    updateInvoice({ [field]: value });
  };

  // Normalise project + client data so we can safely read fields
  const p = projectData || {};
  const c = clientData || {};

  const projectPackage =
    p.package || p.Package || p['Package'] || '';
  const projectHourlyRate =
    p.hourlyRate || p.Hourly_rate || p['Hourly_rate'] || p['Hourly Rate'] || '';
  const projectServiceFee =
    p.serviceFeePct || p.serviceFeePctPct || p.serviceFee || p.serviceFeePctRaw || p.service_fee_pct || '';
  const projectActive =
    p.active ?? p.Active ?? p['Active'] ?? '';

  const clientBusinessName =
    c.Buisness_Name || c.Business_Name || c.business_name || c.name || '';
  const clientPersonName =
    c.Client_name || c.client_name || c.contact_name || '';
  const clientBillingAddress =
    c.Billing_Address || c.billingAddress || '';
  const clientGST =
    c.Client_GST || c.client_gst || '';
  const clientPAN =
    c.Client_PAN || c.client_pan || '';

  return (
    <div>
      {/* ===================== SECTION 1: INVOICE INPUTS ===================== */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 className="section-subtitle">Invoice Inputs</h3>
        <p className="small-text muted">
          Enter the project code from your sheet; consultant name and date can be edited.
        </p>

        <div className="form-row">
          {/* Project Code (user types) */}
          <div className="form-group">
            <label className="label">Project Code</label>
            <input
              className="input"
              placeholder="PRJ_240205"
              value={invoice.projectCode || ''}
              onChange={(e) => handleChange('projectCode', e.target.value)}
            />
            {loadingProject && (
              <p className="small-text muted">Fetching project details…</p>
            )}
            {fetchError && (
              <p className="small-text error">Failed: {fetchError}</p>
            )}
          </div>

          {/* Client Code (auto, read-only) */}
          <div className="form-group">
            <label className="label">Client Code</label>
            <input
              className="input"
              value={invoice.clientCode || ''}
              readOnly
              disabled
            />
            {loadingClient && (
              <p className="small-text muted">Fetching client details…</p>
            )}
          </div>
        </div>

        <div className="form-row">
          {/* Consultant Name (user types) */}
          <div className="form-group">
            <label className="label">Consultant Name</label>
            <input
              className="input"
              placeholder="Enter consultant name"
              value={invoice.consultantName || ''}
              onChange={(e) => handleChange('consultantName', e.target.value)}
            />
          </div>

          {/* Consultant ID (auto from project sheet, read-only) */}
          <div className="form-group">
            <label className="label">Consultant ID</label>
            <input
              className="input"
              value={invoice.consultantId || ''}
              readOnly
              disabled
            />
          </div>
        </div>

        <div className="form-row">
          {/* Date (user can edit) */}
          <div className="form-group">
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={invoice.date || ''}
              onChange={(e) => handleChange('date', e.target.value)}
            />
          </div>

          {/* Service Fee % (auto, read-only) */}
          <div className="form-group">
            <label className="label">Service Fee %</label>
            <input
              className="input"
              value={invoice.serviceFeePct || ''}
              readOnly
              disabled
            />
          </div>
        </div>

        <div className="form-row">
          {/* Base hourly rate (auto) */}
          <div className="form-group">
            <label className="label">Base Hourly Rate (₹)</label>
            <input
              className="input"
              value={invoice.baseHourlyRate || ''}
              readOnly
              disabled
            />
          </div>
          <div className="form-group" />
        </div>
      </div>

      {/* ===================== SECTION 2: PROJECT DETAILS FROM SHEET ===================== */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 className="section-subtitle">Project Details (from sheet)</h3>
        <p className="small-text muted">
          These values are pulled from your Projects sheet for the entered project code.
        </p>

        <div className="info-grid">
          <div className="info-box">
            <span className="info-label">Project Code</span>
            <span className="info-value">
              {p.Project_Code || p.projectCode || invoice.projectCode || '—'}
            </span>
          </div>
          <div className="info-box">
            <span className="info-label">Package</span>
            <span className="info-value">{projectPackage || '—'}</span>
          </div>
          <div className="info-box">
            <span className="info-label">Hourly Rate (₹)</span>
            <span className="info-value">
              {projectHourlyRate ? `₹${projectHourlyRate}` : '—'}
            </span>
          </div>
          <div className="info-box">
            <span className="info-label">Service Fee</span>
            <span className="info-value">
              {projectServiceFee ? `${projectServiceFee}%` : '—'}
            </span>
          </div>
          <div className="info-box">
            <span className="info-label">Active</span>
            <span className="info-value">
              {projectActive === true || projectActive === 'TRUE'
                ? 'Yes'
                : projectActive === false || projectActive === 'FALSE'
                ? 'No'
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ===================== SECTION 3: CLIENT DETAILS FROM SHEET ===================== */}
      <div>
        <h3 className="section-subtitle">Client Details (from sheet)</h3>
        <p className="small-text muted">
          Read-only client information pulled from your Clients sheet.
        </p>

        <div className="info-grid">
          <div className="info-box">
            <span className="info-label">Client Code</span>
            <span className="info-value">
              {invoice.clientCode || c.Client_Code || '—'}
            </span>
          </div>
          <div className="info-box">
            <span className="info-label">Business Name</span>
            <span className="info-value">
              {clientBusinessName || '—'}
            </span>
          </div>
          <div className="info-box">
            <span className="info-label">Client Name</span>
            <span className="info-value">
              {clientPersonName || '—'}
            </span>
          </div>
          <div className="info-box">
            <span className="info-label">GST</span>
            <span className="info-value">{clientGST || '—'}</span>
          </div>
          <div className="info-box">
            <span className="info-label">PAN</span>
            <span className="info-value">{clientPAN || '—'}</span>
          </div>
        </div>

        {/* Billing address (full width) */}
        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label className="label">Billing Address</label>
          <textarea
            className="textarea"
            placeholder="Billing address from sheet"
            value={invoice.billingAddress || clientBillingAddress || ''}
            readOnly
            disabled
          />
        </div>
      </div>
    </div>
  );
}
