import { Sparkles, Clock, Tag, DollarSign, Users, Zap } from 'lucide-react';

const URGENCY_STYLES = {
  high: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: 'Urgent' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', label: 'Moderate' },
  low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', label: 'Standard' }
};

export default function IntentParserPanel({ intent }) {
  if (!intent) return null;
  const style = URGENCY_STYLES[intent.urgency] || URGENCY_STYLES.low;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amazon-orange/10 rounded-lg">
          <Sparkles className="text-amazon-orange" size={24} />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-bold text-lg text-amazon-navy">{intent.intent}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border} font-medium`}>
              {style.label}
            </span>
            {intent.confidence >= 0.85 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 flex items-center gap-0.5">
                <Zap size={10} /> High confidence
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-3">{intent.summary}</p>

          {/* Extracted Slots */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            {intent.category && (
              <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                <Tag size={12} /> {intent.category.replace('_', ' ')}
              </span>
            )}
            {intent.quantity && (
              <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                <Users size={12} /> {intent.quantity} {intent.quantity > 1 ? 'people' : 'person'}
              </span>
            )}
            {intent.parsedSlots?.budget?.max && (
              <span className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded text-green-700">
                <DollarSign size={12} /> Under ${intent.parsedSlots.budget.max}
              </span>
            )}
            {intent.parsedSlots?.budget?.preference && !intent.parsedSlots?.budget?.max && (
              <span className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded text-green-700">
                <DollarSign size={12} /> {intent.parsedSlots.budget.preference}
              </span>
            )}
            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
              <Clock size={12} /> {Math.round((intent.confidence || 0.85) * 100)}% match
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
