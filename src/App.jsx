import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import ClientPage from './pages/ClientPage';
import LoginPage from './pages/LoginPage';
import ManagementPage from './pages/ManagementPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import { MANAGER_SESSION_KEY, MANAGER_TOKEN_KEY } from './data/managerAuth';
import { apiRequest } from './data/api';

function ClientRoute({ clients, loadingError, loading }) {
  const { clientSlug } = useParams();
  const client = clients.find((item) => item.slug === clientSlug);

  if (loading) return <p className="container">Conectando ao banco...</p>;
  if (loadingError) return <p className="container management-error" role="alert">{loadingError}</p>;
  if (!client) {
    return <Navigate to="/" replace />;
  }

  return <ClientPage client={client} />;
}

function ManagementRoute({ clients, loading }) {
  const managerSlug = sessionStorage.getItem(MANAGER_SESSION_KEY);
  const managerClient = clients.find((client) => client.slug === managerSlug);

  if (loading) return <p className="container">Conectando ao banco...</p>;
  if (!managerClient) {
    return <Navigate to="/login" replace />;
  }
  if (!sessionStorage.getItem(MANAGER_TOKEN_KEY)) {
    return <Navigate to="/login" replace />;
  }

  return <ManagementPage client={managerClient} />;
}

function DashboardRoute({ clients, loading }) {
  const managerSlug = sessionStorage.getItem(MANAGER_SESSION_KEY);
  const managerClient = clients.find((client) => client.slug === managerSlug);

  if (loading) return <p className="container">Conectando ao banco...</p>;
  if (!managerClient) {
    return <Navigate to="/login" replace />;
  }
  if (!sessionStorage.getItem(MANAGER_TOKEN_KEY)) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardPage client={managerClient} />;
}

function App() {
  const [clientsState, setClientsState] = useState({ clients: [], loading: true, error: '' });

  useEffect(() => {
    let active = true;
    apiRequest('/api/clients')
      .then((clients) => {
        if (active) setClientsState({ clients, loading: false, error: '' });
      })
      .catch((error) => {
        if (active) setClientsState({ clients: [], loading: false, error: error.message });
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={clientsState.loading
            ? <p className="container">Conectando ao banco...</p>
            : clientsState.error
              ? <p className="container management-error" role="alert">{clientsState.error}</p>
              : <HomePage clients={clientsState.clients} />}
        />
        <Route
          path="/login"
          element={clientsState.loading
            ? <p className="container">Conectando ao banco...</p>
            : clientsState.error
              ? <p className="container management-error" role="alert">{clientsState.error}</p>
              : <LoginPage clients={clientsState.clients} />}
        />
        <Route path="/gerenciamento" element={<ManagementRoute clients={clientsState.clients} loading={clientsState.loading} />} />
        <Route path="/gerenciamento/dashboard" element={<DashboardRoute clients={clientsState.clients} loading={clientsState.loading} />} />
        <Route path="/:clientSlug" element={<ClientRoute clients={clientsState.clients} loading={clientsState.loading} loadingError={clientsState.error} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
