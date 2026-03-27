import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import Tabs from '../../components/ui/Tabs';
import StatusChip from '../../components/ui/StatusChip';
import type { Site, Bot, ChangeHistory } from '../../types';

type Mode = 'bot' | 'customer';

export default function ChangeHistoryPage() {
  const [mode, setMode] = useState<Mode>('bot');
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: () => api.get('/sites').then((r) => r.data),
  });

  const { data: bots = [] } = useQuery<Bot[]>({
    queryKey: ['bots', selectedSites],
    queryFn: () => api.get('/bots', { params: { site_id: selectedSites[0] } }).then((r) => r.data),
    enabled: mode === 'bot' && selectedSites.length > 0,
  });

  const { data: botHistory = [] } = useQuery<ChangeHistory[]>({
    queryKey: ['change-history-bot', selectedBot],
    queryFn: () => api.get('/change-history/bot', { params: { bot_id: selectedBot } }).then((r) => r.data),
    enabled: mode === 'bot' && !!selectedBot,
  });

  const { data: customerHistory = [] } = useQuery<ChangeHistory[]>({
    queryKey: ['change-history-customer', selectedSites],
    queryFn: () => api.get('/change-history/customer', { params: { site_ids: selectedSites.join(',') } }).then((r) => r.data),
    enabled: mode === 'customer' && selectedSites.length > 0,
  });

  const history = mode === 'bot' ? botHistory : customerHistory;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">AMR Change History</h1>

      <div className="flex gap-6 h-[calc(100vh-160px)]">
        {/* Left Pane */}
        <div className="w-[280px] bg-white rounded-xl border border-gray-200 p-4 flex flex-col shrink-0">
          <Tabs tabs={[{ key: 'bot', label: 'Bot' }, { key: 'customer', label: 'Customer' }]} active={mode} onChange={(k) => { setMode(k as Mode); setSelectedBot(null); }} />

          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Customer Site</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={selectedSites[0] ?? ''}
              onChange={(e) => { setSelectedSites(e.target.value ? [e.target.value] : []); setSelectedBot(null); }}
            >
              <option value="">Select site</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.customerName}</option>)}
            </select>
          </div>

          {mode === 'bot' && selectedSites.length > 0 && (
            <div className="mt-4 flex-1 overflow-y-auto">
              <label className="block text-xs font-medium text-gray-600 mb-1">Bots</label>
              <div className="space-y-1">
                {bots.map((bot) => (
                  <button
                    key={bot.id}
                    onClick={() => setSelectedBot(bot.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedBot === bot.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {bot.botNumber} {bot.model && <span className="text-xs text-gray-400">({bot.model})</span>}
                  </button>
                ))}
                {bots.length === 0 && <p className="text-xs text-gray-400 py-2">No bots at this site</p>}
              </div>
            </div>
          )}
        </div>

        {/* Right Pane */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-auto">
          {history.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Engineer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Change</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Service</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Subtype</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Days</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-4">{new Date(h.date).toLocaleDateString()}</td>
                    <td className="py-2 px-4">{h.site?.customerName}</td>
                    <td className="py-2 px-4">{h.engineer?.name}</td>
                    <td className="py-2 px-4">{h.changeType}</td>
                    <td className="py-2 px-4">{h.serviceType}</td>
                    <td className="py-2 px-4">{h.changeSubtype}</td>
                    <td className="py-2 px-4"><StatusChip status={h.status} /></td>
                    <td className="py-2 px-4">{h.timeTakenDays ?? 'Ongoing'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              {selectedSites.length === 0 ? 'Select a customer site to view history' : 'No change history found'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
