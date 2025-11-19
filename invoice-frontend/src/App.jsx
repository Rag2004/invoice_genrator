import React, { useEffect, useRef, useState } from 'react'
import ProjectDetails from './components/ProjectDetails'
import TeamSummary from './components/TeamSummary'
import InvoicePreview from './components/InvoicePreview'
import SummaryActions from './components/SummaryActions'
import { getTeam, getProject, getClient } from './api/api'

/**
 * Helper: debounce a value -> returns debounced value
 */
function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/**
 * Helper: incoming serviceFee from project may be 0.25 (fraction) or 25 (percent)
 * This returns percent form (e.g. 25).
 */
function incomingServiceFeeToPercent(v) {
  const n = (v === undefined || v === null) ? 0 : Number(v)
  if (isNaN(n)) return 0
  return n > 1 ? n : Math.round(n * 10000) / 100 // 0.25 -> 25.00; keep 2 decimals
}

/**
 * Helper: convert percent to fraction for sending to backend (25 -> 0.25)
 */
function percentToFraction(v) {
  const n = Number(v || 0)
  if (isNaN(n)) return 0
  return n > 1 ? n / 100 : n
}

export default function App() {
  const [teamOptions, setTeamOptions] = useState([])
  const [loadingTeam, setLoadingTeam] = useState(false)

  const [projectsList, setProjectsList] = useState([]) // optional dropdown later
  const [loadingProjectsList, setLoadingProjectsList] = useState(false)

  const [projectData, setProjectData] = useState(null)
  const [clientData, setClientData] = useState(null)
  const [loadingProject, setLoadingProject] = useState(false)
  const [loadingClient, setLoadingClient] = useState(false)
  const [fetchError, setFetchError] = useState(null)

  const [invoice, setInvoice] = useState({
    projectCode: '',           // start empty so user types/selects
    clientCode: '',
    consultantName: '',
    date: new Date().toISOString().slice(0, 10),
    billingAddress: '',
    items: [],                 // [{ memberId, name, factor, mode, hours, rate, amount }]
    notes: '',
    invoiceNumber: '',         // assigned by server
    subtotal: 0,
    serviceFeePct: 0,          // PERCENT form (e.g., 25)
    total: 0,
    baseHourlyRate: 0
  })

  // Debounced project code — prevents firing API on every keystroke
  const debouncedProjectCode = useDebouncedValue(invoice.projectCode, 450)

  // load team options (from DB) on mount
  useEffect(() => {
    let mounted = true
    setLoadingTeam(true)
    getTeam()
      .then(t => {
        if (!mounted) return
        setTeamOptions(Array.isArray(t) ? t : (t?.team || []))
      })
      .catch(err => {
        console.error('getTeam failed', err)
        setTeamOptions([])
      })
      .finally(() => mounted && setLoadingTeam(false))
    return () => { mounted = false }
  }, [])

  // optional: load all projects list for dropdown (on mount)
  useEffect(() => {
    let mounted = true
    setLoadingProjectsList(true)
    fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}/api/projects`)
      .then(r => r.json())
      .then(d => {
        if (!mounted) return
        // backend returns { projects: [...] } or raw array
        const arr = d?.projects || d || []
        setProjectsList(arr)
      })
      .catch(err => {
        // it's optional; ignore errors
        console.debug('could not load projects list', err)
        setProjectsList([])
      })
      .finally(() => mounted && setLoadingProjectsList(false))
    return () => { mounted = false }
  }, [])

  // When debounced projectCode changes -> fetch project details
  useEffect(() => {
    const code = (debouncedProjectCode || '').toString().trim()
    if (!code) {
      setProjectData(null)
      // do not wipe user-edited client/billing if they were set intentionally
      return
    }

    let active = true
    setFetchError(null)
    setLoadingProject(true)
    getProject(code)
      .then(p => {
        if (!active) return
        setProjectData(p || null)

        // normalize incoming serviceFee
        const svcPct = (p && typeof p.serviceFeePct !== 'undefined') ? incomingServiceFeeToPercent(p.serviceFeePct) : invoice.serviceFeePct

        // set base hourly rate and service fee pct (in percent form)
        setInvoice(prev => ({
          ...prev,
          serviceFeePct: typeof svcPct === 'number' ? svcPct : prev.serviceFeePct,
          baseHourlyRate: (p && typeof p.hourlyRate !== 'undefined') ? Number(p.hourlyRate || 0) : prev.baseHourlyRate
        }))

        // if project provides clientCode, set it (this will trigger client fetch effect)
        if (p?.clientCode) {
          setInvoice(prev => ({ ...prev, clientCode: p.clientCode }))
        } else {
          // if project had defaultBillingAddress, use it only if user has not edited billingAddress
          if (p?.defaultBillingAddress) {
            setInvoice(prev => ({ ...prev, billingAddress: prev.billingAddress || p.defaultBillingAddress }))
          }
        }
      })
      .catch(err => {
        console.error('getProject failed', err)
        setProjectData(null)
        setFetchError(String(err?.message || err))
      })
      .finally(() => active && setLoadingProject(false))

    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedProjectCode])

  // fetch client when invoice.clientCode changes (or when project sets it)
  useEffect(() => {
    const code = (invoice.clientCode || '').toString().trim()
    if (!code) { setClientData(null); return }

    let active = true
    setLoadingClient(true)
    getClient(code)
      .then(c => {
        if (!active) return
        setClientData(c || null)
        if (c?.billingAddress) {
          // fill billing address only if user hasn't already typed one
          setInvoice(prev => ({ ...prev, billingAddress: prev.billingAddress || c.billingAddress }))
        }
      })
      .catch(err => {
        console.error('getClient failed', err)
        setClientData(null)
      })
      .finally(() => active && setLoadingClient(false))

    return () => { active = false }
  }, [invoice.clientCode])

  // Recalculate each item rate & amount whenever baseHourlyRate changes OR items structure changes
  useEffect(() => {
    // compute new items array from current invoice.items and baseHourlyRate
    setInvoice(prev => {
      const base = Number(prev.baseHourlyRate || 0)
      const items = (prev.items || []).map(it => {
        // keep existing rate if user manually edited rate > 0, otherwise calculate via factor
        const factor = Number(it.factor || 1)
        const hours = Number(it.hours || 0)
        const computedRate = Math.round((base * factor) * 100) / 100
        // if item has explicit rate and a flag (userEditedRate) is true, keep it; else use computedRate
        const rate = (it.userEditedRate ? Number(it.rate||0) : computedRate) || 0
        const amount = Math.round((rate * hours) * 100) / 100
        return { ...it, rate, amount }
      })
      const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
      const total = Math.round((subtotal + (subtotal * (Number(prev.serviceFeePct || 0) / 100))) * 100) / 100
      // only update if things changed to avoid extra re-renders
      const changed = JSON.stringify(items) !== JSON.stringify(prev.items) || subtotal !== prev.subtotal || total !== prev.total
      if (!changed) return prev
      return { ...prev, items, subtotal, total }
    })
  // run when baseHourlyRate or invoice.items length/content changes or serviceFeePct changes
  }, [invoice.baseHourlyRate, invoice.items.length, invoice.serviceFeePct])

  // Additional effect: when items change (deep), recalc totals (covers manual edits in TeamSummary)
  useEffect(() => {
    setInvoice(prev => {
      const items = (prev.items || []).map(it => {
        // ensure amount is consistent (if user edited amount directly we respect it)
        const rate = Number(it.rate || 0)
        const hours = Number(it.hours || 0)
        const amount = Math.round((rate * hours) * 100) / 100
        return { ...it, amount }
      })
      const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
      const total = Math.round((subtotal + (subtotal * (Number(prev.serviceFeePct || 0) / 100))) * 100) / 100
      if (prev.subtotal === subtotal && prev.total === total && JSON.stringify(prev.items) === JSON.stringify(items)) return prev
      return { ...prev, items, subtotal, total }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.items])

  // small helper to update invoice partially
  const updateInvoice = (patch) => setInvoice(prev => ({ ...prev, ...patch }))

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="title">Consultant Invoice Builder — Draft</h1>
      </header>

      <main className="main-grid">
        <section>
          <div className="card mb-2">
            <ProjectDetails
              invoice={invoice}
              updateInvoice={updateInvoice}
              projectData={projectData}
              clientData={clientData}
              loadingProject={loadingProject}
              loadingClient={loadingClient}
              // pass projectsList so ProjectDetails can show a dropdown if desired
              projectsList={projectsList}
              loadingProjectsList={loadingProjectsList}
              fetchError={fetchError}
            />
          </div>

          <div className="card mb-2">
            <TeamSummary
              invoice={invoice}
              updateInvoice={updateInvoice}
              teamOptions={teamOptions}
              loadingTeam={loadingTeam}
              baseHourlyRate={invoice.baseHourlyRate || 0}
            />
          </div>

          <div className="card mb-2">
            <label className="label">Notes</label>
            <textarea
              className="textarea"
              value={invoice.notes}
              onChange={e => updateInvoice({ notes: e.target.value })}
            />
          </div>

          <div className="card">
            <SummaryActions
              invoice={invoice}
              updateInvoice={updateInvoice}
              projectData={projectData}
              clientData={clientData}
            />
          </div>
        </section>

        <aside>
          <div className="card sticky">
            <InvoicePreview invoice={invoice} clientData={clientData} projectData={projectData} />
          </div>
        </aside>
      </main>
    </div>
  )
}
