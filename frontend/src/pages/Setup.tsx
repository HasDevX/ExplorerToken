import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeSetup } from '../lib/api';
import { KNOWN_CHAINS, DEFAULT_SELECTED_CHAIN_IDS } from '../config/chains';

export function Setup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form state
  const [apiKey, setApiKey] = useState('');
  const [selectedChains, setSelectedChains] = useState<number[]>(DEFAULT_SELECTED_CHAIN_IDS);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cacheTtl, setCacheTtl] = useState(60);

  const handleChainToggle = (chainId: number) => {
    setSelectedChains((prev) =>
      prev.includes(chainId) ? prev.filter((id) => id !== chainId) : [...prev, chainId]
    );
  };

  const validateStep = (currentStep: number): boolean => {
    setError('');

    switch (currentStep) {
      case 1:
        if (!apiKey.trim()) {
          setError('API key is required');
          return false;
        }
        break;
      case 2:
        if (selectedChains.length === 0) {
          setError('Please select at least one chain');
          return false;
        }
        break;
      case 3:
        if (!adminUsername.trim()) {
          setError('Username is required');
          return false;
        }
        if (adminUsername.length < 3) {
          setError('Username must be at least 3 characters');
          return false;
        }
        if (!adminPassword) {
          setError('Password is required');
          return false;
        }
        if (adminPassword.length < 8) {
          setError('Password must be at least 8 characters');
          return false;
        }
        if (adminPassword !== confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        break;
      case 4:
        if (cacheTtl < 10) {
          setError('Cache TTL must be at least 10 seconds');
          return false;
        }
        break;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await completeSetup({
        apiKey,
        chains: selectedChains,
        adminUsername,
        adminPassword,
        cacheTtl,
      });

      // Redirect to login
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ExplorerToken Setup</h1>
        <p className="text-gray-600 mb-8">Complete the setup wizard to get started</p>

        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4].map((num) => (
            <div key={num} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {num}
              </div>
              {num < 4 && (
                <div className={`flex-1 h-1 mx-2 ${step > num ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[300px]">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 1: Etherscan API Key</h2>
              <p className="text-gray-600 mb-4">
                Enter your Etherscan API key. You can get one from{' '}
                <a
                  href="https://etherscan.io/apis"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  etherscan.io/apis
                </a>
              </p>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 2: Select Chains</h2>
              <p className="text-gray-600 mb-4">Choose which EVM chains to support</p>
              <div className="grid grid-cols-2 gap-3">
                {KNOWN_CHAINS.map((chain) => (
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
              <p className="text-sm text-gray-500 mt-4">
                Selected: {selectedChains.length} chain{selectedChains.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 3: Admin Account</h2>
              <p className="text-gray-600 mb-4">Create your admin account credentials</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password (minimum 8 characters)
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 4: Cache Configuration</h2>
              <p className="text-gray-600 mb-4">
                Set the default cache TTL (Time To Live) in seconds
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cache TTL (seconds)
                </label>
                <input
                  type="number"
                  value={cacheTtl}
                  onChange={(e) => setCacheTtl(Number(e.target.value))}
                  min="10"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Default: 60 seconds. Minimum: 10 seconds.
                </p>
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Setup Summary</h3>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• API Key: {apiKey ? '********' : 'Not set'}</li>
                  <li>• Chains: {selectedChains.length} selected</li>
                  <li>• Admin: {adminUsername}</li>
                  <li>• Cache TTL: {cacheTtl}s</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={`px-6 py-2 rounded-lg font-medium ${
              step === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Back
          </button>

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-6 py-2 rounded-lg font-medium ${
                loading
                  ? 'bg-blue-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Completing Setup...' : 'Complete Setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
