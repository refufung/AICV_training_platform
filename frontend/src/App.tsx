import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { Building2, BarChart3, Camera, Map, List, FileDown, Menu, Bell } from 'lucide-react';
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

const navItems = [
  { to: '/map', icon: Map, label: 'Map' },
  { to: '/', icon: BarChart3, label: 'Dashboard' },
  { to: '/bim', icon: Building2, label: 'BIM Viewer' },
  { to: '/defects', icon: List, label: 'Defects' },
  { to: '/capture', icon: Camera, label: 'Capture' },
  { to: '/reports', icon: FileDown, label: 'Reports' },
];

function App() {
  const { token, sidebarOpen, toggleSidebar, logout } = useStore();
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

  // Skip login — go straight to dashboard
  // if (!token) return <LoginPage />;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-56' : 'w-16'
        } bg-gray-900 text-white flex flex-col transition-all duration-200`}
      >
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-700">
          <button onClick={toggleSidebar} className="p-1 hover:bg-gray-700 rounded">
            <Menu size={20} />
          </button>
          {sidebarOpen && (
            <span className="font-semibold text-sm truncate">AI Inspection</span>
          )}
        </div>
        <nav className="flex-1 py-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="px-4 py-3 text-sm text-gray-400 hover:text-white hover:bg-gray-800 text-left border-t border-gray-700"
        >
          {sidebarOpen ? 'Logout' : '->'}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto relative">
        {/* Top bar with notification bell */}
        <div className="flex justify-end items-center px-4 py-2 bg-white border-b relative">
          <button
            onClick={toggleNotifs}
            className="relative p-2 rounded hover:bg-gray-100"
          >
            <Bell size={20} className="text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-4 top-12 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-auto">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="px-3 py-4 text-sm text-gray-400 text-center">No notifications</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-3 py-2 border-b text-sm cursor-pointer hover:bg-gray-50 ${
                      !n.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      if (n.link) window.location.hash = n.link;
                      setShowNotifs(false);
                    }}
                  >
                    <p className="text-gray-700">{n.message}</p>
                    {n.created_at && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
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
