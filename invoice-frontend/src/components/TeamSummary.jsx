// src/components/TeamSummary.jsx
import React from 'react'

/**
 Updated TeamSummary.jsx
 - Plug-and-play replacement for your existing TeamSummary component.
 - Preserves the same props and updateInvoice contract:
     Props:
       - invoice: { items: [...] }
       - updateInvoice: function(partialInvoice)  // e.g., updateInvoice({ items: [...] })
       - teamOptions: array of templates [{ id, name, factor, defaultMode, defaultRate }]
       - loadingTeam: boolean
       - baseHourlyRate: number
 - Features:
     - Add / Remove rows
     - Template picker (select) applies name, factor, mode and template defaultRate
     - Hours, Factor, Mode, Rate editable
     - Manual rate detection: when user edits rate the row is marked as manual and will not be overridden by baseHourlyRate changes
     - Automatic recalculation when hours/factor/rate/baseHourlyRate change
     - Uses your existing CSS classes (.input, .btn, .btn-primary, .btn-danger, .muted, .team-row)
 - Drop-in: overwrite your current file with this content.
*/

const uuidv4 = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

function toNumber(v, fallback = 0) {
  if (v === '' || v === null || v === undefined) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function formatCurrency(n) {
  try {
    return n?.toLocaleString ? n.toLocaleString() : String(n)
  } catch (e) {
    return String(n)
  }
}

function computeAmount(row, baseHourlyRate = 0) {
  const factor = toNumber(row.factor, 1)
  const hours = toNumber(row.hours, 0)

  // determine rate:
  // - if user edited rate (row._manualRate === true) keep the explicit row.rate (coerced to number)
  // - else if row.rate present (from template) use it
  // - else use baseHourlyRate * factor
  let rate = 0
  if (row._manualRate === true) {
    rate = toNumber(row.rate, 0)
  } else if (typeof row.rate !== 'undefined' && row.rate !== null && row.rate !== '') {
    rate = toNumber(row.rate, baseHourlyRate * factor)
  } else {
    rate = toNumber(baseHourlyRate * factor, 0)
  }

  const amount = Math.round((hours * rate) * 100) / 100
  return {
    ...row,
    factor,
    hours,
    rate,
    amount,
  }
}

export default function TeamSummary({
  invoice,
  updateInvoice,
  teamOptions = [],
  loadingTeam = false,
  baseHourlyRate = 0,
}) {
  const items = Array.isArray(invoice?.items) ? invoice.items : []

  const setItems = (nextItems) => {
    // Maintain same updateInvoice({ items: [...] }) contract
    updateInvoice({ items: nextItems })
  }

  const addRow = () => {
    const id = uuidv4()
    const item = {
      id,
      name: '',
      factor: 1,
      mode: 'Online',
      hours: 1,
      rate: undefined,
      amount: 0,
      _manualRate: false,
    }
    const next = [...items, computeAmount(item, baseHourlyRate)]
    setItems(next)
  }

  const removeRow = (id) => {
    setItems(items.filter(i => i.id !== id))
  }

  const updateRow = (id, patch) => {
    const next = items.map(it => {
      if (it.id !== id) return it
      const merged = { ...it, ...patch }
      return computeAmount(merged, baseHourlyRate)
    })
    setItems(next)
  }

  const chooseTemplate = (id, templateValue) => {
    if (!templateValue) {
      // clear template selection for this row
      updateRow(id, { name: '', factor: 1, mode: 'Online', rate: undefined, _manualRate: false })
      return
    }
    const t = teamOptions.find(x => x.name === templateValue || x.id === templateValue)
    if (!t) return
    updateRow(id, {
      name: t.name || '',
      factor: typeof t.factor !== 'undefined' ? t.factor : 1,
      mode: t.defaultMode || 'Online',
      rate: (typeof t.defaultRate !== 'undefined' && t.defaultRate !== null) ? t.defaultRate : undefined,
      _manualRate: false,
    })
  }

  const markManualRate = (id) => {
    // mark _manualRate true for the given row while keeping current numeric rate
    const next = items.map(it => it.id === id ? ({ ...it, _manualRate: true, rate: toNumber(it.rate, 0) }) : it)
    setItems(next)
  }

  // Recompute amounts when baseHourlyRate changes (preserve manual rates)
  React.useEffect(() => {
    if (!items.length) return
    const next = items.map(it => {
      if (it._manualRate) {
        // If manual, recompute amount using existing rate (but ensure numeric)
        return computeAmount({ ...it }, baseHourlyRate)
      } else {
        // Recompute with baseHourlyRate effect (do not preserve previous auto-rate)
        return computeAmount({ ...it, rate: undefined }, baseHourlyRate)
      }
    })
    setItems(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseHourlyRate])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>Team & Hours</h3>
        <button className="btn btn-primary" onClick={addRow}>Add member</button>
      </div>

      <div>
        {loadingTeam ? (
          <div className="muted">Loading team...</div>
        ) : (
          <div>
            {items.length === 0 && <div className="muted">No members yet — click “Add member”.</div>}

            {items.map(row => (
              <div key={row.id} className="team-row" style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--border,#eee)',
                marginBottom: 10,
                background: 'white',
              }}>
                {/* Left: Name + template picker */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <input
                    className="input"
                    placeholder="Member name"
                    value={row.name || ''}
                    onChange={e => updateRow(row.id, { name: e.target.value })}
                    style={{ width: '100%', marginBottom: 8 }}
                  />
                  <select
                    style={{ width: '100%', padding: '6px 8px' }}
                    value={row.templateName || ''}
                    onChange={e => chooseTemplate(row.id, e.target.value)}
                  >
                    <option value="">— pick template —</option>
                    {teamOptions.map(t => <option key={t.id || t.name} value={t.name}>{t.name}</option>)}
                  </select>
                </div>

                {/* Factor */}
                <div style={{ width: 100 }}>
                  <div className="small-text small">Factor</div>
                  <input
                    className="input"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={row.factor}
                    onChange={e => updateRow(row.id, { factor: e.target.value, _manualRate: false })}
                  />
                </div>

                {/* Mode */}
                <div style={{ width: 120 }}>
                  <div className="small-text small">Mode</div>
                  <select
                    className="input"
                    value={row.mode}
                    onChange={e => updateRow(row.id, { mode: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option>Online</option>
                    <option>Offline</option>
                    <option>Studio</option>
                  </select>
                </div>

                {/* Hours */}
                <div style={{ width: 100 }}>
                  <div className="small-text small">Hours</div>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={row.hours}
                    onChange={e => updateRow(row.id, { hours: e.target.value })}
                  />
                </div>

                {/* Rate */}
                <div style={{ width: 160 }}>
                  <div className="small-text small">Rate (per hr)</div>
                  <input
                    className="input"
                    type="number"
                    value={row.rate ?? ''}
                    onChange={e => {
                      updateRow(row.id, { rate: e.target.value })
                      // mark manual after update — ensures _manualRate true and rate coerced to numeric
                      // setTimeout to let updateInvoice propagate if it's synchronous in parent
                      setTimeout(() => markManualRate(row.id), 0)
                    }}
                  />
                </div>

                {/* Amount & remove */}
                <div style={{ width: 140, textAlign: 'right' }}>
                  <div style={{ marginBottom: 8 }}><strong>₹{formatCurrency(row.amount || 0)}</strong></div>
                  <div>
                    <button className="btn btn-danger" onClick={() => removeRow(row.id)}>Remove</button>
                  </div>
                </div>
              </div>
            ))}

          </div>
        )}
      </div>
    </div>
  )
}
