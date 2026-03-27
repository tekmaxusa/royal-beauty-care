import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function ymdFromParts(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return { y: +m[1], m: +m[2] - 1, d: +m[3] };
}

interface BookingDateCalendarProps {
  availableDates: string[];
  value: string;
  onChange: (ymd: string) => void;
}

export default function BookingDateCalendar({ availableDates, value, onChange }: BookingDateCalendarProps) {
  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const parsed = value ? parseYmd(value) : null;
    if (parsed) return new Date(parsed.y, parsed.m, 1);
    const first = availableDates[0] ? parseYmd(availableDates[0]) : null;
    if (first) return new Date(first.y, first.m, 1);
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    const parsed = value ? parseYmd(value) : null;
    if (parsed) {
      setCalendarMonth(new Date(parsed.y, parsed.m, 1));
    }
  }, [value]);

  const getDaysInMonth = (d: Date) => {
    const year = d.getFullYear();
    const month = d.getMonth();
    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const pad: number[] = [];
    for (let i = 0; i < first; i++) pad.push(-1);
    for (let i = 1; i <= days; i++) pad.push(i);
    return { pad, year, month };
  };

  const { pad, year, month } = getDaysInMonth(calendarMonth);

  if (availableDates.length === 0) {
    return <p className="text-sm text-salon-ink/60">No dates available yet.</p>;
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-salon-gold mb-2">
        {calendarMonth.toLocaleString('default', { month: 'long' })} {calendarMonth.getFullYear()}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-salon-ink/50 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {pad.map((day, i) =>
          day === -1 ? (
            <div key={i} />
          ) : (
            (() => {
              const ymd = ymdFromParts(year, month, day);
              const selectable = availableSet.has(ymd);
              const selected = value === ymd;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!selectable}
                  onClick={() => onChange(ymd)}
                  className={`aspect-square text-sm rounded transition-colors ${
                    !selectable
                      ? 'text-salon-ink/20 cursor-not-allowed'
                      : selected
                        ? 'bg-salon-gold text-white'
                        : 'hover:bg-salon-beige text-salon-ink'
                  }`}
                >
                  {day}
                </button>
              );
            })()
          ),
        )}
      </div>
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
          className="p-2 border border-salon-ink/10 hover:border-salon-gold"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
          className="p-2 border border-salon-ink/10 hover:border-salon-gold"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
