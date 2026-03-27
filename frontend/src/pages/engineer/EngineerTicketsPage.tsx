import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';
import Tabs from '../../components/ui/Tabs';
import Modal from '../../components/ui/Modal';
import StatusChip from '../../components/ui/StatusChip';
import toast from 'react-hot-toast';
import type { Ticket } from '../../types';

const TABS = [
  { key: 'ASSIGNED', label: 'Requested' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
];

export default function EngineerTicketsPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState('ASSIGNED');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const queryClient = useQueryClient();

  // Completion flow state
  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({ changeType: 'HARDWARE', materialsUsed: '', reasonForChange: '', workDone: '', notes: '' });
  const [completionStep, setCompletionStep] = useState(1);

  const { data } = useQuery({
    queryKey: ['engineer-tickets', activeTab],
    queryFn: () => api.get('/tickets', { params: { state: activeTab, engineer_id: user?.id } }).then((r) => r.data),
  });
  const tickets: Ticket[] = data?.tickets ?? [];

  const acceptMutation = useMutation({
    mutationFn: (id: string) => api.put(`/tickets/${id}/accept`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['engineer-tickets'] }); toast.success('Ticket accepted'); setSelectedTicket(null); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.put(`/tickets/${id}/reject`, { reason }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['engineer-tickets'] }); toast.success('Ticket rejected'); setSelectedTicket(null); setShowReject(false); },
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, images, formData }: { id: string; images: string[]; formData: any }) =>
      api.put(`/tickets/${id}/complete`, { images, formData }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['engineer-tickets'] }); toast.success('Ticket completed'); setSelectedTicket(null); },
  });

  const openTicket = (t: Ticket) => {
    setSelectedTicket(t);
    setCompletionStep(1);
    setImages(t.images ?? []);
    setShowReject(false);
    setRejectReason('');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Tickets</h1>
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {tickets.map((t) => (
          <div key={t.id} onClick={() => openTicket(t)} className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-800">#{t.ticketNumber}</span>
              <StatusChip status={t.state} />
            </div>
            <p className="text-sm text-gray-700 font-medium">{t.customerName}</p>
            <p className="text-xs text-gray-500">{t.customerLocation}</p>
            <div className="flex gap-2 mt-2 text-xs text-gray-500">
              <span className="px-2 py-0.5 bg-gray-100 rounded">{t.serviceType}</span>
              <span className="px-2 py-0.5 bg-gray-100 rounded">{t.changeType}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">{t.startDate} → {t.endDate}</p>
          </div>
        ))}
        {tickets.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">No tickets here</div>}
      </div>

      {/* Ticket Detail / Completion Modal */}
      <Modal open={!!selectedTicket} onClose={() => setSelectedTicket(null)} title={selectedTicket ? `Ticket #${selectedTicket.ticketNumber}` : ''} wide>
        {selectedTicket && (
          <div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div><span className="text-gray-500">Customer</span><p className="font-medium">{selectedTicket.customerName}</p></div>
              <div><span className="text-gray-500">Location</span><p className="font-medium">{selectedTicket.customerLocation}</p></div>
              <div><span className="text-gray-500">Service</span><p className="font-medium">{selectedTicket.serviceType} / {selectedTicket.changeType}</p></div>
              <div><span className="text-gray-500">Dates</span><p className="font-medium">{selectedTicket.startDate} → {selectedTicket.endDate}</p></div>
            </div>

            {/* ASSIGNED — Accept / Reject */}
            {selectedTicket.state === 'ASSIGNED' && (
              <div>
                {showReject ? (
                  <div className="space-y-3">
                    <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection (required)" rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    <div className="flex gap-3">
                      <button onClick={() => rejectMutation.mutate({ id: selectedTicket.id, reason: rejectReason })} disabled={!rejectReason} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50">Confirm Reject</button>
                      <button onClick={() => setShowReject(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => acceptMutation.mutate(selectedTicket.id)} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Accept</button>
                    <button onClick={() => setShowReject(true)} className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Reject</button>
                  </div>
                )}
              </div>
            )}

            {/* IN_PROGRESS — 3-step completion */}
            {selectedTicket.state === 'IN_PROGRESS' && (
              <div>
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3].map((s) => (
                    <button key={s} onClick={() => setCompletionStep(s)} className={`px-4 py-2 rounded-lg text-sm font-medium ${completionStep === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {s === 1 ? 'Upload Images' : s === 2 ? 'Fill Details' : 'Review & Complete'}
                    </button>
                  ))}
                </div>

                {completionStep === 1 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">Upload photos of the work performed (min 1 required)</p>
                    <input type="text" placeholder="Paste image URL and press Enter" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
                      onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLInputElement).value) { setImages([...images, (e.target as HTMLInputElement).value]); (e.target as HTMLInputElement).value = ''; } }} />
                    <div className="flex gap-2 flex-wrap">
                      {images.map((url, i) => (
                        <div key={i} className="relative">
                          <img src={url} alt={`Upload ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border" />
                          <button onClick={() => setImages(images.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs">×</button>
                        </div>
                      ))}
                    </div>
                    {images.length > 0 && <p className="text-xs text-green-600 mt-2">✓ {images.length} image(s) uploaded</p>}
                  </div>
                )}

                {completionStep === 2 && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Change Type</label>
                      <select value={formData.changeType} onChange={(e) => setFormData({ ...formData, changeType: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="HARDWARE">Hardware</option><option value="SOFTWARE">Software</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Materials Used</label>
                      <textarea value={formData.materialsUsed} onChange={(e) => setFormData({ ...formData, materialsUsed: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Change *</label>
                      <textarea value={formData.reasonForChange} onChange={(e) => setFormData({ ...formData, reasonForChange: e.target.value })} rows={2} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Work Done *</label>
                      <textarea value={formData.workDone} onChange={(e) => setFormData({ ...formData, workDone: e.target.value })} rows={2} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                )}

                {completionStep === 3 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">Review all details before marking complete.</p>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2 mb-4">
                      <p>Images: {images.length}</p>
                      <p>Change Type: {formData.changeType}</p>
                      <p>Reason: {formData.reasonForChange || '—'}</p>
                      <p>Work Done: {formData.workDone || '—'}</p>
                    </div>
                    <button
                      onClick={() => { if (confirm('Mark this ticket as completed?')) completeMutation.mutate({ id: selectedTicket.id, images, formData }); }}
                      disabled={images.length === 0 || !formData.reasonForChange || !formData.workDone}
                      className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      Mark as Completed
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
