import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Tabs from '../../components/ui/Tabs';
import Drawer from '../../components/ui/Drawer';
import Modal from '../../components/ui/Modal';
import StatusChip from '../../components/ui/StatusChip';
import toast from 'react-hot-toast';
import type { SmrRequest, Site } from '../../types';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

const TABS = [
  { key: 'REQUESTED', label: 'Requested' },
  { key: 'SYNCED_TO_ERP', label: 'Pending (ERP)' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export default function SmrPage() {
  const [activeTab, setActiveTab] = useState('REQUESTED');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['smr', activeTab],
    queryFn: () => api.get('/smr', { params: { state: activeTab } }).then((r) => r.data),
  });
  const smrs: SmrRequest[] = data?.smrs ?? [];

  const { data: engineers = [] } = useQuery({
    queryKey: ['manager-engineers'],
    queryFn: () => api.get('/users/manager/engineers').then((r) => r.data),
  });

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: () => api.get('/sites').then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.put(`/smr/${id}/approve-manager`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['smr'] }); toast.success('SMR approved'); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.put(`/smr/${id}/reject`, { reason }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['smr'] }); toast.success('SMR rejected'); },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, engineerId }: { id: string; engineerId: string }) => api.put(`/smr/${id}/assign`, { engineerId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['smr'] }); toast.success('SMR assigned to engineer'); },
  });

  const selected = selectedIdx !== null ? smrs[selectedIdx] : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">SMR Management</h1>
        <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Raise SMR
        </button>
      </div>

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {smrs.map((smr, idx) => (
          <div key={smr.id} onClick={() => setSelectedIdx(idx)} className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-800">{smr.customerName}</span>
              <StatusChip status={smr.erpStatus ?? smr.state} />
            </div>
            <p className="text-xs text-gray-500">{smr.site?.name}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{smr.source.replace(/_/g, ' ')}</span>
              <span className="text-xs text-gray-500">{(smr.items as any[])?.length ?? 0} items</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">{new Date(smr.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
        {smrs.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">No SMRs in this tab</div>}
      </div>

      {/* Detail Modal */}
      <Modal open={selected !== null} onClose={() => setSelectedIdx(null)} title="SMR Detail" wide>
        {selected && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setSelectedIdx((i) => (i !== null && i > 0 ? i - 1 : i))} disabled={selectedIdx === 0} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <StatusChip status={selected.erpStatus ?? selected.state} />
              <button onClick={() => setSelectedIdx((i) => (i !== null && i < smrs.length - 1 ? i + 1 : i))} disabled={selectedIdx === smrs.length - 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><span className="text-gray-500">Customer</span><p className="font-medium">{selected.customerName}</p></div>
              <div><span className="text-gray-500">Site</span><p className="font-medium">{selected.site?.name}</p></div>
              <div><span className="text-gray-500">Source</span><p className="font-medium">{selected.source}</p></div>
              <div><span className="text-gray-500">Requester</span><p className="font-medium">{selected.requester?.name}</p></div>
              {selected.erpId && <div><span className="text-gray-500">ERP ID</span><p className="font-medium">{selected.erpId}</p></div>}
            </div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Items</h3>
            <table className="w-full text-sm mb-4">
              <thead><tr className="border-b"><th className="text-left py-1 px-2">Item</th><th className="text-left py-1 px-2">Part #</th><th className="text-left py-1 px-2">Qty</th><th className="text-left py-1 px-2">Unit</th></tr></thead>
              <tbody>
                {(selected.items as any[])?.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 px-2">{item.itemName}</td>
                    <td className="py-1 px-2">{item.partNumber}</td>
                    <td className="py-1 px-2">{item.quantity}</td>
                    <td className="py-1 px-2">{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {selected.state === 'REQUESTED' && (
              <div className="flex gap-3 mt-4">
                <button onClick={() => { if (confirm('Approve without consulting engineer?')) approveMutation.mutate(selected.id); }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Approve Directly</button>
                <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1" defaultValue="" onChange={(e) => { if (e.target.value) assignMutation.mutate({ id: selected.id, engineerId: e.target.value }); }}>
                  <option value="" disabled>Assign to engineer...</option>
                  {engineers.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <button onClick={() => { const reason = prompt('Rejection reason:'); if (reason) rejectMutation.mutate({ id: selected.id, reason }); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Reject</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <CreateSmrDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} engineers={engineers} sites={sites} />
    </div>
  );
}

function CreateSmrDrawer({ open, onClose, engineers, sites }: { open: boolean; onClose: () => void; engineers: any[]; sites: Site[] }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ customerName: '', siteId: '', ticketId: '', assignedEngineerId: '', notes: '' });
  const [items, setItems] = useState([{ itemName: '', partNumber: '', quantity: 1, unit: 'pcs' }]);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/smr', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['smr'] }); toast.success('SMR created'); onClose(); },
    onError: () => toast.error('Failed to create SMR'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...form, items: items.filter((i) => i.itemName) };
    if (!payload.ticketId) delete payload.ticketId;
    if (!payload.assignedEngineerId) delete payload.assignedEngineerId;
    createMutation.mutate(payload);
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <Drawer open={open} onClose={onClose} title="Raise SMR">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
          <input value={form.customerName} onChange={set('customerName')} required className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site *</label>
          <select value={form.siteId} onChange={set('siteId')} required className="input">
            <option value="">Select site</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assign Engineer</label>
          <select value={form.assignedEngineerId} onChange={set('assignedEngineerId')} className="input">
            <option value="">None</option>
            {engineers.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Items *</label>
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
              <input placeholder="Item name" value={item.itemName} onChange={(e) => { const n = [...items]; n[idx].itemName = e.target.value; setItems(n); }} className="input text-xs" />
              <input placeholder="Part #" value={item.partNumber} onChange={(e) => { const n = [...items]; n[idx].partNumber = e.target.value; setItems(n); }} className="input text-xs" />
              <input type="number" min={1} value={item.quantity} onChange={(e) => { const n = [...items]; n[idx].quantity = +e.target.value; setItems(n); }} className="input text-xs" />
              <input placeholder="Unit" value={item.unit} onChange={(e) => { const n = [...items]; n[idx].unit = e.target.value; setItems(n); }} className="input text-xs" />
            </div>
          ))}
          <button type="button" onClick={() => setItems([...items, { itemName: '', partNumber: '', quantity: 1, unit: 'pcs' }])} className="text-xs text-blue-600 hover:underline">+ Add item</button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={set('notes')} rows={3} className="input" />
        </div>
        <button type="submit" disabled={createMutation.isPending} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
          {createMutation.isPending ? 'Creating...' : 'Raise SMR'}
        </button>
      </form>
    </Drawer>
  );
}
