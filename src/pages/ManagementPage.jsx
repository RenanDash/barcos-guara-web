import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MANAGER_SESSION_KEY } from '../data/managerAuth';
import { getScheduleConfig, saveScheduleConfig } from '../data/scheduleStorage';
import demoReports from '../data/demoReports.json';

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

function TripForm({ section, capacity, onSubmit, onCancel }) {
  const [error, setError] = useState('');
  const [trip, setTrip] = useState({
    date: '',
    origin: '',
    destination: '',
    departure: '07:00',
    price: '',
    capacity: String(capacity),
    daysOfWeek: [],
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (section !== 'special' && trip.daysOfWeek.length === 0) {
      setError('Selecione pelo menos um dia da semana.');
      return;
    }

    setError('');
    onSubmit({
      ...trip,
      id: createId(),
      route: `${trip.origin.trim()} → ${trip.destination.trim()}`,
      capacity: Number(trip.capacity),
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
          Capacidade
          <input
            type="number"
            min="1"
            value={trip.capacity}
            onChange={(event) => update('capacity', event.target.value)}
            required
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

function formatWeekdays(days) {
  return WEEK_DAYS.filter((day) => days.includes(day.value))
    .map((day) => day.label)
    .join(', ');
}

function ManagementPage({ client }) {
  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const [dialog, setDialog] = useState(null);
  const [state, setState] = useState(() => {
    try {
      return { config: getScheduleConfig(client), error: '' };
    } catch (error) {
      return { config: null, error: error.message };
    }
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const element = dialogRef.current;
    if (dialog && !element.open) {
      element.showModal();
    } else if (!dialog && element.open) {
      element.close();
    }
  }, [dialog]);

  const handleLogout = () => {
    sessionStorage.removeItem(MANAGER_SESSION_KEY);
    navigate('/login', { replace: true });
  };

  const addTrip = (section, trip) => {
    setState((current) => ({
      ...current,
      config: {
        ...current.config,
        [section]: [...current.config[section], trip],
      },
    }));
    setMessage('');
    setError('');
    setDialog({ mode: 'list', section });
  };

  const removeTrip = (section, tripId) => {
    setState((current) => ({
      ...current,
      config: {
        ...current.config,
        [section]: current.config[section].filter((trip) => trip.id !== tripId),
      },
    }));
    setMessage('');
  };

  const handleSave = () => {
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
      saveScheduleConfig(client.slug, state.config);
      setMessage('Horários salvos neste navegador.');
    } catch (saveError) {
      setError(`Não foi possível salvar os horários: ${saveError.message}`);
    }
  };

  if (!state.config) {
    return (
      <div className="app-shell">
        <main className="container management-page">
          <section className="management-card">
            <p className="management-error" role="alert">{state.error}</p>
          </section>
        </main>
      </div>
    );
  }

  const dialogSection = dialog ? SECTIONS[dialog.section] : null;
  const dialogTrips = dialog ? state.config[dialog.section] : [];
  const report = demoReports[client.slug];
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar__inner">
          <Link className="brand" to="/">
            <span className="brand__mark">⚓</span>
            <span>Barcos Guara</span>
          </Link>
          <nav className="nav management-nav">
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
            <p>Cadastre e consulte horários semanais, passeios e viagens especiais.</p>
          </div>
        </div>

        <section className="management-analysis management-analysis--profit">
          <div className="management-analysis__header">
            <div>
              <span className="report-demo-label">DADOS FICTÍCIOS · {report.currentMonthToDate.period}</span>
              <h2>Lucro líquido até agora</h2>
            </div>
            <Link className="button button--secondary" to="/gerenciamento/dashboard">
              Dashboard
            </Link>
          </div>
          <strong className="management-analysis__profit-value">
            {currency.format(report.currentMonthToDate.netProfit)}
          </strong>
        </section>

        <div className="management-categories">
          {Object.entries(SECTIONS).map(([section, details]) => (
            <section className={`management-card management-category management-category--${section}`} key={section}>
              <div className="section-head">
                <h2>{details.title}</h2>
                <p>
                  {section === 'weekly' && 'Viagens fixas que se repetem nos dias da semana selecionados.'}
                  {section === 'tours' && 'Opções de passeios com rota, valor e dias definidos pelo gerente.'}
                  {section === 'special' && 'Viagens adicionais cadastradas para uma data específica.'}
                </p>
              </div>
              <div className="management-category__actions">
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => setDialog({ mode: 'add', section })}
                >
                  Adicionar {details.singular}
                </button>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => setDialog({ mode: 'list', section })}
                >
                  Ver horários cadastrados ({state.config[section].length})
                </button>
              </div>
            </section>
          ))}

          {error && <p className="management-error" role="alert">{error}</p>}
          {message && <p className="management-success" role="status">{message}</p>}
          <button className="button button--primary management-save" type="button" onClick={handleSave}>
            Salvar horários
          </button>
        </div>
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
                  {dialog.mode === 'add' ? `Adicionar ${dialogSection.singular}` : dialogSection.title}
                </h2>
                <p>
                  {dialog.mode === 'add'
                    ? 'Preencha os dados da viagem.'
                    : 'Horários e viagens cadastrados nesta categoria.'}
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

            {dialog.mode === 'add' ? (
              <TripForm
                key={`${dialog.section}-${dialog.mode}`}
                section={dialog.section}
                capacity={client.capacity}
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
                  <button className="button button--secondary" type="button" onClick={() => setDialog(null)}>
                    Fechar
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
