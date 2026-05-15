import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Car, CheckCircle, Wrench, XCircle,
  AlertTriangle, Gauge, WifiOff, Bell,
  FileDown, RefreshCw, Clock, ShieldAlert,
} from 'lucide-react';
import clsx from 'clsx';
import api from '../../lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
interface VehicleSummary {
  _id: string;
  vehicle_name: string;
  plate_number: string;
  brand?: string;
  model?: string;
  vehicle_type: string;
  status: string;
  odometer?: number;
  next_service_date?: string;
  next_service_km?: number;
  last_service_date?: string;
  service_notes?: string;
  serviceStatus: 'overdue' | 'due_7d' | 'due_30d' | 'ok' | 'none';
}

interface FleetSummary {
  generated_at: string;
  vehicles: {
    total: number;
    active: number;
    inactive: number;
    maintenance: number;
    service_overdue: number;
    service_due_7d: number;
    service_due_30d: number;
  };
  alerts: {
    total: number;
    byType: { type: string; count: number }[];
    dailyTrend: { date: string; count: number }[];
  };
  vehicle_list: VehicleSummary[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SERVICE_STATUS_CFG = {
  overdue:  { label: 'Overdue',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',           icon: ShieldAlert },
  due_7d:   { label: 'Due in 7d',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',   icon: Clock },
  due_30d:  { label: 'Due in 30d', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  ok:       { label: 'OK',         cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  none:     { label: 'Not set',    cls: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400',         icon: XCircle },
} as const;

const VEHICLE_STATUS_CFG: Record<string, string> = {
  active:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  inactive:    'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400',
};

const ALERT_TYPE_CFG: Record<string, { label: string; color: string; icon: typeof Bell }> = {
  alert:   { label: 'Geofence',    color: '#ef4444', icon: ShieldAlert },
  warning: { label: 'Speed / Other', color: '#f59e0b', icon: Gauge },
  info:    { label: 'Info',         color: '#3b82f6', icon: Bell },
  success: { label: 'Success',      color: '#10b981', icon: CheckCircle },
};

const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

function fmt(date?: string) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: number | string; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between">
        <div className={clsx('rounded-lg p-2', color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery<FleetSummary>({
    queryKey: ['fleet-report'],
    queryFn: async () => {
      const { data } = await api.get('/reports/fleet');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const v = data?.vehicles;
  const a = data?.alerts;

  // Filtered vehicle list
  const filteredVehicles = (data?.vehicle_list ?? []).filter((veh) => {
    if (serviceFilter === 'all') return true;
    return veh.serviceStatus === serviceFilter;
  });

  // Pie chart data from byType
  const pieData = (a?.byType ?? []).map((t) => ({
    name: ALERT_TYPE_CFG[t.type]?.label ?? t.type,
    value: t.count,
    color: ALERT_TYPE_CFG[t.type]?.color ?? '#6b7280',
  }));

  // Bar chart: last 14 days of trend
  const trendData = (() => {
    const map = new Map((a?.dailyTrend ?? []).map((d) => [d.date, d.count]));
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      return {
        date: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
        count: map.get(key) ?? 0,
      };
    });
  })();

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ['Vehicle', 'Plate', 'Type', 'Status', 'Odometer (km)', 'Last Service', 'Next Service Date', 'Next Service KM', 'Service Status'],
      ...data.vehicle_list.map((v) => [
        v.vehicle_name, v.plate_number, v.vehicle_type, v.status,
        v.odometer ?? '', fmt(v.last_service_date), fmt(v.next_service_date),
        v.next_service_km ?? '', SERVICE_STATUS_CFG[v.serviceStatus].label,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleet-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fleet Reports</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {data
              ? `Generated ${new Date(dataUpdatedAt).toLocaleTimeString('id-ID')} · last 30 days`
              : 'Fleet performance overview'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
          >
            <RefreshCw className={clsx('h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!data}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-700" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* ── Fleet stat cards ── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total Vehicles"   value={v!.total}       icon={Car}          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
            <StatCard label="Active"           value={v!.active}      icon={CheckCircle}  color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
            <StatCard label="Maintenance"      value={v!.maintenance} icon={Wrench}       color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
            <StatCard label="Inactive"         value={v!.inactive}    icon={XCircle}      color="bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400" />
            <StatCard label="Service Overdue"  value={v!.service_overdue} icon={ShieldAlert}  color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              sub={v!.service_overdue > 0 ? 'Needs attention' : 'All clear'} />
            <StatCard label="Service Due Soon" value={v!.service_due_30d} icon={Clock}     color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
              sub="Within 30 days" />
          </div>

          {/* ── Alert stat cards ── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total Alerts (30d)" value={a!.total} icon={Bell}        color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
            {(a!.byType ?? []).slice(0, 3).map((t) => {
              const cfg = ALERT_TYPE_CFG[t.type];
              return (
                <StatCard
                  key={t.type}
                  label={cfg?.label ?? t.type}
                  value={t.count}
                  icon={cfg?.icon ?? Bell}
                  color={t.type === 'alert' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : t.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}
                />
              );
            })}
          </div>

          {/* ── Charts row ── */}
          <div className="grid gap-4 lg:grid-cols-5">

            {/* Daily trend bar chart */}
            <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Daily Alerts — Last 14 Days
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={1} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    cursor={{ fill: 'rgba(16,185,129,0.08)' }}
                  />
                  <Bar dataKey="count" name="Alerts" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Alert type pie chart */}
            <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Alert Breakdown
              </h2>
              {pieData.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
                  No alerts in the last 30 days
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color ?? PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Vehicle service table ── */}
          <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Vehicle Service Status
                <span className="ml-2 text-xs font-normal text-gray-400">({filteredVehicles.length} vehicles)</span>
              </h2>
              {/* Filter chips */}
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'overdue', 'due_7d', 'due_30d', 'ok', 'none'] as const).map((key) => {
                  const label = key === 'all' ? 'All' : SERVICE_STATUS_CFG[key].label;
                  const count = key === 'all'
                    ? data.vehicle_list.length
                    : data.vehicle_list.filter((v) => v.serviceStatus === key).length;
                  return (
                    <button
                      key={key}
                      onClick={() => setServiceFilter(key)}
                      className={clsx(
                        'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                        serviceFilter === key
                          ? key === 'all'
                            ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900'
                            : SERVICE_STATUS_CFG[key as keyof typeof SERVICE_STATUS_CFG].cls
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300',
                      )}
                    >
                      {label} {count > 0 && `(${count})`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:border-slate-700">
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Odometer</th>
                    <th className="px-4 py-3">Last Service</th>
                    <th className="px-4 py-3">Next Service</th>
                    <th className="px-4 py-3">Service Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                        No vehicles match this filter
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((veh) => {
                      const svcCfg = SERVICE_STATUS_CFG[veh.serviceStatus];
                      const SvcIcon = svcCfg.icon;
                      return (
                        <tr key={veh._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 dark:text-white">{veh.vehicle_name}</p>
                            <p className="text-xs text-gray-500">{veh.plate_number}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium capitalize text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                              {veh.vehicle_type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx('inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize', VEHICLE_STATUS_CFG[veh.status] ?? VEHICLE_STATUS_CFG.inactive)}>
                              {veh.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {veh.odometer != null ? `${veh.odometer.toLocaleString()} km` : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {fmt(veh.last_service_date)}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            <div>{fmt(veh.next_service_date)}</div>
                            {veh.next_service_km != null && (
                              <div className="text-xs text-gray-400">@ {veh.next_service_km.toLocaleString()} km</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', svcCfg.cls)}>
                              <SvcIcon className="h-3 w-3" />
                              {svcCfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
