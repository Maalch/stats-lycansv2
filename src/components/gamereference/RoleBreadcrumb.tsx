interface RoleBreadcrumbProps {
  campName?: string;
  campEmoji?: string;
  onBackToOverview: () => void;
}

export function RoleBreadcrumb({ campName, campEmoji, onBackToOverview }: RoleBreadcrumbProps) {
  if (!campName) return null;

  return (
    <nav className="ref-breadcrumb" aria-label="Navigation de référence">
      <button
        className="ref-breadcrumb__item ref-breadcrumb__item--link"
        onClick={onBackToOverview}
        type="button"
      >
        📖 Référence
      </button>
      <span className="ref-breadcrumb__separator">›</span>
      <span className="ref-breadcrumb__item ref-breadcrumb__item--current">
        {campEmoji} {campName}
      </span>
    </nav>
  );
}
