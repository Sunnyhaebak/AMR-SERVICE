import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import MonthNavigator from '../../components/ui/MonthNavigator';
import toast from 'react-hot-toast';
import type { AttendanceRecord, Site } from '../../types';

interface EngineerRow {
  id: string;
  name: string;
}

export default function AttendanceMarkingPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [dragState, setDragState] = useState<{
    engineerId: string;
    siteId: string;
    siteName: string;
    startDay: number;
    currentDay: number;
  } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const { data: engineers = [] } = useQuery<EngineerRow[]>({
    queryKey: ['manager-engineers'],
    queryFn: () => api.get('/users/manager/engineers').then((r) => r.data),
  });

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: () => api.get('/sites').then((r) => r.data),
  });

  const { data: records = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', month, year],
    queryFn: () =>
      api.get('/attendance', { params: { month, year } }).then((r) => r.data),
  });

  // Auto-scroll to today's column
  useEffect(() => {
    if (month === now.getMonth() + 1 && year === now.getFullYear() && tableRef.current) {
      const todayCol = tableRef.current.querySelector(`[data-day="${now.getDate()}"]`);
      todayCol?.scrollIntoView({ inline: 'center', behavior: 'smooth' });
    }
  }, [month, year, records]);

  const markMutation = useMutation({
    mutationFn: (payload: { engineerId: string; siteId: string; date: string }) =>
      api.put('/attendance/mark', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance', month, year] }),
  });

  const bulkMarkMutation = useMutation({
    mutationFn: (payload: { records: { engineerId: string; siteId: string; date: string }[] }) =>
      api.post('/attendance/bulk', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', month, year] });
      toast.success('Attendance updated');
    },
  });

  const getRecord = useCallback(
    (engineerId: string, day: number) => {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return records.find(
        (r) => r.engineerId === engineerId && r.attendanceDate.substring(0, 10) === dateStr,
      );
    },
    [records, month, year],
  );

  const handleCellSelect = (engineerId: string, day: number, siteId: string) => {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    markMutation.mutate({ engineerId, siteId, date });
  };

  const handleDragEnd = () => {
    if (!dragState) return;
    const { engineerId, siteId, startDay, currentDay } = dragState;
    const from = Math.min(startDay, currentDay);
    const to = Math.max(startDay, currentDay);
    const bulkRecords = [];
    for (let d = from; d <= to; d++) {
      bulkRecords.push({
        engineerId,
        siteId,
        date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }
    bulkMarkMutation.mutate({ records: bulkRecords });
    setDragState(null);
  };

  const getDayOfWeek = (day: number) => new Date(year, month - 1, day).getDay();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Attendance Marking</h1>
        <MonthNavigator month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
      </div>

      <div ref={tableRef} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-auto max-h-[calc(100vh-160px)]">
        <table className="border-collapse w-full">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-600 border-b border-r border-gray-200 min-w-[180px]">
                Engineer
              </th>
              {days.map((day) => {
                const isSunday = getDayOfWeek(day) === 0;
                const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
                return (
                  <th
                    key={day}
                    data-day={day}
                    className={`px-2 py-3 text-center text-xs font-medium border-b border-gray-200 min-w-[90px] ${
                      isSunday ? 'bg-gray-100 text-gray-400' : 'text-gray-600'
                    } ${isToday ? 'bg-blue-50 text-blue-700' : ''}`}
                  >
                    {day}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {engineers.map((eng) => (
              <tr key={eng.id} className="hover:bg-gray-50/50">
                <td className="sticky left-0 z-10 bg-white px-4 py-2 text-sm font-medium text-gray-800 border-b border-r border-gray-200 whitespace-nowrap">
                  {eng.name}
                </td>
                {days.map((day) => {
                  const record = getRecord(eng.id, day);
                  const isSunday = getDayOfWeek(day) === 0;
                  const isDragging =
                    dragState?.engineerId === eng.id &&
                    day >= Math.min(dragState.startDay, dragState.currentDay) &&
                    day <= Math.max(dragState.startDay, dragState.currentDay);

                  return (
                    <td
                      key={day}
                      className={`px-1 py-1 border-b border-gray-100 text-center relative ${
                        isSunday ? 'bg-gray-50' : ''
                      } ${isDragging ? 'bg-blue-100' : ''}`}
                      onMouseDown={() => {
                        if (record?.site) {
                          setDragState({
                            engineerId: eng.id,
                            siteId: record.siteId,
                            siteName: record.site.name,
                            startDay: day,
                            currentDay: day,
                          });
                        }
                      }}
                      onMouseEnter={() => {
                        if (dragState && dragState.engineerId === eng.id) {
                          setDragState({ ...dragState, currentDay: day });
                        }
                      }}
                      onMouseUp={handleDragEnd}
                    >
                      {record?.site ? (
                        <div
                          className={`text-xs px-1 py-1 rounded truncate cursor-grab ${
                            record.source === 'ENGINEER_CHECKIN'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                          title={`${record.site.name} (${record.source === 'ENGINEER_CHECKIN' ? 'Self' : 'Manager'})`}
                        >
                          {record.site.name}
                        </div>
                      ) : (
                        <SiteDropdown
                          sites={sites}
                          onSelect={(siteId) => handleCellSelect(eng.id, day, siteId)}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SiteDropdown({ sites, onSelect }: { sites: Site[]; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full h-full min-h-[28px] text-xs text-gray-300 hover:text-gray-500 hover:bg-gray-50 rounded"
      >
        +
      </button>
    );
  }

  return (
    <select
      autoFocus
      className="w-full text-xs border border-blue-300 rounded px-1 py-1 outline-none"
      onChange={(e) => {
        if (e.target.value) onSelect(e.target.value);
        setOpen(false);
      }}
      onBlur={() => setOpen(false)}
      defaultValue=""
    >
      <option value="" disabled>Select site</option>
      {sites.map((s) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  );
}
