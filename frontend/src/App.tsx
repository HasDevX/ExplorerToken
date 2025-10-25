import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Home } from './pages/Home';
import { AddressPage } from './pages/AddressPage';
import { TxPage } from './pages/TxPage';
import { Setup } from './pages/Setup';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { getSetupState } from './lib/api';

function SetupGuard({ children }: { children: React.ReactNode }) {
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkSetupState();
  }, []);

  const checkSetupState = async () => {
    try {
      const state = await getSetupState();
      setSetupComplete(state.setupComplete);

      // If setup is not complete and we're not on the setup page, redirect
      if (!state.setupComplete && location.pathname !== '/setup') {
        navigate('/setup', { replace: true });
      }
    } catch (error) {
      // If we can't check setup state, assume it's not complete
      console.error('Failed to check setup state:', error);
      setSetupComplete(false);
      if (location.pathname !== '/setup') {
        navigate('/setup', { replace: true });
      }
    }
  };

  // Show loading while checking setup state
  if (setupComplete === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <SetupGuard>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow-sm">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-16">
                <Link to="/" className="text-xl font-bold text-gray-900">
                  ExplorerToken
                </Link>
                <div className="flex gap-4">
                  <Link to="/" className="text-gray-600 hover:text-gray-900">
                    Home
                  </Link>
                  <Link to="/login" className="text-gray-600 hover:text-gray-900">
                    Login
                  </Link>
                  <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
                    Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          <Routes>
            <Route path="/setup" element={<Setup />} />
            <Route path="/" element={<Home />} />
            <Route path="/address/:chainId/:address" element={<AddressPage />} />
            <Route path="/tx/:chainId/:hash" element={<TxPage />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </SetupGuard>
    </BrowserRouter>
  );
}

export default App;
