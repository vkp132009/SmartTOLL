import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

function hourLabel(hour) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric' }).format(new Date(2025, 0, 1, hour))
}

function RevenueChart({ data, dateLabel, transactionCount }) {
  return (
    <section className="revenue-chart-section">
      <div className="chart-heading">
        <div><h2>Revenue through the day</h2><p>Hourly totals by payment method</p></div>
        <span>{transactionCount} transactions</span>
      </div>
      {transactionCount === 0 ? (
        <div className="revenue-chart-empty">Revenue will appear here once tolls are recorded for this date.</div>
      ) : (
        <>
          <div className="revenue-chart" role="img" aria-label={`Revenue chart for ${dateLabel}`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 12, right: 18, left: 4, bottom: 2 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 6" />
                <XAxis dataKey="hour" ticks={[0, 4, 8, 12, 16, 20, 23]} tickFormatter={hourLabel} axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-muted)', fontSize: 11 }} />
                <YAxis tickFormatter={(value) => `$${value}`} axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-muted)', fontSize: 11 }} width={54} />
                <Tooltip
                  labelFormatter={(hour) => hourLabel(Number(hour))}
                  formatter={(value, name) => [currency.format(Number(value)), name === 'fastagRevenue' ? 'FASTag' : name === 'manualRevenue' ? 'Manual' : 'Total']}
                  contentStyle={{ background: 'var(--surface)', border: '0', borderRadius: 14, boxShadow: '0 12px 32px rgb(20 35 24 / 12%)', color: 'var(--ink)' }}
                  labelStyle={{ color: 'var(--muted)', marginBottom: 6 }}
                />
                <Area type="monotone" dataKey="fastagRevenue" name="FASTag" stackId="revenue" stroke="#528562" fill="#8dbb94" fillOpacity={0.85} isAnimationActive={false} />
                <Area type="monotone" dataKey="manualRevenue" name="Manual" stackId="revenue" stroke="#bd8a38" fill="#e3c17e" fillOpacity={0.82} isAnimationActive={false} />
                <Line type="monotone" dataKey="totalRevenue" name="Total" stroke="#315c43" strokeWidth={3} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend"><span><i className="legend-fastag" />FASTag revenue</span><span><i className="legend-manual" />Manual revenue</span><span><i className="legend-total" />Total revenue</span></div>
        </>
      )}
    </section>
  )
}

export default RevenueChart