import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Car, Cpu, Wifi, WifiOff, MapPin, Activity, Navigation,
  AlertTriangle, CheckCircle, Info, Bell, Check, ChevronRight,
  UserRound, Package, Wrench, FileText,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import clsx from 'clsx';
import StatsCard from '../../components/ui/StatsCard';
import api from '../../lib/axios';
import { loadNotifPrefs } from '../../lib/notifPrefs';

interface DashboardStats {
  totalVehicles: number;
  onlineDevices: number;
  totalDrivers: number;
  pendingShipments: number;
  activeShipments: number;
  serviceOverdue: number;
  docsExpiringSoon: number;
  licensesExpiringSoon: number;
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

interface AlertNotification {
  _id: string;
  title: string;
  message: string;
  type: string;
  read_status: boolean;
  createdAt: string;
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const alertTypeConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  alert:   { icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-100 dark:bg-red-900/30' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  info:    { icon: Info,          color: 'text-blue-500',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
  success: { icon: CheckCircle,   color: 'text-emerald-500',bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notifPrefs = loadNotifPrefs();

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

  const { data: alertNotifications } = useQuery<AlertNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data.data ?? data;
    },
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  // Unread alerts & warnings only, max 5 — shown in widget
  const unreadAlerts = (alertNotifications ?? [])
    .filter((n) => !n.read_status && (n.type === 'alert' || n.type === 'warning'))
    .slice(0, 5);

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

      {/* Stats Cards — Row 1: Fleet */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatsCard title="Total Vehicles"  value={loadingStats ? '...' : stats?.totalVehicles ?? 0}     icon={Car}       color="emerald" />
        <StatsCard title="Active Drivers"  value={loadingStats ? '...' : stats?.totalDrivers ?? 0}      icon={UserRound} color="blue" />
        <StatsCard title="In Transit"      value={loadingStats ? '...' : stats?.activeShipments ?? 0}   icon={Package}   color="purple" />
        <StatsCard title="Pending Orders"  value={loadingStats ? '...' : stats?.pendingShipments ?? 0}  icon={Package}   color="amber" />
      </div>

      {/* Stats Cards — Row 2: Compliance */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatsCard title="Online Devices"      value={loadingStats ? '...' : onlineDevices.length}                   icon={Wifi}      color="emerald" />
        <StatsCard title="Live Tracking"       value={latestLocations?.length ?? 0}                                  icon={Navigation} color="blue" />
        <StatsCard
          title="Service Overdue"
          value={loadingStats ? '...' : stats?.serviceOverdue ?? 0}
          icon={Wrench}
          color={stats?.serviceOverdue ? 'red' : 'emerald'}
        />
        <StatsCard
          title="Docs Expiring"
          value={loadingStats ? '...' : (stats?.docsExpiringSoon ?? 0) + (stats?.licensesExpiringSoon ?? 0)}
          icon={FileText}
          color={(stats?.docsExpiringSoon ?? 0) + (stats?.licensesExpiringSoon ?? 0) > 0 ? 'amber' : 'emerald'}
        />
      </div>

      {/* Recent Alerts Widget — only visible when pref enabled & there are unread alert/warning */}
      {notifPrefs.dashboard_widget && unreadAlerts.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/40 dark:bg-red-900/10">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Recent Alerts</h3>
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                {unreadAlerts.length}
              </span>
            </div>
            <button
              onClick={() => navigate('/app/notifications')}
              className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Alert list */}
          <div className="space-y-2">
            {unreadAlerts.map((n) => {
              const cfg = alertTypeConfig[n.type] ?? alertTypeConfig.warning;
              const Icon = cfg.icon;
              return (
                <div
                  key={n._id}
                  className="flex items-start gap-3 rounded-lg border border-white/60 bg-white px-3 py-2.5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800"
                >
                  <div className={clsx('mt-0.5 rounded-md p-1.5 shrink-0', cfg.bg)}>
                    <Icon className={clsx('h-4 w-4', cfg.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{n.message}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: idLocale })}
                    </span>
                    <button
                      onClick={() => markReadMutation.mutate(n._id)}
                      title="Mark as read"
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-emerald-500 dark:hover:bg-slate-700"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Offline device quick warning */}
          {offlineDevices.length > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 dark:border-yellow-900/40 dark:bg-yellow-900/10">
              <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
                <WifiOff className="h-4 w-4" />
                <span><strong>{offlineDevices.length}</strong> device{offlineDevices.length > 1 ? 's' : ''} currently offline</span>
              </div>
              <button
                onClick={() => navigate('/app/devices')}
                className="text-xs font-medium text-yellow-700 hover:underline dark:text-yellow-400"
              >
                Check →
              </button>
            </div>
          )}
        </div>
      )}

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
              onClick={() => navigate('/app/tracking')}
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
