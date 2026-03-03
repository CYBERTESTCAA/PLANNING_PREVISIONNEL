import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatDate = (date: Date | string, formatStr: string = 'yyyy-MM-dd'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, formatStr, { locale: fr });
};

export const getWeekDays = (date: Date): Date[] => {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i)); // Mon-Sun
};

export const getWeekRange = (date: Date): { start: Date; end: Date } => {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = addDays(start, 4); // Friday
  return { start, end };
};

export const getMonthDays = (date: Date): Date[] => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return eachDayOfInterval({ start, end });
};

export const getYearMonths = (date: Date): Date[] => {
  const start = startOfYear(date);
  const end = endOfMonth(new Date(date.getFullYear(), 11, 1));
  return eachMonthOfInterval({ start, end });
};

export const getDayName = (date: Date, short: boolean = false): string => {
  return format(date, short ? 'EEE' : 'EEEE', { locale: fr });
};

export const getDayNumber = (date: Date): string => {
  return format(date, 'd', { locale: fr });
};

export const getMonthName = (date: Date, short: boolean = false): string => {
  return format(date, short ? 'MMM' : 'MMMM', { locale: fr });
};

export const getWeekNumber = (date: Date): number => {
  return parseInt(format(date, 'w', { locale: fr }));
};

export const isSameDay = (date1: Date | string, date2: Date | string): boolean => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  return formatDate(d1) === formatDate(d2);
};

export const isToday = (date: Date | string): boolean => {
  return isSameDay(date, new Date());
};

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};
