import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Activity, Car, Navigation, TrendingUp, BarChart2 } from 'lucide-react';
import clsx from 'clsx';
import api from '../../lib/axios';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Summary {
  totalDistanceKm: number;
  activeVehicles:  number;
  avgActivePerDay: number;
  utilizationRate: number;
}

interface DayPoint {
  date:           string;
  activeVehicles: number;
}

interface VehicleBreakdown {
  vehicleId:      string;
  vehicleName:    string;
  plateNumber:    string;
  totalDistKm:    number;
  activeDays:     number;
  utilizationPct: number;
  avgSpeedKmh:    number;
  maxSpeedKmh:    number;
}

interface HeatCell {
  hour:  number;
  dow:   number;   // 1=Sun … 7=Sat
  day:   string;
  count: number;
}

interface UtilizationData {
  summary:          Summary;
  dailyTrend:       DayPoint[];
  vehicleBreakdown: VehicleBreakdown[];
  hourlyHeatmap:    HeatCell[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const DAY_OPTIONS: Array<{ label: string; value: number }> = [
  { label: '7d',  value: 7  },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '60d', value: 60 },
];

const DOW_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DOW_MAP: Record<string, number> = { Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6, Sat: 7 };

// ── Helpers ───────────────────────────────────────────────────────────────────
function heatColor(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return '';
  const ratio = Math.min(count / maxCount, 1);
  // emerald-100 → emerald-600
  if (ratio < 0.2)  return 'bg-emerald-100 dark:bg-emerald-900/20';
  if (ratio < 0.4)  return 'bg-emerald-200 dark:bg-emerald-800/40';
  if (ratio < 0.6)  return 'bg-emerald-300 dark:bg-emerald-700/60';
  if (ratio < 0.8)  return 'bg-emerald-400 dark:bg-emerald-600/80';
  return 'bg-emerald-500 dark:bg-emerald-500';
}

function StatCard({
  icon: Icon, label, value, sub, color = 'emerald',
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    blue:    'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    purple:  'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    orange:  'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <span className={clsx('rounded-lg p-2', colorMap[color] ?? colorMap.emerald)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UtilizationPage() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery<UtilizationData>({
    queryKey: ['utilization', days],
    queryFn: async () => {
      const { data } = await api.get(`/dashboard/utilization?days=${days}`);
      return data;
    },
  });

  // Build heatmap lookup: [dow][hour] → count
  const heatmap = data?.hourlyHeatmap ?? [];
  const maxHeatCount = heatmap.reduce((m, c) => Math.max(m, c.count), 0);
  const heatLookup = new Map<string, number>(
    heatmap.map((c) => [`${c.dow}-${c.hour}`, c.count]),
  );

  // Format daily trend x-axis label
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const summary = data?.summary;
  const trend   = data?.dailyTrend       ?? [];
  const breakdown = data?.vehicleBreakdown ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <BarChart2 className="h-6 w-6" /> Fleet Utilization
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor how your fleet is being used over time
          </p>
        </div>

        {/* Day selector */}
        <div className="flex rounded-lg border border-gray-300 dark:border-slate-600 overflow-hidden">
          {DAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                days === opt.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={Navigation}
              label="Total Distance"
              value={`${(summary?.totalDistanceKm ?? 0).toLocaleString()} km`}
              sub={`last ${days} days`}
              color="emerald"
            />
            <StatCard
              icon={Car}
              label="Active Vehicles"
              value={summary?.activeVehicles ?? 0}
              sub="had GPS activity"
              color="blue"
            />
            <StatCard
              icon={Activity}
              label="Avg Active / Day"
              value={summary?.avgActivePerDay ?? 0}
              sub="vehicles per day"
              color="purple"
            />
            <StatCard
              icon={TrendingUp}
              label="Utilization Rate"
              value={`${summary?.utilizationRate ?? 0}%`}
              sub="of fleet active"
              color="orange"
            />
          </div>

          {/* Daily trend */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
              Active Vehicles per Day
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-slate-700" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  interval={Math.max(1, Math.floor(trend.length / 10) - 1)}
                />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [`${v ?? 0} vehicles`, 'Active']}
                  labelFormatter={(l) => formatDate(l)}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="activeVehicles"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#utilGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Heatmap + table */}
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Hourly activity heatmap */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                Activity by Hour &amp; Day
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr>
                      <th className="w-8 pr-1 text-right text-gray-400 font-normal" />
                      {Array.from({ length: 24 }, (_, h) => (
                        <th key={h} className="w-5 pb-1 text-center text-gray-400 font-normal">
                          {h % 3 === 0 ? h : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DOW_ORDER.map((day) => {
                      const dow = DOW_MAP[day];
                      return (
                        <tr key={day}>
                          <td className="pr-1 py-0.5 text-right text-gray-400">{day}</td>
                          {Array.from({ length: 24 }, (_, h) => {
                            const count = heatLookup.get(`${dow}-${h}`) ?? 0;
                            return (
                              <td key={h} className="py-0.5">
                                <div
                                  title={`${day} ${h}:00 — ${count} pts`}
                                  className={clsx(
                                    'mx-auto h-4 w-4 rounded-sm',
                                    count === 0
                                      ? 'bg-gray-100 dark:bg-slate-700'
                                      : heatColor(count, maxHeatCount),
                                  )}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* Legend */}
                <div className="mt-3 flex items-center gap-1 text-[10px] text-gray-400">
                  <span>Less</span>
                  {['bg-gray-100 dark:bg-slate-700', 'bg-emerald-100', 'bg-emerald-200', 'bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500'].map((c, i) => (
                    <div key={i} className={clsx('h-3.5 w-3.5 rounded-sm', c)} />
                  ))}
                  <span>More</span>
                </div>
              </div>
            </div>

            {/* Vehicle breakdown */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
              <div className="border-b border-gray-200 px-5 py-3 dark:border-slate-700">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Vehicle Breakdown
                </h2>
              </div>
              {breakdown.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Car className="h-8 w-8 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-400">No activity in this period</p>
                </div>
              ) : (
                <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white dark:bg-slate-800">
                      <tr className="border-b border-gray-100 dark:border-slate-700">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Vehicle</th>
                        <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Distance</th>
                        <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Active Days</th>
                        <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                      {breakdown.map((v) => (
                        <tr key={v.vehicleId} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <Car className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white leading-none">{v.vehicleName}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{v.plateNumber}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium text-gray-700 dark:text-gray-200">
                            {v.totalDistKm.toLocaleString()} km
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-500 dark:text-gray-400">
                            {v.activeDays}d
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span
                              className={clsx(
                                'inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                                v.utilizationPct >= 70
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : v.utilizationPct >= 40
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                              )}
                            >
                              {v.utilizationPct}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
