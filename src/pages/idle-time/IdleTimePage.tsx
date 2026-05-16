import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Timer, Car, Clock, TrendingDown, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import clsx from 'clsx';
import api from '../../lib/axios';

// ── Types ─────────────────────────────────────────────────────────────────────
interface IdleEvent {
  _id:              string;
  vehicle_id:       string | null;
  imei:             string;
  start_time:       string;
  end_time:         string;
  duration_minutes: number;
  latitude:         number;
  longitude:        number;
}

interface PagedResponse {
  data:       IdleEvent[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

interface VehicleStats {
  _id:          string | null;
  totalEvents:  number;
  totalMinutes: number;
  avgDuration:  number;
  maxDuration:  number;
  lastIdle:     string;
}

interface StatsResponse {
  summary: { totalEvents: number; totalMinutes: number; avgDuration: number };
  perVehicle: VehicleStats[];
}

interface Vehicle { _id: string; vehicle_name: string; plate_number: string }

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

const DAY_OPTIONS = [
  { label: '7d',  value: 7  },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '60d', value: 60 },
];

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color = 'amber',
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    amber:  'bg-amber-50  text-amber-600  dark:bg-amber-900/20  dark:text-amber-400',
    red:    'bg-red-50    text-red-600    dark:bg-red-900/20    dark:text-red-400',
    blue:   'bg-blue-50   text-blue-600   dark:bg-blue-900/20   dark:text-blue-400',
    slate:  'bg-slate-100 text-slate-600  dark:bg-slate-700     dark:text-slate-300',
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <span className={clsx('rounded-lg p-2', colorMap[color] ?? colorMap.amber)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function IdleTimePage() {
  const [days,          setDays]          = useState(30);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [page,          setPage]          = useState(1);
  const LIMIT = 20;

  // Stats query
  const { data: stats } = useQuery<StatsResponse>({
    queryKey: ['idle-stats', days],
    queryFn: async () => {
      const { data } = await api.get(`/idle-logs/stats?days=${days}`);
      return data;
    },
  });

  // Events query
  const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
  if (vehicleFilter) params.set('vehicleId', vehicleFilter);

  const { data: events, isLoading } = useQuery<PagedResponse>({
    queryKey: ['idle-logs', vehicleFilter, page],
    queryFn: async () => {
      const { data } = await api.get(`/idle-logs?${params}`);
      return data;
    },
  });

  // Vehicles for filter dropdown
  const { data: vehiclesRes } = useQuery<{ data: Vehicle[] }>({
    queryKey: ['vehicles-all'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles?limit=200');
      return data;
    },
  });

  const vehicles   = vehiclesRes?.data ?? [];
  const summary    = stats?.summary;
  const perVehicle = stats?.perVehicle ?? [];

  // Build chart data: per-vehicle idle hours, truncate label
  const chartData = perVehicle.slice(0, 10).map((v) => {
    const match = vehicles.find((veh) => veh._id === String(v._id));
    return {
      name:    match?.vehicle_name ?? (v._id ? v._id.slice(-6) : 'Unknown'),
      plate:   match?.plate_number ?? '',
      hours:   Math.round((v.totalMinutes / 60) * 10) / 10,
      events:  v.totalEvents,
    };
  });

  const handleVehicleChange = (val: string) => { setVehicleFilter(val); setPage(1); };
  const totalIdleHours = Math.round(((summary?.totalMinutes ?? 0) / 60) * 10) / 10;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <Timer className="h-6 w-6" /> Idle Time
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Detect and analyse periods when vehicles are stationary but connected
          </p>
        </div>
        {/* Days selector for stats */}
        <div className="flex rounded-lg border border-gray-300 dark:border-slate-600 overflow-hidden">
          {DAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                days === opt.value
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Timer}        label="Idle Events"     value={summary?.totalEvents  ?? 0} sub={`last ${days} days`}                        color="amber"  />
        <StatCard icon={Clock}        label="Total Idle Time" value={`${totalIdleHours}h`}        sub="cumulative"                                  color="red"    />
        <StatCard icon={TrendingDown} label="Avg Duration"    value={fmtDuration(Math.round(summary?.avgDuration ?? 0))} sub="per idle session"    color="blue"   />
        <StatCard icon={Car}          label="Vehicles Idling" value={perVehicle.length}            sub="had idle events"                             color="slate"  />
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
            Idle Hours per Vehicle (top 10)
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" className="dark:[&>line]:stroke-slate-700" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} unit="h" />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                tickLine={false}
                width={90}
              />
              <Tooltip
                formatter={(v) => [`${v}h`, 'Idle hours']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === 0 ? '#ef4444' : i === 1 ? '#f97316' : '#f59e0b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Event log */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {/* Table header + filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-3 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Recent Idle Events</h2>
          <select
            value={vehicleFilter}
            onChange={(e) => handleVehicleChange(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-amber-400 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-gray-200"
          >
            <option value="">All Vehicles</option>
            {vehicles.map((v) => (
              <option key={v._id} value={v._id}>
                {v.vehicle_name} — {v.plate_number}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          </div>
        ) : !events?.data.length ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Timer className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-400">No idle events recorded yet.</p>
            <p className="text-xs text-gray-400">Events appear when a vehicle is stationary for 2+ minutes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Start</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">End</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Duration</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {events.data.map((ev) => {
                  const veh = vehicles.find((v) => v._id === String(ev.vehicle_id));
                  const durationColor =
                    ev.duration_minutes >= 30 ? 'text-red-600 dark:text-red-400'
                    : ev.duration_minutes >= 10 ? 'text-orange-500 dark:text-orange-400'
                    : 'text-gray-700 dark:text-gray-300';
                  return (
                    <tr key={ev._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="px-5 py-3">
                        {veh ? (
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{veh.vehicle_name}</p>
                            <p className="text-[11px] text-gray-400">{veh.plate_number}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 font-mono">{ev.imei}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {fmtDateTime(ev.start_time)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {fmtDateTime(ev.end_time)}
                      </td>
                      <td className={clsx('px-4 py-3 text-right font-semibold', durationColor)}>
                        {fmtDuration(ev.duration_minutes)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <a
                          href={mapsUrl(ev.latitude, ev.longitude)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-400 dark:hover:bg-slate-700"
                        >
                          <MapPin className="h-3 w-3" />
                          Map
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {events && events.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {events.page} of {events.totalPages} &middot; {events.total} events
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(events.totalPages, p + 1))}
                disabled={page >= events.totalPages}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
