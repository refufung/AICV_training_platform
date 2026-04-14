import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { AlertTriangle, CheckCircle2, ClipboardList, Eye } from 'lucide-react';
import { getDefectStats } from '../api/client';
import type { DefectStats } from '../types';
import { SEVERITY_HEX } from '../theme/colors';
import { GlowCard } from '../components/ui/GlowCard';
import { StatCard } from '../components/ui/StatCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { StatusBadge } from '../components/ui/StatusBadge';

/* ── Recharts custom dark tooltip ── */
const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-300 font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill || p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DefectStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDefectStats()
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="p-6">
        <SectionHeader title="Dashboard" accent="green" />
        <p className="text-red-400 mt-4">Failed to load stats: {error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <SectionHeader title="Dashboard" accent="green" />
        <p className="text-gray-500 mt-4">Loading...</p>
      </div>
    );
  }

  const severityData = Object.entries(stats.by_severity).map(([name, value]) => ({
    name,
    value,
  }));

  const classData = Object.entries(stats.by_class).map(([name, value]) => ({
    name,
    value,
  }));

  const statusIcon = (status: string) => {
    if (status === 'fixed') return CheckCircle2;
    if (status === 'reviewed') return Eye;
    return ClipboardList;
  };

  const statusGlow = (status: string) => {
    if (status === 'fixed') return 'green' as const;
    if (status === 'reviewed') return 'cyan' as const;
    return 'purple' as const;
  };

  return (
    <div className="p-6 space-y-6">
      <SectionHeader title="Dashboard" accent="green" />

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={AlertTriangle}
          label="Total Defects"
          value={stats.total}
          glow="cyan"
        />
        {Object.entries(stats.by_status).map(([status, count]) => (
          <StatCard
            key={status}
            icon={statusIcon(status)}
            label={status}
            value={count}
            glow={statusGlow(status)}
          />
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Defects by class */}
        <GlowCard glow="cyan">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">By Defect Class</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={classData}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="value" fill="#06b6d4" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlowCard>

        {/* Severity pie */}
        <GlowCard glow="purple">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">By Severity</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={severityData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={85}
                innerRadius={40}
                paddingAngle={3}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {severityData.map((entry) => (
                  <Cell key={entry.name} fill={SEVERITY_HEX[entry.name] || '#64748b'} />
                ))}
              </Pie>
              <Tooltip content={<DarkTooltip />} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: '#9ca3af' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </GlowCard>
      </div>

      {/* ── Recent defects table ── */}
      <GlowCard glow="green">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Recent Defects</h2>
        {stats.recent.length === 0 ? (
          <p className="text-gray-500 text-sm">No defects yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-surface-600">
                  <th className="pb-2 font-medium">ID</th>
                  <th className="pb-2 font-medium">Class</th>
                  <th className="pb-2 font-medium">Severity</th>
                  <th className="pb-2 font-medium">Floor</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-surface-700/50 last:border-0 hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => navigate(`/defects/${d.id}`)}
                  >
                    <td className="py-2 text-gray-300">#{d.id}</td>
                    <td className="py-2 text-gray-300">{d.defect_class}</td>
                    <td className="py-2">
                      <StatusBadge type="severity" value={d.severity} />
                    </td>
                    <td className="py-2 text-gray-400">{d.floor}</td>
                    <td className="py-2">
                      <StatusBadge type="status" value={d.status} />
                    </td>
                    <td className="py-2 text-gray-500">{new Date(d.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlowCard>
    </div>
  );
}
