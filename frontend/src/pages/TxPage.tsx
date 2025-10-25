import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTx, getChains } from '@/lib/api';
import { ChainBadge } from '@/components/ChainBadge';
import { CopyToClipboard } from '@/components/CopyToClipboard';
import { formatTimestamp } from '@/lib/utils';

export function TxPage() {
  const { chainId, hash } = useParams<{ chainId: string; hash: string }>();
  const chainIdNum = parseInt(chainId || '1');

  const { data: chains } = useQuery({
    queryKey: ['chains'],
    queryFn: getChains,
  });

  const {
    data: tx,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['tx', chainIdNum, hash],
    queryFn: () => getTx(chainIdNum, hash!),
    enabled: !!hash,
  });

  const currentChain = chains?.find((c) => c.id === chainIdNum);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading transaction...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-red-600">Error: {(error as Error).message}</div>
      </div>
    );
  }

  if (!tx) {
    return null;
  }

  const isSuccess = tx.txreceipt_status === '1' || tx.isError === '0';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Transaction Details</h1>
            {currentChain && <ChainBadge chainId={currentChain.id} chainName={currentChain.name} />}
          </div>
          <div className="flex items-center">
            <span className="font-mono text-sm text-gray-700">{hash}</span>
            {hash && <CopyToClipboard text={hash} displayText="" />}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p className="mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {isSuccess ? 'Success' : 'Failed'}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Block Number</label>
                <p className="mt-1 text-gray-900">{tx.blockNumber}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Timestamp</label>
                <p className="mt-1 text-gray-900">{formatTimestamp(tx.timeStamp)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Confirmations</label>
                <p className="mt-1 text-gray-900">{tx.confirmations || 'N/A'}</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold mb-4">Transaction Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">From</label>
                  <div className="mt-1 flex items-center">
                    <a
                      href={`/address/${chainIdNum}/${tx.from}`}
                      className="font-mono text-sm text-blue-600 hover:underline"
                    >
                      {tx.from}
                    </a>
                    <CopyToClipboard text={tx.from} displayText="" />
                  </div>
                </div>

                {tx.to && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">To</label>
                    <div className="mt-1 flex items-center">
                      <a
                        href={`/address/${chainIdNum}/${tx.to}`}
                        className="font-mono text-sm text-blue-600 hover:underline"
                      >
                        {tx.to}
                      </a>
                      <CopyToClipboard text={tx.to} displayText="" />
                    </div>
                  </div>
                )}

                {tx.contractAddress && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Contract Address</label>
                    <div className="mt-1 flex items-center">
                      <a
                        href={`/address/${chainIdNum}/${tx.contractAddress}`}
                        className="font-mono text-sm text-blue-600 hover:underline"
                      >
                        {tx.contractAddress}
                      </a>
                      <CopyToClipboard text={tx.contractAddress} displayText="" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">Value</label>
                  <p className="mt-1 text-gray-900 font-mono">{tx.value} Wei</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold mb-4">Gas Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Gas Limit</label>
                  <p className="mt-1 text-gray-900">{tx.gas}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Gas Used</label>
                  <p className="mt-1 text-gray-900">{tx.gasUsed || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Gas Price</label>
                  <p className="mt-1 text-gray-900">{tx.gasPrice} Wei</p>
                </div>
                {tx.cumulativeGasUsed && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Cumulative Gas Used</label>
                    <p className="mt-1 text-gray-900">{tx.cumulativeGasUsed}</p>
                  </div>
                )}
              </div>
            </div>

            {tx.input && tx.input !== '0x' && (
              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold mb-4">Input Data</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-xs font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap break-all">
                    {tx.input}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
