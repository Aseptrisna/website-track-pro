import { useQuery } from '@tanstack/react-query';
import {
  Car,
  Cpu,
  Truck,
  CheckCircle,
  MapPin,
  Users,
  Activity,
  Package,
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
import StatsCard from '../../components/ui/StatsCard';
import api from '../../lib/axios';

interface DashboardStats {
  totalVehicles: number;
  activeDevices: number;
  totalShipments: number;
  completedDeliveries: number;
  totalDrivers: number;
}

interface FleetUsage {
  type: string;
  count: number;
}

interface VehicleActivity {
  date: string;
  active: number;
  idle: number;
}

interface ShipmentAnalytics {
  month: string;
  delivered: number;
  pending: number;
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DashboardPage() {
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

  const { data: shipmentAnalytics } = useQuery<ShipmentAnalytics[]>({
    queryKey: ['shipment-analytics'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/shipment-analytics');
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Fleet overview and key metrics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatsCard
          title="Total Vehicles"
          value={loadingStats ? '...' : stats?.totalVehicles ?? 0}
          icon={Car}
          color="emerald"
        />
        <StatsCard
          title="Active Devices"
          value={loadingStats ? '...' : stats?.activeDevices ?? 0}
          icon={Cpu}
          color="blue"
        />
        <StatsCard
          title="Total Drivers"
          value={loadingStats ? '...' : stats?.totalDrivers ?? 0}
          icon={Users}
          color="purple"
        />
        <StatsCard
          title="Shipments"
          value={loadingStats ? '...' : stats?.totalShipments ?? 0}
          icon={Truck}
          color="amber"
        />
        <StatsCard
          title="Delivered"
          value={loadingStats ? '...' : stats?.completedDeliveries ?? 0}
          icon={CheckCircle}
          color="emerald"
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
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#fff',
                }}
              />
              <Line
                type="monotone"
                dataKey="active"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="Active"
              />
              <Line
                type="monotone"
                dataKey="idle"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="Idle"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Fleet Usage Pie Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Fleet by Type</h3>
          </div>
          <div className="flex items-center justify-center">
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
                  label={({ type, count }) => `${type}: ${count}`}
                >
                  {(fleetUsage ?? []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Shipment Analytics */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Shipment Analytics</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={shipmentAnalytics ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '0.5rem',
                color: '#fff',
              }}
            />
            <Bar dataKey="delivered" fill="#10b981" radius={[4, 4, 0, 0]} name="Delivered" />
            <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pending" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
