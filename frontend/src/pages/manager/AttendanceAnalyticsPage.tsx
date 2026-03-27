import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import MonthNavigator from '../../components/ui/MonthNavigator';
import Tabs from '../../components/ui/Tabs';
import type { AttendanceRecord } from '../../types';

type TimeMode = 'day' | 'month';
type SubjectMode = 'engineer' | 'site';

export default function AttendanceAnalyticsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [timeMode, setTimeMode] = useState<TimeMode>('day');
  const [subjectMode, setSubjectMode] = useState<SubjectMode>('engineer');

  const { data: records = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance-analytics', month, year, timeMode],
    queryFn: () =>
      api.get('/attendance/analytics', { params: { mode: timeMode, month, year } }).then((r) => r.data),
  });

  // Group records by engineer or site
  const grouped = records.reduce<Record<string, AttendanceRecord[]>>((acc, r) => {
    const key = subjectMode === 'engineer'
      ? r.engineer?.name ?? r.engineerId
      : r.site?.name ?? r.siteId;
    (acc[key] ??= []).push(r);
    return acc;
  }, {});

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const exportCsv = () => {
    const headers = ['Name', ...(timeMode === 'day' ? days.map(String) : months.map((m) => m.toString())), 'Total'];
    const rows = Object.entries(grouped).map(([name, recs]) => {
      if (timeMode === 'day') {
        const cells = days.map((d) => {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const rec = recs.find((r) => r.attendanceDate.startsWith(dateStr));
          return rec?.state === 'PRESENT' || rec?.state === 'MANUAL_APPROVED' ? 'P' : 'A';
        });
        const absent = cells.filter((c) => c === 'A').length;
        return [name, ...cells, absent.toString()];
      } else {
        const cells = months.map((m) => {
          const monthRecs = recs.filter((r) => new Date(r.attendanceDate).getMonth() + 1 === m);
          const absent = monthRecs.filter((r) => r.state === 'ABSENT').length;
          return absent.toString();
        });
        const total = cells.reduce((s, c) => s + parseInt(c), 0);
        return [name, ...cells, total.toString()];
      }
    });

    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-analytics-${year}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Attendance Analytics</h1>
        <div className="flex items-center gap-4">
          <button onClick={exportCsv} className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Export CSV
          </button>
          <MonthNavigator
            month={month}
            year={year}
            onChange={(m, y) => { setMonth(m); setYear(y); }}
            mode={timeMode === 'month' ? 'year' : 'month'}
          />
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <Tabs
          tabs={[{ key: 'day', label: 'Day-wise' }, { key: 'month', label: 'Month-wise' }]}
          active={timeMode}
          onChange={(k) => setTimeMode(k as TimeMode)}
        />
        <Tabs
          tabs={[{ key: 'engineer', label: 'Engineer-wise' }, { key: 'site', label: 'Site-wise' }]}
          active={subjectMode}
          onChange={(k) => setSubjectMode(k as SubjectMode)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-auto">
        <table className="border-collapse w-full">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-600 border-b border-r border-gray-200 min-w-[180px]">
                {subjectMode === 'engineer' ? 'Engineer' : 'Site'}
              </th>
              {(timeMode === 'day' ? days : months).map((col) => (
                <th key={col} className="px-3 py-3 text-center text-xs font-medium text-gray-600 border-b border-gray-200 min-w-[60px]">
                  {timeMode === 'day' ? col : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][col - 1]}
                </th>
              ))}
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-600 border-b border-gray-200">Total</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([name, recs]) => {
              let totalAbsent = 0;
              return (
                <tr key={name} className="hover:bg-gray-50/50">
                  <td className="sticky left-0 bg-white px-4 py-2 text-sm font-medium text-gray-800 border-b border-r border-gray-200">
                    {name}
                  </td>
                  {(timeMode === 'day' ? days : months).map((col) => {
                    if (timeMode === 'day') {
                      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(col).padStart(2, '0')}`;
                      const rec = recs.find((r) => r.attendanceDate.startsWith(dateStr));
                      const present = rec?.state === 'PRESENT' || rec?.state === 'MANUAL_APPROVED' || rec?.state === 'OVERRIDDEN';
                      if (!present && rec) totalAbsent++;
                      return (
                        <td key={col} className="px-2 py-2 text-center text-sm border-b border-gray-100" title={rec ? `${name} - ${rec.site?.name ?? ''}` : ''}>
                          {rec ? (present ? '✅' : '❌') : '—'}
                        </td>
                      );
                    } else {
                      const monthRecs = recs.filter((r) => new Date(r.attendanceDate).getMonth() + 1 === col);
                      const absent = monthRecs.filter((r) => r.state === 'ABSENT').length;
                      totalAbsent += absent;
                      return (
                        <td key={col} className="px-2 py-2 text-center text-sm border-b border-gray-100">
                          {absent || '—'}
                        </td>
                      );
                    }
                  })}
                  <td className="px-2 py-2 text-center text-sm font-semibold border-b border-gray-100">
                    {totalAbsent}
                  </td>
                </tr>
              );
            })}
            {Object.keys(grouped).length === 0 && (
              <tr>
                <td colSpan={100} className="px-4 py-8 text-center text-gray-400">No data for this period</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
