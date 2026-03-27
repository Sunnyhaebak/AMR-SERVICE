import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';
import Tabs from '../../components/ui/Tabs';
import MonthNavigator from '../../components/ui/MonthNavigator';
import StatusChip from '../../components/ui/StatusChip';
import type { Ticket, AttendanceRecord } from '../../types';

type ViewMode = 'work' | 'attendance';

export default function EngineerAnalyticsPage() {
  const user = useAuthStore((s) => s.user);
  const now = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>('work');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [timeMode, setTimeMode] = useState<'day' | 'month'>('day');

  const { data: ticketData } = useQuery({
    queryKey: ['my-tickets-all'],
    queryFn: () => api.get('/tickets', { params: { engineer_id: user?.id, limit: 200 } }).then((r) => r.data),
    enabled: viewMode === 'work',
  });
  const tickets: Ticket[] = ticketData?.tickets ?? [];

  const { data: attendance = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['my-attendance', month, year],
    queryFn: () => api.get('/attendance', { params: { engineer_id: user?.id, month, year } }).then((r) => r.data),
    enabled: viewMode === 'attendance',
  });

  const exportCsv = (headers: string[], rows: string[][]) => {
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-analytics-${year}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Analytics</h1>
        {viewMode === 'attendance' && (
          <MonthNavigator month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} mode={timeMode === 'month' ? 'year' : 'month'} />
        )}
      </div>

      <div className="flex gap-4 mb-6">
        <Tabs tabs={[{ key: 'work', label: 'Work Analytics' }, { key: 'attendance', label: 'Attendance Analytics' }]} active={viewMode} onChange={(k) => setViewMode(k as ViewMode)} />
        {viewMode === 'attendance' && (
          <Tabs tabs={[{ key: 'day', label: 'Day-wise' }, { key: 'month', label: 'Month-wise' }]} active={timeMode} onChange={(k) => setTimeMode(k as 'day' | 'month')} />
        )}
      </div>

      {viewMode === 'work' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Ticket #</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Service</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Change</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Days</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">SLA</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const slaExpected = Math.ceil((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / 86400000);
                const breached = t.daysTaken !== undefined && t.daysTaken > slaExpected;
                return (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium">#{t.ticketNumber}</td>
                    <td className="py-2 px-4">{t.customerName}</td>
                    <td className="py-2 px-4"><StatusChip status={t.state} /></td>
                    <td className="py-2 px-4">{t.serviceType}</td>
                    <td className="py-2 px-4">{t.changeType}</td>
                    <td className="py-2 px-4">{t.startDate}</td>
                    <td className="py-2 px-4">{t.daysTaken ?? 'Ongoing'}</td>
                    <td className="py-2 px-4">{t.state === 'COMPLETED' ? (breached ? <span className="text-red-600">Breached</span> : <span className="text-green-600">On Time</span>) : '—'}</td>
                  </tr>
                );
              })}
              {tickets.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-gray-400">No tickets</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'attendance' && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => {
                const headers = ['Date', 'Site', 'State', 'Check In', 'Check Out', 'Source'];
                const rows = attendance.map((r) => [r.attendanceDate, r.site?.name ?? '', r.state, r.checkInTime ?? '', r.checkOutTime ?? '', r.source]);
                exportCsv(headers, rows);
              }}
              className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Export CSV
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Site</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">State</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Check In</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Check Out</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Source</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-4">{new Date(r.attendanceDate).toLocaleDateString()}</td>
                    <td className="py-2 px-4">{r.site?.name}</td>
                    <td className="py-2 px-4"><StatusChip status={r.state} /></td>
                    <td className="py-2 px-4">{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : '—'}</td>
                    <td className="py-2 px-4">{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '—'}</td>
                    <td className="py-2 px-4 text-xs">{r.source === 'ENGINEER_CHECKIN' ? 'Self' : 'Manager'}</td>
                  </tr>
                ))}
                {attendance.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">No attendance records</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
