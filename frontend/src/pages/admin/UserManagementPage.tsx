import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Drawer from '../../components/ui/Drawer';
import toast from 'react-hot-toast';
import type { User, Role } from '../../types';
import { Plus, Lock, Unlock, Trash2, Pencil } from 'lucide-react';

const ALL_ROLES: Role[] = ['ADMIN', 'MANAGER', 'ENGINEER'];

export default function UserManagementPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users', search, roleFilter],
    queryFn: () => api.get('/users', { params: { search: search || undefined, role: roleFilter || undefined } }).then((r) => r.data),
  });

  const lockMutation = useMutation({
    mutationFn: ({ id, isLocked }: { id: string; isLocked: boolean }) => api.put(`/users/${id}`, { isLocked }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('User updated'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('User deleted'); },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
        <button onClick={() => { setEditUser(null); setDrawerOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Create User
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Roles</option>
          {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Roles</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Page Access</th>
              <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{u.name}</td>
                <td className="py-3 px-4 text-gray-600">{u.email}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">{u.roles.map((r) => <span key={r} className="px-2 py-0.5 bg-gray-100 rounded text-xs">{r}</span>)}</div>
                </td>
                <td className="py-3 px-4">
                  <span className={`text-xs font-medium ${u.isLocked ? 'text-red-600' : 'text-green-600'}`}>{u.isLocked ? 'Locked' : 'Active'}</span>
                </td>
                <td className="py-3 px-4 text-gray-500 text-xs">
                  {u.pageAccess && Array.isArray(u.pageAccess)
                    ? `${(u.pageAccess as string[]).length} pages`
                    : 'Role defaults'}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => { setEditUser(u); setDrawerOpen(true); }} className="p-1.5 rounded hover:bg-gray-100" title="Edit">
                      <Pencil className="w-4 h-4 text-gray-500" />
                    </button>
                    <button onClick={() => lockMutation.mutate({ id: u.id, isLocked: !u.isLocked })} className="p-1.5 rounded hover:bg-gray-100" title={u.isLocked ? 'Unlock' : 'Lock'}>
                      {u.isLocked ? <Unlock className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-orange-500" />}
                    </button>
                    <button onClick={() => { if (confirm(`Delete ${u.name}?`)) deleteMutation.mutate(u.id); }} className="p-1.5 rounded hover:bg-gray-100" title="Delete">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">No users found</td></tr>}
          </tbody>
        </table>
      </div>

      <UserFormDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setEditUser(null); }} user={editUser} />
    </div>
  );
}

// All pages in the system, mapped to which roles get them by default (per PRD Section 2.2)
const ALL_PAGES: { path: string; label: string; defaultRoles: Role[] }[] = [
  { path: '/manager/attendance',           label: 'Attendance Marking Table',  defaultRoles: ['MANAGER'] },
  { path: '/manager/attendance-analytics', label: 'Attendance Analytics',      defaultRoles: ['MANAGER', 'ENGINEER'] },
  { path: '/manager/tickets',             label: 'Tickets',                   defaultRoles: ['MANAGER', 'ENGINEER'] },
  { path: '/manager/engineers',           label: 'Service Engineers',         defaultRoles: ['MANAGER'] },
  { path: '/manager/smr',                 label: 'SMR',                       defaultRoles: ['MANAGER', 'ENGINEER'] },
  { path: '/manager/change-history',      label: 'AMR Change History',        defaultRoles: ['MANAGER'] },
  { path: '/engineer/schedule',           label: 'Schedule',                  defaultRoles: ['ENGINEER'] },
  { path: '/engineer/analytics',          label: 'Analytics (Engineer)',      defaultRoles: ['ENGINEER'] },
  { path: '/engineer/tickets',            label: 'Engineer Tickets',          defaultRoles: ['ENGINEER'] },
  { path: '/admin/users',                 label: 'User Management',           defaultRoles: ['ADMIN'] },
];

function getDefaultPagesForRoles(roles: Role[]): string[] {
  return ALL_PAGES
    .filter((p) => p.defaultRoles.some((r) => roles.includes(r)))
    .map((p) => p.path);
}

function UserFormDrawer({ open, onClose, user }: { open: boolean; onClose: () => void; user: User | null }) {
  const queryClient = useQueryClient();
  const isEdit = !!user;

  const initialRoles = user?.roles ?? ['ENGINEER'] as Role[];
  const initialPageAccess = (user?.pageAccess as string[] | null) ?? getDefaultPagesForRoles(initialRoles);

  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    roles: initialRoles,
    managerId: user?.managerId ?? '',
    pageAccess: initialPageAccess,
  });

  // When roles change, auto-add newly applicable default pages (don't remove manually unchecked ones)
  const handleRoleToggle = (role: Role) => {
    setForm((f) => {
      const newRoles = f.roles.includes(role)
        ? f.roles.filter((r) => r !== role)
        : [...f.roles, role];

      // Add default pages for newly added role
      const newDefaults = getDefaultPagesForRoles(newRoles);
      const merged = [...new Set([...f.pageAccess, ...newDefaults.filter((p) => !f.pageAccess.includes(p) && !getDefaultPagesForRoles(f.roles).includes(p))])];

      // If removing a role, remove pages that were ONLY from that role (unless user explicitly kept them)
      const filtered = merged.filter((p) => {
        const page = ALL_PAGES.find((pg) => pg.path === p);
        if (!page) return false;
        return page.defaultRoles.some((r) => newRoles.includes(r)) || f.pageAccess.includes(p);
      });

      return { ...f, roles: newRoles, pageAccess: filtered };
    });
  };

  const togglePage = (path: string) => {
    setForm((f) => {
      const newAccess = f.pageAccess.includes(path)
        ? f.pageAccess.filter((p) => p !== path)
        : [...f.pageAccess, path];

      // If we removed the current landing page, clear it
      return { ...f, pageAccess: newAccess };
    });
  };

  const { data: managers = [] } = useQuery<User[]>({
    queryKey: ['managers-list'],
    queryFn: () => api.get('/users', { params: { role: 'MANAGER' } }).then((r) => r.data),
    enabled: open && form.roles.includes('ENGINEER'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('User created'); onClose(); },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/users/${user!.id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('User updated'); onClose(); },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: form.name,
      email: form.email,
      roles: form.roles,
      pageAccess: form.pageAccess,
      defaultLandingPage: form.pageAccess[0] || undefined,
    };
    if (form.managerId) payload.managerId = form.managerId;
    if (!isEdit) payload.password = form.password;
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  // Pages relevant to the selected roles (shown with checkboxes)
  const relevantPages = ALL_PAGES.filter((p) =>
    p.defaultRoles.some((r) => form.roles.includes(r)),
  );

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit User' : 'Create User'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Roles *</label>
          <div className="flex gap-2">
            {ALL_ROLES.map((role) => (
              <button key={role} type="button" onClick={() => handleRoleToggle(role)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${form.roles.includes(role) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-500'}`}>
                {role}
              </button>
            ))}
          </div>
        </div>
        {form.roles.includes('ENGINEER') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
            <select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select manager</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}

        {/* Page Access — checkboxes per PRD Section 7.1.4 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Page Access</label>
          <p className="text-xs text-gray-400 mb-3">Uncheck a page to remove access, even if the role normally grants it.</p>
          <div className="space-y-2 bg-gray-50 rounded-lg p-3">
            {relevantPages.map((page) => (
              <label key={page.path} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.pageAccess.includes(page.path)}
                  onChange={() => togglePage(page.path)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{page.label}</span>
                <span className="text-xs text-gray-400 ml-auto">{page.defaultRoles.join(', ')}</span>
              </label>
            ))}
            {relevantPages.length === 0 && (
              <p className="text-xs text-gray-400 py-2">Select at least one role to see available pages</p>
            )}
          </div>
        </div>

        <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
          {isEdit ? 'Update User' : 'Create User'}
        </button>
      </form>
    </Drawer>
  );
}
