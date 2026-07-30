import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import VenuesList from './pages/VenuesList';
import VenueDetail from './pages/VenueDetail';

function RequireAuth({ children }: { children: React.ReactElement }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/venues" element={<VenuesList />} />
        <Route path="/venues/:id" element={<VenueDetail />} />
        <Route path="/" element={<Navigate to="/venues" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/venues" replace />} />
    </Routes>
  );
}
