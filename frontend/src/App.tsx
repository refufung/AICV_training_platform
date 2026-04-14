import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  Building2,
  BarChart3,
  Camera,
  Map,
  List,
  FileDown,
  Menu,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStore } from './store';
import { getUnreadCount, getNotifications, markAllNotificationsRead } from './api/client';
import Dashboard from './pages/Dashboard';
import BimViewerPage from './pages/BimViewerPage';
import DefectsPage from './pages/DefectsPage';
import DefectDetailPage from './pages/DefectDetailPage';
import CaptureDefect from './pages/CaptureDefect';
import MapPage from './pages/MapPage';
import ReportsPage from './pages/ReportsPage';
import LoginPage from './pages/LoginPage';
import type { Notification } from './types';

/* ── Navigation structure matching 5-layer architecture ── */
const NAV_SECTIONS = [
  {
    label: 'Pipeline',
    items: [
      { to: '/capture', icon: Camera, label: 'Capture', accent: 'border-neon-orange' },
      { to: '/defects', icon: List, label: 'Defects', accent: 'border-neon-purple' },
      { to: '/bim', icon: Building2, label: 'BIM Viewer', accent: 'border-neon-cyan' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/', icon: BarChart3, label: 'Dashboard', accent: 'border-neon-green' },
      { to: '/map', icon: Map, label: 'Map', accent: 'border-neon-purple' },
      { to: '/reports', icon: FileDown, label: 'Reports', accent: 'border-neon-green' },
    ],
  },
];

/* ── Breadcrumb labels for routes ── */
const ROUTE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/bim': 'BIM Viewer',
  '/defects': 'Defects',
  '/capture': 'Capture',
  '/map': 'Map',
  '/reports': 'Reports',
};

function App() {
  const { token, sidebarOpen, toggleSidebar, logout } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!token) return;
    const poll = () => getUnreadCount().then(setUnreadCount).catch(() => {});
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, [token]);

  const toggleNotifs = async () => {
    if (!showNotifs) {
      try {
        const items = await getNotifications();
        setNotifications(items);
      } catch { /* ignore */ }
    }
    setShowNotifs(!showNotifs);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead().catch(() => {});
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  /* Breadcrumb segments */
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbLabel =
    ROUTE_LABELS[location.pathname] ||
    (pathSegments[0] === 'defects' && pathSegments[1]
      ? `Defect #${pathSegments[1]}`
      : 'Page');

  // Skip login — go straight to dashboard
  // if (!token) return <LoginPage />;

  return (
    <div className="flex h-screen bg-surface-950">
      {/* ── Sidebar ── */}
      <aside
        className={`${
          sidebarOpen ? 'w-56' : 'w-16'
        } bg-gradient-to-b from-surface-900 to-surface-950 text-white flex flex-col transition-all duration-200 border-r border-surface-700/50`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-surface-700/50">
          <button onClick={toggleSidebar} className="p-1 hover:bg-surface-700 rounded transition-colors">
            <Menu size={20} />
          </button>
          {sidebarOpen && (
            <span className="font-semibold text-sm truncate bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
              AI Inspection
            </span>
          )}
        </div>

        {/* Nav sections */}
        <nav className="flex-1 py-2 space-y-1">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {sidebarOpen && (
                <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                  {section.label}
                </p>
              )}
              {section.items.map(({ to, icon: Icon, label, accent }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 text-sm transition-all border-l-2 ${
                      isActive
                        ? `${accent} bg-white/5 text-white`
                        : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`
                  }
                >
                  <Icon size={18} />
                  {sidebarOpen && <span>{label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <button
          onClick={logout}
          className="px-4 py-3 text-sm text-gray-500 hover:text-gray-300 hover:bg-white/5 text-left border-t border-surface-700/50 transition-colors"
        >
          {sidebarOpen ? 'Logout' : '→'}
        </button>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto relative">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-2 bg-surface-900/80 backdrop-blur-md border-b border-surface-700/50">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <span className="hover:text-gray-200 cursor-pointer" onClick={() => navigate('/')}>
              Home
            </span>
            <ChevronRight size={12} className="text-gray-600" />
            <span className="text-gray-200">{breadcrumbLabel}</span>
          </div>

          {/* Notification bell */}
          <button
            onClick={toggleNotifs}
            className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Bell size={18} className="text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotifs && (
            <div className="absolute right-4 top-12 w-80 bg-surface-800 rounded-xl border border-surface-600 shadow-2xl z-50 max-h-96 overflow-auto">
              <div className="flex items-center justify-between px-3 py-2 border-b border-surface-700">
                <span className="font-semibold text-sm text-gray-200">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-neon-cyan hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="px-3 py-4 text-sm text-gray-500 text-center">No notifications</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-3 py-2 border-b border-surface-700/50 text-sm cursor-pointer hover:bg-white/5 transition-colors ${
                      !n.read ? 'bg-neon-cyan/5 border-l-2 border-l-neon-cyan' : ''
                    }`}
                    onClick={() => {
                      if (n.link) navigate(n.link);
                      setShowNotifs(false);
                    }}
                  >
                    <p className="text-gray-300">{n.message}</p>
                    {n.created_at && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bim" element={<BimViewerPage />} />
          <Route path="/defects" element={<DefectsPage />} />
          <Route path="/defects/:id" element={<DefectDetailPage />} />
          <Route path="/capture" element={<CaptureDefect />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
