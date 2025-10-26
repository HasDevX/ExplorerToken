import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAdminSettings,
  updateAdminSettings,
  updateApiKey,
  clearCache,
  getMetrics,
  logout,
  type Settings,
} from '../lib/api';

type Tab = 'settings' | 'apikey' | 'cache' | 'metrics';

const DEFAULT_CHAINS = [
  { id: 1, name: 'Ethereum' },
  { id: 10, name: 'Optimism' },
  { id: 56, name: 'BNB Smart Chain' },
  { id: 100, name: 'Gnosis' },
  { id: 137, name: 'Polygon' },
  { id: 250, name: 'Fantom' },
  { id: 43114, name: 'Avalanche C-Chain' },
  { id: 42161, name: 'Arbitrum One' },
  { id: 8453, name: 'Base' },
  { id: 59144, name: 'Linea' },
];

export function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ type: 'info' | 'error'; message: string } | null>(null);

  // Settings tab state
  const [selectedChains, setSelectedChains] = useState<number[]>([]);
  const [cacheTtl, setCacheTtl] = useState(60);

  // API key tab state
  const [newApiKey, setNewApiKey] = useState('');

  // Metrics state
  const [metrics, setMetrics] = useState<{
    usage: Record<string, number>;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  // Auto-clear toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadSettings = async () => {
    try {
      const data = await getAdminSettings();
      setSettings(data);
      setSelectedChains(data.chains);
      setCacheTtl(data.cacheTtl);
    } catch (err) {
      // Handle different error scenarios
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as {
          response?: { status?: number; data?: Record<string, unknown> };
        };

        if (axiosError.response?.status === 401) {
          // Session expired - clear token and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToast({ type: 'info', message: 'Session expired. Please log in again.' });
          setTimeout(() => navigate('/login'), 1500);
          return;
        }

        if (axiosError.response?.status === 409) {
          // Setup not completed - redirect to setup
          setToast({ type: 'info', message: 'Setup not completed. Redirecting to setup...' });
          setTimeout(() => navigate('/setup'), 1500);
          return;
        }

        if (axiosError.response?.status === 500) {
          // Server error - show friendly error banner, do NOT redirect
          setError('An internal server error occurred. Please try again later.');
          return;
        }
      }

      // Generic error
      setError('Failed to load settings. Please try again.');
    }
  };

  const handleChainToggle = (chainId: number) => {
    setSelectedChains((prev) =>
      prev.includes(chainId) ? prev.filter((id) => id !== chainId) : [...prev, chainId]
    );
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await updateAdminSettings({ chains: selectedChains, cacheTtl });
      setMessage('Settings updated successfully');
      await loadSettings();
    } catch (err) {
      setError('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateApiKey = async () => {
    if (!newApiKey.trim()) {
      setError('API key cannot be empty');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      await updateApiKey(newApiKey);
      setMessage('API key updated successfully');
      setNewApiKey('');
      await loadSettings();
    } catch (err) {
      setError('Failed to update API key');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear the cache?')) {
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      await clearCache();
      setMessage('Cache cleared successfully');
    } catch (err) {
      setError('Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMetrics = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getMetrics();
      setMetrics(data);
    } catch (err) {
      setError('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      // Ignore errors
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* Toast notification */}
          {toast && (
            <div
              className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
                toast.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-blue-50 border border-blue-200 text-blue-700'
              }`}
            >
              {toast.message}
            </div>
          )}

          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              Logout
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex px-6">
              {[
                { id: 'settings' as Tab, label: 'Settings' },
                { id: 'apikey' as Tab, label: 'API Key' },
                { id: 'cache' as Tab, label: 'Cache' },
                { id: 'metrics' as Tab, label: 'Metrics' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMessage('');
                    setError('');
                  }}
                  className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab content */}
          <div className="p-6">
            {message && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {message}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-4">Chain Configuration</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {DEFAULT_CHAINS.map((chain) => (
                      <label
                        key={chain.id}
                        className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedChains.includes(chain.id)}
                          onChange={() => handleChainToggle(chain.id)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="ml-3 text-gray-900">{chain.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-4">Cache Configuration</h2>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Cache TTL (seconds)
                  </label>
                  <input
                    type="number"
                    value={cacheTtl}
                    onChange={(e) => setCacheTtl(Number(e.target.value))}
                    min="10"
                    className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={loading}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    loading
                      ? 'bg-blue-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            )}

            {/* API Key Tab */}
            {activeTab === 'apikey' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-4">Update Etherscan API Key</h2>
                  <p className="text-gray-600 mb-4">
                    Current API key is {settings?.hasApiKey ? 'configured' : 'not set'}
                  </p>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New API Key
                  </label>
                  <input
                    type="text"
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    placeholder="Enter new API key"
                    className="w-full max-w-xl px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={handleUpdateApiKey}
                  disabled={loading}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    loading
                      ? 'bg-blue-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {loading ? 'Updating...' : 'Update API Key'}
                </button>
              </div>
            )}

            {/* Cache Tab */}
            {activeTab === 'cache' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-4">Cache Management</h2>
                  <p className="text-gray-600 mb-4">
                    Clear the application cache to force fresh data fetching from external APIs.
                  </p>
                </div>

                <button
                  onClick={handleClearCache}
                  disabled={loading}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    loading
                      ? 'bg-red-400 text-white cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {loading ? 'Clearing...' : 'Clear Cache'}
                </button>
              </div>
            )}

            {/* Metrics Tab */}
            {activeTab === 'metrics' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-4">API Usage Metrics</h2>
                  <p className="text-gray-600 mb-4">View API usage statistics and analytics.</p>
                </div>

                <button
                  onClick={handleLoadMetrics}
                  disabled={loading}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    loading
                      ? 'bg-blue-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {loading ? 'Loading...' : 'Load Metrics'}
                </button>

                {metrics && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-2">Usage Data</h3>
                    <p className="text-sm text-gray-500 mb-4">Last updated: {metrics.timestamp}</p>
                    {Object.keys(metrics.usage).length === 0 ? (
                      <p className="text-gray-500">No usage data available yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(metrics.usage).map(([key, count]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-gray-700">{key}</span>
                            <span className="font-mono text-gray-900">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
