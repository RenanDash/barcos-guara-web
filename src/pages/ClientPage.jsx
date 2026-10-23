import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import clients from '../data/clients.json';

function ClientPage() {
  const { clientSlug } = useParams();
  const client = useMemo(
    () => clients.find((item) => item.slug === clientSlug) || clients[0],
    [clientSlug],
  );

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    origem: '',
    destino: '',
    passageiros: '2',
    observacao: '',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    alert('Reserva simulada com sucesso! O pagamento por Pix será enviado em seguida.');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar__inner">
          <div className="brand">
            <div className="brand__mark">⚓</div>
            <span>Barcos Guara</span>
          </div>

          <nav className="nav">
            <Link to="/">Início</Link>
            {clients.map((item) => (
              <Link key={item.slug} to={`/${item.slug}`}>
                {item.name}
              </Link>
            ))}
          </nav>
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
          </div>

          <div className="schedule-card">
            <div className="section-head">
              <h2>Horários disponíveis</h2>
              <p>{client.subtitle}</p>
            </div>

            <div className="schedule-list">
              {client.schedule.map((item) => (
                <div className="schedule-item" key={`${item.route}-${item.departure}`}>
                  <div className="schedule-item__meta">
                    <strong>{item.route}</strong>
                    <span>Disponível para até {item.capacity} passageiros</span>
                  </div>

                  <div className="schedule-item__time">
                    <span className="time-badge">{item.departure}</span>
                    <span className="pill">{item.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="client-page__hero">
          <div className="form-card">
            <div className="section-head">
              <h2>Solicitar agendamento</h2>
              <p>{client.description}</p>
            </div>

            <form onSubmit={handleSubmit}>
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

              <div className="form-row">
                <label>
                  Origem
                  <input
                    type="text"
                    name="origem"
                    value={formData.origem}
                    onChange={handleChange}
                    placeholder="Ex: Guara"
                    required
                  />
                </label>

                <label>
                  Destino
                  <input
                    type="text"
                    name="destino"
                    value={formData.destino}
                    onChange={handleChange}
                    placeholder="Ex: Paranaguá"
                    required
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Passageiros
                  <select name="passageiros" value={formData.passageiros} onChange={handleChange}>
                    {[...Array(client.capacity)].map((_, index) => (
                      <option key={index + 1} value={String(index + 1)}>
                        {index + 1}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Horário desejado
                  <select name="horario" defaultValue="07:00">
                    {client.schedule.map((slot) => (
                      <option key={`${slot.route}-${slot.departure}`} value={slot.departure}>
                        {slot.route} - {slot.departure}
                      </option>
                    ))}
                  </select>
                </label>
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

              <button type="submit" className="button button--primary">
                Confirmar reserva
              </button>
            </form>
          </div>

          <div className="schedule-card">
            <div className="section-head">
              <h2>Resumo do cliente</h2>
              <p>Dados do serviço e regras da viagem.</p>
            </div>

            <div className="summary-box">
              <p>
                <strong>Cliente:</strong> {client.name}
              </p>
              <p>
                <strong>Capacidade:</strong> {client.capacity} passageiros
              </p>
              <p>
                <strong>Rotas principais:</strong> {client.schedule.map((slot) => slot.route).join(' / ')}
              </p>
              <p>
                <strong>Pagamento:</strong> Pix em até 5 minutos após a confirmação da reserva.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ClientPage;
