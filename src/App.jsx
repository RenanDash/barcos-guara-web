import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ClientPage from './pages/ClientPage';
import HomePage from './pages/HomePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:clientSlug" element={<ClientPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
