import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays, ChevronLeft, ChevronRight,
  Wrench, FileText, ShieldCheck, BadgeCheck,
  AlertTriangle, Clock, CheckCircle2, Car,
} from 'lucide-react';
import clsx from 'clsx';
import api from '../../lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
type EventType   = 'service' | 'stnk' | 'kir' | 'insurance';
type EventStatus = 'overdue' | 'due-soon' | 'upcoming' | 'ok';

interface CalendarEvent {
  date:         string;   // YYYY-MM-DD
  type:         EventType;
  label:        string;
  vehicleId:    string;
  vehicle_name: string;
  plate_number: string;
  status:       EventStatus;
  daysUntil:    number;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<EventType, {
  icon: typeof Wrench;
  label: string;
  dot:   string;
  bg:    string;
  text:  string;
  border: string;
}> = {
  service:   { icon: Wrench,       label: 'Service',   dot: 'bg-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20',       text: 'text-blue-700 dark:text-blue-300',    border: 'border-blue-200 dark:border-blue-800/50'    },
  stnk:      { icon: FileText,     label: 'STNK',      dot: 'bg-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20',   text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800/50' },
  kir:       { icon: BadgeCheck,   label: 'KIR',       dot: 'bg-orange-500',  bg: 'bg-orange-50 dark:bg-orange-900/20',   text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800/50' },
  insurance: { icon: ShieldCheck,  label: 'Insurance', dot: 'bg-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-900/20',   text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800/50' },
};

const STATUS_CONFIG: Record<EventStatus, {
  badge: string;
  icon:  typeof AlertTriangle;
  label: string;
}> = {
  overdue:  { badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',       icon: AlertTriangle, label: 'Overdue'   },
  'due-soon':{ badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock,        label: 'Due Soon'  },
  upcoming: { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',    icon: CalendarDays, label: 'Upcoming'  },
  ok:       { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2, label: 'OK' },
};

const DOT_STATUS: Record<EventStatus, string> = {
  overdue:   'bg-red-500',
  'due-soon':'bg-amber-400',
  upcoming:  'bg-blue-400',
  ok:        'bg-emerald-400',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS   = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function formatDaysUntil(n: number) {
  if (n < 0)   return `${Math.abs(n)}d overdue`;
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  return `In ${n} days`;
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ ev }: { ev: CalendarEvent }) {
  const tc = TYPE_CONFIG[ev.type];
  const sc = STATUS_CONFIG[ev.status];
  const TypeIcon   = tc.icon;
  const StatusIcon = sc.icon;

  return (
    <div className={clsx(
      'flex items-start gap-3 rounded-lg border p-3 transition-colors',
      tc.bg, tc.border,
    )}>
      <div className={clsx('mt-0.5 rounded-md p-1.5 shrink-0', tc.bg)}>
        <TypeIcon className={clsx('h-4 w-4', tc.text)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={clsx('text-xs font-semibold', tc.text)}>{tc.label}</span>
          <span className={clsx('rounded-full px-1.5 py-0.5 text-[10px] font-medium flex items-center gap-0.5', sc.badge)}>
            <StatusIcon className="h-2.5 w-2.5" />
            {formatDaysUntil(ev.daysUntil)}
          </span>
        </div>
        <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white truncate">{ev.vehicle_name}</p>
        <p className="text-xs text-gray-400">{ev.plate_number}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={clsx('text-xs font-semibold', ev.status === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400')}>
          {new Date(ev.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const today     = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [typeFilter, setTypeFilter]   = useState<EventType | ''>('');

  const { data, isLoading } = useQuery<{ events: CalendarEvent[] }>({
    queryKey: ['vehicle-calendar'],
    queryFn:  async () => { const { data } = await api.get('/vehicles/calendar'); return data; },
  });

  const allEvents = data?.events ?? [];

  // ── Build day → events map ─────────────────────────────────────────────────
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of allEvents) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    return map;
  }, [allEvents]);

  // ── Events for the selected / current view ─────────────────────────────────
  const filteredAll = useMemo(() =>
    allEvents.filter((ev) => !typeFilter || ev.type === typeFilter),
  [allEvents, typeFilter]);

  const selectedEvents = useMemo(() => {
    if (!selectedDay) return [];
    return (eventsByDay.get(selectedDay) ?? []).filter((ev) => !typeFilter || ev.type === typeFilter);
  }, [selectedDay, eventsByDay, typeFilter]);

  const urgentEvents = useMemo(() =>
    filteredAll.filter((ev) => ev.status === 'overdue' || ev.status === 'due-soon'),
  [filteredAll]);

  // ── Calendar grid ──────────────────────────────────────────────────────────
  const firstDay = firstDayOfMonth(year, month);
  const totalDays = daysInMonth(year, month);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
    setSelectedDay(null);
  };

  const todayStr = today.toISOString().split('T')[0];

  // Summary counts
  const overdue  = allEvents.filter((e) => e.status === 'overdue').length;
  const dueSoon  = allEvents.filter((e) => e.status === 'due-soon').length;
  const upcoming = allEvents.filter((e) => e.status === 'upcoming').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <CalendarDays className="h-6 w-6 text-emerald-600" /> Maintenance Calendar
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Service due dates, STNK, KIR, and insurance expiries for all vehicles
        </p>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {overdue > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" /> {overdue} overdue
          </span>
        )}
        {dueSoon > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" /> {dueSoon} due within 14 days
          </span>
        )}
        {upcoming > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <CalendarDays className="h-3.5 w-3.5" /> {upcoming} upcoming (15–60 days)
          </span>
        )}
        {overdue === 0 && dueSoon === 0 && !isLoading && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> All up to date
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* ── Left: Calendar + selected day ───────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Month navigator */}
          <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            {/* Header row */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700">
              <button onClick={prevMonth}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {MONTHS[month]} {year}
              </h2>
              <button onClick={nextMonth}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Weekday labels */}
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-slate-700">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="h-20 border-b border-r border-gray-50 dark:border-slate-700/50 last:border-r-0" />;
                }

                const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const dayEvents = eventsByDay.get(dateStr) ?? [];
                const isToday   = dateStr === todayStr;
                const isSelected = dateStr === selectedDay;
                const isLastInRow = (idx + 1) % 7 === 0;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className={clsx(
                      'relative h-20 border-b border-r border-gray-100 p-1.5 text-left align-top transition-colors',
                      'dark:border-slate-700/50',
                      isLastInRow && 'border-r-0',
                      isSelected && 'bg-emerald-50 dark:bg-emerald-900/20',
                      !isSelected && 'hover:bg-gray-50 dark:hover:bg-slate-700/30',
                    )}
                  >
                    {/* Day number */}
                    <span className={clsx(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                      isToday
                        ? 'bg-emerald-600 text-white'
                        : 'text-gray-700 dark:text-gray-300',
                    )}>
                      {day}
                    </span>

                    {/* Event dots */}
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {dayEvents.slice(0, 4).map((ev, i) => (
                        <span
                          key={i}
                          title={`${ev.label} — ${ev.vehicle_name}`}
                          className={clsx(
                            'h-1.5 w-1.5 rounded-full',
                            DOT_STATUS[ev.status],
                          )}
                        />
                      ))}
                      {dayEvents.length > 4 && (
                        <span className="text-[9px] text-gray-400">+{dayEvents.length - 4}</span>
                      )}
                    </div>

                    {/* Mini event labels (only if ≤2 events) */}
                    {dayEvents.length <= 2 && dayEvents.map((ev, i) => (
                      <div key={i} className={clsx(
                        'mt-0.5 truncate rounded px-1 text-[10px] font-medium leading-4',
                        TYPE_CONFIG[ev.type].text,
                      )}>
                        {TYPE_CONFIG[ev.type].label}
                      </div>
                    ))}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected day detail */}
          {selectedDay && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {new Date(selectedDay + 'T00:00:00').toLocaleDateString('id-ID', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </h3>
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-gray-400">No events on this day.</p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((ev, i) => <EventCard key={i} ev={ev} />)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Upcoming events list ──────────────────────────────────── */}
        <div className="space-y-4">
          {/* Type filter */}
          <div className="flex flex-wrap gap-1.5">
            {(['', 'service', 'stnk', 'kir', 'insurance'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={clsx(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  typeFilter === t
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300',
                )}
              >
                {t === '' ? 'All' : TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>

          {/* Urgent panel */}
          {urgentEvents.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-white dark:border-red-800/40 dark:bg-slate-800">
              <div className="flex items-center gap-2 border-b border-red-100 px-4 py-2.5 dark:border-red-800/30">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Needs Attention ({urgentEvents.length})
                </h3>
              </div>
              <div className="space-y-2 p-3">
                {urgentEvents.map((ev, i) => <EventCard key={i} ev={ev} />)}
              </div>
            </div>
          )}

          {/* Full upcoming list */}
          <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 dark:border-slate-700">
              <Car className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                All Events ({filteredAll.length})
              </h3>
            </div>
            {isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-700" />
                ))}
              </div>
            ) : filteredAll.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <CalendarDays className="h-8 w-8 text-gray-300 dark:text-slate-600" />
                <p className="mt-2 text-xs text-gray-400">
                  {allEvents.length === 0
                    ? 'Set service dates and document expiry on your vehicles to see events here.'
                    : 'No events match the filter.'}
                </p>
              </div>
            ) : (
              <div className="max-h-[520px] overflow-y-auto space-y-2 p-3">
                {filteredAll.map((ev, i) => <EventCard key={i} ev={ev} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
