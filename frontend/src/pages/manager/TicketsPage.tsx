import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Tabs from '../../components/ui/Tabs';
import Drawer from '../../components/ui/Drawer';
import Modal from '../../components/ui/Modal';
import StatusChip from '../../components/ui/StatusChip';
import toast from 'react-hot-toast';
import type { Ticket, TicketState, Site } from '../../types';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'COMPLETED', label: 'Completed' },
];

export default function TicketsPage() {
  const [activeTab, setActiveTab] = useState<TicketState>('PENDING');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['tickets', activeTab],
    queryFn: () => api.get('/tickets', { params: { state: activeTab } }).then((r) => r.data),
  });

  const tickets: Ticket[] = data?.tickets ?? [];

  const { data: engineers = [] } = useQuery({
    queryKey: ['manager-engineers'],
    queryFn: () => api.get('/users/manager/engineers').then((r) => r.data),
  });

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: () => api.get('/sites').then((r) => r.data),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, engineerId }: { id: string; engineerId: string }) =>
      api.put(`/tickets/${id}/assign`, { engineerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket assigned');
    },
  });

  const selectedTicket = selectedIdx !== null ? tickets[selectedIdx] : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tickets</h1>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Create Ticket
        </button>
      </div>

      <Tabs tabs={TABS} active={activeTab} onChange={(k) => setActiveTab(k as TicketState)} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {tickets.map((ticket, idx) => (
          <div
            key={ticket.id}
            onClick={() => setSelectedIdx(idx)}
            className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-800">#{ticket.ticketNumber}</span>
              <StatusChip status={ticket.state} />
            </div>
            <p className="text-sm text-gray-700 font-medium">{ticket.customerName}</p>
            <p className="text-xs text-gray-500">{ticket.customerLocation}</p>
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
              <span className="px-2 py-0.5 bg-gray-100 rounded">{ticket.serviceType}</span>
              <span className="px-2 py-0.5 bg-gray-100 rounded">{ticket.changeType}</span>
            </div>
            {ticket.assignedEngineer && (
              <p className="text-xs text-gray-500 mt-2">Assigned: {ticket.assignedEngineer.name}</p>
            )}
            {ticket.rejectionHistory && ticket.rejectionHistory.length > 0 && (
              <p className="text-xs text-red-500 mt-1">
                Rejected by {ticket.rejectionHistory[ticket.rejectionHistory.length - 1].engineer_id}
              </p>
            )}
          </div>
        ))}
        {tickets.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">No tickets in this tab</div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      <Modal open={selectedTicket !== null} onClose={() => setSelectedIdx(null)} title={selectedTicket ? `Ticket #${selectedTicket.ticketNumber}` : ''} wide>
        {selectedTicket && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedIdx((i) => (i !== null && i > 0 ? i - 1 : i))}
                disabled={selectedIdx === 0}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <StatusChip status={selectedTicket.state} />
              <button
                onClick={() => setSelectedIdx((i) => (i !== null && i < tickets.length - 1 ? i + 1 : i))}
                disabled={selectedIdx === tickets.length - 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <Detail label="Customer" value={selectedTicket.customerName} />
              <Detail label="Location" value={selectedTicket.customerLocation} />
              <Detail label="Site" value={selectedTicket.site?.name} />
              <Detail label="Bot" value={selectedTicket.botNumber || 'N/A'} />
              <Detail label="Service Type" value={selectedTicket.serviceType} />
              <Detail label="Change Type" value={selectedTicket.changeType} />
              <Detail label="Subtype" value={selectedTicket.changeSubtype} />
              <Detail label="Start Date" value={selectedTicket.startDate} />
              <Detail label="End Date" value={selectedTicket.endDate} />
              <Detail label="Assigned To" value={selectedTicket.assignedEngineer?.name || 'Unassigned'} />
              {selectedTicket.daysTaken !== undefined && <Detail label="Days Taken" value={String(selectedTicket.daysTaken)} />}
              {selectedTicket.notes && <Detail label="Notes" value={selectedTicket.notes} />}
            </div>

            {selectedTicket.state === 'PENDING' && (
              <div className="mt-6 flex items-center gap-3">
                <select
                  id="assign-engineer"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>Select engineer</option>
                  {engineers.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const sel = (document.getElementById('assign-engineer') as HTMLSelectElement).value;
                    if (sel) assignMutation.mutate({ id: selectedTicket.id, engineerId: sel });
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Assign
                </button>
              </div>
            )}

            {selectedTicket.rejectionHistory && selectedTicket.rejectionHistory.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Rejection History</h3>
                <div className="space-y-2">
                  {selectedTicket.rejectionHistory.map((r, i) => (
                    <div key={i} className="text-xs bg-red-50 border border-red-100 rounded-lg p-3">
                      <p>Rejected at: {new Date(r.rejected_at).toLocaleString()}</p>
                      <p>Reason: {r.reason}</p>
                      {r.re_accepted_at && <p>Re-accepted at: {new Date(r.re_accepted_at).toLocaleString()}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTicket.images && selectedTicket.images.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Images</h3>
                <div className="flex gap-2 flex-wrap">
                  {selectedTicket.images.map((url, i) => (
                    <img key={i} src={url} alt={`Ticket image ${i + 1}`} className="w-24 h-24 object-cover rounded-lg border" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Ticket Drawer */}
      <CreateTicketDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} engineers={engineers} sites={sites} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span className="text-gray-500">{label}</span>
      <p className="font-medium text-gray-800">{value || '—'}</p>
    </div>
  );
}

function CreateTicketDrawer({ open, onClose, engineers, sites }: {
  open: boolean;
  onClose: () => void;
  engineers: any[];
  sites: Site[];
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    customerName: '', customerLocation: '', siteId: '', botNumber: '',
    zendeskTicketId: '', serviceType: 'REPAIR', changeType: 'HARDWARE',
    changeSubtype: '', assignedEngineerId: '', startDate: '', endDate: '', notes: '',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/tickets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket created');
      onClose();
    },
    onError: () => toast.error('Failed to create ticket'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.assignedEngineerId) delete (payload as any).assignedEngineerId;
    if (!payload.botNumber) delete (payload as any).botNumber;
    if (!payload.zendeskTicketId) delete (payload as any).zendeskTicketId;
    createMutation.mutate(payload);
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <Drawer open={open} onClose={onClose} title="Create Ticket">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Customer Name" required>
          <input value={form.customerName} onChange={set('customerName')} required className="input" />
        </Field>
        <Field label="Customer Location" required>
          <input value={form.customerLocation} onChange={set('customerLocation')} required className="input" />
        </Field>
        <Field label="Site" required>
          <select value={form.siteId} onChange={set('siteId')} required className="input">
            <option value="">Select site</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Bot Number">
          <input value={form.botNumber} onChange={set('botNumber')} className="input" />
        </Field>
        <Field label="Zendesk Ticket ID">
          <input value={form.zendeskTicketId} onChange={set('zendeskTicketId')} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Service Type" required>
            <select value={form.serviceType} onChange={set('serviceType')} className="input">
              <option value="REPAIR">Repair</option>
              <option value="CHANGE">Change</option>
            </select>
          </Field>
          <Field label="Change Type" required>
            <select value={form.changeType} onChange={set('changeType')} className="input">
              <option value="HARDWARE">Hardware</option>
              <option value="SOFTWARE">Software</option>
            </select>
          </Field>
        </div>
        <Field label="Change Subtype" required>
          <input value={form.changeSubtype} onChange={set('changeSubtype')} required className="input" />
        </Field>
        <Field label="Assign Engineer">
          <select value={form.assignedEngineerId} onChange={set('assignedEngineerId')} className="input">
            <option value="">Unassigned (Pending)</option>
            {engineers.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Date" required>
            <input type="date" value={form.startDate} onChange={set('startDate')} required className="input" />
          </Field>
          <Field label="End Date" required>
            <input type="date" value={form.endDate} onChange={set('endDate')} required className="input" />
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={form.notes} onChange={set('notes')} rows={3} className="input" />
        </Field>
        <button type="submit" disabled={createMutation.isPending} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
          {createMutation.isPending ? 'Creating...' : 'Create Ticket'}
        </button>
      </form>
    </Drawer>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
