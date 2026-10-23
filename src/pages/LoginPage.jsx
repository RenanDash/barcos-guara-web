import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import clients from '../data/clients.json';
import { MANAGER_SESSION_KEY } from '../data/managerAuth';

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (clients.some((client) => client.slug === sessionStorage.getItem(MANAGER_SESSION_KEY))) {
    return <Navigate to="/gerenciamento" replace />;
  }

  const handleSubmit = (event) => {
    event.preventDefault();

    const client = clients.find((item) => item.slug === username);
    if (client && password === 'adm') {
      sessionStorage.setItem(MANAGER_SESSION_KEY, client.slug);
      navigate('/gerenciamento', { replace: true });
      return;
    }

    setError('Usuário ou senha incorretos.');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar__inner">
          <Link className="brand" to="/">
            <span className="brand__mark">⚓</span>
            <span>Barcos Guara</span>
          </Link>
        </div>
      </header>

      <main className="container management-page">
        <section className="management-card login-card">
          <div className="section-head">
            <h1>Gerenciamento</h1>
            <p>Use o identificador do cliente e a senha de gerenciamento.</p>
          </div>

          <form className="management-form" onSubmit={handleSubmit}>
            <label>
              Usuário
              <input
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error && <p className="management-error" role="alert">{error}</p>}

            <button className="button button--primary" type="submit">
              Entrar
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
