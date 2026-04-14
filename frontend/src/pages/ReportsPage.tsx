import { useState } from 'react';
import { downloadBCF, downloadPDF, downloadCSV } from '../api/client';

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

export default function ReportsPage() {
  const bcf = useDownload(downloadBCF, 'defects.bcfzip');
  const pdf = useDownload(downloadPDF, 'inspection_report.pdf');
  const csv = useDownload(downloadCSV, 'defects.csv');

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Reports & Export</h1>

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-2">BCF Export</h2>
          <p className="text-sm text-gray-500 mb-3">
            Download all defect issues as a BCF (BIM Collaboration Format) zip file.
            Import into Revit, Navisworks, or other BIM tools.
          </p>
          <button
            onClick={bcf.download}
            disabled={bcf.loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            {bcf.loading ? 'Generating...' : 'Download BCF'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-2">PDF Report</h2>
          <p className="text-sm text-gray-500 mb-3">
            Generate a comprehensive inspection report in PDF format with summary
            statistics and defect register.
          </p>
          <button
            onClick={pdf.download}
            disabled={pdf.loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            {pdf.loading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-2">CSV Export</h2>
          <p className="text-sm text-gray-500 mb-3">
            Export defect data as a CSV spreadsheet for analysis in Excel or
            other tools.
          </p>
          <button
            onClick={csv.download}
            disabled={csv.loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            {csv.loading ? 'Generating...' : 'Download CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}
