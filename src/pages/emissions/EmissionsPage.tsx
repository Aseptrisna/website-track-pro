import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Leaf, ChevronLeft, ChevronRight, Car,
  TrendingUp, Wind, Trees, Plane,
  Info,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import clsx from 'clsx';
import api from '../../lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MonthlyEmission {
  month:   number;
  liters:  number;
  co2_kg:  number;
}

interface VehicleEmission {
  vehicle_name: string;
  plate_number: string;
  liters:       number;
  co2_kg:       number;
  fills:        number;
  pct:          number;
}

interface EmissionsData {
  year:           number;
  co2Factor:      number;
  totalLiters:    number;
  totalCo2Kg:     number;
  totalCo2Tonnes: number;
  thisMonthCo2Kg: number;
  treesNeeded:    number;
  flightsJktSub:  number;
  monthly:        MonthlyEmission[];
  perVehicle:     VehicleEmission[];
}

interface VehicleOption { _id: string; vehicle_name: string; plate_number: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtCo2  = (kg: number) =>
  kg >= 1000 ? `${(kg / 1000).toFixed(2)} t` : `${Math.round(kg)} kg`;
const fmtNum  = (n: number) => n.toLocaleString('id-ID');

// Gradient from green (low) to red (high) for vehicle bars
const BAR_COLORS = ['#ef4444','#f97316','#eab308','#84cc16','#22c55e'];
function barColor(idx: number, total: number) {
  const pos = total > 1 ? idx / (total - 1) : 0;
  const i   = Math.round(pos * (BAR_COLORS.length - 1));
  return BAR_COLORS[BAR_COLORS.length - 1 - i]; // highest emitter → red
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Leaf; label: string; value: string; sub?: string; color: string;
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

// ─── Carbon Equivalent Card ───────────────────────────────────────────────────
function EquivCard({ icon: Icon, label, value, desc, color }: {
  icon: typeof Trees; label: string; value: string; desc: string; color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2 mb-2">
        <div className={clsx('rounded-lg p-1.5', color)}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs text-gray-400">{desc}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EmissionsPage() {
  const currentYear = new Date().getFullYear();
  const [year,          setYear]          = useState(currentYear);
  const [vehicleFilter, setVehicleFilter] = useState('');

  const { data: vehicleOptions } = useQuery<VehicleOption[]>({
    queryKey: ['vehicles-options'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles', { params: { limit: 100 } });
      return data.data ?? data;
    },
  });

  const params: Record<string, any> = { year };
  if (vehicleFilter) params.vehicleId = vehicleFilter;

  const { data, isLoading } = useQuery<EmissionsData>({
    queryKey: ['emissions', year, vehicleFilter],
    queryFn: async () => {
      const { data } = await api.get('/fuel-logs/emissions', { params });
      return data;
    },
    placeholderData: (prev) => prev,
  });

  const hasData = (data?.totalLiters ?? 0) > 0;

  // Chart data — monthly bar
  const chartData = (data?.monthly ?? []).map((m) => ({
    month:  SHORT_MONTHS[m.month - 1],
    'CO₂ (kg)': m.co2_kg,
    liters: m.liters,
  }));

  // Peak month
  const peakMonth = data?.monthly.reduce((best, m) =>
    m.co2_kg > best.co2_kg ? m : best,
    { month: 0, co2_kg: 0, liters: 0 },
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <Leaf className="h-6 w-6 text-green-500" /> CO₂ Emissions
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Fleet carbon footprint estimated from fuel consumption
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-slate-600">
            <button onClick={() => setYear((y) => y - 1)}
              className="rounded-l-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm font-semibold text-gray-900 dark:text-white min-w-[4rem] text-center">{year}</span>
            <button onClick={() => setYear((y) => Math.min(currentYear, y + 1))}
              disabled={year >= currentYear}
              className="rounded-r-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-slate-700">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white">
            <option value="">All Vehicles</option>
            {vehicleOptions?.map((v) => (
              <option key={v._id} value={v._id}>{v.vehicle_name} ({v.plate_number})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Methodology note */}
      <div className="flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800/40 dark:bg-green-900/10">
        <Info className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400 mt-0.5" />
        <p className="text-xs text-green-700 dark:text-green-400">
          Calculated using <strong>2.4 kg CO₂/liter</strong> — Indonesian mixed-fleet average
          (Pertalite 2.31 kg/L · Solar 2.68 kg/L). Based on fuel fill-up records only.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Wind}       label={`Total CO₂ — ${year}`}
          value={hasData ? fmtCo2(data!.totalCo2Kg) : '—'}
          sub={hasData ? `${fmtNum(data!.totalLiters)} liters burned` : 'No fuel data'}
          color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
        <StatCard icon={TrendingUp} label="This Month"
          value={hasData ? fmtCo2(data!.thisMonthCo2Kg) : '—'}
          sub={SHORT_MONTHS[new Date().getMonth()]}
          color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
        <StatCard icon={Car}        label="Highest Emitter"
          value={data?.perVehicle[0]?.vehicle_name ?? '—'}
          sub={data?.perVehicle[0] ? fmtCo2(data.perVehicle[0].co2_kg) : undefined}
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
        <StatCard icon={Leaf}       label="Peak Month"
          value={peakMonth && peakMonth.co2_kg > 0
            ? SHORT_MONTHS[peakMonth.month - 1] : '—'}
          sub={peakMonth && peakMonth.co2_kg > 0 ? fmtCo2(peakMonth.co2_kg) : undefined}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
      </div>

      {hasData ? (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Monthly bar chart */}
            <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Monthly CO₂ Emissions — {year}
              </h3>
              <p className="mb-3 text-xs text-gray-400">
                Total fleet CO₂ per month (kg)
              </p>
              {isLoading ? (
                <div className="h-52 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-700" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-slate-700" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12 }}
                      formatter={(v, name) => {
                        if (name === 'CO₂ (kg)') return [`${fmtNum(v as number)} kg`, 'CO₂'];
                        return [`${fmtNum(v as number)} L`, 'Fuel'];
                      }}
                    />
                    <Bar dataKey="CO₂ (kg)" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={entry['CO₂ (kg)'] === Math.max(...chartData.map((d) => d['CO₂ (kg)']))
                            ? '#ef4444' : '#22c55e'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Carbon equivalents */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Carbon Equivalents
              </h3>
              <EquivCard icon={Trees} label="Trees needed to offset"
                value={fmtNum(data!.treesNeeded)}
                desc="growing for 1 year (@ 21 kg CO₂/tree/year)"
                color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" />
              <EquivCard icon={Plane} label="Equivalent flights"
                value={fmtNum(data!.flightsJktSub)}
                desc="Jakarta → Surabaya (@ ~100 kg CO₂/passenger)"
                color="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" />
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total CO₂ {year}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data!.totalCo2Tonnes} <span className="text-base font-normal text-gray-500">tonnes</span>
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  from {fmtNum(data!.totalLiters)} L of fuel consumed
                </p>
              </div>
            </div>
          </div>

          {/* Per-vehicle breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-800">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Emissions by Vehicle — {year}
              </h3>
            </div>

            {isLoading ? (
              <div className="space-y-1 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-700" />
                ))}
              </div>
            ) : (
              <>
                {/* Horizontal bar chart */}
                {data!.perVehicle.length > 1 && (
                  <div className="border-b border-gray-100 p-4 dark:border-slate-700">
                    <ResponsiveContainer width="100%" height={Math.max(120, data!.perVehicle.length * 32)}>
                      <BarChart
                        data={[...data!.perVehicle].reverse().map((v) => ({
                          name: v.vehicle_name.length > 14 ? v.vehicle_name.slice(0, 12) + '…' : v.vehicle_name,
                          'CO₂ (kg)': v.co2_kg,
                        }))}
                        layout="vertical"
                        margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-gray-100 dark:stroke-slate-700" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                        <Tooltip
                          contentStyle={{ fontSize: 12 }}
                          formatter={(v) => [`${fmtNum(v as number)} kg`, 'CO₂']}
                        />
                        <Bar dataKey="CO₂ (kg)" radius={[0, 4, 4, 0]}>
                          {[...data!.perVehicle].reverse().map((_, idx) => (
                            <Cell key={`v-${idx}`} fill={barColor(idx, data!.perVehicle.length)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-900/40">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">#</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Vehicle</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Fuel (L)</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Fills</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-red-500">CO₂ (kg)</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                      {data!.perVehicle.map((v, idx) => (
                        <tr key={v.plate_number} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-3 text-sm text-gray-400">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 dark:text-white">{v.vehicle_name}</p>
                            <p className="text-xs text-gray-400">{v.plate_number}</p>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                            {fmtNum(v.liters)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                            {v.fills}×
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">
                            {fmtNum(v.co2_kg)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 rounded-full bg-gray-100 dark:bg-slate-700">
                                <div
                                  className="h-2 rounded-full bg-red-400 transition-all"
                                  style={{ width: `${v.pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400">{v.pct}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {data!.perVehicle.length > 1 && (
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50 dark:border-slate-600 dark:bg-slate-900/40">
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3 text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Fleet Total</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-300">
                            {fmtNum(data!.totalLiters)}
                          </td>
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                            {fmtNum(data!.totalCo2Kg)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">100%</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        !isLoading && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-20 dark:border-slate-600 dark:bg-slate-800/50">
            <Leaf className="h-10 w-10 text-gray-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
              No fuel data for {year}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Log fuel fill-ups in the Fuel page to calculate emissions.
            </p>
          </div>
        )
      )}
    </div>
  );
}
