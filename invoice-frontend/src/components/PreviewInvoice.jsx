// src/components/PreviewInvoice.jsx
import React from 'react'
import { formatCurrency } from '../utils/format'

/**
 * Client-facing invoice layout (no internal-only fields).
 * Props:
 *  - invoice: invoice object (items, date, consultantName, billingAddress, invoiceNumber, notes)
 *  - projectData: package, hourlyRate, gstPct (optional)
 *  - clientData: name, billingAddress (optional)
 */
export default function PreviewInvoice({ invoice = {}, projectData = {}, clientData = {}, forPrint = false }) {
  const baseRate = Number(projectData?.hourlyRate ?? invoice.baseHourlyRate ?? 0)
  const gstPct = (typeof projectData?.gstPct !== 'undefined') ? Number(projectData.gstPct) : 18

  const rows = (invoice.items || []).map(it => {
    const factor = Number(it.factor || 1)
    const hours = Number(it.hours || 0)
    const rate = (typeof it.rate !== 'undefined' && it._manualRate) ? Number(it.rate || 0) : (baseRate * factor)
    const amount = Math.round(hours * rate * 100) / 100
    return { ...it, rate, amount, factor, hours }
  })

  const subtotal = rows.reduce((s,r) => s + (Number(r.amount)||0), 0)
  const gstAmount = Math.round(subtotal * (gstPct/100) * 100) / 100
  const clientBill = Math.round((subtotal + gstAmount) * 100) / 100

  return (
    <div className="invoice-sheet" style={{background:'#fff', padding:24, minWidth:760}}>
      <header style={{display:'flex', justifyContent:'space-between', marginBottom:16}}>
        <div>
          <h2 style={{margin:0}}>INVOICE</h2>
          <div style={{fontSize:12, color:'#374151'}}>{projectData?.package ? `${projectData.package}` : ''}</div>
        </div>

        <div style={{textAlign:'right'}}>
          <div style={{fontSize:12, color:'#6b7280'}}>Invoice #: <strong>{invoice.invoiceNumber || '-'}</strong></div>
          <div style={{fontSize:12, color:'#6b7280'}}>Date: <strong>{invoice.date || ''}</strong></div>
          <div style={{marginTop:8, fontSize:12}}>{clientData?.name || invoice.clientCode || ''}</div>
        </div>
      </header>

      <section style={{display:'flex', justifyContent:'space-between', marginBottom:16}}>
        <div style={{maxWidth:420}}>
          <div style={{fontSize:12, color:'#6b7280'}}>Bill To</div>
          <div style={{fontWeight:700, marginTop:6}}>{clientData?.name || invoice.clientCode || '-'}</div>
          <div style={{marginTop:6, fontSize:13, color:'#374151', whiteSpace:'pre-wrap'}}>{invoice.billingAddress || clientData?.billingAddress || '-'}</div>
        </div>

        <div style={{textAlign:'right'}}>
          <div style={{fontSize:12, color:'#6b7280'}}>Consultant</div>
          <div style={{fontWeight:700, marginTop:6}}>{invoice.consultantName || '-'}</div>
          <div style={{marginTop:6, fontSize:12}}>Hourly Rate: <strong>{formatCurrency(baseRate)}</strong></div>
        </div>
      </section>

      <table style={{width:'100%', borderCollapse:'collapse', marginBottom:12}}>
        <thead>
          <tr style={{background:'#f3f4f6', textAlign:'left'}}>
            <th style={{padding:8}}>Team member</th>
            <th style={{padding:8}}>Mode</th>
            <th style={{padding:8}}>Hours</th>
            <th style={{padding:8}}>Rate</th>
            <th style={{padding:8, textAlign:'right'}}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i} style={{borderBottom:'1px solid #eee'}}>
              <td style={{padding:10}}>{r.name || '-'}</td>
              <td style={{padding:10}}>{r.mode || '-'}</td>
              <td style={{padding:10}}>{r.hours}</td>
              <td style={{padding:10}}>{formatCurrency(r.rate)}</td>
              <td style={{padding:10, textAlign:'right'}}>{formatCurrency(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
        <div style={{width:360, fontSize:14}}>
          <div style={{display:'flex', justifyContent:'space-between', padding:'8px 0'}}><div>Subtotal</div><div>{formatCurrency(subtotal)}</div></div>
          <div style={{display:'flex', justifyContent:'space-between', padding:'8px 0'}}><div>GST ({gstPct}%)</div><div>{formatCurrency(gstAmount)}</div></div>
          <div style={{borderTop:'1px solid #eee', marginTop:8, paddingTop:12, fontWeight:700, display:'flex', justifyContent:'space-between', fontSize:16}}>
            <div>Total (incl. GST)</div>
            <div>{formatCurrency(clientBill)}</div>
          </div>
        </div>
      </div>

      <footer style={{marginTop:20, display:'flex', gap:20}}>
        <div style={{flex:1, fontSize:13, color:'#374151', whiteSpace:'pre-wrap'}}>{invoice.notes || ''}</div>
        <div style={{flexBasis:260, textAlign:'center', fontSize:12, color:'#6b7280'}}>
          <div>Thank you for your business.</div>
          <div style={{marginTop:8}}>This is a computer generated invoice.</div>
        </div>
      </footer>
    </div>
  )
}
