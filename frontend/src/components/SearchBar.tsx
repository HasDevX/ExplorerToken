import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isEthAddress, isTxHash } from '@/lib/utils';
import type { Chain } from '@/lib/validators';

interface SearchBarProps {
  chains: Chain[];
}

export function SearchBar({ chains }: SearchBarProps) {
  const [selectedChainId, setSelectedChainId] = useState<number>(chains[0]?.id || 1);
  const [searchInput, setSearchInput] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();

    if (!trimmed) {
      return;
    }

    if (isEthAddress(trimmed)) {
      navigate(`/address/${selectedChainId}/${trimmed}`);
    } else if (isTxHash(trimmed)) {
      navigate(`/tx/${selectedChainId}/${trimmed}`);
    } else {
      alert('Invalid input. Please enter a valid address (0x + 40 hex) or tx hash (0x + 64 hex)');
    }
  };

  return (
    <form onSubmit={handleSearch} className="w-full max-w-4xl mx-auto">
      <div className="flex gap-2">
        <select
          value={selectedChainId}
          onChange={(e) => setSelectedChainId(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {chains.map((chain) => (
            <option key={chain.id} value={chain.id}>
              {chain.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Enter address (0x...) or tx hash (0x...)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Search
        </button>
      </div>
    </form>
  );
}
