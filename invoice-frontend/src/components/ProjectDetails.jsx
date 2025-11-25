
// import React from 'react';

// export default function ProjectDetails({
//   invoice = {},
//   updateInvoice,
//   projectData,
//   clientData,
//   loadingProject = false,
//   loadingClient = false,
//   fetchError,
// }) {
  
//   // Safe handlers
//   const handleChange = (field, value) => {
//     if (typeof updateInvoice === 'function') {
//       updateInvoice({ [field]: value });
//     }
//   };

//   return (
//     <div>
//       <div className="form-row">
//         <div className="form-group">
//           <label className="label">Project Code</label>
//           <input
//             type="text"
//             className="input"
//             placeholder="PRJ_240205"
//             value={invoice.projectCode || ''}
//             onChange={(e) => handleChange('projectCode', e.target.value)}
//           />
//           {loadingProject && (
//             <small className="muted">Loading project details...</small>
//           )}
//           {fetchError && (
//             <small className="error" style={{ color: 'var(--danger)', display: 'block', marginTop: 4 }}>
//               ⚠️ {fetchError}
//             </small>
//           )}
//         </div>

//         <div className="form-group">
//           <label className="label">Client Code</label>
//           <input
//             type="text"
//             className="input"
//             placeholder="CLT_240205"
//             value={invoice.clientCode || ''}
//             onChange={(e) => handleChange('clientCode', e.target.value)}
//             disabled
//           />
//           {loadingClient && (
//             <small className="muted">Loading client details...</small>
//           )}
//         </div>
//       </div>

//       <div className="form-row">
//         <div className="form-group">
//           <label className="label">Consultant Name</label>
//           <input
//             type="text"
//             className="input"
//             placeholder="Enter consultant name"
//             value={invoice.consultantName || ''}
//             onChange={(e) => handleChange('consultantName', e.target.value)}
//           />
//         </div>

//         <div className="form-group">
//           <label className="label">Date</label>
//           <input
//             type="date"
//             className="input"
//             value={invoice.date || ''}
//             onChange={(e) => handleChange('date', e.target.value)}
//           />
//         </div>
//       </div>

//       <div className="form-row">
//         <div className="form-group">
//           <label className="label">Base Hourly Rate (₹)</label>
//           <input
//             type="number"
//             className="input"
//             placeholder="6000"
//             value={invoice.baseHourlyRate || 0}
//             onChange={(e) => handleChange('baseHourlyRate', Number(e.target.value))}
//             min="0"
//           />
//         </div>

//         <div className="form-group">
//           <label className="label">Service Fee %</label>
//           <input
//             type="number"
//             className="input"
//             placeholder="25"
//             value={invoice.serviceFeePct || 0}
//             onChange={(e) => handleChange('serviceFeePct', Number(e.target.value))}
//             min="0"
//             max="100"
//           />
//         </div>
//       </div>

//       <div className="form-group">
//         <label className="label">Billing Address</label>
//         <textarea
//           className="textarea"
//           placeholder="Enter billing address"
//           value={invoice.billingAddress || ''}
//           onChange={(e) => handleChange('billingAddress', e.target.value)}
//           rows={4}
//         />
//       </div>

//       {projectData && (
//         <div 
//           className="success" 
//           style={{ 
//             padding: '12px', 
//             background: '#f0fdf4', 
//             borderRadius: '8px', 
//             marginTop: '12px',
//             fontSize: '0.875rem',
//             color: 'var(--success)'
//           }}
//         >
//           ✅ Project loaded: {projectData.name || projectData.projectCode || 'Success'}
//         </div>
//       )}

//       {clientData && (
//         <div 
//           className="success" 
//           style={{ 
//             padding: '12px', 
//             background: '#f0fdf4', 
//             borderRadius: '8px', 
//             marginTop: '12px',
//             fontSize: '0.875rem',
//             color: 'var(--success)'
//           }}
//         >
//           ✅ Client loaded: {clientData.name || clientData.clientCode || 'Success'}
//         </div>
//       )}
//     </div>
//   );
// }
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

  return (
    <div>
      <div className="form-row">
        {/* Project Code (ONLY field user must type) */}
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

        {/* Client Code – auto from project sheet, read-only */}
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
        {/* Consultant Name – user types this */}
        <div className="form-group">
          <label className="label">Consultant Name</label>
          <input
            className="input"
            placeholder="Enter consultant name"
            value={invoice.consultantName || ''}
            onChange={(e) => handleChange('consultantName', e.target.value)}
          />
        </div>

        {/* Consultant ID – auto from project sheet, read-only */}
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
        {/* Date – user can still change */}
        <div className="form-group">
          <label className="label">Date</label>
          <input
            className="input"
            type="date"
            value={invoice.date || ''}
            onChange={(e) => handleChange('date', e.target.value)}
          />
        </div>

        {/* Service Fee % – auto from sheet, read-only */}
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
        {/* Base hourly rate – auto, read-only */}
        <div className="form-group">
          <label className="label">Base Hourly Rate (₹)</label>
          <input
            className="input"
            value={invoice.baseHourlyRate || ''}
            readOnly
            disabled
          />
        </div>

        {/* Just an empty placeholder column to keep grid aligned */}
        <div className="form-group" />
      </div>

      {/* Billing address – auto from sheet, read-only */}
      <div className="form-group">
        <label className="label">Billing Address</label>
        <textarea
          className="textarea"
          placeholder="Billing address from sheet"
          value={invoice.billingAddress || ''}
          readOnly
          disabled
        />
      </div>
    </div>
  );
}
