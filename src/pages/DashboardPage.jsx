import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  EXPENSE_CATEGORIES,
  getExpenses,
  getExpenseOccurrences,
} from '../data/expenseStorage';
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
  const [expenseState, setExpenseState] = useState({ expenses: [], error: '', loading: true });

  useEffect(() => {
    let active = true;
    getExpenses(client.slug)
      .then((expenses) => {
        if (active) setExpenseState({ expenses, error: '', loading: false });
      })
      .catch((error) => {
        if (active) setExpenseState({ expenses: [], error: error.message, loading: false });
      });

    return () => {
      active = false;
    };
  }, [client.slug]);
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
  const expenseOccurrences = useMemo(
    () => getExpenseOccurrences(expenseState.expenses, startDate, endDate),
    [expenseState.expenses, startDate, endDate],
  );
  const loggedExpensesTotal = expenseOccurrences.reduce(
    (total, expense) => total + expense.amount,
    0,
  );
  const loggedExpensesByCategory = EXPENSE_CATEGORIES.map((category) => ({
    label: category.label,
    value: expenseOccurrences
      .filter((expense) => expense.category === category.value)
      .reduce((total, expense) => total + expense.amount, 0),
  })).filter((category) => category.value > 0);
  const maxLoggedExpense = Math.max(...loggedExpensesByCategory.map((item) => item.value), 0);
  const netProfit = totals.grossRevenue - loggedExpensesTotal;
  const averageOccupancy = filteredDays.length
    ? totals.occupancyTotal / filteredDays.length
    : 0;
  const demoNetProfit = totals.grossRevenue - totals.operatingExpenses;
  const periodShare = report.currentMonthToDate.netProfit
    ? demoNetProfit / report.currentMonthToDate.netProfit
    : 0;
  const scaled = (amount) => amount * periodShare;
  const tripTypeTotal = report.tripTypes.reduce((total, tripType) => total + tripType.reservations, 0);
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
  const maxExpense = maxLoggedExpense;
  const maxTripType = Math.max(...selectedTripTypes.map((item) => item.value), 0);
  const maxRoute = Math.max(...selectedRoutes.map((item) => item.value), 0);
  const maxStatus = Math.max(...selectedStatuses.map((item) => item.value), 0);
  const expensesForDate = (date) => expenseOccurrences
    .filter((expense) => expense.occurrenceDate === date)
    .reduce((total, expense) => total + expense.amount, 0);
  const chartMax = Math.max(
    ...filteredDays.flatMap((day) => {
      const dailyExpenses = expensesForDate(day.date);
      return [day.grossRevenue, dailyExpenses, day.grossRevenue - dailyExpenses];
    }),
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
            <span className="brand__mark">⚓︎</span>
            <span>Táxi Náutico</span>
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

        {expenseState.error && (
          <p className="management-error" role="alert">
            Não foi possível carregar os gastos: {expenseState.error}
          </p>
        )}

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
            <span>Gastos lançados</span>
            <strong>{currency.format(loggedExpensesTotal)}</strong>
            <small>Inclui ocorrências mensais dos gastos recorrentes</small>
          </article>
          <article className="report-metric report-metric--profit">
            <span>Lucro líquido estimado</span>
            <strong>{currency.format(netProfit)}</strong>
            <small>Faturamento demonstrativo menos gastos lançados</small>
          </article>
          <article className="report-metric report-metric--trips">
            <span>Viagens concluídas</span>
            <strong>{totals.completedTrips}</strong>
            <small>Ocupação média de {averageOccupancy.toFixed(0)}%</small>
          </article>
        </section>

        <section className="report-panel">
          <div className="section-head">
            <h2>Gastos lançados no período</h2>
            <p>
              Gastos registrados no banco de dados: {currency.format(loggedExpensesTotal)}.
              {' '}Cada gasto recorrente entra uma vez por mês a partir da data cadastrada.
            </p>
          </div>
          {expenseOccurrences.length === 0 ? (
            <p className="dashboard-empty">Nenhum gasto lançado neste período.</p>
          ) : (
            <div className="report-list">
              {expenseOccurrences.map((expense) => (
                <div
                  className="report-list__row"
                  key={`${expense.id}-${expense.occurrenceDate}`}
                >
                  <span>
                    {EXPENSE_CATEGORIES.find((category) => category.value === expense.category)?.label
                      ?? expense.category}
                    {' · '}{expense.description}
                    {' · '}{formatDate(expense.occurrenceDate)}
                    {expense.recurring ? ' · recorrente' : ''}
                  </span>
                  <strong>{currency.format(expense.amount)}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="report-panel">
          <div className="section-head">
            <h2>Faturamento, custos e lucro por dia</h2>
            <p>Valores diários dentro do período selecionado.</p>
          </div>
          <div className="dashboard-legend">
            <span><i className="dashboard-legend__revenue" />Faturamento</span>
            <span><i className="dashboard-legend__expenses" />Gastos lançados</span>
            <span><i className="dashboard-legend__profit" />Lucro líquido</span>
          </div>
          {filteredDays.length === 0 ? (
            <p className="dashboard-empty">Não há dados de demonstração para este período.</p>
          ) : (
            <div className="dashboard-bar-chart">
              {filteredDays.map((day) => {
                const dailyExpenses = expensesForDate(day.date);
                const dailyProfit = day.grossRevenue - dailyExpenses;
                return (
                  <div className="dashboard-bar-chart__group" key={day.date} title={formatDate(day.date)}>
                    <div className="dashboard-bar-chart__bars">
                      <span className="dashboard-bar dashboard-bar--revenue" style={{ height: `${(day.grossRevenue / chartMax) * 100}%` }} />
                      <span className="dashboard-bar dashboard-bar--expenses" style={{ height: `${(dailyExpenses / chartMax) * 100}%` }} />
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
              <h2>Gastos por categoria</h2>
              <p>Gastos lançados no período: {currency.format(loggedExpensesTotal)}</p>
            </div>
            {loggedExpensesByCategory.length === 0 ? (
              <p className="dashboard-empty">Nenhum gasto lançado neste período.</p>
            ) : (
              <BreakdownChart
                items={loggedExpensesByCategory}
                maxValue={maxExpense}
                formatValue={currency.format}
              />
            )}
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
              <h2>Situação das reservas</h2>
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
                <span>Valor médio por reserva</span>
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
            O faturamento e os demais indicadores da operação são dados de demonstração.
            Os gastos lançados são registros deste navegador; cada recorrência conta uma vez por mês.
          </small>
        </aside>
      </main>
    </div>
  );
}

export default DashboardPage;
