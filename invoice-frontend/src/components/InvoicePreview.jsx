// src/components/InvoicePreview.jsx
import React from 'react'
import { formatCurrency } from '../utils/format'

export default function InvoicePreview({ invoice = {}, projectData = {}, clientData = {} }) {
  // prefer DB values
  const packageName = projectData?.package || '-'
  const baseRate = Number(projectData?.hourlyRate ?? invoice.baseHourlyRate ?? 0)
  const serviceFeePct = Number(projectData?.serviceFeePct ?? invoice.serviceFeePct ?? 0)
  // GST: allow project-defined or default 18% if not provided (adjust as needed)
  const gstPct = (typeof projectData?.gstPct !== 'undefined') ? Number(projectData.gstPct) : 18

  // Prepare rows with computed rate/amount (rate might be stored on item or computed)
  const rows = (invoice.items || []).map(it => {
    const factor = Number(it.factor || 1)
    const hours = Number(it.hours || 0)
    // If UI allowed manual override it will be in it.rate; otherwise compute from baseRate * factor
    const rate = typeof it.rate !== 'undefined' && it._manualRate ? Number(it.rate || 0) : (baseRate * factor)
    const amount = Math.round(hours * rate * 100) / 100
    // some invoices show "Total Hours" (if there are day/hours splits) — for now equal to hours
    const totalHours = hours
    return { ...it, rate, amount, factor, hours, totalHours }
  })

  const subtotal = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const gstAmount = Math.round(subtotal * (gstPct / 100) * 100) / 100
  const clientBill = Math.round((subtotal + gstAmount) * 100) / 100
  const serviceFeeAmount = Math.round(subtotal * (serviceFeePct / 100) * 100) / 100
  const yourEarnings = Math.round((subtotal - serviceFeeAmount) * 100) / 100

  return (
    <div id="invoice-preview" style={{padding:12}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12}}>
        <div>
          <h3 style={{margin:0}}>Invoice Preview</h3>
          <div style={{fontSize:12, color:'#6b7280'}}>{invoice.date}</div>
        </div>

        <div style={{textAlign:'right'}}>
          <div style={{fontSize:12, color:'#6b7280'}}>Consultant</div>
          <div style={{fontWeight:700}}>{invoice.consultantName}</div>
          <div style={{marginTop:8, fontSize:12, color:'#374151'}}>Invoice #: <span style={{fontWeight:600}}>{invoice.invoiceNumber || '—'}</span></div>
        </div>
      </div>

      {/* Platform / Package details (DB sourced) */}
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:12}}>
        <div>
          <div style={{fontSize:13, color:'#6b7280'}}>Project</div>
          <div style={{fontWeight:700}}>{invoice.projectCode} — {invoice.clientCode}</div>
          <div style={{fontSize:13, color:'#6b7280'}}>Client</div>
          <div style={{fontWeight:600}}>{clientData?.name || '-'}</div>
          <div style={{fontSize:12, color:'#6b7280', marginTop:6}}>{clientData?.billingAddress || ''}</div>
        </div>

        <div style={{textAlign:'right'}}>
          <div style={{fontSize:13, color:'#6b7280'}}>Package</div>
          <div style={{fontWeight:700}}>{packageName}</div>

          <div style={{marginTop:8, fontSize:13, color:'#6b7280'}}>Platform Details</div>
          <div style={{fontSize:13}}><strong>Hourly Rate:</strong> {formatCurrency(baseRate)}</div>
          <div style={{fontSize:13}}><strong>Service Fee:</strong> {serviceFeePct}%</div>
          <div style={{fontSize:13}}><strong>GST:</strong> {gstPct}%</div>
        </div>
      </div>

      {/* Items table */}
      <div style={{overflowX:'auto', marginBottom:12}}>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
          <thead>
            <tr style={{textAlign:'left', color:'#6b7280', borderBottom:'1px solid #e6e6e6'}}>
              <th style={{padding:'8px 6px'}}>Team Member</th>
              <th style={{padding:'8px 6px'}}>Consultation Mode</th>
              <th style={{padding:'8px 6px'}}>Hours</th>
              <th style={{padding:'8px 6px'}}>Total Hours</th>
              <th style={{padding:'8px 6px'}}>Factor</th>
              <th style={{padding:'8px 6px'}}>Rate</th>
              <th style={{padding:'8px 6px', textAlign:'right'}}>Price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.id || idx} style={{borderBottom:'1px solid #f3f4f6'}}>
                <td style={{padding:'8px 6px'}}>{r.name || '-'}</td>
                <td style={{padding:'8px 6px'}}>{r.mode || '-'}</td>
                <td style={{padding:'8px 6px'}}>{r.hours}</td>
                <td style={{padding:'8px 6px'}}>{r.totalHours}</td>
                <td style={{padding:'8px 6px'}}>{r.factor}</td>
                <td style={{padding:'8px 6px'}}>{formatCurrency(r.rate)}</td>
                <td style={{padding:'8px 6px', textAlign:'right'}}>{formatCurrency(r.amount)}</td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{padding:12, color:'#6b7280'}}>No team members added</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary block like your screenshot */}
      <div style={{display:'flex', gap:20, justifyContent:'space-between', alignItems:'flex-start'}}>
        <div style={{flex:'1 1 60%'}}>
          <div style={{fontSize:13, color:'#6b7280'}}>Notes:</div>
          <div style={{marginTop:8, background:'#f8fafc', padding:8, borderRadius:6}}>{invoice.notes || '-'}</div>
        </div>

        <div style={{width:320}}>
          <div style={{display:'flex', justifyContent:'space-between', padding:'6px 0'}}><div>Subtotal:</div><div>{formatCurrency(subtotal)}</div></div>
          <div style={{display:'flex', justifyContent:'space-between', padding:'6px 0'}}><div>GST ({gstPct}%):</div><div>{formatCurrency(gstAmount)}</div></div>
          <div style={{display:'flex', justifyContent:'space-between', padding:'8px 0', fontWeight:700, fontSize:16}}><div>Client Bill (incl. GST):</div><div>{formatCurrency(clientBill)}</div></div>

          <div style={{height:12}} />

          <div style={{display:'flex', justifyContent:'space-between', padding:'6px 0', color:'#6b7280'}}><div>Service Fee ({serviceFeePct}%):</div><div>{formatCurrency(serviceFeeAmount)}</div></div>
          <div style={{display:'flex', justifyContent:'space-between', padding:'8px 0', fontWeight:700, fontSize:15}}><div>Your Earnings (post service fee):</div><div>{formatCurrency(yourEarnings)}</div></div>
        </div>
      </div>
    </div>
  )
}
