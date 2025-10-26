import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTransfers, getTokenInfo, getChains, getHolders } from '@/lib/api';
import { TabLayout } from '@/components/TabLayout';
import { ChainBadge } from '@/components/ChainBadge';
import { CopyToClipboard } from '@/components/CopyToClipboard';
import { shortenHex, formatTimestamp } from '@/lib/utils';

export function AddressPage() {
  const { chainId, address } = useParams<{ chainId: string; address: string }>();
  const [activeTab, setActiveTab] = useState('transfers');
  const [page, setPage] = useState(1);
  const [offset] = useState(25);

  const chainIdNum = parseInt(chainId || '1');

  const { data: chains } = useQuery({
    queryKey: ['chains'],
    queryFn: getChains,
  });

  const {
    data: transfers,
    isLoading: transfersLoading,
    error: transfersError,
  } = useQuery({
    queryKey: ['transfers', chainIdNum, address, page, offset],
    queryFn: () => getTransfers(chainIdNum, address!, { page, offset, sort: 'desc' }),
    enabled: !!address && activeTab === 'transfers',
  });

  const {
    data: tokenInfo,
    isLoading: infoLoading,
    error: infoError,
  } = useQuery({
    queryKey: ['tokenInfo', chainIdNum, address],
    queryFn: () => getTokenInfo(chainIdNum, address!),
    enabled: !!address && activeTab === 'info',
  });

  const {
    data: holders,
    isLoading: holdersLoading,
    error: holdersError,
  } = useQuery({
    queryKey: ['holders', chainIdNum, address, page, offset],
    queryFn: () => getHolders(chainIdNum, address!, { page, offset }),
    enabled: !!address && activeTab === 'holders',
  });

  const currentChain = chains?.find((c) => c.id === chainIdNum);

  const tabs = [
    { id: 'transfers', label: 'Transfers' },
    { id: 'info', label: 'Token Info' },
    { id: 'holders', label: 'Holders' },
    { id: 'contract', label: 'Contract', disabled: true },
    { id: 'analytics', label: 'Analytics', disabled: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Address Details</h1>
            {currentChain && <ChainBadge chainId={currentChain.id} chainName={currentChain.name} />}
          </div>
          <div className="flex items-center text-gray-700">
            <span className="font-mono text-sm">{address}</span>
            {address && <CopyToClipboard text={address} displayText="" />}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <TabLayout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
            {activeTab === 'transfers' && (
              <div>
                {transfersLoading && <div className="text-gray-600">Loading transfers...</div>}
                {transfersError && (
                  <div className="text-red-600">Error: {(transfersError as Error).message}</div>
                )}
                {transfers && (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Tx Hash
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              From
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              To
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Value
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Token
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {transfers.data.map((transfer, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                                <a
                                  href={`/tx/${chainIdNum}/${transfer.hash}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {shortenHex(transfer.hash)}
                                </a>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatTimestamp(transfer.timeStamp)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                                {shortenHex(transfer.from)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                                {shortenHex(transfer.to)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {transfer.value}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {transfer.tokenSymbol || 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-gray-600">Page {page}</span>
                      <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={transfers.data.length < offset}
                        className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'info' && (
              <div>
                {infoLoading && <div className="text-gray-600">Loading token info...</div>}
                {infoError && (
                  <div className="text-red-600">Error: {(infoError as Error).message}</div>
                )}
                {tokenInfo && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Token Name</label>
                        <p className="text-gray-900">{tokenInfo.tokenName || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Symbol</label>
                        <p className="text-gray-900">{tokenInfo.symbol || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Total Supply</label>
                        <p className="text-gray-900">{tokenInfo.totalSupply || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Token Type</label>
                        <p className="text-gray-900">{tokenInfo.tokenType || 'N/A'}</p>
                      </div>
                      {tokenInfo.description && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-500">Description</label>
                          <p className="text-gray-900">{tokenInfo.description}</p>
                        </div>
                      )}
                    </div>
                    {(tokenInfo.website || tokenInfo.twitter || tokenInfo.github) && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-2">
                          Links
                        </label>
                        <div className="flex gap-4">
                          {tokenInfo.website && (
                            <a
                              href={tokenInfo.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Website
                            </a>
                          )}
                          {tokenInfo.twitter && (
                            <a
                              href={tokenInfo.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Twitter
                            </a>
                          )}
                          {tokenInfo.github && (
                            <a
                              href={tokenInfo.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              GitHub
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'holders' && (
              <div>
                {holdersLoading && <div className="text-gray-600">Loading holders...</div>}
                {holdersError && (
                  <div className="space-y-4">
                    <div className="text-red-600">Error: {(holdersError as Error).message}</div>
                    {holdersError instanceof Error &&
                      'response' in holdersError &&
                      (holdersError as { response?: { status?: number } }).response?.status ===
                        429 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-yellow-800 text-sm font-semibold mb-1">
                            ⚠️ Rate Limit Exceeded
                          </p>
                          <p className="text-yellow-700 text-sm">
                            Please wait a moment before trying again. You can also try refreshing
                            the page in a few seconds.
                          </p>
                        </div>
                      )}
                  </div>
                )}
                {holders && holders.unavailable && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800 text-sm font-semibold mb-1">
                        ℹ️ Feature Not Available
                      </p>
                      <p className="text-blue-700 text-sm">
                        {holders.reason ||
                          'Holders information is not available for this chain or plan.'}
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Rank
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Address
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Balance (Raw)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Percentage
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                              No data available
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {holders && !holders.unavailable && holders.result.length === 0 && (
                  <div className="text-gray-600">No holders found for this token.</div>
                )}
                {holders && !holders.unavailable && holders.result.length > 0 && (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Rank
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Address
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Balance (Raw)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Percentage
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {holders.result.map((holder, idx) => (
                            <tr key={holder.address} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {(page - 1) * offset + idx + 1}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                                <div className="flex items-center">
                                  <span>{shortenHex(holder.address)}</span>
                                  <CopyToClipboard text={holder.address} displayText="" />
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                {holder.balanceRaw}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {holder.percent !== undefined
                                  ? `${holder.percent.toFixed(2)}%`
                                  : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-gray-600">Page {page}</span>
                      <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={holders.result.length < offset}
                        className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </TabLayout>
        </div>
      </div>
    </div>
  );
}
