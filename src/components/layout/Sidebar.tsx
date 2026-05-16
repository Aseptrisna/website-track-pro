import { NavLink, useLocation } from 'react-router-dom';
import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronDown,
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

interface MenuItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  ownerOnly?: boolean;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/app',          icon: LayoutDashboard, label: 'Dashboard',    end: true },
      { to: '/app/tracking', icon: MapPin,          label: 'Live Tracking' },
    ],
  },
  {
    label: 'Fleet',
    items: [
      { to: '/app/vehicles',    icon: Car,       label: 'My Vehicles' },
      { to: '/app/devices',     icon: Cpu,       label: 'GPS Devices'  },
      { to: '/app/drivers',     icon: UserRound, label: 'Drivers'      },
      { to: '/app/assignments', icon: GitMerge,  label: 'Assignments'  },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/app/shipments',   icon: Package,    label: 'Shipments'    },
      { to: '/app/route-plans', icon: MapPinned,  label: 'Route Plans'  },
      { to: '/app/history',     icon: Route,      label: 'Route History'},
      { to: '/app/trips',       icon: Navigation, label: 'Trip Log'     },
      { to: '/app/idle-time',   icon: Timer,      label: 'Idle Time'    },
    ],
  },
  {
    label: 'Fuel & Emissions',
    items: [
      { to: '/app/fuel',            icon: Fuel,  label: 'Fuel'            },
      { to: '/app/fuel-efficiency', icon: Gauge, label: 'Fuel Efficiency' },
      { to: '/app/emissions',       icon: Leaf,  label: 'CO₂ Emissions'  },
    ],
  },
  {
    label: 'Maintenance',
    items: [
      { to: '/app/maintenance', icon: Wrench,       label: 'Maintenance'     },
      { to: '/app/calendar',    icon: CalendarDays, label: 'Sched. Calendar' },
      { to: '/app/expenses',    icon: Receipt,      label: 'Expenses'        },
    ],
  },
  {
    label: 'Safety',
    items: [
      { to: '/app/geofences',   icon: ShieldCheck, label: 'Geofences'   },
      { to: '/app/safety',      icon: ShieldAlert, label: 'Safety'      },
      { to: '/app/incidents',   icon: Siren,       label: 'Incidents'   },
      { to: '/app/alert-rules', icon: BellRing,    label: 'Alert Rules' },
      { to: '/app/compliance',  icon: FileWarning, label: 'Compliance'  },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/app/utilization',       icon: PieChart,  label: 'Utilization'    },
      { to: '/app/reports',           icon: BarChart2, label: 'Reports'        },
      { to: '/app/scheduled-reports', icon: MailCheck, label: 'Sched. Reports', ownerOnly: true },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/app/notifications', icon: Bell,          label: 'Notifications' },
      { to: '/app/activity-log',  icon: ClipboardList, label: 'Activity Log'  },
      { to: '/app/simulator',     icon: Radio,         label: 'GPS Simulator', ownerOnly: true },
      { to: '/app/team',          icon: Users,         label: 'Team Members',  ownerOnly: true },
      { to: '/app/settings',      icon: Settings,      label: 'Settings'      },
    ],
  },
];

// ── Portal tooltip shown when sidebar is collapsed ─────────────────────────
function SidebarTooltip({
  label,
  badge,
  children,
}: {
  label: string;
  badge?: number;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setCoords({ top: r.top + r.height / 2, left: r.right + 10 });
    }
    setVisible(true);
  };

  return (
    <div ref={ref} onMouseEnter={handleEnter} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              transform: 'translateY(-50%)',
              zIndex: 9999,
              pointerEvents: 'none',
            }}
            className="flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-xl"
          >
            {/* Arrow */}
            <span
              style={{
                position: 'absolute',
                right: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
                borderWidth: 5,
                borderStyle: 'solid',
                borderColor: 'transparent #111827 transparent transparent',
              }}
            />
            {label}
            {badge != null && badge > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

// ── Main sidebar ───────────────────────────────────────────────────────────
export default function Sidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapse,
}: SidebarProps) {
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isTeamMember = user?.isTeamMember ?? false;

  // Determine which group contains the current active route
  const activeGroupLabel =
    menuGroups.find((g) =>
      g.items.some((item) =>
        item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + '/'),
      ),
    )?.label ?? '';

  // Per-group open/closed — default is open; persisted in localStorage
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(() => {
    try {
      const s = localStorage.getItem('tp-sidebar-groups');
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  });

  const toggleGroup = useCallback(
    (label: string) => {
      if (label === activeGroupLabel) return; // active group stays open
      setGroupOpen((prev) => {
        const wasOpen = prev[label] !== false; // default = open
        const next = { ...prev, [label]: !wasOpen };
        localStorage.setItem('tp-sidebar-groups', JSON.stringify(next));
        return next;
      });
    },
    [activeGroupLabel],
  );

  const isGroupOpen = (label: string) =>
    collapsed ||                      // collapsed = all groups show icons
    label === activeGroupLabel ||     // active group is always open
    groupOpen[label] !== false;       // default = open

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

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !isTeamMember || !item.ownerOnly,
          );
          if (visibleItems.length === 0) return null;

          const open_ = isGroupOpen(group.label);
          const isActive = group.label === activeGroupLabel;

          return (
            <div key={group.label} className="mb-2">
              {/* Group header */}
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={clsx(
                    'flex w-full items-center justify-between rounded-md px-3 py-1 mb-1 transition-colors',
                    isActive
                      ? 'cursor-default text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-300',
                  )}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest">
                    {group.label}
                  </span>
                  <ChevronDown
                    className={clsx(
                      'h-3.5 w-3.5 transition-transform duration-200',
                      !open_ && '-rotate-90',
                      isActive && 'opacity-0',
                    )}
                  />
                </button>
              ) : (
                <div className="mx-1 mb-2 mt-1 border-t border-gray-100 dark:border-slate-700" />
              )}

              {/* Animated item list */}
              <div
                className={clsx(
                  'grid transition-[grid-template-rows] duration-200 ease-in-out',
                  open_ ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
              >
                <ul className="overflow-hidden space-y-0.5">
                  {visibleItems.map((item) => {
                    const link = (
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onClose}
                        className={({ isActive }) =>
                          clsx(
                            'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-gray-200',
                            collapsed && 'justify-center',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {/* Left accent bar */}
                            {isActive && !collapsed && (
                              <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-emerald-600 dark:bg-emerald-400" />
                            )}

                            <item.icon
                              className={clsx(
                                'h-[18px] w-[18px] flex-shrink-0 transition-transform duration-150',
                                !isActive && 'group-hover:scale-110',
                              )}
                            />

                            {!collapsed && (
                              <>
                                <span className="flex-1 truncate">{item.label}</span>
                                {item.to === '/app/notifications' && unreadCount > 0 && (
                                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                  </span>
                                )}
                              </>
                            )}

                            {collapsed && item.to === '/app/notifications' && unreadCount > 0 && (
                              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                                {unreadCount > 9 ? '9+' : unreadCount}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    );

                    return (
                      <li key={item.to}>
                        {collapsed ? (
                          <SidebarTooltip
                            label={item.label}
                            badge={
                              item.to === '/app/notifications' ? unreadCount : undefined
                            }
                          >
                            {link}
                          </SidebarTooltip>
                        ) : (
                          link
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
