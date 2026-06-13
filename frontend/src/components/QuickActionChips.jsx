const ICONS = {
  party: '🎉', travel: '✈️', dinner: '🍳', baby: '👶', office: '💼',
  pharmacy: '💊', movie: '🎬', cleaning: '🧹', emergency: '🚨', guests: '🏠'
};

export default function QuickActionChips({ templates, onSelect, selected }) {
  return (
    <div className="flex flex-wrap gap-2">
      {templates.map(t => (
        <button
          key={t.id}
          onClick={() => onSelect(t)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all border ${
            selected?.id === t.id
              ? 'bg-amazon-orange text-white border-amazon-orange shadow-md scale-105'
              : 'bg-white text-amazon-navy border-gray-300 hover:border-amazon-orange hover:shadow-sm'
          }`}
        >
          <span>{ICONS[t.icon] || '🛒'}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}
