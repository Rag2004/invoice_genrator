
// import React from 'react'

// export default function ProjectDetails({
//   invoice,
//   updateInvoice,
//   projectData,
//   clientData,
//   loadingProject,
//   loadingClient,
//   fetchError
// }) {
//   const handleProjectChange = (val) => {
//     updateInvoice({ projectCode: val })
//   }

//   return (
//     <div>
//       <h2 style={{ marginBottom: 12 }}>Project & Client</h2>

//       <div className="grid-2" style={{ gap: 16 }}>
//         <div>
//           <label className="label">Project Code</label>
//           <input
//             className="input"
//             value={invoice.projectCode}
//             onChange={e => handleProjectChange(e.target.value)}
//             placeholder="Type project code (e.g. PRJ_210325)"
//           />
//           {loadingProject && <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>Fetching project...</div>}
//           {fetchError && <div style={{ color: 'crimson', marginTop: 6 }}>{fetchError}</div>}
//         </div>

//         <div>
//           <label className="label">Client Code</label>
//           <input
//             className="input"
//             value={invoice.clientCode || ''}
//             onChange={e => updateInvoice({ clientCode: e.target.value })}
//             placeholder="Client code or leave blank"
//           />
//         </div>
//       </div>

//       <div className="grid-2" style={{ gap: 16, marginTop: 12 }}>
//         <div>
//           <label className="label">Consultant Name</label>
//           <input
//             className="input"
//             value={invoice.consultantName || ''}
//             onChange={e => updateInvoice({ consultantName: e.target.value })}
//           />
//         </div>

//         <div>
//           <label className="label">Date</label>
//           <input
//             className="input"
//             type="date"
//             value={invoice.date || ''}
//             onChange={e => updateInvoice({ date: e.target.value })}
//           />
//         </div>
//       </div>

//       <div className="grid-2" style={{ gap: 16, marginTop: 12 }}>
//         <div>
//           <label className="label">Service Fee %</label>
//           <input
//             className="input"
//             value={invoice.serviceFeePct || ''}
//             onChange={e => updateInvoice({ serviceFeePct: e.target.value })}
//           />
//         </div>

//         <div>
//           <label className="label">Invoice # (assigned by server)</label>
//           <input className="input" value={invoice.invoiceNumber || 'Assigned after save'} readOnly />
//         </div>
//       </div>

//       <div className="grid-2" style={{ gap: 16, marginTop: 12 }}>
//         <div>
//           <label className="label">Base Hourly Rate</label>
//           <input
//             className="input"
//             value={invoice.baseHourlyRate || 0}
//             onChange={e => updateInvoice({ baseHourlyRate: Number(e.target.value || 0) })}
//           />
//         </div>

//         <div>
//           <label className="label">Billing Address</label>
//           <input
//             className="input"
//             value={invoice.billingAddress || ''}
//             onChange={e => updateInvoice({ billingAddress: e.target.value })}
//           />
//         </div>
//       </div>

//       <div style={{ marginTop: 10 }}>
//         <small style={{ color: '#666' }}>
//           Package: <strong>{projectData?.Package || '-'}</strong> &nbsp; • &nbsp;
//           Client: <strong>{clientData?.name || '-'}</strong>
//         </small>
//       </div>
//     </div>
//   )
// }
// src/components/ProjectDetails.jsx
// src/components/ProjectDetails.jsx
import React from 'react';

export default function ProjectDetails({
  invoice = {},
  updateInvoice,
  projectData,
  clientData,
  loadingProject = false,
  loadingClient = false,
  fetchError,
}) {
  
  // Safe handlers
  const handleChange = (field, value) => {
    if (typeof updateInvoice === 'function') {
      updateInvoice({ [field]: value });
    }
  };

  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="label">Project Code</label>
          <input
            type="text"
            className="input"
            placeholder="PRJ_240205"
            value={invoice.projectCode || ''}
            onChange={(e) => handleChange('projectCode', e.target.value)}
          />
          {loadingProject && (
            <small className="muted">Loading project details...</small>
          )}
          {fetchError && (
            <small className="error" style={{ color: 'var(--danger)', display: 'block', marginTop: 4 }}>
              ⚠️ {fetchError}
            </small>
          )}
        </div>

        <div className="form-group">
          <label className="label">Client Code</label>
          <input
            type="text"
            className="input"
            placeholder="CLT_240205"
            value={invoice.clientCode || ''}
            onChange={(e) => handleChange('clientCode', e.target.value)}
            disabled
          />
          {loadingClient && (
            <small className="muted">Loading client details...</small>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="label">Consultant Name</label>
          <input
            type="text"
            className="input"
            placeholder="Enter consultant name"
            value={invoice.consultantName || ''}
            onChange={(e) => handleChange('consultantName', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">Date</label>
          <input
            type="date"
            className="input"
            value={invoice.date || ''}
            onChange={(e) => handleChange('date', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="label">Base Hourly Rate (₹)</label>
          <input
            type="number"
            className="input"
            placeholder="6000"
            value={invoice.baseHourlyRate || 0}
            onChange={(e) => handleChange('baseHourlyRate', Number(e.target.value))}
            min="0"
          />
        </div>

        <div className="form-group">
          <label className="label">Service Fee %</label>
          <input
            type="number"
            className="input"
            placeholder="25"
            value={invoice.serviceFeePct || 0}
            onChange={(e) => handleChange('serviceFeePct', Number(e.target.value))}
            min="0"
            max="100"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="label">Billing Address</label>
        <textarea
          className="textarea"
          placeholder="Enter billing address"
          value={invoice.billingAddress || ''}
          onChange={(e) => handleChange('billingAddress', e.target.value)}
          rows={4}
        />
      </div>

      {projectData && (
        <div 
          className="success" 
          style={{ 
            padding: '12px', 
            background: '#f0fdf4', 
            borderRadius: '8px', 
            marginTop: '12px',
            fontSize: '0.875rem',
            color: 'var(--success)'
          }}
        >
          ✅ Project loaded: {projectData.name || projectData.projectCode || 'Success'}
        </div>
      )}

      {clientData && (
        <div 
          className="success" 
          style={{ 
            padding: '12px', 
            background: '#f0fdf4', 
            borderRadius: '8px', 
            marginTop: '12px',
            fontSize: '0.875rem',
            color: 'var(--success)'
          }}
        >
          ✅ Client loaded: {clientData.name || clientData.clientCode || 'Success'}
        </div>
      )}
    </div>
  );
}