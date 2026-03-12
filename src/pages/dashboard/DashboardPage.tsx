import { useQuery } from '@tanstack/react-query';
import {
  Car,
  Cpu,
  Wifi,
  WifiOff,
  MapPin,
  Activity,
  Navigation,
} from 'lucide-react';
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
  LineChart,
  Line,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import StatsCard from '../../components/ui/StatsCard';
import api from '../../lib/axios';

interface DashboardStats {
  totalVehicles: number;
  activeDevices: number;
  onlineDevices: number;
  totalShipments: number;
  completedDeliveries: number;
  totalDrivers: number;
}

interface FleetUsage {
  type: string;
  count: number;
}

interface VehicleActivity {
  day: string;
  date: string;
  active: number;
  idle: number;
}

interface LatestLocation {
  vehicle_id: string;
  vehicle_name?: string;
  plate_number?: string;
  imei: string;
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
}

interface DeviceItem {
  _id: string;
  device_name: string;
  imei: string;
  status: string;
  last_seen: string;
  vehicle_id?: { vehicle_name: string; plate_number: string } | null;
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: stats, isLoading: loadingStats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/stats');
      return data;
    },
  });

  const { data: fleetUsage } = useQuery<FleetUsage[]>({
    queryKey: ['fleet-usage'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/fleet-usage');
      return data;
    },
  });

  const { data: vehicleActivity } = useQuery<VehicleActivity[]>({
    queryKey: ['vehicle-activity'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/vehicle-activity');
      return data;
    },
  });

  const { data: latestLocations } = useQuery<LatestLocation[]>({
    queryKey: ['latest-locations-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/gps-data/latest');
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: devices } = useQuery<DeviceItem[]>({
    queryKey: ['devices-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/devices', { params: { limit: 100 } });
      return data.data ?? data;
    },
  });

  const onlineDevices = devices?.filter((d) => d.status === 'online') ?? [];
  const offlineDevices = devices?.filter((d) => d.status !== 'online') ?? [];

  const deviceStatusData = [
    { name: 'Online', value: onlineDevices.length },
    { name: 'Offline', value: offlineDevices.length },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          GPS tracking overview and fleet status
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Vehicles"
          value={loadingStats ? '...' : stats?.totalVehicles ?? 0}
          icon={Car}
          color="emerald"
        />
        <StatsCard
          title="GPS Devices"
          value={loadingStats ? '...' : devices?.length ?? 0}
          icon={Cpu}
          color="blue"
        />
        <StatsCard
          title="Online Now"
          value={loadingStats ? '...' : onlineDevices.length}
          icon={Wifi}
          color="emerald"
        />
        <StatsCard
          title="Live Tracking"
          value={latestLocations?.length ?? 0}
          icon={Navigation}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Vehicle Activity Line Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Vehicle Activity</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={vehicleActivity ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#fff',
                }}
              />
              <Line type="monotone" dataKey="active" stroke="#10b981" strokeWidth={2} dot={false} name="Active" />
              <Line type="monotone" dataKey="idle" stroke="#f59e0b" strokeWidth={2} dot={false} name="Idle" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Fleet by Type Pie Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center gap-2">
            <Car className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Fleet by Type</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={fleetUsage ?? []}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                label={({ type, count }: any) => `${type}: ${count}`}
              >
                {(fleetUsage ?? []).map((_: any, i: number) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Device Status + Recent Positions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Device Online/Offline */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Device Status</h3>
          </div>
          {deviceStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deviceStatusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" width={60} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Devices">
                  {deviceStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.name === 'Online' ? '#10b981' : '#9ca3af'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-gray-400">No devices registered</p>
          )}

          {/* Device list */}
          <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
            {devices?.map((d) => (
              <div
                key={d._id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 dark:border-slate-700"
              >
                {d.status === 'online' ? (
                  <Wifi className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <WifiOff className="h-4 w-4 shrink-0 text-gray-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{d.device_name}</p>
                  <p className="text-xs text-gray-400">{d.imei}</p>
                </div>
                {d.vehicle_id && typeof d.vehicle_id !== 'string' && (
                  <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    {d.vehicle_id.plate_number}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent GPS Positions */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Latest GPS Positions</h3>
            </div>
            <button
              onClick={() => navigate('/tracking')}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              Open Live Map →
            </button>
          </div>

          {latestLocations && latestLocations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500 dark:border-slate-700 dark:text-gray-400">
                    <th className="pb-2 pr-4">Vehicle / IMEI</th>
                    <th className="pb-2 pr-4">Position</th>
                    <th className="pb-2 pr-4">Speed</th>
                    <th className="pb-2">Last Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {latestLocations.map((loc, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {loc.vehicle_name || loc.imei}
                        </p>
                        {loc.plate_number && (
                          <p className="text-xs text-gray-400">{loc.plate_number}</p>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-600 dark:text-gray-300">
                        {loc.latitude?.toFixed(5)}, {loc.longitude?.toFixed(5)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs font-medium ${loc.speed > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                          {loc.speed?.toFixed(0) ?? 0} km/h
                        </span>
                      </td>
                      <td className="py-2.5 text-xs text-gray-400">
                        {new Date(loc.timestamp).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <MapPin className="mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm">No GPS data received yet</p>
              <p className="mt-1 text-xs">Connect a GPS device to start tracking</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
