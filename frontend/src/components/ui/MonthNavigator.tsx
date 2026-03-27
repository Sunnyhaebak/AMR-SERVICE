import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Backward limit: October 2025
const MIN_YEAR = 2025;
const MIN_MONTH = 10;

interface Props {
  month: number; // 1-12
  year: number;
  onChange: (month: number, year: number) => void;
  mode?: 'month' | 'year';
}

export default function MonthNavigator({ month, year, onChange, mode = 'month' }: Props) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Forward limit: Dec of current year, or Feb next year if current month is Dec
  const maxYear = currentMonth === 12 ? currentYear + 1 : currentYear;
  const maxMonth = currentMonth === 12 ? 2 : 12;

  const canGoBack = mode === 'year'
    ? year > MIN_YEAR
    : !(year === MIN_YEAR && month <= MIN_MONTH);

  const canGoForward = mode === 'year'
    ? year < maxYear
    : !(year === maxYear && month >= maxMonth);

  const goBack = () => {
    if (!canGoBack) return;
    if (mode === 'year') {
      onChange(month, year - 1);
    } else if (month === 1) {
      onChange(12, year - 1);
    } else {
      onChange(month - 1, year);
    }
  };

  const goForward = () => {
    if (!canGoForward) return;
    if (mode === 'year') {
      onChange(month, year + 1);
    } else if (month === 12) {
      onChange(1, year + 1);
    } else {
      onChange(month + 1, year);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={goBack}
        disabled={!canGoBack}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span className="text-lg font-semibold text-gray-800 min-w-[180px] text-center">
        {mode === 'year' ? year : `${MONTHS[month - 1]} ${year}`}
      </span>
      <button
        onClick={goForward}
        disabled={!canGoForward}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
