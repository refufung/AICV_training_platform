import { useState } from 'react';
import { FileDown, FileText, Table2 } from 'lucide-react';
import { downloadBCF, downloadPDF, downloadCSV } from '../api/client';
import { GlowCard } from '../components/ui/GlowCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import type { GlowColor } from '../components/ui/GlowCard';

function useDownload(fetcher: () => Promise<Blob>, filename: string) {
  const [loading, setLoading] = useState(false);
  const download = async () => {
    setLoading(true);
    try {
      const blob = await fetcher();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert(`Failed to download ${filename}`);
    } finally {
      setLoading(false);
    }
  };
  return { download, loading };
}

const REPORTS: {
  title: string;
  desc: string;
  glow: GlowColor;
  icon: typeof FileDown;
  gradient: string;
}[] = [
  {
    title: 'BCF Export',
    desc: 'Download all defect issues as a BCF (BIM Collaboration Format) zip file. Import into Revit, Navisworks, or other BIM tools.',
    glow: 'cyan',
    icon: FileDown,
    gradient: 'from-neon-cyan to-neon-blue',
  },
  {
    title: 'PDF Report',
    desc: 'Generate a comprehensive inspection report in PDF format with summary statistics and defect register.',
    glow: 'purple',
    icon: FileText,
    gradient: 'from-neon-purple to-neon-magenta',
  },
  {
    title: 'CSV Export',
    desc: 'Export defect data as a CSV spreadsheet for analysis in Excel or other tools.',
    glow: 'green',
    icon: Table2,
    gradient: 'from-neon-green to-neon-cyan',
  },
];

export default function ReportsPage() {
  const hooks = [
    useDownload(downloadBCF, 'defects.bcfzip'),
    useDownload(downloadPDF, 'inspection_report.pdf'),
    useDownload(downloadCSV, 'defects.csv'),
  ];

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <SectionHeader title="Reports & Export" accent="green" />

      <div className="space-y-4">
        {REPORTS.map((r, i) => {
          const { download, loading } = hooks[i];
          const Icon = r.icon;
          return (
            <GlowCard key={r.title} glow={r.glow}>
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${r.gradient} shrink-0`}>
                  <Icon size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-200 mb-1">{r.title}</h2>
                  <p className="text-sm text-gray-400 mb-3">{r.desc}</p>
                  <button
                    onClick={download}
                    disabled={loading}
                    className={`bg-gradient-to-r ${r.gradient} text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity`}
                  >
                    {loading ? 'Generating...' : `Download ${r.title.split(' ')[0]}`}
                  </button>
                </div>
              </div>
            </GlowCard>
          );
        })}
      </div>
    </div>
  );
}
