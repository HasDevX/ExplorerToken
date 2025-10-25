interface ChainBadgeProps {
  chainId: number;
  chainName: string;
}

export function ChainBadge({ chainId, chainName }: ChainBadgeProps) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      {chainName} ({chainId})
    </span>
  );
}
