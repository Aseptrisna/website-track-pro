import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Gauge, Car, TrendingUp, AlertTriangle,
  TrendingDown, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
  LineChart, Line,
} from 'recharts';
import clsx from 'clsx';
import api from '../../lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FillInterval {
  date: string;
  liters: number;
  km_driven: number;
  km_per_liter: number;
  is_anomaly: boolean;
}

interface VehicleEfficiency {
  vehicle_name:       string;
  plate_number:       string;
  avg_km_per_liter:   number;
  best_km_per_liter:  number;
  worst_km_per_liter: number;
  anomaly_count:      number;
  fill_count:         number;
  intervals:          FillInterval[];
}

interface EfficiencyData {
  fleetAvg:        number;
  totalDataPoints: number;
  totalAnomalies:  number;
  perVehicle:      VehicleEfficiency[];
}

interface VehicleOption { _id: string; vehicle_name: string; plate_number: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtKmL = (n: number) => `${n.toFixed(1)} km/L`;
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function efficiencyColor(kml: number, avg: number) {
  const ratio = avg > 0 ? kml / avg : 1;
  if (ratio >= 1.10) return 'text-emerald-600 dark:text-emerald-400';
  if (ratio <= 0.90) return 'text-red-600 dark:text-red-400';
  return 'text-gray-700 dark:text-gray-300';
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Gauge; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className={clsx('rounded-lg p-2 shrink-0', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-0.5 truncate text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Vehicle Detail Row ───────────────────────────────────────────────────────
function VehicleRow({ v, fleetAvg }: { v: VehicleEfficiency; fleetAvg: number }) {
  const [expanded, setExpanded] = useState(false);

  const vsFleet = fleetAvg > 0
    ? Math.round(((v.avg_km_per_liter - fleetAvg) / fleetAvg) * 100)
    : 0;
  const isAbove = vsFleet >= 0;

  const trendData = v.intervals.map((iv, idx) => ({
    fill: `#${idx + 1}`,
    kml:  iv.km_per_liter,
    anomaly: iv.is_anomaly,
  }));

  return (
    <div className="border-b border-gray-100 last:border-0 dark:border-slate-700">
      {/* Summary row */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-700/30 text-left"
      >
        {/* Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-bold dark:bg-blue-900/30 dark:text-blue-400">
          {v.vehicle_name.charAt(0).toUpperCase()}
        </div>

        {/* Name */}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 dark:text-white">{v.vehicle_name}</p>
          <p className="text-xs text-gray-400">{v.plate_number}</p>
        </div>

        {/* Avg km/L */}
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtKmL(v.avg_km_per_liter)}</p>
          <p className={clsx('text-xs font-medium', isAbove ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
            {isAbove ? '+' : ''}{vsFleet}% vs fleet
          </p>
        </div>

        {/* Range */}
        <div className="hidden sm:block text-right text-xs text-gray-400 shrink-0 w-28">
          <p>Best: {fmtKmL(v.best_km_per_liter)}</p>
          <p>Worst: {fmtKmL(v.worst_km_per_liter)}</p>
        </div>

        {/* Anomaly badge */}
        {v.anomaly_count > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400 shrink-0">
            <AlertTriangle className="h-3 w-3" />
            {v.anomaly_count}
          </div>
        )}

        {/* Fills count + expand toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400">{v.fill_count} fill(s)</span>
          {expanded
            ? <ChevronUp className="h-4 w-4 text-gray-400" />
            : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/30">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Trend chart */}
            <div>
              <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Fill-up Efficiency Trend
              </p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={trendData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-slate-600" />
                  <XAxis dataKey="fill" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ fontSize: 11 }}
                    formatter={(v) => [`${(v as number).toFixed(2)} km/L`, 'Efficiency']}
                  />
                  <ReferenceLine y={v.avg_km_per_liter} stroke="#10b981" strokeDasharray="4 2"
                    label={{ value: 'avg', fontSize: 10, fill: '#10b981' }} />
                  <Line type="monotone" dataKey="kml" stroke="#3b82f6" strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle
                          key={`dot-${cx}-${cy}`}
                          cx={cx} cy={cy} r={4}
                          fill={payload.anomaly ? '#ef4444' : '#3b82f6'}
                          stroke="white" strokeWidth={1}
                        />
                      );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Fill-up table */}
            <div>
              <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Fill-up Details
              </p>
              <div className="overflow-auto max-h-[140px] rounded-lg border border-gray-200 dark:border-slate-600">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-slate-800">
                      <th className="px-2.5 py-1.5 text-left text-gray-500 dark:text-gray-400">Date</th>
                      <th className="px-2.5 py-1.5 text-right text-gray-500 dark:text-gray-400">km</th>
                      <th className="px-2.5 py-1.5 text-right text-gray-500 dark:text-gray-400">L</th>
                      <th className="px-2.5 py-1.5 text-right text-gray-500 dark:text-gray-400">km/L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {[...v.intervals].reverse().map((iv, idx) => (
                      <tr key={idx} className={clsx(
                        'hover:bg-white dark:hover:bg-slate-700/30',
                        iv.is_anomaly && 'bg-red-50 dark:bg-red-900/10',
                      )}>
                        <td className="px-2.5 py-1.5 text-gray-600 dark:text-gray-400">
                          {new Date(iv.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-2.5 py-1.5 text-right text-gray-600 dark:text-gray-400">
                          {iv.km_driven.toLocaleString('id-ID')}
                        </td>
                        <td className="px-2.5 py-1.5 text-right text-gray-600 dark:text-gray-400">
                          {iv.liters.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                        </td>
                        <td className={clsx(
                          'px-2.5 py-1.5 text-right font-semibold',
                          efficiencyColor(iv.km_per_liter, v.avg_km_per_liter),
                        )}>
                          {iv.km_per_liter.toFixed(2)}
                          {iv.is_anomaly && (
                            <span className="ml-1 text-red-500" title="Efficiency anomaly">⚠</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FuelEfficiencyPage() {
  const [vehicleFilter, setVehicleFilter] = useState('');

  const { data: vehicleOptions } = useQuery<VehicleOption[]>({
    queryKey: ['vehicles-options'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles', { params: { limit: 100 } });
      return data.data ?? data;
    },
  });

  const { data, isLoading } = useQuery<EfficiencyData>({
    queryKey: ['fuel-efficiency', vehicleFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (vehicleFilter) params.vehicleId = vehicleFilter;
      const { data } = await api.get('/fuel-logs/efficiency', { params });
      return data;
    },
    placeholderData: (prev) => prev,
  });

  // Bar chart: avg km/L per vehicle (sorted best → worst)
  const rankingData = (data?.perVehicle ?? []).map((v) => ({
    name: v.vehicle_name.length > 12 ? v.vehicle_name.slice(0, 10) + '…' : v.vehicle_name,
    'km/L': v.avg_km_per_liter,
  }));

  const best  = data?.perVehicle[0];
  const worst = data?.perVehicle[data.perVehicle.length - 1];

  const hasData = (data?.totalDataPoints ?? 0) > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <Gauge className="h-6 w-6 text-blue-500" /> Fuel Efficiency
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            km/L per vehicle calculated from consecutive fill-up odometer readings
          </p>
        </div>

        {/* Vehicle filter */}
        <select
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        >
          <option value="">All Vehicles</option>
          {vehicleOptions?.map((v) => (
            <option key={v._id} value={v._id}>{v.vehicle_name} ({v.plate_number})</option>
          ))}
        </select>
      </div>

      {/* Info banner when no data */}
      {!isLoading && !hasData && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/40 dark:bg-blue-900/20">
          <Info className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              No odometer data found
            </p>
            <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
              To enable efficiency tracking, enter the <strong>odometer reading</strong> when logging
              each fuel fill-up. Efficiency (km/L) is calculated from consecutive odometer readings.
              You need at least 2 fill-ups per vehicle with odometer data.
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Gauge}         label="Fleet Avg"
          value={hasData ? fmtKmL(data!.fleetAvg) : '—'}
          sub={`${data?.totalDataPoints ?? 0} data point(s)`}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard icon={TrendingUp}    label="Most Efficient"
          value={best ? fmtKmL(best.avg_km_per_liter) : '—'}
          sub={best?.vehicle_name}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <StatCard icon={TrendingDown}  label="Least Efficient"
          value={worst && data!.perVehicle.length > 1 ? fmtKmL(worst.avg_km_per_liter) : '—'}
          sub={worst && data!.perVehicle.length > 1 ? worst.vehicle_name : undefined}
          color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
        <StatCard icon={AlertTriangle} label="Anomalies"
          value={String(data?.totalAnomalies ?? 0)}
          sub="fill-ups ±30% from avg"
          color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
      </div>

      {hasData && (
        <>
          {/* Ranking bar chart */}
          {rankingData.length > 1 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Vehicle Efficiency Ranking</h3>
              <p className="mb-3 text-xs text-gray-400">Average km per liter across all recorded fill-ups</p>
              <ResponsiveContainer width="100%" height={Math.max(160, rankingData.length * 36)}>
                <BarChart
                  data={[...rankingData].reverse()}
                  layout="vertical"
                  margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-gray-100 dark:stroke-slate-700" />
                  <XAxis type="number" tick={{ fontSize: 11 }} unit=" km/L" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(v) => [`${(v as number).toFixed(2)} km/L`, 'Avg Efficiency']}
                  />
                  <ReferenceLine
                    x={data!.fleetAvg}
                    stroke="#10b981"
                    strokeDasharray="4 2"
                    label={{ value: `Fleet avg ${fmtKmL(data!.fleetAvg)}`, fontSize: 10, fill: '#10b981', position: 'top' }}
                  />
                  <Bar dataKey="km/L" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Per-vehicle expandable list */}
          {isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-700" />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Per-Vehicle Details
                </h3>
                <p className="text-xs text-gray-400">Click a row to see fill-up history</p>
              </div>

              {/* Column headers */}
              <div className="hidden sm:flex items-center gap-4 border-b border-gray-100 bg-gray-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-900/40 text-xs font-semibold text-gray-500 dark:text-gray-400">
                <div className="w-9 shrink-0" />
                <div className="flex-1">Vehicle</div>
                <div className="w-24 text-right">Avg km/L</div>
                <div className="w-28 text-right">Range</div>
                <div className="w-16 text-right">Anomalies</div>
                <div className="w-20 text-right">Fills</div>
                <div className="w-5" />
              </div>

              {data?.perVehicle.map((v) => (
                <VehicleRow key={v.plate_number} v={v} fleetAvg={data.fleetAvg} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
