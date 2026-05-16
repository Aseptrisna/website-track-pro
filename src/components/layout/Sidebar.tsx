import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Car,
  Cpu,
  Route,
  Bell,
  Settings,
  Navigation,
  ChevronsLeft,
  ChevronsRight,
  X,
  ShieldCheck,
  BarChart2,
  UserRound,
  Package,
  ClipboardList,
  Fuel,
  Wrench,
  Receipt,
  Radio,
  ShieldAlert,
  Siren,
  Gauge,
  CalendarDays,
  MapPinned,
  Leaf,
  FileWarning,
  BellRing,
  PieChart,
  GitMerge,
  Timer,
  MailCheck,
  Users,
} from 'lucide-react';
import clsx from 'clsx';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

const menuItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/app/tracking', icon: MapPin, label: 'Live Tracking' },
  { to: '/app/vehicles', icon: Car, label: 'My Vehicles' },
  { to: '/app/drivers',     icon: UserRound, label: 'Drivers' },
  { to: '/app/assignments', icon: GitMerge,  label: 'Assignments' },
  { to: '/app/shipments', icon: Package, label: 'Shipments' },
  { to: '/app/devices', icon: Cpu, label: 'GPS Devices' },
  { to: '/app/history', icon: Route, label: 'Route History' },
  { to: '/app/route-plans', icon: MapPinned, label: 'Route Plans' },
  { to: '/app/trips',     icon: Navigation, label: 'Trip Log' },
  { to: '/app/idle-time', icon: Timer,      label: 'Idle Time' },
  { to: '/app/fuel', icon: Fuel, label: 'Fuel' },
  { to: '/app/fuel-efficiency', icon: Gauge, label: 'Fuel Efficiency' },
  { to: '/app/emissions', icon: Leaf, label: 'CO₂ Emissions' },
  { to: '/app/maintenance', icon: Wrench, label: 'Maintenance' },
  { to: '/app/calendar', icon: CalendarDays, label: 'Sched. Calendar' },
  { to: '/app/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/app/geofences', icon: ShieldCheck, label: 'Geofences' },
  { to: '/app/safety', icon: ShieldAlert, label: 'Safety' },
  { to: '/app/incidents', icon: Siren, label: 'Incidents' },
  { to: '/app/alert-rules', icon: BellRing, label: 'Alert Rules' },
  { to: '/app/compliance', icon: FileWarning, label: 'Compliance' },
  { to: '/app/utilization', icon: PieChart, label: 'Utilization' },
  { to: '/app/reports',            icon: BarChart2,  label: 'Reports'           },
  { to: '/app/scheduled-reports', icon: MailCheck,  label: 'Sched. Reports'    },
  { to: '/app/notifications', icon: Bell, label: 'Notifications' },
  { to: '/app/activity-log', icon: ClipboardList, label: 'Activity Log' },
  { to: '/app/simulator', icon: Radio, label: 'GPS Simulator' },
  { to: '/app/team',     icon: Users,    label: 'Team Members' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
];

// Items visible only to fleet owners (not team members)
const OWNER_ONLY_PATHS = ['/app/team', '/app/simulator', '/app/scheduled-reports'];

export default function Sidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapse,
}: SidebarProps) {
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const isTeamMember = user?.isTeamMember ?? false;

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-[1000] flex flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-slate-700 dark:bg-slate-800 lg:static',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Navigation className="h-7 w-7 text-emerald-600" />
          {!collapsed && (
            <span className="text-xl font-bold text-emerald-600">TrackPro</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
        <button
          onClick={onToggleCollapse}
          className="hidden rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 lg:block"
        >
          {collapsed ? (
            <ChevronsRight className="h-5 w-5" />
          ) : (
            <ChevronsLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {menuItems.filter((item) =>
            !isTeamMember || !OWNER_ONLY_PATHS.includes(item.to),
          ).map((item) => (
            <li key={item.to} className="relative">
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700',
                    collapsed && 'justify-center',
                  )
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.to === '/app/notifications' && unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.to === '/app/notifications' && unreadCount > 0 && (
                  <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
