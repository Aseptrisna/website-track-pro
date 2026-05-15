import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  Gauge,
  Car,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
} from 'lucide-react';
import api from '../../lib/axios';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

// ── Types ────────────────────────────────────────────────────────────────────

interface VehicleInfo {
  vehicle_name: string;
  plate_number: string;
}

interface ViolationStats {
  summary: {
    total: number;
    avgExcess: number;
    maxSpeed: number;
    severe: number;
    moderate: number;
    mild: number;
  };
  trend: { date: string; total: number; mild: number; moderate: number; severe: number }[];
  byVehicle: {
    _id: string;
    count: number;
    avgExcess: number;
    severe: number;
    moderate: number;
    mild: number;
    vehicle_info?: VehicleInfo;
  }[];
  bySeverity: { mild?: number; moderate?: number; severe?: number };
}

interface ViolationRecord {
  _id: string;
  vehicle?: string;
  imei: string;
  timestamp: string;
  speed: number;
  speed_limit: number;
  excess: number;
  severity: 'mild' | 'moderate' | 'severe';
  latitude?: number;
  longitude?: number;
  vehicle_info?: VehicleInfo;
}

interface ViolationList {
  data: ViolationRecord[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface Vehicle {
  _id: string;
  vehicle_name: string;
  plate_number: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  mild: { label: 'Mild', color: '#f59e0b', bg: 'bg-amber-100', text: 'text-amber-800' },
  moderate: { label: 'Moderate', color: '#f97316', bg: 'bg-orange-100', text: 'text-orange-800' },
  severe: { label: 'Severe', color: '#ef4444', bg: 'bg-red-100', text: 'text-red-800' },
};

const DAY_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

function SeverityBadge({ severity }: { severity: 'mild' | 'moderate' | 'severe' }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {severity === 'severe' && <Flame className="h-3 w-3" />}
      {severity === 'moderate' && <AlertTriangle className="h-3 w-3" />}
      {cfg.label}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SafetyPage() {
  const [days, setDays] = useState(30);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [page, setPage] = useState(1);

  // Fetch vehicles for filter
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles-list'],
    queryFn: () => api.get('/vehicles').then((r: any) => r.data?.data ?? r.data ?? []),
  });

  // Stats
  const { data: stats, isLoading: statsLoading } = useQuery<ViolationStats>({
    queryKey: ['violations-stats', days, selectedVehicle],
    queryFn: () =>
      api
        .get('/violations/stats', { params: { days, vehicleId: selectedVehicle || undefined } })
        .then((r: any) => r.data),
  });

  // Violations list
  const { data: listData, isLoading: listLoading } = useQuery<ViolationList>({
    queryKey: ['violations-list', selectedVehicle, severityFilter, page],
    queryFn: () =>
      api
        .get('/violations', {
          params: {
            vehicleId: selectedVehicle || undefined,
            severity: severityFilter || undefined,
            page,
            limit: 15,
          },
        })
        .then((r: any) => r.data),
    placeholderData: (prev) => prev,
  });

  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Mild', value: stats.summary.mild, color: SEVERITY_CONFIG.mild.color },
      { name: 'Moderate', value: stats.summary.moderate, color: SEVERITY_CONFIG.moderate.color },
      { name: 'Severe', value: stats.summary.severe, color: SEVERITY_CONFIG.severe.color },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const worstVehicle = stats?.byVehicle[0];

  function exportCSV() {
    const rows = listData?.data ?? [];
    const header = ['Timestamp', 'Vehicle', 'Plate', 'Speed (km/h)', 'Limit (km/h)', 'Excess (km/h)', 'Severity'];
    const lines = rows.map((r) => [
      format(parseISO(r.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      r.vehicle_info?.vehicle_name ?? r.imei,
      r.vehicle_info?.plate_number ?? '-',
      r.speed,
      r.speed_limit,
      r.excess,
      r.severity,
    ]);
    const csv = [header, ...lines].map((l) => l.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `violations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Custom tooltip for stacked bar
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-slate-600 dark:bg-slate-800">
        <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: p.fill }} />
            <span className="text-gray-600 dark:text-gray-400">{p.name}:</span>
            <span className="font-semibold">{p.value}</span>
          </div>
        ))}
        <div className="mt-1 border-t border-gray-100 pt-1 text-xs font-semibold dark:border-slate-600">
          Total: {payload.reduce((s: number, p: any) => s + p.value, 0)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
            <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Safety & Violations</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Speed violation analytics and history</p>
          </div>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Vehicle filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setSelectedVehicle(''); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !selectedVehicle
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
            }`}
          >
            All Vehicles
          </button>
          {vehicles.map((v) => (
            <button
              key={v._id}
              onClick={() => { setSelectedVehicle(v._id); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedVehicle === v._id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
              }`}
            >
              {v.vehicle_name}
            </button>
          ))}
        </div>

        {/* Day range */}
        <div className="ml-auto flex gap-1">
          {DAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                days === opt.value
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<ShieldAlert className="h-5 w-5 text-red-500" />}
          label="Total Violations"
          value={statsLoading ? '—' : (stats?.summary.total ?? 0).toString()}
          sub={`Last ${days} days`}
          color="red"
        />
        <StatCard
          icon={<Flame className="h-5 w-5 text-orange-500" />}
          label="Severe Violations"
          value={statsLoading ? '—' : (stats?.summary.severe ?? 0).toString()}
          sub={`${stats?.summary.moderate ?? 0} moderate, ${stats?.summary.mild ?? 0} mild`}
          color="orange"
        />
        <StatCard
          icon={<Gauge className="h-5 w-5 text-amber-500" />}
          label="Max Speed Recorded"
          value={statsLoading ? '—' : `${Math.round(stats?.summary.maxSpeed ?? 0)} km/h`}
          sub={`Avg ${Math.round(stats?.summary.avgExcess ?? 0)} km/h over limit`}
          color="amber"
        />
        <StatCard
          icon={<Car className="h-5 w-5 text-purple-500" />}
          label="Most Violations"
          value={
            statsLoading
              ? '—'
              : worstVehicle?.vehicle_info?.vehicle_name ?? (worstVehicle ? 'Unknown' : 'None')
          }
          sub={worstVehicle ? `${worstVehicle.count} violations` : 'No data'}
          color="purple"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trend chart */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Violations Trend — Last {days} Days
          </h3>
          {statsLoading ? (
            <div className="h-52 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-700" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats?.trend ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => {
                    try { return format(parseISO(v), 'd MMM', { locale: id }); } catch { return v; }
                  }}
                  interval={Math.floor((days - 1) / 8)}
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="mild" name="Mild" stackId="a" fill={SEVERITY_CONFIG.mild.color} radius={[0, 0, 0, 0]} />
                <Bar dataKey="moderate" name="Moderate" stackId="a" fill={SEVERITY_CONFIG.moderate.color} />
                <Bar dataKey="severe" name="Severe" stackId="a" fill={SEVERITY_CONFIG.severe.color} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Severity pie */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Severity Breakdown</h3>
          {statsLoading ? (
            <div className="h-52 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-700" />
          ) : pieData.length === 0 ? (
            <div className="flex h-52 flex-col items-center justify-center text-gray-400">
              <ShieldAlert className="mb-2 h-10 w-10 opacity-30" />
              <span className="text-sm">No violations</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} violations`, '']} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {/* counts */}
          {!statsLoading && (
            <div className="mt-2 space-y-1.5">
              {(['severe', 'moderate', 'mild'] as const).map((s) => {
                const cfg = SEVERITY_CONFIG[s];
                const count = stats?.summary[s] ?? 0;
                const total = stats?.summary.total ?? 1;
                return (
                  <div key={s} className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${total ? (count / total) * 100 : 0}%`, background: cfg.color }}
                      />
                    </div>
                    <span className="w-6 text-right text-gray-600 dark:text-gray-400">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* By vehicle ranking */}
      {!statsLoading && (stats?.byVehicle?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Violations by Vehicle</h3>
          <div className="space-y-3">
            {stats!.byVehicle.map((v, i) => {
              const maxCount = stats!.byVehicle[0]?.count ?? 1;
              const name = v.vehicle_info?.vehicle_name ?? `Device (unknown)`;
              const plate = v.vehicle_info?.plate_number ?? '—';
              return (
                <div key={v._id ?? i} className="flex items-center gap-3">
                  <span className="w-5 text-right text-xs font-bold text-gray-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                        {name}
                        <span className="ml-1.5 text-xs text-gray-400">{plate}</span>
                      </span>
                      <div className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
                        <span className="text-red-500 font-semibold">{v.severe}S</span>
                        <span className="text-orange-500 font-semibold">{v.moderate}M</span>
                        <span className="text-amber-500 font-semibold">{v.mild}L</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300">{v.count}</span>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-red-500 transition-all"
                        style={{ width: `${(v.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-gray-400">S = Severe  M = Moderate  L = Mild (low)</p>
        </div>
      )}

      {/* Violations table */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {/* Table header + severity filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Violation Records
            {listData && (
              <span className="ml-2 text-xs font-normal text-gray-400">({listData.total} total)</span>
            )}
          </h3>
          <div className="flex gap-1.5">
            {['', 'mild', 'moderate', 'severe'].map((s) => (
              <button
                key={s}
                onClick={() => { setSeverityFilter(s); setPage(1); }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  severityFilter === s
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
                }`}
              >
                {s === '' ? 'All' : SEVERITY_CONFIG[s as 'mild' | 'moderate' | 'severe'].label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/50">
                {['Timestamp', 'Vehicle', 'Speed', 'Limit', 'Over Limit', 'Severity'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {listLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-slate-700" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : listData?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm text-gray-500">No violations recorded</p>
                  </td>
                </tr>
              ) : (
                listData?.data.map((rec) => (
                  <tr
                    key={rec._id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700/30"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {format(parseISO(rec.timestamp), 'dd MMM yyyy HH:mm', { locale: id })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {rec.vehicle_info ? (
                        <div>
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {rec.vehicle_info.vehicle_name}
                          </div>
                          <div className="text-xs text-gray-400">{rec.vehicle_info.plate_number}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">{rec.imei}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {rec.speed} km/h
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {rec.speed_limit} km/h
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="font-semibold"
                        style={{ color: SEVERITY_CONFIG[rec.severity].color }}
                      >
                        +{rec.excess} km/h
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={rec.severity} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {listData && listData.pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-slate-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Page {page} of {listData.pages} — {listData.total} records
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(listData.pages, p + 1))}
                disabled={page === listData.pages}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-slate-700"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: 'red' | 'orange' | 'amber' | 'purple';
}) {
  const bgMap = {
    red: 'bg-red-50 dark:bg-red-900/20',
    orange: 'bg-orange-50 dark:bg-orange-900/20',
    amber: 'bg-amber-50 dark:bg-amber-900/20',
    purple: 'bg-purple-50 dark:bg-purple-900/20',
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className={`mb-3 inline-flex rounded-lg p-2 ${bgMap[color]}`}>{icon}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</div>
      <div className="mt-1 text-xs text-gray-400">{sub}</div>
    </div>
  );
}
