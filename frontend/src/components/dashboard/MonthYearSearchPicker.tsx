'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const MONTHS = [
  { num: '01', name: 'January', short: 'Jan' },
  { num: '02', name: 'February', short: 'Feb' },
  { num: '03', name: 'March', short: 'Mar' },
  { num: '04', name: 'April', short: 'Apr' },
  { num: '05', name: 'May', short: 'May' },
  { num: '06', name: 'June', short: 'Jun' },
  { num: '07', name: 'July', short: 'Jul' },
  { num: '08', name: 'August', short: 'Aug' },
  { num: '09', name: 'September', short: 'Sep' },
  { num: '10', name: 'October', short: 'Oct' },
  { num: '11', name: 'November', short: 'Nov' },
  { num: '12', name: 'December', short: 'Dec' },
];

export interface MonthYearSearchPickerProps {
  value?: string; // e.g. "2026-11" or "ALL"
  onChange: (value: string) => void;
  docCounts?: Record<string, number>; // "YYYY-MM" -> count
  className?: string;
  placeholder?: string;
}

export function MonthYearSearchPicker({
  value = 'ALL',
  onChange,
  docCounts = {},
  className,
  placeholder = 'Search Month & Year...',
}: MonthYearSearchPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentYear = new Date().getFullYear();
  const currentMonthNum = String(new Date().getMonth() + 1).padStart(2, '0');
  const currentMonthKey = `${currentYear}-${currentMonthNum}`;

  // State for visual year navigator
  const [viewYear, setViewYear] = useState<number>(() => {
    if (value && /^\d{4}-\d{2}$/.test(value)) {
      return parseInt(value.slice(0, 4), 10);
    }
    return currentYear;
  });

  // Keep viewYear in sync if value changes externally
  useEffect(() => {
    if (value && /^\d{4}-\d{2}$/.test(value)) {
      setViewYear(parseInt(value.slice(0, 4), 10));
    }
  }, [value]);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Available year options for dropdown (e.g. 2018 to 2035)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    for (let y = currentYear - 6; y <= currentYear + 6; y++) {
      yearsSet.add(y);
    }
    Object.keys(docCounts).forEach((k) => {
      const y = parseInt(k.slice(0, 4), 10);
      if (!isNaN(y)) yearsSet.add(y);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [currentYear, docCounts]);

  // Live Search results matching searchQuery
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    // Extract 4-digit year if typed (e.g. "2024" or "nov 2025")
    const yearMatch = q.match(/\b(19\d{2}|20\d{2})\b/);
    const explicitYear = yearMatch ? parseInt(yearMatch[1], 10) : null;
    const monthQuery = explicitYear
      ? q.replace(String(explicitYear), '').trim()
      : q;

    // If explicit year, search only that year; otherwise search across recent years
    const candidateYears = explicitYear
      ? [explicitYear]
      : [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear + 1];

    const list: Array<{
      key: string;
      label: string;
      year: number;
      monthName: string;
      count: number;
    }> = [];

    for (const yr of candidateYears) {
      for (const m of MONTHS) {
        const ymKey = `${yr}-${m.num}`;
        const fullLabel = `${m.name} ${yr}`;
        const shortLabel = `${m.short} ${yr}`;

        let matches = false;
        if (!monthQuery) {
          // User only typed the year, match all 12 months
          matches = true;
        } else {
          const mNum = parseInt(m.num, 10);
          const qNum = parseInt(monthQuery, 10);
          if (
            m.name.toLowerCase().includes(monthQuery) ||
            m.short.toLowerCase().includes(monthQuery) ||
            (!isNaN(qNum) && qNum === mNum) ||
            fullLabel.toLowerCase().includes(q) ||
            shortLabel.toLowerCase().includes(q)
          ) {
            matches = true;
          }
        }

        if (matches) {
          list.push({
            key: ymKey,
            label: fullLabel,
            year: yr,
            monthName: m.name,
            count: docCounts[ymKey] || 0,
          });
        }
      }
    }

    return list;
  }, [searchQuery, currentYear, docCounts]);

  // Display label on the trigger button
  const selectedLabel = useMemo(() => {
    if (!value || value === 'ALL') return null;
    if (/^\d{4}-\d{2}$/.test(value)) {
      try {
        const [y, m] = value.split('-').map(Number);
        const dt = new Date(y, m - 1, 1);
        const name = dt.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        const count = docCounts[value];
        return count !== undefined ? `${name} (${count})` : name;
      } catch {
        return value;
      }
    }
    return value;
  }, [value, docCounts]);

  const handleSelect = (monthKey: string) => {
    onChange(monthKey);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        handleSelect(searchResults[0].key);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={cn('relative inline-block text-left', className)} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs',
          value && value !== 'ALL'
            ? 'bg-teal-50 border-teal-300 text-teal-900 hover:bg-teal-100'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
        )}
        title="Search any month and year"
      >
        <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
        <span className="font-semibold truncate max-w-[170px]">
          {selectedLabel || placeholder}
        </span>
        {value && value !== 'ALL' ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange('ALL');
            }}
            className="p-0.5 rounded-full hover:bg-teal-200 text-teal-700 hover:text-rose-700 transition-colors ml-0.5 cursor-pointer"
            title="Clear filter"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 top-full w-80 rounded-2xl bg-white shadow-2xl border border-slate-200 p-3.5 z-50 animate-in fade-in zoom-in-95 space-y-3">
          {/* 1. Live Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type month or year (e.g. Nov 2026, 2025)..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2. SEARCH RESULTS VIEW (When query is typed) */}
          {searchQuery.trim() !== '' ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Matching Months ({searchResults.length})</span>
                <span className="text-[9px] font-normal lowercase text-slate-400">Press Enter to select</span>
              </div>
              <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                {searchResults.length > 0 ? (
                  searchResults.map((res) => {
                    const isSelected = value === res.key;
                    return (
                      <button
                        key={res.key}
                        type="button"
                        onClick={() => handleSelect(res.key)}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer',
                          isSelected
                            ? 'bg-teal-700 text-white shadow-xs font-bold'
                            : 'hover:bg-teal-50 text-slate-800 border border-slate-100 hover:border-teal-200'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Calendar
                            className={cn(
                              'w-3.5 h-3.5 shrink-0',
                              isSelected ? 'text-white' : 'text-teal-600'
                            )}
                          />
                          <span>{res.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded-full font-mono font-bold',
                              isSelected
                                ? 'bg-white/20 text-white'
                                : res.count > 0
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-slate-100 text-slate-500'
                            )}
                          >
                            {res.count} {res.count === 1 ? 'doc' : 'docs'}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white ml-1 shrink-0" />}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No month found matching &ldquo;{searchQuery}&rdquo;.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 3. VISUAL YEAR & 12-MONTH GRID VIEW (When search is empty) */
            <div className="space-y-3">
              {/* Year Switcher */}
              <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setViewYear((y) => y - 1)}
                  className="p-1 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 shadow-2xs transition-all cursor-pointer"
                  title="Previous Year"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">Year:</span>
                  <select
                    value={viewYear}
                    onChange={(e) => setViewYear(Number(e.target.value))}
                    className="text-xs font-black text-slate-900 bg-white border border-slate-200 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setViewYear((y) => y + 1)}
                  className="p-1 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 shadow-2xs transition-all cursor-pointer"
                  title="Next Year"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 12 Months Grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS.map((m) => {
                  const ymKey = `${viewYear}-${m.num}`;
                  const isSelected = value === ymKey;
                  const isCurrent = currentMonthKey === ymKey;
                  const count = docCounts[ymKey] || 0;

                  return (
                    <button
                      key={m.num}
                      type="button"
                      onClick={() => handleSelect(ymKey)}
                      className={cn(
                        'p-2 rounded-xl text-center border transition-all cursor-pointer relative flex flex-col items-center justify-center min-h-[46px]',
                        isSelected
                          ? 'bg-teal-700 border-teal-700 text-white shadow-xs font-bold'
                          : count > 0
                          ? 'bg-teal-50/70 hover:bg-teal-100 border-teal-200 text-teal-950 font-semibold'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      )}
                    >
                      <span className="text-xs font-bold leading-tight">{m.short}</span>
                      <span
                        className={cn(
                          'text-[9px] font-mono mt-0.5',
                          isSelected
                            ? 'text-white/80 font-bold'
                            : count > 0
                            ? 'text-teal-700 font-bold'
                            : 'text-slate-400'
                        )}
                      >
                        {count > 0 ? `${count} docs` : isCurrent ? 'current' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Footer Quick Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => handleSelect(currentMonthKey)}
              className="font-semibold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
            >
              Current Month
            </button>
            <button
              type="button"
              onClick={() => handleSelect('ALL')}
              className="font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors cursor-pointer"
            >
              All Months
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

