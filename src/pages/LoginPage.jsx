import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { MANAGER_SESSION_KEY, MANAGER_TOKEN_KEY } from '../data/managerAuth';
import { apiRequest, getLocalData } from '../data/api';

function LoginPage({ clients }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (
    sessionStorage.getItem(MANAGER_TOKEN_KEY)
    && clients.some((client) => client.slug === sessionStorage.getItem(MANAGER_SESSION_KEY))
  ) {
    return <Navigate to="/gerenciamento" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token } = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { username, password },
      });
      sessionStorage.setItem(MANAGER_SESSION_KEY, username);
      sessionStorage.setItem(MANAGER_TOKEN_KEY, token);

      const importKey = `barcos-guara-local-imported-${username}`;
      if (!localStorage.getItem(importKey)) {
        const localData = getLocalData(username);
        const hasLocalData = Object.values(localData).some((value) => value !== undefined);
        if (hasLocalData) {
          await apiRequest(`/api/manager/${encodeURIComponent(username)}/import-local`, {
            method: 'POST',
            body: localData,
            authenticated: true,
          });
        }
        localStorage.setItem(importKey, 'true');
      }

      navigate('/gerenciamento', { replace: true });
    } catch (loginError) {
      sessionStorage.removeItem(MANAGER_SESSION_KEY);
      sessionStorage.removeItem(MANAGER_TOKEN_KEY);
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar__inner">
          <Link className="brand" to="/">
            <span className="brand__mark">⚓︎</span>
            <span>Táxi Náutico</span>
          </Link>
        </div>
      </header>

      <main className="container management-page">
        <section className="management-card login-card">
          <div className="section-head">
            <h1>Gerenciamento</h1>
            <p>Use o identificador do cliente e a senha de gerenciamento configurada no servidor.</p>
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

            <button className="button button--primary" type="submit" disabled={loading}>
              {loading ? 'Conectando...' : 'Entrar'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
