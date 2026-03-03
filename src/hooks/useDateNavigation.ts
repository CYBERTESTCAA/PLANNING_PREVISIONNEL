import { useState, useCallback, useMemo } from 'react';
import { addWeeks, subWeeks, addMonths, subMonths, addYears, subYears, startOfWeek } from 'date-fns';
import { ViewType } from '@/types/planning';
import { getWeekDays, getMonthDays, getYearMonths, formatDate } from '@/lib/dateUtils';

export const useDateNavigation = (initialDate: Date = new Date()) => {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [viewType, setViewType] = useState<ViewType>('week');

  const goToPreviousPeriod = useCallback(() => {
    setCurrentDate(prev => {
      switch (viewType) {
        case 'day':
          return new Date(prev.getTime() - 86400000);
        case 'week':
          return subWeeks(prev, 1);
        case 'month':
          return subMonths(prev, 1);
        case 'year':
          return subYears(prev, 1);
        default:
          return subWeeks(prev, 1);
      }
    });
  }, [viewType]);

  const goToNextPeriod = useCallback(() => {
    setCurrentDate(prev => {
      switch (viewType) {
        case 'day':
          return new Date(prev.getTime() + 86400000);
        case 'week':
          return addWeeks(prev, 1);
        case 'month':
          return addMonths(prev, 1);
        case 'year':
          return addYears(prev, 1);
        default:
          return addWeeks(prev, 1);
      }
    });
  }, [viewType]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToDate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const visibleDays = useMemo(() => {
    switch (viewType) {
      case 'day':
        return [currentDate];
      case 'week':
        return getWeekDays(currentDate);
      case 'month':
        return getMonthDays(currentDate);
      case 'year':
        return getYearMonths(currentDate);
      default:
        return getWeekDays(currentDate);
    }
  }, [currentDate, viewType]);

  const weekStart = useMemo(() => {
    return startOfWeek(currentDate, { weekStartsOn: 1 });
  }, [currentDate]);

  const periodLabel = useMemo(() => {
    const start = visibleDays[0];
    const end = visibleDays[visibleDays.length - 1];
    
    if (viewType === 'day') {
      return formatDate(start, 'EEEE d MMMM yyyy');
    } else if (viewType === 'week') {
      return `${formatDate(start, 'd MMM')} - ${formatDate(end, 'd MMM yyyy')}`;
    } else if (viewType === 'month') {
      return formatDate(start, 'MMMM yyyy');
    } else {
      return String(start.getFullYear());
    }
  }, [visibleDays, viewType]);

  return {
    currentDate,
    viewType,
    setViewType,
    goToPreviousPeriod,
    goToNextPeriod,
    goToToday,
    goToDate,
    visibleDays,
    weekStart,
    periodLabel,
  };
};
