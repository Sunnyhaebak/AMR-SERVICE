import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';
import StatusChip from '../../components/ui/StatusChip';
import type { AttendanceRecord } from '../../types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function EngineerSchedulePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const now = new Date();

  const { data: records = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['my-schedule'],
    queryFn: () =>
      api.get('/attendance', {
        params: { engineer_id: user?.id, month: now.getMonth() + 1, year: now.getFullYear() },
      }).then((r) => r.data),
  });

  // Filter to today and future only
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const futureRecords = records.filter((r) => new Date(r.attendanceDate) >= today);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Schedule</h1>
        <button
          onClick={() => navigate('/engineer/analytics')}
          className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          See History
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Day</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Site</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">State</th>
            </tr>
          </thead>
          <tbody>
            {futureRecords.map((r) => {
              const date = new Date(r.attendanceDate);
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <tr key={r.id} className={`border-b border-gray-100 ${isToday ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <td className="py-3 px-4 font-medium">{date.toLocaleDateString()}</td>
                  <td className="py-3 px-4">{DAY_NAMES[date.getDay()]}</td>
                  <td className="py-3 px-4">{r.site?.name ?? '—'}</td>
                  <td className="py-3 px-4"><StatusChip status={r.state} /></td>
                </tr>
              );
            })}
            {futureRecords.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-gray-400">No upcoming schedule</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
