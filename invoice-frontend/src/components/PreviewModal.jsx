// src/components/PreviewModal.jsx
import React from 'react'
import PreviewInvoice from './PreviewInvoice'

export default function PreviewModal({ open, onClose, invoice, projectData, clientData }) {
  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <h3 style={{margin:0}}>Preview Invoice (Client View)</h3>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div style={{overflow:'auto', maxHeight:'75vh', paddingBottom:16}}>
          <PreviewInvoice invoice={invoice} projectData={projectData} clientData={clientData} />
        </div>
      </div>
    </div>
  )
}
