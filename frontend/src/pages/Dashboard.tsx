export function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Dashboard</h1>
          <p className="text-gray-600 mb-6">
            This is a placeholder for the admin dashboard. Full functionality will be available in a
            future update.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">API Keys</h2>
              <p className="text-sm text-gray-500">Manage Etherscan API keys</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">Chains</h2>
              <p className="text-sm text-gray-500">Configure supported chains</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">Cache Settings</h2>
              <p className="text-sm text-gray-500">Adjust cache TTL values</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">Metrics</h2>
              <p className="text-sm text-gray-500">View usage analytics</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">Rate Limits</h2>
              <p className="text-sm text-gray-500">Configure rate limiting</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">Settings</h2>
              <p className="text-sm text-gray-500">General application settings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
