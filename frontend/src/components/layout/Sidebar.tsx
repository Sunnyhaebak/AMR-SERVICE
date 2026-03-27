import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import {
  CalendarDays, BarChart3, Ticket, Users, Package,
  History, ClipboardList, LogOut, Bot,
} from 'lucide-react';
import clsx from 'clsx';

const managerLinks = [
  { to: '/manager/attendance', label: 'Attendance', icon: CalendarDays },
  { to: '/manager/attendance-analytics', label: 'Attendance Analytics', icon: BarChart3 },
  { to: '/manager/tickets', label: 'Tickets', icon: Ticket },
  { to: '/manager/engineers', label: 'Service Engineers', icon: Users },
  { to: '/manager/smr', label: 'SMR', icon: Package },
  { to: '/manager/change-history', label: 'AMR Change History', icon: History },
];

const engineerLinks = [
  { to: '/engineer/tickets', label: 'Tickets', icon: ClipboardList },
  { to: '/engineer/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/engineer/schedule', label: 'Schedule', icon: CalendarDays },
];

const adminLinks = [
  { to: '/admin/users', label: 'User Management', icon: Users },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const links = [
    ...(user?.roles.includes('ADMIN') ? adminLinks : []),
    ...(user?.roles.includes('MANAGER') ? managerLinks : []),
    ...(user?.roles.includes('ENGINEER') ? engineerLinks : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-blue-600" />
          <span className="font-semibold text-lg text-gray-800">AMR Platform</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100',
              )
            }
          >
            <link.icon className="w-4 h-4" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-200">
        <div className="px-3 py-2 text-sm text-gray-500 truncate">{user?.name}</div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
