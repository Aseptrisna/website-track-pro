import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Car,
  Users,
  Cpu,
  Route,
  Bell,
  Settings,
  Navigation,
  ChevronsLeft,
  ChevronsRight,
  X,
} from 'lucide-react';
import clsx from 'clsx';

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
  { to: '/app/drivers', icon: Users, label: 'Drivers' },
  { to: '/app/devices', icon: Cpu, label: 'GPS Devices' },
  { to: '/app/history', icon: Route, label: 'Route History' },
  { to: '/app/notifications', icon: Bell, label: 'Notifications' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-slate-700 dark:bg-slate-800 lg:static',
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
          {menuItems.map((item) => (
            <li key={item.to}>
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
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
