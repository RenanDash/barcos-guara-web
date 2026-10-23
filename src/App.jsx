import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import ClientPage from './pages/ClientPage';
import LoginPage from './pages/LoginPage';
import ManagementPage from './pages/ManagementPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import clients from './data/clients.json';
import { MANAGER_SESSION_KEY } from './data/managerAuth';

function ClientRoute() {
  const { clientSlug } = useParams();
  const client = clients.find((item) => item.slug === clientSlug);

  if (!client) {
    return <Navigate to="/" replace />;
  }

  return <ClientPage client={client} />;
}

function ManagementRoute() {
  const managerSlug = sessionStorage.getItem(MANAGER_SESSION_KEY);
  const managerClient = clients.find((client) => client.slug === managerSlug);

  if (!managerClient) {
    return <Navigate to="/login" replace />;
  }

  return <ManagementPage client={managerClient} />;
}

function DashboardRoute() {
  const managerSlug = sessionStorage.getItem(MANAGER_SESSION_KEY);
  const managerClient = clients.find((client) => client.slug === managerSlug);

  if (!managerClient) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardPage client={managerClient} />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/gerenciamento" element={<ManagementRoute />} />
        <Route path="/gerenciamento/dashboard" element={<DashboardRoute />} />
        <Route path="/:clientSlug" element={<ClientRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
