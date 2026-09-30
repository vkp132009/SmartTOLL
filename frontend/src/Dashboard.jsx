import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  CarFront,
  CalendarDays,
  Check,
  CircleDollarSign,
  CreditCard,
  Download,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sun,
  Truck,
  X,
} from 'lucide-react'
import './styles/minimal-dashboard.css'

const RevenueChart = lazy(() => import('./RevenueChart.jsx'))

const STORAGE_KEY = 'smarttoll-dashboard-transactions'
const THEME_KEY = 'smarttoll-theme'
const RATE_STORAGE_KEY = 'smarttoll-rate-config'
const MAX_WEIGHT_TONS = 1_000_000
const DEFAULT_RATES = {
  carBase: 100,
  truckUpTo20: 400,
  truckOver20Base: 500,
  truckPerExtraTon: 150,
  fastagDiscountPercent: 10,
  manualSurchargePercent: 50,
}
const RATE_FIELDS = [
  { key: 'carBase', label: 'Car base toll', unit: 'USD', max: MAX_WEIGHT_TONS },
  { key: 'truckUpTo20', label: 'Truck up to 20 tons', unit: 'USD', max: MAX_WEIGHT_TONS },
  { key: 'truckOver20Base', label: 'Truck over 20 tons base', unit: 'USD', max: MAX_WEIGHT_TONS },
  { key: 'truckPerExtraTon', label: 'Per ton above 20', unit: 'USD', max: MAX_WEIGHT_TONS },
  { key: 'fastagDiscountPercent', label: 'FASTag discount', unit: '%', max: 100 },
  { key: 'manualSurchargePercent', label: 'Manual surcharge', unit: '%', max: 100 },
]
const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

function dateInputValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function calculateToll(rates, vehicleType, weight, hasFastag) {
  let base = 0

  if (vehicleType === 'TRUCK') {
    base = weight > 20
      ? rates.truckOver20Base + rates.truckPerExtraTon * (weight - 20)
      : rates.truckUpTo20
  } else if (vehicleType === 'CAR') {
    base = rates.carBase
  }

  const adjusted = vehicleType === 'EMERGENCY VEHICLE'
    ? 0
    : base * (hasFastag
      ? 1 - rates.fastagDiscountPercent / 100
      : 1 + rates.manualSurchargePercent / 100)

  return Math.round((adjusted + Number.EPSILON) * 100) / 100
}

function readRateConfig(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey))
    if (!saved || typeof saved !== 'object') return { version: 1, rates: DEFAULT_RATES }

    const rates = { ...DEFAULT_RATES, ...saved.rates }
    const invalid = RATE_FIELDS.some(({ key, max }) => (
      !Number.isFinite(Number(rates[key])) || Number(rates[key]) < 0 || Number(rates[key]) > max
    ))
    if (invalid) return { version: 1, rates: DEFAULT_RATES }

    return {
      version: Number.isInteger(saved.version) && saved.version > 0 ? saved.version : 1,
      rates,
    }
  } catch {
    return { version: 1, rates: DEFAULT_RATES }
  }
}

function readTransactions(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey))
    if (!Array.isArray(saved)) return []

    const entries = saved.filter((transaction) => (
      transaction
      && typeof transaction.id === 'string'
      && !transaction.id.startsWith('sample-')
      && typeof transaction.plate === 'string'
      && typeof transaction.vehicleType === 'string'
      && Number.isFinite(Number(transaction.amount))
    ))

    if (entries.length !== saved.length) {
      localStorage.setItem(storageKey, JSON.stringify(entries))
    }
    return entries
  } catch {
    return []
  }
}

function readTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function vehicleName(type) {
  return type === 'EMERGENCY VEHICLE' ? 'Emergency' : type.toLowerCase()
}

function Dashboard({ user, profile, onLogout }) {
  const [now] = useState(() => new Date())
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedDate, setSelectedDate] = useState(() => dateInputValue(new Date()))
  const transactionStorageKey = `${STORAGE_KEY}:${user.uid}`
  const rateStorageKey = `${RATE_STORAGE_KEY}:${profile.plazaId || 'toll-1'}`
  const [theme, setTheme] = useState(readTheme)
  const [transactions, setTransactions] = useState(() => readTransactions(transactionStorageKey))
  const [rateConfig, setRateConfig] = useState(() => readRateConfig(rateStorageKey))
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [entryOpen, setEntryOpen] = useState(false)
  const [ratesOpen, setRatesOpen] = useState(false)
  const [rateDraft, setRateDraft] = useState(null)
  const [rateError, setRateError] = useState('')
  const [notice, setNotice] = useState('')
  const [plate, setPlate] = useState('')
  const [vehicleType, setVehicleType] = useState('TRUCK')
  const [weight, setWeight] = useState('')
  const [hasFastag, setHasFastag] = useState(true)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(transactionStorageKey, JSON.stringify(transactions))
    } catch {
      return
    }
  }, [transactionStorageKey, transactions])

  useEffect(() => {
    try {
      localStorage.setItem(rateStorageKey, JSON.stringify(rateConfig))
    } catch {
      return
    }
  }, [rateConfig, rateStorageKey])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      return
    }
  }, [theme])

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') setEntryOpen(false)
      if (event.key === 'Escape') setRatesOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const todaysTransactions = useMemo(() => (
    transactions.filter((entry) => dateInputValue(new Date(entry.createdAt)) === dateInputValue(now))
  ), [now, transactions])

  const selectedDateTransactions = useMemo(() => (
    transactions.filter((entry) => dateInputValue(new Date(entry.createdAt)) === selectedDate)
  ), [selectedDate, transactions])

  const activeTransactions = activeTab === 'overview' ? todaysTransactions : selectedDateTransactions

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase()
    return [...activeTransactions]
      .filter((entry) => filter === 'all' || (filter === 'fastag' ? entry.hasFastag : !entry.hasFastag))
      .filter((entry) => entry.plate.toLowerCase().includes(query) || vehicleName(entry.vehicleType).includes(query))
      .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
  }, [activeTransactions, filter, search])

  const hourlyRevenue = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      fastagRevenue: 0,
      manualRevenue: 0,
      totalRevenue: 0,
    }))

    for (const entry of selectedDateTransactions) {
      const hour = new Date(entry.createdAt).getHours()
      if (entry.hasFastag) hours[hour].fastagRevenue += entry.amount
      else hours[hour].manualRevenue += entry.amount
      hours[hour].totalRevenue += entry.amount
    }

    return hours
  }, [selectedDateTransactions])

  const revenue = todaysTransactions.reduce((sum, entry) => sum + entry.amount, 0)
  const selectedRevenue = selectedDateTransactions.reduce((sum, entry) => sum + entry.amount, 0)
  const selectedFastagRevenue = selectedDateTransactions.filter((entry) => entry.hasFastag).reduce((sum, entry) => sum + entry.amount, 0)
  const selectedManualRevenue = selectedDateTransactions.filter((entry) => !entry.hasFastag).reduce((sum, entry) => sum + entry.amount, 0)
  const fastagCount = todaysTransactions.filter((entry) => entry.hasFastag).length
  const manualCount = todaysTransactions.length - fastagCount
  const fastagShare = todaysTransactions.length ? Math.round((fastagCount / todaysTransactions.length) * 100) : 0
  const manualShare = todaysTransactions.length ? 100 - fastagShare : 0
  const estimate = weight && Number.isFinite(Number(weight)) && Number(weight) > 0
    ? calculateToll(rateConfig.rates, vehicleType, Number(weight), hasFastag)
    : null

  function openRateEditor() {
    setRateDraft({ ...rateConfig.rates })
    setRateError('')
    setRatesOpen(true)
  }

  function saveRates(event) {
    event.preventDefault()
    const updatedRates = {}

    for (const field of RATE_FIELDS) {
      const value = Number(rateDraft[field.key])
      if (rateDraft[field.key] === '' || !Number.isFinite(value) || value < 0 || value > field.max) {
        setRateError(`${field.label} must be between 0 and ${field.max.toLocaleString('en-US')}${field.unit === '%' ? '%' : ' USD'}.`)
        return
      }
      updatedRates[field.key] = value
    }

    setRateConfig((current) => ({ version: current.version + 1, rates: updatedRates }))
    setRatesOpen(false)
    setRateError('')
    setNotice('Toll rates updated for new transactions.')
    window.setTimeout(() => setNotice(''), 3500)
  }

  function addTransaction(event) {
    event.preventDefault()
    const normalizedPlate = plate.trim().toUpperCase()
    const tons = Number(weight)

    if (!normalizedPlate) {
      setFormError('Enter a license plate.')
      return
    }
    if (!Number.isFinite(tons) || tons <= 0 || tons > MAX_WEIGHT_TONS) {
      setFormError('Enter a weight greater than 0 and no more than 1,000,000 tons.')
      return
    }

    const entry = {
      id: crypto.randomUUID(),
      plate: normalizedPlate,
      vehicleType,
      weight: tons,
      hasFastag,
      amount: calculateToll(rateConfig.rates, vehicleType, tons, hasFastag),
      rateVersion: rateConfig.version,
      rateSnapshot: { ...rateConfig.rates },
      createdAt: new Date().toISOString(),
    }

    setTransactions((current) => [entry, ...current])
    setEntryOpen(false)
    setPlate('')
    setWeight('')
    setHasFastag(true)
    setFormError('')
    setNotice(`Toll recorded for ${normalizedPlate}.`)
    window.setTimeout(() => setNotice(''), 3500)
  }

  function exportTransactions() {
    const rows = [
      ['Time', 'License plate', 'Vehicle', 'Weight (tons)', 'FASTag', 'Toll (USD)', 'Rate version'],
      ...visibleTransactions.map((entry) => [
        new Date(entry.createdAt).toISOString(),
        entry.plate,
        entry.vehicleType,
        entry.weight,
        entry.hasFastag ? 'Yes' : 'No',
        entry.amount.toFixed(2),
        entry.rateVersion ?? '',
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'smarttoll-transactions.csv'
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now)

  const selectedDateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${selectedDate}T00:00:00`))

  const transactionPanel = (
    <section className="transactions-section" id="transactions">
      <div className="section-heading">
        <h2>{activeTab === 'overview' ? "Today's transactions" : `Transactions · ${selectedDateLabel}`}</h2>
        <button className="quiet-button" type="button" onClick={exportTransactions}>
          <Download size={17} />Export CSV
        </button>
      </div>

      <div className="table-tools">
        <label className="search-box">
          <Search size={17} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search vehicles"
            aria-label="Search transactions"
          />
        </label>
        <div className="filter-group" role="group" aria-label="Filter by payment method">
          {[
            ['all', 'All'],
            ['fastag', 'FASTag'],
            ['manual', 'Manual'],
          ].map(([value, label]) => (
            <button
              className={`filter-button ${filter === value ? 'selected' : ''}`}
              type="button"
              key={value}
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Vehicle</th><th>Class</th><th>Weight</th><th>Payment</th><th>Time</th><th className="amount-heading">Toll</th></tr>
          </thead>
          <tbody>
            {visibleTransactions.length > 0 ? visibleTransactions.map((entry) => (
              <tr key={entry.id}>
                <td><div className="vehicle-cell"><span className={`vehicle-icon ${entry.vehicleType === 'TRUCK' ? 'truck' : entry.vehicleType === 'CAR' ? 'car' : 'emergency'}`}>{entry.vehicleType === 'TRUCK' ? <Truck size={17} /> : entry.vehicleType === 'CAR' ? <CarFront size={17} /> : <ShieldCheck size={17} />}</span><span><strong>{entry.plate}</strong><small>{vehicleName(entry.vehicleType)}</small></span></div></td>
                <td className="class-name">{vehicleName(entry.vehicleType)}</td>
                <td>{Number(entry.weight).toLocaleString('en-US', { maximumFractionDigits: 2 })} <span className="muted">t</span></td>
                <td><span className={`payment-tag ${entry.hasFastag ? 'fastag' : 'manual'}`}><span />{entry.hasFastag ? 'FASTag' : 'Manual'}</span></td>
                <td className="time-cell">{new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(entry.createdAt))}</td>
                <td className="amount-cell">{currency.format(entry.amount)}</td>
              </tr>
            )) : (
              <tr><td className="empty-state" colSpan="6"><span className="empty-mark"><Search size={20} /></span><strong>{activeTransactions.length === 0 ? (activeTab === 'overview' ? 'No tolls recorded today' : 'No transactions on this date') : 'No matching transactions'}</strong><small>{activeTransactions.length === 0 ? 'Recorded vehicles will appear here.' : 'Try a different vehicle or payment filter.'}</small></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer"><span>{visibleTransactions.length} of {activeTransactions.length} records</span><span><ShieldCheck size={15} />Saved on this device</span></div>
    </section>
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#overview" aria-label="SmartTOLL home" onClick={() => setActiveTab('overview')}>
          <img className="brand-mark" src="/smarttoll-icon.svg" alt="" />
          <span>SmartTOLL</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('overview')}><LayoutDashboard size={17} />Overview</button>
          <button className={`nav-link ${activeTab === 'transactions' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('transactions')}><CreditCard size={17} />Transactions</button>
          <button className="nav-link nav-button" type="button" onClick={openRateEditor}><Settings2 size={17} />Toll rates</button>
        </nav>
        <div className="topbar-right">
          <span className="topbar-date">{dateLabel}</span>
          <button className="logout-button" type="button" onClick={onLogout} title="Sign out"><LogOut size={17} /><span>Sign out</span></button>
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <main className="main-content" id="overview">
        <div className={`page-content ${activeTab === 'transactions' ? 'transactions-view' : ''}`}>
          {activeTab === 'overview' ? (
            <>
              <section className="page-heading">
                <div>
                  <h1>{profile.displayName}</h1>
                  <p className="page-subtitle">Dashboard</p>
                </div>
                <button className="primary-button" type="button" onClick={() => setEntryOpen(true)}>
                  <Plus size={18} />Record toll
                </button>
              </section>

              <section className="metric-grid" aria-label="Today's toll summary">
                <article className="metric-card collected-metric">
                  <div className="metric-top"><span className="metric-label">Collected today</span><CircleDollarSign className="metric-icon" size={20} /></div>
                  <div className="metric-value">{currency.format(revenue)}</div>
                  <div className="metric-foot">Gross tolls recorded</div>
                </article>
                <article className="metric-card">
                  <div className="metric-top"><span className="metric-label">Vehicles processed</span><Truck className="metric-icon" size={20} /></div>
                  <div className="metric-value">{todaysTransactions.length.toLocaleString('en-US')}</div>
                  <div className="metric-foot">All vehicle classes</div>
                </article>
                <article className="metric-card">
                  <div className="metric-top"><span className="metric-label">FASTag adoption</span><BadgeCheck className="metric-icon" size={20} /></div>
                  <div className="metric-value">{fastagShare}<small>%</small></div>
                  <div className="metric-foot">{fastagCount} of {todaysTransactions.length} vehicles</div>
                </article>
              </section>

              <section className="content-grid">
                <div>{transactionPanel}</div>
                <aside className="right-column">
                  <section className="payment-mix-section">
                    <div className="section-heading"><h2>Payment methods</h2></div>
                    <div className="payment-mix-content">
                      <div className="payment-mix-total"><strong>{todaysTransactions.length}</strong><span>vehicles today</span></div>
                      <div className="payment-bar" role="img" aria-label={`${fastagCount} FASTag and ${manualCount} manual payments`}>
                        <span className="payment-bar-fastag" style={{ width: `${fastagShare}%` }} />
                        <span className="payment-bar-manual" style={{ width: `${manualShare}%` }} />
                      </div>
                      <div className="payment-legend">
                        <div><span className="legend-key fastag-key" />FASTag<strong>{fastagCount}</strong></div>
                        <div><span className="legend-key manual-key" />Manual<strong>{manualCount}</strong></div>
                      </div>
                      {todaysTransactions.length === 0 && <p className="payment-empty">No payment activity yet</p>}
                    </div>
                  </section>

                  <section className="rates-section" id="rates">
                    <div className="section-heading"><h2>Toll rates</h2><button className="rate-edit-button" type="button" onClick={openRateEditor}>Edit</button></div>
                    <div className="rate-row"><span><CarFront size={17} />Car</span><strong>{currency.format(rateConfig.rates.carBase)}</strong></div>
                    <div className="rate-row"><span><Truck size={17} />Truck up to 20 tons</span><strong>{currency.format(rateConfig.rates.truckUpTo20)}</strong></div>
                    <div className="rate-row"><span><Truck size={17} />Truck over 20 tons</span><strong>{currency.format(rateConfig.rates.truckOver20Base)} + {currency.format(rateConfig.rates.truckPerExtraTon)}/t<small> above 20 tons</small></strong></div>
                    <div className="rate-row"><span><ShieldCheck size={17} />Emergency</span><strong className="exempt-rate">Exempt</strong></div>
                    <div className="rate-adjustments"><div><span>FASTag</span><strong>−{rateConfig.rates.fastagDiscountPercent}%</strong></div><div><span>Manual</span><strong>+{rateConfig.rates.manualSurchargePercent}%</strong></div></div>
                  </section>
                </aside>
              </section>
            </>
          ) : (
            <>
              <section className="page-heading transactions-heading">
                <div>
                  <h1>{profile.displayName}</h1>
                  <p className="page-subtitle">Transactions</p>
                </div>
                <label className="date-picker">
                  <CalendarDays size={18} aria-hidden="true" />
                  <input className="date-picker-input" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} aria-label="Choose transaction date" />
                </label>
              </section>

              <section className="analytics-metrics" aria-label="Revenue for selected date">
                <article className="analytics-metric total-metric"><span>Total revenue</span><strong>{currency.format(selectedRevenue)}</strong></article>
                <article className="analytics-metric fastag-metric"><span>FASTag revenue</span><strong>{currency.format(selectedFastagRevenue)}</strong></article>
                <article className="analytics-metric manual-metric"><span>Manual revenue</span><strong>{currency.format(selectedManualRevenue)}</strong></article>
              </section>

              <Suspense fallback={<div className="revenue-chart-loading">Loading revenue chart…</div>}>
                <RevenueChart data={hourlyRevenue} dateLabel={selectedDateLabel} transactionCount={selectedDateTransactions.length} />
              </Suspense>

              {transactionPanel}
            </>
          )}
        </div>
      </main>

      {notice && <div className="toast" role="status"><Check size={17} />{notice}</div>}

      {ratesOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setRatesOpen(false) }}>
          <section className="entry-dialog rate-dialog" role="dialog" aria-modal="true" aria-labelledby="rates-title">
            <div className="dialog-heading"><div><h2 id="rates-title">Toll rates</h2><p>Version {rateConfig.version} · Changes apply to new transactions only.</p></div><button className="icon-button" type="button" onClick={() => setRatesOpen(false)} aria-label="Close rate editor"><X size={19} /></button></div>
            <form onSubmit={saveRates}>
              <div className="rate-editor-grid">
                {RATE_FIELDS.map((field) => (
                  <label className="rate-field" htmlFor={`rate-${field.key}`} key={field.key}>
                    <span>{field.label}</span>
                    <span className="rate-input-wrap"><span>{field.unit === 'USD' ? '$' : '%'}</span><input id={`rate-${field.key}`} type="number" min="0" max={field.max} step="0.01" value={rateDraft[field.key]} onChange={(event) => setRateDraft((current) => ({ ...current, [field.key]: event.target.value }))} /></span>
                  </label>
                ))}
              </div>
              {rateError && <p className="form-error" role="alert">{rateError}</p>}
              <p className="rate-history-note">Each saved toll keeps the rate version used at the time it was recorded.</p>
              <div className="dialog-actions"><button className="cancel-button" type="button" onClick={() => setRatesOpen(false)}>Cancel</button><button className="primary-button" type="submit"><Check size={17} />Save rates</button></div>
            </form>
          </section>
        </div>
      )}

      {entryOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEntryOpen(false) }}>
          <section className="entry-dialog" role="dialog" aria-modal="true" aria-labelledby="entry-title">
            <div className="dialog-heading"><div><h2 id="entry-title">Record a toll</h2><p>Enter vehicle and payment details.</p></div><button className="icon-button" type="button" onClick={() => setEntryOpen(false)} aria-label="Close dialog"><X size={19} /></button></div>
            <form onSubmit={addTransaction}>
              <label className="field-label" htmlFor="plate">License plate</label>
              <input className="form-input plate-input" id="plate" autoFocus value={plate} onChange={(event) => setPlate(event.target.value)} placeholder="e.g. 8KX 204" maxLength={16} />

              <div className="form-two-column">
                <div><label className="field-label" htmlFor="vehicle-type">Vehicle class</label><select className="form-input" id="vehicle-type" value={vehicleType} onChange={(event) => setVehicleType(event.target.value)}><option value="TRUCK">Truck</option><option value="CAR">Car</option><option value="EMERGENCY VEHICLE">Emergency vehicle</option></select></div>
                <div><label className="field-label" htmlFor="weight">Weight <span>(tons)</span></label><input className="form-input" id="weight" type="number" min="0.01" max={MAX_WEIGHT_TONS} step="0.01" required value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="0.00" /></div>
              </div>

              <label className="fastag-control" htmlFor="fastag-toggle"><span className="fastag-copy"><span className="fastag-control-icon"><CreditCard size={17} /></span><span><strong>FASTag payment</strong><small>10% discount applies</small></span></span><input id="fastag-toggle" type="checkbox" checked={hasFastag} onChange={(event) => setHasFastag(event.target.checked)} /><span className="switch-track" aria-hidden="true" /></label>

              <div className="estimate-row"><span>Estimated toll</span><strong>{estimate === null ? '—' : currency.format(estimate)}</strong></div>
              {!hasFastag && <p className="manual-hint">Manual lane surcharge of {rateConfig.rates.manualSurchargePercent}% will be applied.</p>}
              {vehicleType === 'EMERGENCY VEHICLE' && <p className="emergency-hint">Emergency vehicles are toll exempt.</p>}
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <div className="dialog-actions"><button className="cancel-button" type="button" onClick={() => setEntryOpen(false)}>Cancel</button><button className="primary-button" type="submit"><Plus size={17} />Add transaction</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default Dashboard