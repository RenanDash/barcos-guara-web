import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import demoReports from '../data/demoReports.json';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00Z`));
}

function BreakdownChart({ items, maxValue, formatValue }) {
  return (
    <div className="dashboard-breakdown">
      {items.map((item) => (
        <div className="dashboard-breakdown__item" key={item.label}>
          <div className="dashboard-breakdown__label">
            <span>{item.label}</span>
            <strong>{formatValue(item.value)}</strong>
          </div>
          <div className="dashboard-breakdown__track">
            <span style={{ width: `${maxValue ? (item.value / maxValue) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardPage({ client }) {
  const report = demoReports[client.slug];
  const [startDate, setStartDate] = useState(report.daily[0].date);
  const [endDate, setEndDate] = useState(report.daily.at(-1).date);
  const filteredDays = useMemo(
    () => report.daily.filter((day) => day.date >= startDate && day.date <= endDate),
    [report.daily, startDate, endDate],
  );
  const totals = filteredDays.reduce((sum, day) => ({
    grossRevenue: sum.grossRevenue + day.grossRevenue,
    operatingExpenses: sum.operatingExpenses + day.operatingExpenses,
    completedTrips: sum.completedTrips + day.completedTrips,
    reservations: sum.reservations + day.reservations,
    occupancyTotal: sum.occupancyTotal + day.occupancyRate,
  }), {
    grossRevenue: 0,
    operatingExpenses: 0,
    completedTrips: 0,
    reservations: 0,
    occupancyTotal: 0,
  });
  const netProfit = totals.grossRevenue - totals.operatingExpenses;
  const averageOccupancy = filteredDays.length
    ? totals.occupancyTotal / filteredDays.length
    : 0;
  const periodShare = report.currentMonthToDate.netProfit
    ? netProfit / report.currentMonthToDate.netProfit
    : 0;
  const scaled = (amount) => amount * periodShare;
  const expenseTotal = report.expenses.reduce((total, expense) => total + expense.amount, 0);
  const tripTypeTotal = report.tripTypes.reduce((total, tripType) => total + tripType.reservations, 0);
  const selectedExpenses = report.expenses.map((expense) => ({
    label: expense.category,
    value: scaled(expense.amount),
  }));
  const selectedTripTypes = report.tripTypes.map((tripType) => ({
    label: tripType.category,
    value: scaled(tripType.revenue),
    trips: tripTypeTotal ? Math.round(tripType.reservations * totals.completedTrips / tripTypeTotal) : 0,
  }));
  const selectedRoutes = report.topRoutes.map((route) => ({
    label: `${route.origin} → ${route.destination}`,
    value: scaled(route.revenue),
    trips: Math.round(route.trips * periodShare),
  }));
  const selectedStatuses = report.reservationStatus.map((status) => ({
    label: status.status,
    value: Math.round(status.count * (report.summary.reservations
      ? totals.reservations / report.summary.reservations
      : 0)),
  }));
  const maxExpense = Math.max(...selectedExpenses.map((item) => item.value), 0);
  const maxTripType = Math.max(...selectedTripTypes.map((item) => item.value), 0);
  const maxRoute = Math.max(...selectedRoutes.map((item) => item.value), 0);
  const maxStatus = Math.max(...selectedStatuses.map((item) => item.value), 0);
  const chartMax = Math.max(
    ...filteredDays.flatMap((day) => [day.grossRevenue, day.operatingExpenses, day.grossRevenue - day.operatingExpenses]),
    1,
  );
  const periodLabel = startDate && endDate
    ? `${formatDate(startDate)} a ${formatDate(endDate)}`
    : 'Selecione o período';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar__inner">
          <Link className="brand" to="/">
            <span className="brand__mark">⚓</span>
            <span>Barcos Guara</span>
          </Link>
          <nav className="nav management-nav">
            <Link to="/gerenciamento">Voltar ao gerenciamento</Link>
            <Link to={`/${client.slug}`}>Página do cliente</Link>
          </nav>
        </div>
      </header>

      <main className="container reports-page">
        <div className="reports-page__title">
          <div>
            <span className="report-demo-label">DADOS FICTÍCIOS PARA DEMONSTRAÇÃO</span>
            <h1>Dashboard · {client.name}</h1>
            <p>Indicadores e gráficos do período selecionado.</p>
          </div>
        </div>

        <section className="report-panel dashboard-filters">
          <div className="form-row">
            <label>
              Data inicial
              <input
                type="date"
                min={report.daily[0].date}
                max={report.daily.at(-1).date}
                value={startDate}
                onChange={(event) => {
                  const nextStartDate = event.target.value;
                  setStartDate(nextStartDate);
                  if (nextStartDate > endDate) setEndDate(nextStartDate);
                }}
              />
            </label>
            <label>
              Data final
              <input
                type="date"
                min={report.daily[0].date}
                max={report.daily.at(-1).date}
                value={endDate}
                onChange={(event) => {
                  const nextEndDate = event.target.value;
                  setEndDate(nextEndDate);
                  if (nextEndDate < startDate) setStartDate(nextEndDate);
                }}
              />
            </label>
          </div>
          <p className="dashboard-period">Período: {periodLabel}</p>
        </section>

        <section className="report-metrics">
          <article className="report-metric report-metric--revenue">
            <span>Faturamento bruto</span>
            <strong>{currency.format(totals.grossRevenue)}</strong>
            <small>{totals.reservations} reservas registradas no período</small>
          </article>
          <article className="report-metric report-metric--expenses">
            <span>Custos operacionais</span>
            <strong>{currency.format(totals.operatingExpenses)}</strong>
            <small>Combustível, manutenção, taxas e outros</small>
          </article>
          <article className="report-metric report-metric--profit">
            <span>Lucro líquido estimado</span>
            <strong>{currency.format(netProfit)}</strong>
            <small>Faturamento bruto menos custos operacionais</small>
          </article>
          <article className="report-metric report-metric--trips">
            <span>Viagens concluídas</span>
            <strong>{totals.completedTrips}</strong>
            <small>Ocupação média de {averageOccupancy.toFixed(0)}%</small>
          </article>
        </section>

        <section className="report-panel">
          <div className="section-head">
            <h2>Faturamento, custos e lucro por dia</h2>
            <p>Valores diários dentro do período selecionado.</p>
          </div>
          <div className="dashboard-legend">
            <span><i className="dashboard-legend__revenue" />Faturamento</span>
            <span><i className="dashboard-legend__expenses" />Custos</span>
            <span><i className="dashboard-legend__profit" />Lucro líquido</span>
          </div>
          {filteredDays.length === 0 ? (
            <p className="dashboard-empty">Não há dados de demonstração para este período.</p>
          ) : (
            <div className="dashboard-bar-chart">
              {filteredDays.map((day) => {
                const dailyProfit = day.grossRevenue - day.operatingExpenses;
                return (
                  <div className="dashboard-bar-chart__group" key={day.date} title={formatDate(day.date)}>
                    <div className="dashboard-bar-chart__bars">
                      <span className="dashboard-bar dashboard-bar--revenue" style={{ height: `${(day.grossRevenue / chartMax) * 100}%` }} />
                      <span className="dashboard-bar dashboard-bar--expenses" style={{ height: `${(day.operatingExpenses / chartMax) * 100}%` }} />
                      <span className="dashboard-bar dashboard-bar--profit" style={{ height: `${(dailyProfit / chartMax) * 100}%` }} />
                    </div>
                    <span>{formatDate(day.date)}</span>
                    <small>{currency.format(day.grossRevenue)}</small>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="reports-grid">
          <section className="report-panel">
            <div className="section-head">
              <h2>Despesas por categoria</h2>
              <p>Estimativa no período: {currency.format(scaled(expenseTotal))}</p>
            </div>
            <BreakdownChart
              items={selectedExpenses}
              maxValue={maxExpense}
              formatValue={currency.format}
            />
          </section>

          <section className="report-panel">
            <div className="section-head">
              <h2>Receita por tipo de viagem</h2>
              <p>Reservas e faturamento por categoria.</p>
            </div>
            <BreakdownChart
              items={selectedTripTypes.map((item) => ({
                label: `${item.label} · ${item.trips} viagens`,
                value: item.value,
              }))}
              maxValue={maxTripType}
              formatValue={currency.format}
            />
          </section>

          <section className="report-panel">
            <div className="section-head">
              <h2>Rotas com maior faturamento</h2>
              <p>Principais trajetos do período.</p>
            </div>
            <BreakdownChart
              items={selectedRoutes.map((route) => ({
                label: `${route.label} · ${route.trips} viagens`,
                value: route.value,
              }))}
              maxValue={maxRoute}
              formatValue={currency.format}
            />
          </section>

          <section className="report-panel">
            <div className="section-head">
              <h2>Status das reservas</h2>
              <p>{totals.reservations} reservas no total.</p>
            </div>
            <BreakdownChart
              items={selectedStatuses.map((status) => ({
                label: status.label,
                value: status.value,
              }))}
              maxValue={maxStatus}
              formatValue={(value) => `${value} reservas`}
            />
            <div className="report-list">
              <div className="report-list__row">
                <span>Ticket médio</span>
                <strong>{currency.format(totals.reservations ? totals.grossRevenue / totals.reservations : 0)}</strong>
              </div>
            </div>
          </section>
        </div>

        <aside className="report-insight">
          <strong>Análise do período</strong>
          <p>
            No período de {periodLabel}, foram concluídas {totals.completedTrips} viagens,
            com lucro líquido estimado de {currency.format(netProfit)}.
          </p>
          <small>
            O lucro líquido estimado é calculado como faturamento bruto menos custos operacionais.
            Os detalhamentos por categoria são exemplos proporcionais e não representam dados reais.
          </small>
        </aside>
      </main>
    </div>
  );
}

export default DashboardPage;
