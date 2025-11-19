import React from 'react'

export default function ProjectDetails({
  invoice,
  updateInvoice,
  projectData,
  clientData,
  loadingProject,
  loadingClient,
  projectsList = [],
  loadingProjectsList = false,
  fetchError
}) {

  const handleProjectChange = (val) => {
    // Clear invoice fields that come from project if code changed
    updateInvoice({
      projectCode: val,
      // do not clear user fields like consultantName or notes
    })
  }

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Project & Client</h2>

      <div className="grid-2" style={{ gap: 16 }}>
        <div>
          <label className="label">Project Code</label>
          {loadingProjectsList ? (
            <input className="input" value={invoice.projectCode} onChange={e => handleProjectChange(e.target.value)} placeholder="Type project code..." />
          ) : (projectsList && projectsList.length > 0) ? (
            <select className="input" value={invoice.projectCode || ''} onChange={e => handleProjectChange(e.target.value)}>
              <option value=''>— choose project —</option>
              {projectsList.map(p => {
                const code = p.Code || p.code || p.code || ''
                const label = `${code}${p.Package ? ' — ' + p.Package : ''}`
                return <option key={code} value={code}>{label}</option>
              })}
            </select>
          ) : (
            <input
              className="input"
              value={invoice.projectCode}
              onChange={e => handleProjectChange(e.target.value)}
              placeholder="Type project code (e.g. PRJ_210325)"
            />
          )}
          {loadingProject && <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>Fetching project...</div>}
          {fetchError && <div style={{ color: 'crimson', marginTop: 6 }}>{fetchError}</div>}
        </div>

        <div>
          <label className="label">Client Code</label>
          <input className="input" value={invoice.clientCode || ''} onChange={e => updateInvoice({ clientCode: e.target.value })} placeholder="Client code or leave blank" />
        </div>
      </div>

      <div className="grid-2" style={{ gap: 16, marginTop: 12 }}>
        <div>
          <label className="label">Consultant Name</label>
          <input className="input" value={invoice.consultantName || ''} onChange={e => updateInvoice({ consultantName: e.target.value })} />
        </div>

        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={invoice.date || ''} onChange={e => updateInvoice({ date: e.target.value })} />
        </div>
      </div>

      <div className="grid-2" style={{ gap: 16, marginTop: 12 }}>
        <div>
          <label className="label">Service Fee % (from DB)</label>
          <input className="input" value={invoice.serviceFeePct || ''} onChange={e => updateInvoice({ serviceFeePct: e.target.value })} />
        </div>

        <div>
          <label className="label">Invoice # (assigned by server)</label>
          <input className="input" value={invoice.invoiceNumber || 'Assigned after save'} readOnly />
        </div>
      </div>

      <div className="grid-2" style={{ gap: 16, marginTop: 12 }}>
        <div>
          <label className="label">Base Hourly Rate (from DB)</label>
          <input className="input" value={invoice.baseHourlyRate || 0} onChange={e => updateInvoice({ baseHourlyRate: Number(e.target.value || 0) })} />
        </div>

        <div>
          <label className="label">Billing Address (editable)</label>
          <input className="input" value={invoice.billingAddress || ''} onChange={e => updateInvoice({ billingAddress: e.target.value })} />
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <small style={{ color: '#666' }}>
          Package: <strong>{projectData?.package || '-'}</strong> &nbsp; • &nbsp;
          Client: <strong>{clientData?.name || '-'}</strong>
        </small>
      </div>
    </div>
  )
}
