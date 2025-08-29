import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { SettingsPage } from './pages/SettingsPage';
import { useSocket } from '@ultibiker/shared';

export function App() {
  // Initialize socket connection
  useSocket({
    url: import.meta.env.VITE_API_URL || 'http://localhost:3001',
    autoConnect: true,
  });

  return (
    <>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </Router>
      
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </>
  );
}