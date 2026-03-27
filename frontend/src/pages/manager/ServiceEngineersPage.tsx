import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import Modal from '../../components/ui/Modal';
import StatusChip from '../../components/ui/StatusChip';
import type { Ticket } from '../../types';
import { Users } from 'lucide-react';

interface EngineerCard {
  id: string;
  name: string;
  email: string;
}

export default function ServiceEngineersPage() {
  const [selectedEngineer, setSelectedEngineer] = useState<EngineerCard | null>(null);

  const { data: engineers = [] } = useQuery<EngineerCard[]>({
    queryKey: ['manager-engineers'],
    queryFn: () => api.get('/users/manager/engineers').then((r) => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Service Engineers</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {engineers.map((eng) => (
          <div
            key={eng.id}
            onClick={() => setSelectedEngineer(eng)}
            className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">{eng.name}</p>
                <p className="text-xs text-gray-500">{eng.email}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Engineer Detail Modal */}
      <Modal open={!!selectedEngineer} onClose={() => setSelectedEngineer(null)} title={selectedEngineer?.name ?? ''} wide>
        {selectedEngineer && <EngineerDetail engineerId={selectedEngineer.id} />}
      </Modal>
    </div>
  );
}

function EngineerDetail({ engineerId }: { engineerId: string }) {
  const { data } = useQuery({
    queryKey: ['engineer-tickets', engineerId],
    queryFn: () => api.get('/tickets', { params: { engineer_id: engineerId, limit: 100 } }).then((r) => r.data),
  });

  const tickets: Ticket[] = data?.tickets ?? [];

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-3 text-gray-600 font-medium">Ticket #</th>
            <th className="text-left py-2 px-3 text-gray-600 font-medium">Customer</th>
            <th className="text-left py-2 px-3 text-gray-600 font-medium">Status</th>
            <th className="text-left py-2 px-3 text-gray-600 font-medium">Service</th>
            <th className="text-left py-2 px-3 text-gray-600 font-medium">Change</th>
            <th className="text-left py-2 px-3 text-gray-600 font-medium">Date</th>
            <th className="text-left py-2 px-3 text-gray-600 font-medium">Days</th>
            <th className="text-left py-2 px-3 text-gray-600 font-medium">SLA</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => {
            const slaExpected = Math.ceil(
              (new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / (1000 * 60 * 60 * 24),
            );
            const breached = t.daysTaken !== undefined && t.daysTaken > slaExpected;
            return (
              <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 font-medium">#{t.ticketNumber}</td>
                <td className="py-2 px-3">{t.customerName}</td>
                <td className="py-2 px-3"><StatusChip status={t.state} /></td>
                <td className="py-2 px-3">{t.serviceType}</td>
                <td className="py-2 px-3">{t.changeType}</td>
                <td className="py-2 px-3">{t.startDate}</td>
                <td className="py-2 px-3">{t.daysTaken ?? 'Ongoing'}</td>
                <td className="py-2 px-3">
                  {t.state === 'COMPLETED' ? (
                    <span className={breached ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                      {breached ? 'Breached' : 'On Time'}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            );
          })}
          {tickets.length === 0 && (
            <tr><td colSpan={8} className="py-8 text-center text-gray-400">No tickets found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
