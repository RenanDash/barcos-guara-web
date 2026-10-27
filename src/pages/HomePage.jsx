import { Link } from 'react-router-dom';

function HomePage({ clients }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar__inner">
          <div className="brand">
            <div className="brand__mark">⚓︎</div>
            <span>Táxi Náutico</span>
          </div>
          <nav className="nav">
            <Link to="/">Início</Link>
            {clients.map((client) => (
              <Link to={`/${client.slug}`} key={client.slug}>{client.name}</Link>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero__grid">
            <div>
              <div className="eyebrow">Táxi aquático digital</div>
              <h1>Agende sua travessia com rapidez e segurança.</h1>
              <p>
                Reserve horários flexíveis, veja disponibilidade e confirme sua viagem com pagamento por Pix.
                Cada cliente recebe uma experiência personalizada com rotas e horários específicos.
              </p>

              <div className="cta-row">
                <Link className="button button--primary" to="/login">
                  Gerenciamento
                </Link>
                <a className="button button--secondary" href="#clientes">
                  Clientes
                </a>
              </div>
            </div>

            <div className="hero__panel">
              <div
                className="hero__photo"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1567899365259-0df7f650f3bb?auto=format&fit=crop&w=1200&q=80')",
                }}
              />
              <div className="hero__floating">
                <strong>14 passageiros</strong>
                <span>Capacidade por embarcação</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>Como funciona</h2>
              <p>Processo simples para agendar sua viagem.</p>
            </div>

            <div className="grid-3">
              <article className="card">
                <div className="card__icon">01</div>
                <h3>Escolha a rota</h3>
                <p>Selecione o cliente, a origem e o destino da viagem com base no horário disponível.</p>
              </article>

              <article className="card">
                <div className="card__icon">02</div>
                <h3>Confirme o agendamento</h3>
                <p>Informe seus dados e confirme a reserva. A disponibilidade é validada no momento.</p>
              </article>

              <article className="card">
                <div className="card__icon">03</div>
                <h3>Pagamento por Pix</h3>
                <p>Receba o código QR do Pix e finalize a reserva com segurança e rapidez.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="clientes">
          <div className="container">
            <div className="section-head">
              <h2>Clientes disponíveis</h2>
              <p>Selecione o cliente para ver tarifas e horários.</p>
            </div>

            <div className="client-grid">
              {clients.map((client) => (
                <article key={client.slug} className="client-card">
                  <div
                    className="client-card__image"
                    style={{ backgroundImage: `url('${client.image}')` }}
                  />

                  <div className="client-card__body">
                    <h3>{client.name}</h3>
                    <p>{client.subtitle}</p>
                    <Link className="button button--primary" to={`/${client.slug}`}>
                      Ver horários
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default HomePage;
