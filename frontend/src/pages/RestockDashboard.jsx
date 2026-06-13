import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BadgeInfo,
  Bell,
  CalendarDays,
  CheckCircle2,
  Flame,
  Loader2,
  Package,
  RefreshCw,
  ShieldAlert,
  ShoppingCart,
  Sparkles
} from 'lucide-react';
import { feedback, restock } from '../api';
import { useAuthStore, useCartStore } from '../store';

const URGENCY_META = {
  CRITICAL: {
    label: 'CRITICAL',
    prompt: 'Reorder immediately',
    border: 'border-red-300',
    ring: 'ring-red-200',
    bar: 'bg-red-500',
    bg: 'bg-red-50',
    chip: 'bg-red-100 text-red-700'
  },
  WARNING: {
    label: 'WARNING',
    prompt: 'Plan restock soon',
    border: 'border-amber-300',
    ring: 'ring-amber-200',
    bar: 'bg-amber-500',
    bg: 'bg-amber-50',
    chip: 'bg-amber-100 text-amber-800'
  },
  SAFE: {
    label: 'SAFE',
    prompt: 'Monitor inventory',
    border: 'border-emerald-300',
    ring: 'ring-emerald-200',
    bar: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    chip: 'bg-emerald-100 text-emerald-700'
  }
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function clampNumber(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : localDateKey(date);
}

function normalizeItem(item) {
  const product = item.productId || {};
  const daysRemaining = Number(item.daysRemaining ?? item.days_remaining ?? 0);
  const urgencyTier = String(item.urgencyTier || item.urgency_tier || (item.urgency === 'danger' ? 'CRITICAL' : item.urgency === 'warning' ? 'WARNING' : 'SAFE')).toUpperCase();
  const totalLifespan = Number(item.totalLifespan || item.baseLifespan || item.lifespan || Math.max(daysRemaining + 1, 7));
  const quantity = Number(item.quantity || 1);
  const price = Number(product.price ?? item.price ?? 0);

  return {
    ...item,
    quantity,
    daysRemaining,
    urgencyTier: URGENCY_META[urgencyTier] ? urgencyTier : 'SAFE',
    totalLifespan,
    productId: product,
    productName: item.productName || product.name || 'Product',
    category: item.category || product.category || 'other',
    price,
    expectedFinishDate: item.expectedFinishDate || item.targetDate || null,
    progressPercent: totalLifespan > 0 ? clampNumber(((totalLifespan - daysRemaining) / totalLifespan) * 100, 0, 100) : clampNumber(100 - daysRemaining * 10, 0, 100)
  };
}

function sortItemsByUrgency(items) {
  const rank = { CRITICAL: 0, WARNING: 1, SAFE: 2 };
  return [...items].sort((a, b) => {
    const urgencyDiff = (rank[a.urgencyTier] ?? 2) - (rank[b.urgencyTier] ?? 2);
    if (urgencyDiff !== 0) return urgencyDiff;
    return a.daysRemaining - b.daysRemaining;
  });
}

function formatShortDate(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return 'Soon';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function buildMonthGrid(referenceDate, milestoneMap) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();
  const cells = [];

  for (let index = 0; index < leadingBlanks; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    const key = localDateKey(date);
    const milestones = milestoneMap.get(key) || [];
    cells.push({
      day,
      key,
      date,
      milestones,
      isToday: localDateKey(date) === localDateKey(new Date())
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function RiskCard({ item, onFeedback, busy }) {
  const meta = URGENCY_META[item.urgencyTier] || URGENCY_META.SAFE;
  const riskNote = meta.prompt;
  const priceLabel = item.price ? `$${Number(item.price).toFixed(2)}` : 'Price not set';
  const finishLabel = item.expectedFinishDate ? formatShortDate(item.expectedFinishDate) : 'Unknown';

  return (
    <article className={`rounded-3xl border bg-white shadow-sm transition hover:shadow-lg ${meta.border} ${meta.ring} ${meta.bg} ring-1`}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white bg-white shadow-sm">
            {item.productId?.image ? (
              <img src={item.productId.image} alt={item.productName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">No image</div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${meta.chip}`}>
                {meta.label}
              </span>
              <span className="text-xs text-slate-500">{item.category}</span>
            </div>

            <h3 className="mt-2 truncate text-base font-semibold text-slate-950 sm:text-lg">
              {item.productName}
            </h3>
            <p className="truncate text-sm text-slate-500">{priceLabel} · {item.quantity} unit{item.quantity === 1 ? '' : 's'}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>{riskNote}</span>
            <span>{item.daysRemaining.toFixed(1)} days remaining</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${meta.bar}`}
              style={{ width: `${clampNumber(item.progressPercent, 0, 100)}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            {item.urgencyTier === 'CRITICAL' ? (
              <ShieldAlert size={16} className="text-red-600" />
            ) : item.urgencyTier === 'WARNING' ? (
              <AlertTriangle size={16} className="text-amber-600" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-600" />
            )}
            <span>Expected out: {finishLabel}</span>
          </div>
          <span className="text-xs text-slate-400">{Math.round(item.confidence ? item.confidence * 100 : 0)}% confidence</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onFeedback(item, 'finished_early')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Flame size={15} /> Finished Early
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onFeedback(item, 'still_plenty')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <BadgeInfo size={15} /> Still Have Plenty
          </button>
        </div>
      </div>
    </article>
  );
}

function MilestoneCalendar({ cells, milestoneMap, referenceDate }) {
  const monthLabel = referenceDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
            <CalendarDays size={18} className="text-amazon-orange" /> The 30-Day Milestone Calendar Grid
          </h2>
          <p className="mt-1 text-sm text-slate-500">Predicted empty dates are marked directly on the calendar days.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{monthLabel}</span>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
        {DAY_NAMES.map((day) => (
          <div key={day} className="py-2">{day}</div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {cells.map((cell, index) => {
          if (!cell) {
            return <div key={`blank-${index}`} className="min-h-24 rounded-2xl bg-slate-50/60" />;
          }

          const topMilestone = cell.milestones[0];
          const markerMeta = topMilestone ? URGENCY_META[topMilestone.urgencyTier] || URGENCY_META.SAFE : null;

          return (
            <div
              key={cell.key}
              className={`min-h-24 rounded-2xl border p-2 transition ${cell.isToday ? 'border-amazon-orange bg-amber-50/60 ring-1 ring-amber-200' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`text-sm font-semibold ${cell.isToday ? 'text-amazon-orange' : 'text-slate-900'}`}>{cell.day}</span>
                {cell.milestones.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {cell.milestones.length}
                  </span>
                )}
              </div>

              <div className="mt-2 space-y-1.5">
                {cell.milestones.slice(0, 2).map((milestone, milestoneIndex) => {
                  const dotColor = URGENCY_META[milestone.urgencyTier]?.bar || 'bg-slate-400';
                  return (
                    <div key={`${cell.key}-${milestoneIndex}`} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                      <span className="truncate">{milestone.title || milestone.productName || 'Out of stock soon'}</span>
                    </div>
                  );
                })}

                {topMilestone && (
                  <div className={`mt-1 rounded-lg px-2 py-1 text-[10px] font-semibold ${markerMeta?.chip || 'bg-slate-100 text-slate-600'}`}>
                    {topMilestone.urgencyTier}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function RestockDashboard() {
  const navigate = useNavigate();
  const { user, householdProfile } = useAuthStore();
  const { addItem, clearCart } = useCartStore();

  const [items, setItems] = useState([]);
  const [calendarMilestones, setCalendarMilestones] = useState([]);
  const [categorySpending, setCategorySpending] = useState([]);
  const [summary, setSummary] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [feedbackBusyId, setFeedbackBusyId] = useState(null);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await restock.getDashboard();
      const rawItems = Array.isArray(data?.checklist)
        ? data.checklist
        : Array.isArray(data)
          ? data
          : data?.items || [];

      setItems(sortItemsByUrgency(rawItems.map(normalizeItem)));
      setCalendarMilestones(Array.isArray(data?.calendarMilestones) ? data.calendarMilestones : []);
      setCategorySpending(Array.isArray(data?.categorySpending) ? data.categorySpending : []);
      setSummary(data?.summary || null);
      setProfile(data?.userProfile || null);
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to load restock dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const milestoneMap = useMemo(() => {
    const map = new Map();

    for (const milestone of calendarMilestones) {
      const key = parseDateKey(milestone.date || milestone.targetDate || milestone.expectedFinishDate || milestone.day);
      if (!key) continue;

      const normalized = {
        ...milestone,
        urgencyTier: String(milestone.urgencyTier || milestone.urgency || 'SAFE').toUpperCase(),
        title: milestone.title || milestone.productName || `Out in ${milestone.dayOffset ?? milestone.daysRemaining ?? ''}`.trim(),
        items: Array.isArray(milestone.items) ? milestone.items : []
      };

      const existing = map.get(key) || [];
      existing.push(normalized);
      map.set(key, existing);
    }

    return map;
  }, [calendarMilestones]);

  const monthCells = useMemo(() => buildMonthGrid(new Date(), milestoneMap), [milestoneMap]);

  const criticalItems = useMemo(() => items.filter((item) => item.urgencyTier === 'CRITICAL'), [items]);
  const warningItems = useMemo(() => items.filter((item) => item.urgencyTier === 'WARNING'), [items]);
  const safeItems = useMemo(() => items.filter((item) => item.urgencyTier === 'SAFE'), [items]);
  const dueItems = useMemo(() => [...criticalItems, ...warningItems], [criticalItems, warningItems]);

  const dashboardUser = profile || householdProfile || {};
  const displayName = dashboardUser?.name || user?.name || 'Household';
  const householdSize = dashboardUser?.household?.size || user?.household?.size || 1;
  const monthlyBudget = dashboardUser?.monthlyBudget || user?.monthlyBudget || 150;

  const handleFeedback = async (item, type) => {
    if (!item?._id) return;

    const factor = type === 'finished_early' ? 0.85 : 1.15;
    setFeedbackBusyId(item._id);

    setItems((prev) => sortItemsByUrgency(prev.map((entry) => {
      if (entry._id !== item._id) return entry;

      const nextDays = clampNumber(Number(entry.daysRemaining) * factor, 0, 999);
      const nextTotal = Math.max(Number(entry.totalLifespan) || nextDays + 1, 1);
      const nextUrgency = nextDays <= 2 ? 'CRITICAL' : nextDays <= 5 ? 'WARNING' : 'SAFE';

      return {
        ...entry,
        daysRemaining: Math.round(nextDays * 100) / 100,
        urgencyTier: nextUrgency,
        urgency: nextUrgency === 'CRITICAL' ? 'danger' : nextUrgency === 'WARNING' ? 'warning' : 'safe',
        progressPercent: clampNumber(((nextTotal - nextDays) / nextTotal) * 100, 0, 100)
      };
    })));

    try {
      await feedback.send({
        type: 'restock',
        accepted: type === 'still_plenty',
        restockItemId: item._id,
        productId: item.productId?._id || item.productId,
        reason: type === 'finished_early' ? 'Finished Early' : 'Still Have Plenty'
      });
    } catch (err) {
      console.error('Feedback update failed', err);
    } finally {
      setFeedbackBusyId(null);
    }
  };

  const handleSmartBundleReorder = async () => {
    const bundleTargets = dueItems.filter((item) => item.productId);
    if (bundleTargets.length === 0) return;

    setBundleLoading(true);
    try {
      clearCart();
      bundleTargets.forEach((item) => {
        addItem(item.productId, item.quantity || 1);
      });
      const fastestEta = bundleTargets.reduce((min, item) => {
        const minutes = parseInt(item.productId?.deliveryETA, 10) || 60;
        return minutes < min ? minutes : min;
      }, 60);
      useCartStore.setState({ eta: `${fastestEta} mins` });
      navigate('/checkout');
    } finally {
      setBundleLoading(false);
    }
  };

  const averageDaysRemaining = items.length
    ? (items.reduce((sum, item) => sum + Number(item.daysRemaining || 0), 0) / items.length).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-[calc(100vh-120px)] bg-[radial-gradient(circle_at_top,_rgba(255,153,0,0.12),_transparent_30%),linear-gradient(180deg,#fefefe_0%,#f5f7fb_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amazon-orange">
                <Sparkles size={13} /> Predictive Inventory Tracking
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">Restock Dashboard</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base">
                Track household consumables, learn from feedback, and build bundles before you run out.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSmartBundleReorder}
                disabled={bundleLoading || dueItems.length === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-amazon-orange px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amazon-orange-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bundleLoading ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
                Smart Bundle Reorder
                <ArrowRight size={16} />
              </button>

              <Link to="/restock/calendar" className="amazon-btn inline-flex items-center gap-2 text-sm">
                <CalendarDays size={16} /> Calendar
              </Link>
              <Link to="/restock/analytics" className="amazon-btn inline-flex items-center gap-2 text-sm">
                <BarChart3 size={16} /> Analytics
              </Link>
              <Link to="/restock/notifications" className="amazon-btn inline-flex items-center gap-2 text-sm">
                <Bell size={16} /> Alerts
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Critical</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{criticalItems.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Warning</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{warningItems.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Safe</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{safeItems.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Avg. Days Left</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{averageDaysRemaining}</p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Loader2 size={36} className="animate-spin text-amazon-orange" />
              <p className="text-sm font-medium">Loading predictive inventory dashboard…</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
            <p className="font-semibold">Unable to load dashboard</p>
            <p className="mt-1 text-sm">{error}</p>
            <button type="button" onClick={loadDashboard} className="amazon-btn-primary mt-4 inline-flex items-center gap-2">
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">No tracked consumables yet</h2>
            <p className="mt-2 text-sm text-slate-500">Your restock dashboard will populate once items are added from AI shopping.</p>
            <Link to="/ai" className="amazon-btn-primary mt-5 inline-flex items-center gap-2">
              <Sparkles size={16} /> Go to AI Shopping
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-2">
                {sortItemsByUrgency(items).map((item) => (
                  <RiskCard
                    key={item._id}
                    item={item}
                    busy={feedbackBusyId === item._id}
                    onFeedback={handleFeedback}
                  />
                ))}
              </div>
            </section>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-lg font-semibold text-slate-950">
                  <ShieldAlert size={18} className="text-amazon-orange" /> Urgency Meter Checklist Grid
                </div>
                <p className="mt-1 text-sm text-slate-500">Actionable snapshot of every tracked household consumable.</p>

                <div className="mt-4 space-y-3">
                  {sortItemsByUrgency(items).map((item) => {
                    const meta = URGENCY_META[item.urgencyTier] || URGENCY_META.SAFE;
                    return (
                      <div key={`list-${item._id}`} className={`rounded-2xl border p-3 ${meta.bg} ${meta.border}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{item.productName}</p>
                            <p className="text-xs text-slate-500">{item.category} · {item.daysRemaining.toFixed(1)} days remaining</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${meta.chip}`}>{meta.label}</span>
                        </div>
                        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/70">
                          <div className={`h-full rounded-full transition-all ${meta.bar}`} style={{ width: `${clampNumber(item.progressPercent, 0, 100)}%` }} />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                          <span>{meta.prompt}</span>
                          <span>{Math.round(item.progressPercent)}% depleted</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <MilestoneCalendar
                cells={monthCells}
                milestoneMap={milestoneMap}
                referenceDate={new Date()}
              />

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-lg font-semibold text-slate-950">
                  <BarChart3 size={18} className="text-amazon-orange" /> Category Spending Summary
                </div>
                <p className="mt-1 text-sm text-slate-500">Bar chart breakdown from the backend dashboard payload.</p>

                <div className="mt-4 space-y-3">
                  {(categorySpending.length > 0 ? categorySpending : []).map((entry) => (
                    <div key={entry.category}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700 capitalize">{entry.category}</span>
                        <span className="text-slate-500">${Number(entry.totalSpend || 0).toFixed(2)}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-amazon-orange" style={{ width: `${clampNumber(entry.bar || entry.share || 0, 0, 100)}%` }} />
                      </div>
                    </div>
                  ))}

                  {categorySpending.length === 0 && (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No category spending summary available yet.</div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#fff,#fff8ef)] p-5 shadow-sm">
                <div className="flex items-center gap-2 text-lg font-semibold text-slate-950">
                  <BadgeInfo size={18} className="text-amazon-orange" /> Household Snapshot
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</p>
                    <p className="mt-1 font-semibold text-slate-900">{displayName}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Household Size</p>
                    <p className="mt-1 font-semibold text-slate-900">{householdSize}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Budget</p>
                    <p className="mt-1 font-semibold text-slate-900">${Number(monthlyBudget).toFixed(2)}</p>
                  </div>
                </div>
                {summary && (
                  <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                    <p className="text-sm font-semibold text-slate-800">30-day summary</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-600 sm:grid-cols-4">
                      <span>Critical: {summary.criticalCount ?? criticalItems.length}</span>
                      <span>Warning: {summary.warningCount ?? warningItems.length}</span>
                      <span>Safe: {summary.safeCount ?? safeItems.length}</span>
                      <span>Spend: ${Number(summary.estimatedSpend ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
