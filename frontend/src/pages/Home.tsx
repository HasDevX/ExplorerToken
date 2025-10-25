import { useQuery } from '@tanstack/react-query';
import { getChains } from '@/lib/api';
import { SearchBar } from '@/components/SearchBar';

export function Home() {
  const {
    data: chains,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['chains'],
    queryFn: getChains,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading chains...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Error loading chains: {(error as Error).message}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">ExplorerToken</h1>
          <p className="text-lg text-gray-600">Multi-chain Token Explorer</p>
        </div>

        <div className="mb-8">{chains && <SearchBar chains={chains} />}</div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Supported Chains</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {chains?.map((chain) => (
                <div
                  key={chain.id}
                  className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
                >
                  <div className="font-medium text-gray-900">{chain.name}</div>
                  <div className="text-sm text-gray-500">Chain ID: {chain.id}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
