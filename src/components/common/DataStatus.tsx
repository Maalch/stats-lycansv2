// src/components/common/DataStatus.tsx
import { useState, useEffect } from 'react';
import { getDataFreshness } from '../../api/statsApi';

interface DataStatusProps {
  className?: string;
}

export function DataStatus({ className = '' }: DataStatusProps) {
  const [freshness, setFreshness] = useState<{
    lastUpdated: Date;
    availableEndpoints: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFreshness = async () => {
      try {
        const data = await getDataFreshness();
        setFreshness(data);
      } catch (error) {
        console.warn('Could not load data freshness info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFreshness();
  }, []);

  if (isLoading || !freshness) {
    return null;
  }

  const timeSinceUpdate = Date.now() - freshness.lastUpdated.getTime();
  const hoursSinceUpdate = Math.floor(timeSinceUpdate / (1000 * 60 * 60));
  
  const getStatusColor = () => {
    if (hoursSinceUpdate < 24) return 'text-green-600';
    if (hoursSinceUpdate < 48) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusText = () => {
    if (hoursSinceUpdate < 1) return 'Updated recently';
    if (hoursSinceUpdate < 24) return `Updated ${hoursSinceUpdate}h ago`;
    const daysSinceUpdate = Math.floor(hoursSinceUpdate / 24);
    return `Updated ${daysSinceUpdate} day${daysSinceUpdate > 1 ? 's' : ''} ago`;
  };

  return (
    <div className={`text-sm ${getStatusColor()} ${className}`}>
      <span title={`Last updated: ${freshness.lastUpdated.toLocaleString()}`}>
        📊 {getStatusText()}
      </span>
    </div>
  );
}
