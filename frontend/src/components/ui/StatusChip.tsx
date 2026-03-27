import clsx from 'clsx';

const colorMap: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  PRESENT: 'bg-green-100 text-green-800',
  ABSENT: 'bg-red-100 text-red-800',
  PLANNED: 'bg-blue-100 text-blue-800',
  OVERRIDE_PENDING: 'bg-orange-100 text-orange-800',
  OVERRIDDEN: 'bg-purple-100 text-purple-800',
  MANUAL_APPROVED: 'bg-teal-100 text-teal-800',
  REQUESTED: 'bg-yellow-100 text-yellow-800',
  ASSIGNED_TO_ENGINEER: 'bg-blue-100 text-blue-800',
  APPROVED_BY_ENGINEER: 'bg-cyan-100 text-cyan-800',
  APPROVED_BY_MANAGER: 'bg-green-100 text-green-800',
  SYNCED_TO_ERP: 'bg-emerald-100 text-emerald-800',
  DRAFT: 'bg-gray-100 text-gray-800',
  APPROVED: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
};

interface Props {
  status: string;
  className?: string;
}

export default function StatusChip({ status, className }: Props) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorMap[status] ?? 'bg-gray-100 text-gray-800',
        className,
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
