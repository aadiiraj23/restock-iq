import { TrendingDown, Droplets } from 'lucide-react';

const URGENCY_COLORS = {
  danger: { bar: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'Reorder now' },
  warning: { bar: 'bg-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'Running low' },
  safe: { bar: 'bg-green-500', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: 'Well stocked' }
};

export default function RestockCard({ item, onReorder, onFeedback }) {
  const product = item.productId || {};
  const style = URGENCY_COLORS[item.urgency] || URGENCY_COLORS.safe;
  const maxDays = item.totalLifespan || 30;
  const pct = Math.min(100, ((maxDays - item.daysRemaining) / maxDays) * 100);

  return (
    <div className={`rounded-lg border p-4 ${style.bg} ${style.border}`}>
      <div className="flex gap-3">
        <img src={product.image} alt="" className="w-16 h-16 object-contain bg-white rounded" />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{product.name || 'Product'}</h3>
          <p className={`text-xs font-bold mt-0.5 ${style.text}`}>{style.label}</p>
          <p className="text-2xl font-bold mt-1">{item.daysRemaining}<span className="text-sm font-normal text-gray-500"> days left</span></p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${style.bar}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-gray-500">Finish: {new Date(item.expectedFinishDate).toLocaleDateString()}</p>
          {item.confidence && (
            <p className="text-xs text-gray-400">{Math.round(item.confidence * 100)}% confidence</p>
          )}
        </div>
      </div>

      {/* Prediction Details (new from ML engine) */}
      {(item.dailyRate || item.depletionModel || item.feedbackLearned) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {item.dailyRate > 0 && (
            <span className="text-xs bg-white/70 px-2 py-0.5 rounded flex items-center gap-1">
              <Droplets size={10} /> {item.dailyRate}%/day
            </span>
          )}
          {item.depletionModel && item.depletionModel !== 'linear' && (
            <span className="text-xs bg-white/70 px-2 py-0.5 rounded flex items-center gap-1">
              <TrendingDown size={10} /> {item.depletionModel}
            </span>
          )}
          {item.feedbackLearned && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">🧠 Learned</span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-3">
        <button onClick={() => onReorder?.(item)} className="amazon-btn-primary flex-1 text-xs py-1.5">
          Reorder ${product.price?.toFixed(2) || ''}
        </button>
        <button
          onClick={() => onFeedback?.(item._id, 'finished_early')}
          className="text-xs border rounded px-2 py-1 hover:bg-white"
          title="Finished earlier than predicted — AI will learn"
        >👎 Early</button>
        <button
          onClick={() => onFeedback?.(item._id, 'still_plenty')}
          className="text-xs border rounded px-2 py-1 hover:bg-white"
          title="Still have plenty — AI will learn"
        >👍 Plenty</button>
      </div>

      {/* Feedback count badge */}
      {item.feedbackHistory?.length > 0 && (
        <p className="text-xs text-gray-400 mt-2 text-right">
          {item.feedbackHistory.length} feedback signal{item.feedbackHistory.length > 1 ? 's' : ''} recorded
        </p>
      )}
    </div>
  );
}
