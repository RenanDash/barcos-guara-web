import { useEffect, useRef, useState } from 'react';
import { getScheduleConfig, getTripsForDate } from '../data/scheduleStorage';

function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function ClientPage({ client }) {
  const today = new Date();
  const minDate = toDateInputValue(today);
  const maxDateValue = new Date(today);
  maxDateValue.setDate(maxDateValue.getDate() + 10);
  const maxDate = toDateInputValue(maxDateValue);
  const [scheduleState] = useState(() => {
    try {
      return { config: getScheduleConfig(client), error: '' };
    } catch (error) {
      return { config: null, error: error.message };
    }
  });

  const [dialogStep, setDialogStep] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => (
    scheduleState.config && getTripsForDate(client, minDate).length > 0 ? minDate : ''
  ));
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    passageiros: '2',
    observacao: '',
  });

  const dateDialogRef = useRef(null);
  const tripsDialogRef = useRef(null);
  const bookingDialogRef = useRef(null);

  useEffect(() => {
    const dialogs = {
      date: dateDialogRef.current,
      trips: tripsDialogRef.current,
      booking: bookingDialogRef.current,
    };
    const activeDialog = dialogStep ? dialogs[dialogStep] : null;

    Object.values(dialogs).forEach((dialog) => {
      if (dialog?.open && dialog !== activeDialog) {
        dialog.close();
      }
    });

    if (activeDialog && !activeDialog.open) {
      activeDialog.showModal();
    }
  }, [dialogStep]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateSubmit = (event) => {
    event.preventDefault();
    if (
      selectedDate >= minDate
      && selectedDate <= maxDate
      && getTripsForDate(client, selectedDate).length > 0
    ) {
      setDialogStep('trips');
    }
  };

  const firstWeekday = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1,
  ).getDay();
  const daysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0,
  ).getDate();
  const calendarDays = [
    ...Array(firstWeekday).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index + 1),
    ),
  ];
  const monthTitle = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(calendarMonth);
  const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const maxMonth = new Date(maxDateValue.getFullYear(), maxDateValue.getMonth(), 1);
  const canGoToPreviousMonth = calendarMonth > minMonth;
  const canGoToNextMonth = calendarMonth < maxMonth;
  const [origin, destination] = selectedTrip?.route.split(' → ') ?? [];
  const tripsForSelectedDate = selectedDate ? getTripsForDate(client, selectedDate) : [];
  const tripGroups = [
    { kind: 'weekly', title: 'Horários fixos', trips: tripsForSelectedDate },
    { kind: 'tour', title: 'Passeios', trips: tripsForSelectedDate },
    { kind: 'special', title: 'Viagens especiais', trips: tripsForSelectedDate },
  ];

  const handleSubmit = (event) => {
    event.preventDefault();
    alert('Reserva simulada com sucesso! O pagamento por Pix será enviado em seguida.');
    setDialogStep(null);
  };

  const handleDialogCancel = (event) => {
    event.preventDefault();
    setDialogStep(null);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar__inner">
          <div className="brand">
            <div className="brand__mark">⚓</div>
            <span>Barcos Guara</span>
          </div>
        </div>
      </header>

      <main className="container client-page">
        <section className="client-page__hero">
          <div
            className="client-page__banner"
            style={{ backgroundImage: `url('${client.image}')` }}
          >
            <div className="client-page__banner-text">
              <span>{client.city}</span>
              <h1>{client.title}</h1>
            </div>
            <button
              className="booking-cta"
              type="button"
              onClick={() => setDialogStep('date')}
              disabled={!scheduleState.config}
            >
              Agende Sua viagem
            </button>
            {scheduleState.error && (
              <p className="schedule-error" role="alert">
                Não foi possível carregar os horários: {scheduleState.error}
              </p>
            )}
          </div>
        </section>
      </main>

      <dialog
        className="booking-dialog"
        ref={dateDialogRef}
        onCancel={handleDialogCancel}
      >
        <div className="section-head">
          <h2>Escolha uma data</h2>
          <p>Selecione uma data entre hoje e os próximos 10 dias.</p>
        </div>

        <form className="booking-form" onSubmit={handleDateSubmit}>
          <div className="date-picker">
            <div className="calendar-header">
              <button
                className="calendar-nav"
                type="button"
                aria-label="Mês anterior"
                disabled={!canGoToPreviousMonth}
                onClick={() => setCalendarMonth(
                  new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1),
                )}
              >
                ‹
              </button>
              <strong>{monthTitle}</strong>
              <button
                className="calendar-nav"
                type="button"
                aria-label="Próximo mês"
                disabled={!canGoToNextMonth}
                onClick={() => setCalendarMonth(
                  new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
                )}
              >
                ›
              </button>
            </div>
            <div className="calendar-grid" role="group" aria-label={monthTitle}>
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((weekday, index) => (
                <span className="calendar-weekday" key={`${weekday}-${index}`}>
                  {weekday}
                </span>
              ))}
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <span className="calendar-day calendar-day--empty" key={`empty-${index}`} />;
                }

                const dateValue = toDateInputValue(date);
                const hasTrips = scheduleState.config
                  && getTripsForDate(client, dateValue).length > 0;
                const isDisabled = dateValue < minDate || dateValue > maxDate || !hasTrips;
                const isSelected = dateValue === selectedDate;

                return (
                  <button
                    className={`calendar-day${isDisabled ? ' calendar-day--disabled' : ''}${isSelected ? ' calendar-day--selected' : ''}`}
                    key={dateValue}
                    type="button"
                    aria-label={formatDate(dateValue)}
                    aria-pressed={isSelected}
                    disabled={isDisabled}
                    onClick={() => setSelectedDate(dateValue)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="dialog-actions">
            <button className="button button--secondary" type="button" onClick={() => setDialogStep(null)}>
              Cancelar
            </button>
            <button
              className="button button--primary"
              type="submit"
              disabled={!selectedDate || getTripsForDate(client, selectedDate).length === 0}
            >
              Ver viagens
            </button>
          </div>
        </form>
      </dialog>

      <dialog
        className="booking-dialog"
        ref={tripsDialogRef}
        onCancel={handleDialogCancel}
      >
        <div className="section-head">
          <h2>Viagens disponíveis</h2>
          <p>{selectedDate && formatDate(selectedDate)} · {client.subtitle}</p>
        </div>

        <div className="schedule-list">
          {tripGroups.map((group) => {
            const groupTrips = group.trips.filter((trip) => trip.kind === group.kind);

            if (groupTrips.length === 0) {
              return null;
            }

            return (
              <section className="schedule-group" key={group.kind}>
                <h3>{group.title}</h3>
                {groupTrips.map((trip) => {
                  const [tripOrigin, tripDestination] = trip.route.split(' → ');

                  return (
                    <button
                      className={`schedule-item schedule-item--selectable schedule-item--${trip.kind}`}
                      key={`${trip.kind}-${trip.route}-${trip.departure}`}
                      type="button"
                      onClick={() => {
                        setSelectedTrip(trip);
                        setShowBookingDetails(false);
                        setDialogStep('booking');
                      }}
                    >
                      <span className="schedule-item__meta">
                        <strong>Origem: {tripOrigin}</strong>
                        <strong>Destino: {tripDestination}</strong>
                        <span>Disponível para até {trip.capacity} passageiros</span>
                      </span>

                      <span className="schedule-item__time">
                        <span className="time-badge">{trip.departure}</span>
                        <span className="pill">{trip.price}</span>
                      </span>
                    </button>
                  );
                })}
              </section>
            );
          })}
        </div>

        <div className="dialog-actions">
          <button className="button button--secondary" type="button" onClick={() => setDialogStep('date')}>
            Voltar
          </button>
        </div>
      </dialog>

      <dialog
        className="booking-dialog"
        ref={bookingDialogRef}
        onCancel={handleDialogCancel}
      >
        {selectedTrip && (
          <>
            <div className="section-head">
              <h2>Solicitar agendamento</h2>
            </div>

            <button
              className="booking-details-toggle"
              type="button"
              aria-expanded={showBookingDetails}
              aria-controls="booking-details"
              onClick={() => setShowBookingDetails((visible) => !visible)}
            >
              Detalhes
            </button>
            {showBookingDetails && (
              <div className="summary-box booking-summary" id="booking-details">
                <p><strong>Data:</strong> {formatDate(selectedDate)}</p>
                <p><strong>Origem:</strong> {origin}</p>
                <p><strong>Destino:</strong> {destination}</p>
                <p><strong>Horário:</strong> {selectedTrip.departure}</p>
                <p><strong>Valor:</strong> {selectedTrip.price}</p>
              </div>
            )}

            <form className="booking-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <label>
                  Nome
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    placeholder="Seu nome"
                    required
                  />
                </label>

                <label>
                  Telefone
                  <input
                    type="tel"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleChange}
                    placeholder="(00) 00000-0000"
                    required
                  />
                </label>
              </div>

              <label>
                Passageiros
                <select name="passageiros" value={formData.passageiros} onChange={handleChange}>
                  {[...Array(Math.min(client.capacity, selectedTrip.capacity))].map((_, index) => (
                    <option key={index + 1} value={String(index + 1)}>
                      {index + 1}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Observação
                <textarea
                  name="observacao"
                  value={formData.observacao}
                  onChange={handleChange}
                  placeholder="Alguma informação adicional?"
                />
              </label>

              <div className="dialog-actions">
                <button className="button button--secondary" type="button" onClick={() => setDialogStep('trips')}>
                  Voltar
                </button>
                <button type="submit" className="button button--primary">
                  Reservar
                </button>
              </div>
            </form>
          </>
        )}
      </dialog>
    </div>
  );
}

export default ClientPage;
