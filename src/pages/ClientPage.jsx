import { useEffect, useRef, useState } from 'react';
import { getPublicScheduleConfig, getTripsForDate } from '../data/scheduleStorage';
import { addBooking } from '../data/bookingStorage';

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

function getRouteKey(route) {
  return route.split(' → ').map((place) => place.trim().toLocaleLowerCase()).sort().join('|');
}

function ClientPage({ client }) {
  const today = new Date();
  const minDate = toDateInputValue(today);
  const maxDateValue = new Date(today);
  maxDateValue.setDate(maxDateValue.getDate() + 10);
  const maxDate = toDateInputValue(maxDateValue);
  const [scheduleState, setScheduleState] = useState({ config: null, error: '', loading: true });

  const [dialogStep, setDialogStep] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedRouteKey, setSelectedRouteKey] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    passageiros: '1',
    observacao: '',
  });
  const destinationCards = scheduleState.config
    ? [...scheduleState.config.weekly, ...scheduleState.config.tours, ...scheduleState.config.special]
      .reduce((cards, trip) => {
        const routeKey = getRouteKey(trip.route);
        if (!cards.some((card) => card.routeKey === routeKey)) {
          const [originPlace, destinationPlace] = trip.route.split(' → ');
          cards.push({
            routeKey,
            originPlace,
            destinationPlace,
          });
        }
        return cards;
      }, [])
    : [];
  const dateDialogRef = useRef(null);
  const tripsDialogRef = useRef(null);
  const bookingDialogRef = useRef(null);

  useEffect(() => {
    let active = true;
    getPublicScheduleConfig(client)
      .then((config) => {
        if (!active) return;
        setScheduleState({ config, error: '', loading: false });
        if (getTripsForDate(config, minDate).length > 0) setSelectedDate(minDate);
      })
      .catch((error) => {
        if (active) setScheduleState({ config: null, error: error.message, loading: false });
      });

    return () => {
      active = false;
    };
  }, [client, minDate]);

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
    const tripsForDate = getTripsForDate(scheduleState.config, selectedDate);
    if (
      selectedDate >= minDate
      && selectedDate <= maxDate
      && tripsForDate.some((trip) => (
        selectedRouteKey === null || getRouteKey(trip.route) === selectedRouteKey
      ))
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
  const maxPassengers = selectedTrip
    ? Number(selectedTrip.capacity)
    : client.capacity;
  const tripsForSelectedDate = selectedDate ? getTripsForDate(scheduleState.config, selectedDate) : [];
  const tripGroups = [
    { kind: 'weekly', title: 'Horários fixos', trips: tripsForSelectedDate },
    { kind: 'tour', title: 'Passeios', trips: tripsForSelectedDate },
    { kind: 'special', title: 'Datas especiais', trips: tripsForSelectedDate },
  ];
  const hasTripsForSelectedDate = tripsForSelectedDate.some((trip) => (
    selectedRouteKey === null || getRouteKey(trip.route) === selectedRouteKey
  ));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBookingError('');

    try {
      await addBooking(client.slug, {
        date: selectedDate,
        tripId: selectedTrip.tripId,
        kind: selectedTrip.kind,
        route: selectedTrip.route,
        departure: selectedTrip.departure,
        price: selectedTrip.price,
        nome: formData.nome.trim(),
        telefone: formData.telefone.trim(),
        passageiros: Number(formData.passageiros),
        observacao: formData.observacao.trim(),
      });
      alert('Reserva registrada com sucesso! O pagamento por Pix ainda deve ser combinado.');
      setDialogStep(null);
    } catch (error) {
      setBookingError(`Não foi possível registrar a reserva: ${error.message}`);
    }
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
            <div className="brand__mark">⚓︎</div>
            <span>Táxi Náutico</span>
          </div>
        </div>
      </header>

      <main className="container client-page">
        <section className="destination-grid" aria-label={`Viagens disponíveis para ${client.name}`}>
          {scheduleState.error && (
            <p className="schedule-error" role="alert">
              Não foi possível carregar os horários: {scheduleState.error}
            </p>
          )}
          {scheduleState.loading && <p className="schedule-error">Carregando horários...</p>}
          {destinationCards.map((card) => (
            <article
              className="destination-card"
              key={card.routeKey}
              style={{ backgroundImage: `url('${client.image}')` }}
            >
              <button
                className="booking-cta"
                type="button"
                onClick={() => {
                  setSelectedRouteKey(card.routeKey);
                  setSelectedDate('');
                  setDialogStep('date');
                }}
              >
                Agende sua viagem
              </button>
              <div className="destination-card__text">
                <span>{`${card.originPlace} / ${card.destinationPlace}`}</span>
                <h1>{`${card.originPlace} e ${card.destinationPlace}`}</h1>
              </div>
            </article>
          ))}
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
                const tripsForDate = getTripsForDate(scheduleState.config, dateValue);
                const hasTrips = tripsForDate.some((trip) => (
                  selectedRouteKey === null || getRouteKey(trip.route) === selectedRouteKey
                ));
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
              disabled={!selectedDate || !hasTripsForSelectedDate}
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
            const groupTrips = group.trips.filter((trip) => (
              trip.kind === group.kind
              && (selectedRouteKey === null || getRouteKey(trip.route) === selectedRouteKey)
            ));

            if (groupTrips.length === 0) {
              return null;
            }

            const tripItems = groupTrips.map((trip) => {
              const [tripOrigin, tripDestination] = trip.route.split(' → ');

              return (
                <button
                  className={`schedule-item schedule-item--selectable schedule-item--${trip.kind}`}
                  key={`${trip.kind}-${trip.route}-${trip.departure}`}
                  type="button"
                  onClick={() => {
                    setSelectedTrip(trip);
                    setFormData((prev) => ({ ...prev, passageiros: '1' }));
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
            });

            if (group.kind === 'weekly') {
              return tripItems;
            }

            return (
              <section className={`schedule-group schedule-group--${group.kind}`} key={group.kind}>
                <h3>{group.title}</h3>
                {tripItems}
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
              {bookingError && <p className="management-error" role="alert">{bookingError}</p>}
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

              <div className="passenger-field">
                <span className="passenger-field__label" id="passenger-count-label">Passageiros</span>
                <div className="passenger-control" aria-labelledby="passenger-count-label">
                  <button
                    className="passenger-control__button"
                    type="button"
                    aria-label="Diminuir passageiros"
                    disabled={Number(formData.passageiros) <= 1}
                    onClick={() => setFormData((prev) => ({
                      ...prev,
                      passageiros: String(Math.max(1, Number(prev.passageiros) - 1)),
                    }))}
                  >
                    -
                  </button>
                  <output className="passenger-control__value" aria-live="polite">
                    {formData.passageiros}
                  </output>
                  <button
                    className="passenger-control__button"
                    type="button"
                    aria-label="Aumentar passageiros"
                    disabled={Number(formData.passageiros) >= maxPassengers}
                    onClick={() => setFormData((prev) => ({
                      ...prev,
                      passageiros: String(Math.min(maxPassengers, Number(prev.passageiros) + 1)),
                    }))}
                  >
                    +
                  </button>
                </div>
              </div>

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
      <footer className="client-page__footer">
        developed Renan Cordeiro Ramos
      </footer>
    </div>
  );
}

export default ClientPage;
