import type { RelatedItem } from '../../hooks/useGameReference';

interface RelatedItemsChipsProps {
  items?: RelatedItem[];
  onNavigate?: (item: RelatedItem) => void;
}

const TYPE_ICONS: Record<string, string> = {
  camp: '🏘️',
  mainRole: '👤',
  wolfPower: '🐺',
  villagerPower: '👤',
  elitePower: '⭐',
  secondaryRole: '🔄',
  deadRole: '👻',
  accessory: '💍',
  gadget: '🧪',
  effect: '✨',
  event: '⚡',
  sabotage: '💣',
};

export function RelatedItemsChips({ items, onNavigate }: RelatedItemsChipsProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="ref-related-chips">
      <span className="ref-related-chips__label">Voir aussi :</span>
      {items.map(item => (
        <button
          key={`${item.type}-${item.id}`}
          className="ref-related-chip"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate?.(item);
          }}
          type="button"
          title={`Aller à : ${item.label}`}
        >
          <span className="ref-related-chip__icon">{TYPE_ICONS[item.type] || '📎'}</span>
          <span className="ref-related-chip__label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
