import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MANAGER_SESSION_KEY, MANAGER_TOKEN_KEY } from '../data/managerAuth';
import { getScheduleConfig, saveScheduleConfig } from '../data/scheduleStorage';
import { getBookings } from '../data/bookingStorage';
import { getBoats, addBoat as createBoat } from '../data/boatStorage';
import { apiRequest } from '../data/api';
import {
  EXPENSE_CATEGORIES,
  getExpenses,
  getExpenseOccurrences,
  saveExpenses,
} from '../data/expenseStorage';

const WEEK_DAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const SECTIONS = {
  weekly: { title: 'Horários fixos semanais', singular: 'horário semanal' },
  tours: { title: 'Passeios', singular: 'passeio' },
  special: { title: 'Datas especiais', singular: 'viagem especial' },
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function todayValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatBookingDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

function TripForm({ section, boats, onSubmit, onCancel }) {
  const [error, setError] = useState('');
  const [selectedBoatId, setSelectedBoatId] = useState(boats[0]?.id ?? '');
  const [trip, setTrip] = useState({
    date: '',
    origin: '',
    destination: '',
    departure: '07:00',
    price: '',
    daysOfWeek: [],
  });
  const selectedBoat = boats.find((boat) => boat.id === selectedBoatId);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!selectedBoat) {
      setError('Selecione uma embarcação cadastrada.');
      return;
    }

    if (section !== 'special' && trip.daysOfWeek.length === 0) {
      setError('Selecione pelo menos um dia da semana.');
      return;
    }

    setError('');
    onSubmit({
      ...trip,
      id: createId(),
      route: `${trip.origin.trim()} → ${trip.destination.trim()}`,
      boatId: selectedBoat.id,
      boatName: selectedBoat.name,
      capacity: selectedBoat.capacity,
      price: trip.price.trim(),
      ...(section === 'special' ? {} : { daysOfWeek: trip.daysOfWeek }),
    });
  };

  const update = (field, value) => setTrip((current) => ({ ...current, [field]: value }));

  return (
    <form className="management-form" onSubmit={handleSubmit}>
      {section === 'special' && (
        <label>
          Data
          <input
            type="date"
            min={todayValue()}
            value={trip.date}
            onChange={(event) => update('date', event.target.value)}
            required
          />
        </label>
      )}

      <div className="form-row">
        <label>
          Origem
          <input value={trip.origin} onChange={(event) => update('origin', event.target.value)} required />
        </label>
        <label>
          Destino
          <input value={trip.destination} onChange={(event) => update('destination', event.target.value)} required />
        </label>
      </div>

      <div className="form-row management-trip__settings">
        <label>
          Horário
          <input
            type="time"
            value={trip.departure}
            onChange={(event) => update('departure', event.target.value)}
            required
          />
        </label>
        <label>
          Valor
          <input
            value={trip.price}
            onChange={(event) => update('price', event.target.value)}
            placeholder="Ex: R$ 220,00"
            required
          />
        </label>
        <label>
          Embarcação
          {boats.length > 1 ? (
            <select
              value={selectedBoatId}
              onChange={(event) => setSelectedBoatId(event.target.value)}
              required
            >
              {boats.map((boat) => (
                <option value={boat.id} key={boat.id}>{boat.name}</option>
              ))}
            </select>
          ) : (
            <input value={selectedBoat?.name ?? ''} readOnly aria-readonly="true" />
          )}
        </label>
        <label>
          Capacidade
          <input
            value={selectedBoat ? `${selectedBoat.capacity} passageiros` : ''}
            readOnly
            aria-readonly="true"
          />
        </label>
      </div>

      {section !== 'special' && (
        <fieldset className="weekday-picker">
          <legend>Dias disponíveis</legend>
          <div className="weekday-options">
            {WEEK_DAYS.map((day) => (
              <label className="weekday-option" key={day.value}>
                <input
                  type="checkbox"
                  checked={trip.daysOfWeek.includes(day.value)}
                  onChange={(event) => {
                    const daysOfWeek = event.target.checked
                      ? [...trip.daysOfWeek, day.value].sort()
                      : trip.daysOfWeek.filter((value) => value !== day.value);
                    update('daysOfWeek', daysOfWeek);
                  }}
                />
                {day.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {error && <p className="management-error" role="alert">{error}</p>}

      <div className="dialog-actions">
        <button className="button button--secondary" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="button button--primary" type="submit">
          Adicionar
        </button>
      </div>
    </form>
  );
}

function BoatForm({ onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('1');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ name: name.trim(), capacity: Number(capacity) });
  };

  return (
    <form className="management-form" onSubmit={handleSubmit}>
      <label>
        Nome do barco
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex: Guará I"
          required
        />
      </label>
      <label>
        Capacidade máxima de passageiros
        <div className="passenger-control" aria-label="Capacidade máxima do barco">
          <button
            className="passenger-control__button"
            type="button"
            aria-label="Diminuir capacidade"
            disabled={Number(capacity) <= 1}
            onClick={() => setCapacity(String(Math.max(1, Number(capacity) - 1)))}
          >
            -
          </button>
          <output className="passenger-control__value" aria-live="polite">{capacity}</output>
          <button
            className="passenger-control__button"
            type="button"
            aria-label="Aumentar capacidade"
            disabled={Number(capacity) >= 1000}
            onClick={() => setCapacity(String(Number(capacity) + 1))}
          >
            +
          </button>
        </div>
      </label>
      <div className="dialog-actions">
        <button className="button button--secondary" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="button button--primary" type="submit">
          Salvar barco
        </button>
      </div>
    </form>
  );
}

function ExpenseForm({ onSubmit, onCancel }) {
  const [expense, setExpense] = useState({
    date: todayValue(),
    category: 'combustivel',
    description: '',
    amount: '',
    recurring: false,
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      ...expense,
      id: createId(),
      amount: Number(expense.amount),
      description: expense.description.trim(),
    });
  };

  const update = (field, value) => setExpense((current) => ({ ...current, [field]: value }));

  return (
    <form className="management-form" onSubmit={handleSubmit}>
      <label>
        Data do gasto
        <input
          type="date"
          value={expense.date}
          onChange={(event) => update('date', event.target.value)}
          required
        />
      </label>

      <div className="form-row">
        <label>
          Categoria
          <select
            value={expense.category}
            onChange={(event) => update('category', event.target.value)}
          >
            {EXPENSE_CATEGORIES.map((category) => (
              <option value={category.value} key={category.value}>{category.label}</option>
            ))}
          </select>
        </label>
        <label>
          Valor
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={expense.amount}
            onChange={(event) => update('amount', event.target.value)}
            placeholder="0,00"
            required
          />
        </label>
      </div>

      <label>
        Descrição
        <input
          value={expense.description}
          onChange={(event) => update('description', event.target.value)}
          placeholder="Ex: abastecimento da embarcação"
          required
        />
      </label>

      <label className="expense-recurring-option">
        <input
          type="checkbox"
          checked={expense.recurring}
          onChange={(event) => update('recurring', event.target.checked)}
        />
        Gasto recorrente (contabilizar uma vez por mês, até ser removido)
      </label>

      <div className="dialog-actions">
        <button className="button button--secondary" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="button button--primary" type="submit">
          Adicionar
        </button>
      </div>
    </form>
  );
}

function formatWeekdays(days) {
  return WEEK_DAYS.filter((day) => days.includes(day.value))
    .map((day) => day.label)
    .join(', ');
}

function ManagementPage({ client }) {
  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const [dialog, setDialog] = useState(null);
  const [state, setState] = useState({ config: null, error: '', loading: true });
  const [expenseState, setExpenseState] = useState({ expenses: [], error: '', loading: true });
  const [bookingState, setBookingState] = useState({ bookings: [], error: '', loading: true });
  const [boatState, setBoatState] = useState({ boats: [], error: '', loading: true });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getScheduleConfig(client),
      getExpenses(client.slug),
      getBookings(client.slug),
      getBoats(client.slug),
    ]).then(([scheduleResult, expenseResult, bookingResult, boatResult]) => {
      if (!active) return;
      setState(scheduleResult.status === 'fulfilled'
        ? { config: scheduleResult.value, error: '', loading: false }
        : { config: null, error: scheduleResult.reason.message, loading: false });
      setExpenseState(expenseResult.status === 'fulfilled'
        ? { expenses: expenseResult.value, error: '', loading: false }
        : { expenses: [], error: expenseResult.reason.message, loading: false });
      setBookingState(bookingResult.status === 'fulfilled'
        ? { bookings: bookingResult.value, error: '', loading: false }
        : { bookings: [], error: bookingResult.reason.message, loading: false });
      setBoatState(boatResult.status === 'fulfilled'
        ? { boats: boatResult.value, error: '', loading: false }
        : { boats: [], error: boatResult.reason.message, loading: false });
    });

    return () => {
      active = false;
    };
  }, [client]);

  useEffect(() => {
    const element = dialogRef.current;
    if (dialog && !element.open) {
      element.showModal();
    } else if (!dialog && element.open) {
      element.close();
    }
  }, [dialog]);

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST', authenticated: true });
    } catch (logoutError) {
      console.error('Não foi possível encerrar a sessão na API:', logoutError.message);
    } finally {
      sessionStorage.removeItem(MANAGER_TOKEN_KEY);
      sessionStorage.removeItem(MANAGER_SESSION_KEY);
      navigate('/login', { replace: true });
    }
  };

  const addTrip = (section, trip) => {
    setState((current) => ({
      ...current,
      config: {
        ...current.config,
        [section]: [...current.config[section], trip],
      },
    }));
    setMessage('Cadastro atualizado. Salve para aplicar os horários.');
    setError('');
    setDialog({ mode: 'registration' });
  };

  const removeTrip = (section, tripId) => {
    setState((current) => ({
      ...current,
      config: {
        ...current.config,
        [section]: current.config[section].filter((trip) => trip.id !== tripId),
      },
    }));
    setMessage('Horário removido. Salve para aplicar a alteração.');
  };

  const addBoat = async (boat) => {
    if (boatState.boats.some((item) => item.name.toLocaleLowerCase() === boat.name.toLocaleLowerCase())) {
      setError('Já existe um barco cadastrado com esse nome.');
      return;
    }

    try {
      const savedBoat = await createBoat(client.slug, { ...boat, id: createId() });
      const boats = [...boatState.boats, savedBoat];
      setBoatState({ boats, error: '' });
      setError('');
      setMessage('Embarcação salva no banco de dados.');
      setDialog({ mode: 'registration' });
    } catch (saveError) {
      setError(`Não foi possível salvar o barco: ${saveError.message}`);
    }
  };

  const addExpense = async (expense) => {
    const expenses = [...expenseState.expenses, expense];
    try {
      await saveExpenses(client.slug, expenses);
      setExpenseState({ expenses, error: '' });
      setMessage('Gasto salvo no banco de dados.');
      setError('');
      setDialog({ mode: 'expense-list' });
    } catch (saveError) {
      setError(`Não foi possível salvar o gasto: ${saveError.message}`);
    }
  };

  const removeExpense = async (expenseId) => {
    const expenses = expenseState.expenses.filter((expense) => expense.id !== expenseId);
    try {
      await saveExpenses(client.slug, expenses);
      setExpenseState({ expenses, error: '' });
      setMessage('Gasto removido do banco de dados.');
      setError('');
    } catch (saveError) {
      setError(`Não foi possível remover o gasto: ${saveError.message}`);
    }
  };

  const handleSave = async () => {
    setMessage('');
    setError('');
    const { weekly, tours, special } = state.config;
    const invalidRecurringTrip = [...weekly, ...tours].some((trip) => {
      const [origin, destination] = trip.route.split(' → ');
      return (
        !origin?.trim()
        || !destination?.trim()
        || !trip.departure
        || !trip.price.trim()
        || !Number.isFinite(Number(trip.capacity))
        || Number(trip.capacity) < 1
        || trip.daysOfWeek.length === 0
      );
    });

    if (invalidRecurringTrip) {
      setError('Verifique origem, destino, horário, valor, capacidade e dias das viagens recorrentes.');
      return;
    }

    const invalidSpecialTrip = special.some((trip) => (
      !trip.date
      || !trip.departure
      || !trip.price.trim()
      || !Number.isFinite(Number(trip.capacity))
      || Number(trip.capacity) < 1
      || !trip.route.split(' → ').every((part) => part.trim())
    ));

    if (invalidSpecialTrip) {
      setError('Verifique os dados das viagens em datas especiais antes de salvar.');
      return;
    }

    try {
      await saveScheduleConfig(client.slug, state.config);
      setMessage('Horários salvos no banco de dados.');
    } catch (saveError) {
      setError(`Não foi possível salvar os horários: ${saveError.message}`);
    }
  };

  if (!state.config) {
    return (
      <div className="app-shell">
        <main className="container management-page">
          <section className="management-card">
            {state.loading
              ? <p>Carregando dados...</p>
              : <p className="management-error" role="alert">{state.error}</p>}
          </section>
        </main>
      </div>
    );
  }

  const dialogSection = dialog?.section ? SECTIONS[dialog.section] : null;
  const dialogTrips = dialog?.section ? state.config[dialog.section] : [];
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const now = new Date();
  const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthExpenses = getExpenseOccurrences(
    expenseState.expenses,
    currentMonthStart,
    todayValue(),
  );
  const monthExpensesTotal = monthExpenses.reduce((total, expense) => total + expense.amount, 0);
  const bookingsByTrip = bookingState.bookings.reduce((groups, booking) => {
    const tripKey = [
      booking.date,
      booking.kind,
      booking.tripId ?? `${booking.route}|${booking.departure}`,
    ].join('|');
    let tripGroup = groups.find((group) => group.key === tripKey);

    if (!tripGroup) {
      tripGroup = {
        key: tripKey,
        date: booking.date,
        kind: booking.kind,
        route: booking.route,
        departure: booking.departure,
        bookings: [],
      };
      groups.push(tripGroup);
    }

    tripGroup.bookings.push(booking);
    return groups;
  }, []).sort((first, second) => (
    first.date.localeCompare(second.date) || first.departure.localeCompare(second.departure)
  ));
  const tripKindLabels = { weekly: 'Horário fixo', tour: 'Passeio', special: 'Data especial' };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar__inner">
          <Link className="brand" to="/">
            <span className="brand__mark">⚓︎</span>
            <span>Táxi Náutico</span>
          </Link>
          <nav className="nav management-nav">
            <Link to="/gerenciamento/dashboard">Dashboard</Link>
            <Link to={`/${client.slug}`}>Ver página do cliente</Link>
            <button className="button button--secondary" type="button" onClick={handleLogout}>
              Sair
            </button>
          </nav>
        </div>
      </header>

      <main className="container management-page">
        <div className="management-title">
          <div className="section-head">
            <h1>Gerenciamento · {client.name}</h1>
            <p>Gerencie cadastros, viagens e gastos em um só lugar.</p>
          </div>
        </div>

        <nav className="management-shortcuts" aria-label="Seções do gerenciamento">
          <button
            className="management-shortcut"
            type="button"
            onClick={() => setDialog({ mode: 'registration' })}
          >
            <span className="management-shortcut__title">Cadastro</span>
            <span>Horários fixos, passeios e datas especiais</span>
          </button>
          <button
            className="management-shortcut"
            type="button"
            onClick={() => setDialog({ mode: 'bookings' })}
            disabled={Boolean(bookingState.error)}
          >
            <span className="management-shortcut__title">Viagens</span>
            <span>{bookingState.bookings.length} reservas · consultar passageiros</span>
          </button>
          <button
            className="management-shortcut"
            type="button"
            onClick={() => setDialog({ mode: 'expenses' })}
          >
            <span className="management-shortcut__title">Gastos</span>
            <span>{currency.format(monthExpensesTotal)} neste mês · {expenseState.expenses.length} lançamentos</span>
          </button>
        </nav>

        {error && <p className="management-error" role="alert">{error}</p>}
        {message && <p className="management-success" role="status">{message}</p>}
        {bookingState.error && (
          <p className="management-error" role="alert">
            Não foi possível carregar as reservas: {bookingState.error}
          </p>
        )}
        {expenseState.error && (
          <p className="management-error" role="alert">
            Não foi possível carregar os gastos: {expenseState.error}
          </p>
        )}
      </main>

      <dialog
        className="booking-dialog management-dialog"
        ref={dialogRef}
        onCancel={(event) => {
          event.preventDefault();
          setDialog(null);
        }}
        onClose={() => setDialog(null)}
      >
        {dialog && (
          <>
            <div className="management-dialog__header">
              <div className="section-head">
                <h2>
                  {dialog.mode === 'registration' && 'Cadastro'}
                  {dialog.mode === 'boat-add' && 'Cadastrar embarcação'}
                  {dialog.mode === 'expenses' && 'Gastos'}
                  {dialog.mode === 'add' && `Adicionar ${dialogSection.singular}`}
                  {dialog.mode === 'list' && dialogSection.title}
                  {dialog.mode === 'expense-add' && 'Adicionar gasto'}
                  {dialog.mode === 'expense-list' && 'Gastos cadastrados'}
                  {dialog.mode === 'bookings' && 'Reservas por viagem'}
                </h2>
                <p>
                  {(dialog.mode === 'add' || dialog.mode === 'expense-add')
                    ? 'Preencha os dados.'
                    : dialog.mode === 'boat-add'
                      ? 'Informe o nome do barco e a capacidade máxima de passageiros.'
                    : dialog.mode === 'bookings'
                      ? 'Clientes que solicitaram passagem; pagamentos ainda não são processados.'
                      : dialog.mode === 'registration'
                        ? 'Cadastre e consulte horários semanais, passeios e datas especiais.'
                        : dialog.mode === 'expenses'
                          ? 'Registre e consulte os gastos da operação.'
                          : 'Consulte e remova os lançamentos armazenados no banco de dados.'}
                </p>
              </div>
              <button
                className="booking-dialog__close"
                type="button"
                aria-label="Fechar diálogo"
                onClick={() => setDialog(null)}
              >
                ×
              </button>
            </div>

            {error && <p className="management-error" role="alert">{error}</p>}
            {message && <p className="management-success" role="status">{message}</p>}

            {dialog.mode === 'registration' ? (
              <>
                <div className="management-registration-list">
                  <section className="management-registration-item">
                    <div>
                      <strong>Embarcações</strong>
                      <span>{boatState.boats.length} cadastradas</span>
                    </div>
                    <div className="management-category__actions">
                      <button
                        className="button button--primary"
                        type="button"
                        onClick={() => setDialog({ mode: 'boat-add' })}
                        disabled={Boolean(boatState.error)}
                      >
                        Cadastrar barco
                      </button>
                    </div>
                    {boatState.error && (
                      <p className="management-error" role="alert">
                        Não foi possível carregar os barcos: {boatState.error}
                      </p>
                    )}
                    {boatState.boats.map((boat) => (
                      <span className="management-registration-item__boat" key={boat.id}>
                        {boat.name} · {boat.capacity} passageiros
                      </span>
                    ))}
                  </section>
                  {Object.entries(SECTIONS).map(([section, details]) => (
                    <section className="management-registration-item" key={section}>
                      <div>
                        <strong>{details.title}</strong>
                        <span>{state.config[section].length} cadastrados</span>
                      </div>
                      <div className="management-category__actions">
                        <button
                          className="button button--secondary"
                          type="button"
                          onClick={() => setDialog({ mode: 'list', section })}
                        >
                          Consultar
                        </button>
                        <button
                          className="button button--primary"
                          type="button"
                          onClick={() => setDialog({ mode: 'add', section })}
                          disabled={boatState.boats.length === 0 || Boolean(boatState.error)}
                        >
                          Adicionar
                        </button>
                      </div>
                      {boatState.boats.length === 0 && (
                        <span className="management-registration-item__hint">
                          Cadastre um barco para adicionar horários.
                        </span>
                      )}
                    </section>
                  ))}
                </div>
                <div className="dialog-actions">
                  <button className="button button--secondary" type="button" onClick={() => setDialog(null)}>
                    Fechar
                  </button>
                  <button className="button button--primary" type="button" onClick={handleSave}>
                    Salvar cadastros
                  </button>
                </div>
              </>
            ) : dialog.mode === 'boat-add' ? (
              <BoatForm
                onSubmit={addBoat}
                onCancel={() => setDialog({ mode: 'registration' })}
              />
            ) : dialog.mode === 'expenses' ? (
              <>
                <p className="management-expenses__summary">
                  {currency.format(monthExpensesTotal)} registrados neste mês
                </p>
                <div className="management-category__actions">
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={() => setDialog({ mode: 'expense-add' })}
                  >
                    Adicionar gasto
                  </button>
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => setDialog({ mode: 'expense-list' })}
                  >
                    Consultar gastos ({expenseState.expenses.length})
                  </button>
                </div>
                <div className="dialog-actions">
                  <button className="button button--secondary" type="button" onClick={() => setDialog(null)}>
                    Fechar
                  </button>
                </div>
              </>
            ) : dialog.mode === 'bookings' ? (
              <>
                {bookingState.error ? (
                  <p className="management-error" role="alert">
                    Não foi possível carregar as reservas: {bookingState.error}
                  </p>
                ) : bookingsByTrip.length === 0 ? (
                  <p className="management-empty">Nenhuma reserva registrada ainda.</p>
                ) : (
                  <div className="management-trip-list">
                    {bookingsByTrip.map((trip) => (
                      <article className="management-saved-trip" key={trip.key}>
                        <strong>{trip.route} · {trip.departure}</strong>
                        <span>
                          {formatBookingDate(trip.date)} · {tripKindLabels[trip.kind] ?? trip.kind}
                        </span>
                        {trip.bookings.map((booking) => (
                          <div className="management-booking-customer" key={booking.id}>
                            <strong>{booking.nome} · {booking.passageiros} passageiro(s)</strong>
                            <span>Telefone: {booking.telefone}</span>
                            {booking.observacao && <span>Observação: {booking.observacao}</span>}
                          </div>
                        ))}
                      </article>
                    ))}
                  </div>
                )}
                <div className="dialog-actions">
                  <button className="button button--secondary" type="button" onClick={() => setDialog(null)}>
                    Fechar
                  </button>
                </div>
              </>
            ) : dialog.mode === 'expense-add' ? (
              <ExpenseForm
                onSubmit={addExpense}
                onCancel={() => setDialog(null)}
              />
            ) : dialog.mode === 'expense-list' ? (
              <>
                {expenseState.expenses.length === 0 ? (
                  <p className="management-empty">Nenhum gasto cadastrado ainda.</p>
                ) : (
                  <div className="management-trip-list">
                    {expenseState.expenses.map((expense) => (
                      <article className="management-saved-trip" key={expense.id}>
                        <strong>
                          {EXPENSE_CATEGORIES.find((category) => category.value === expense.category)?.label
                            ?? expense.category}
                          {' · '}
                          {currency.format(expense.amount)}
                        </strong>
                        <span>{expense.date} · {expense.description}</span>
                        {expense.recurring && <span>Recorrente · contabilizado uma vez por mês</span>}
                        <button
                          className="button button--secondary"
                          type="button"
                          onClick={() => removeExpense(expense.id)}
                        >
                          Remover
                        </button>
                      </article>
                    ))}
                  </div>
                )}
                <div className="dialog-actions">
                  <button className="button button--secondary" type="button" onClick={() => setDialog({ mode: 'expenses' })}>
                    Voltar
                  </button>
                </div>
              </>
            ) : dialog.mode === 'add' ? (
              <TripForm
                key={`${dialog.section}-${dialog.mode}`}
                section={dialog.section}
                boats={boatState.boats}
                onSubmit={(trip) => addTrip(dialog.section, trip)}
                onCancel={() => setDialog(null)}
              />
            ) : (
              <>
                {dialogTrips.length === 0 ? (
                  <p className="management-empty">Nenhum horário cadastrado ainda.</p>
                ) : (
                  <div className="management-trip-list">
                    {dialogTrips.map((trip) => (
                      <article className="management-saved-trip" key={trip.id}>
                        <strong>{trip.route}</strong>
                        <span>
                          {trip.date ? `Data: ${trip.date} · ` : ''}
                          {trip.departure} · {trip.price} · até {trip.capacity} passageiros
                        </span>
                        {trip.boatName && <span>Embarcação: {trip.boatName}</span>}
                        {trip.daysOfWeek && (
                          <span>Dias: {formatWeekdays(trip.daysOfWeek)}</span>
                        )}
                        <button
                          className="button button--secondary"
                          type="button"
                          onClick={() => removeTrip(dialog.section, trip.id)}
                        >
                          Remover
                        </button>
                      </article>
                    ))}
                  </div>
                )}
                <div className="dialog-actions">
                  <button className="button button--secondary" type="button" onClick={() => setDialog({ mode: 'registration' })}>
                    Voltar
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </dialog>
    </div>
  );
}

export default ManagementPage;
