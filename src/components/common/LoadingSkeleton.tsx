import './LoadingSkeleton.css';

interface LoadingSkeletonProps {
  type?: 'chart' | 'table' | 'text' | 'card';
  count?: number;
  height?: string;
}

/**
 * LoadingSkeleton component for better loading UX
 * Displays animated placeholder content while data is loading
 */
export function LoadingSkeleton({ 
  type = 'chart', 
  count = 1,
  height = '400px'
}: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'chart':
        return (
          <div className="loading-skeleton-chart" style={{ height }}>
            <div className="skeleton-title"></div>
            <div className="skeleton-chart-body">
              <div className="skeleton-bars">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i} 
                    className="skeleton-bar"
                    style={{ height: `${Math.random() * 60 + 40}%` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'table':
        return (
          <div className="loading-skeleton-table">
            <div className="skeleton-table-header">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton-cell"></div>
              ))}
            </div>
            {[...Array(count)].map((_, i) => (
              <div key={i} className="skeleton-table-row">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="skeleton-cell"></div>
                ))}
              </div>
            ))}
          </div>
        );
      
      case 'card':
        return (
          <div className="loading-skeleton-card">
            <div className="skeleton-card-header"></div>
            <div className="skeleton-card-content">
              <div className="skeleton-line"></div>
              <div className="skeleton-line short"></div>
            </div>
          </div>
        );
      
      case 'text':
      default:
        return (
          <div className="loading-skeleton-text">
            {[...Array(count)].map((_, i) => (
              <div 
                key={i} 
                className="skeleton-line"
                style={{ width: `${Math.random() * 30 + 70}%` }}
              ></div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="loading-skeleton">
      {renderSkeleton()}
    </div>
  );
}
