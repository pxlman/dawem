import { format, startOfWeek, endOfWeek, eachDayOfInterval, Day } from 'date-fns';
import { LogEntry } from '@/types/index';

/**
 * Get the total of habit completions for a specific week
 * @param habitId The ID of the habit to check
 * @param date Any date within the week to check
 * @param logs Array of log entries
 * @param startDayOfWeek The day to start the week (0 = Sunday, 1 = Monday, etc.)
 * @returns The total number of times the habit was completed in that week
 */
export const getWeeklyHabitTotal = (
  habitId: string, 
  date: Date, 
  logs: LogEntry[], 
  startDayOfWeek: Day = 6
): number => {
  // Get the start and end of the week containing the provided date
  const weekStart = startOfWeek(date, { weekStartsOn: startDayOfWeek });
  const weekEnd = endOfWeek(date, { weekStartsOn: startDayOfWeek });
  
  // Generate all dates in the week
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  // Sum up all logs for this habit in the selected week
  return daysInWeek.reduce((total, day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayLog = logs.find((log: LogEntry) => log.habitId === habitId && log.date === dayStr);
    return total + (dayLog?.value || 0);
  }, 0);
};
