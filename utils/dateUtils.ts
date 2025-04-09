// utils/dateUtils.ts
import { format, getDay, getDate, isSameDay, subDays, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { Habit, LogEntry, HabitRepetitionType, RepetitionConfig } from '../types';

export const getTodayDateString = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const getDayOfWeek = (date: Date = new Date()): number => {
  return getDay(date); // Sunday - 0, ..., Saturday - 6
};

export const getDayOfMonth = (date: Date = new Date()): number => {
  return getDate(date); // 1-31
};

// Checks if a log entry matches a given date (ignoring time)
export const isLogForDate = (log: LogEntry, date: Date): boolean => {
    if (!log?.date) return false;
    try {
        // Assumes log.date is 'yyyy-MM-dd'
        return log.date === format(date, 'yyyy-MM-dd');
    } catch (error) {
        console.error("Error comparing log date:", log.date, error);
        return false;
    }
};

// Simplified isHabitDue - checks repetition type
// Returns true for daily, weekly, monthly for now (needs enhancement later)
export const isHabitDue = (habit: Habit, date: Date = new Date()): boolean => {
    if (!habit?.repetition) return false;
    const { type, config } = habit.repetition; // config is currently unused here

    switch (type) {
        case 'daily':
            return true;
        case 'weekly':
            // TODO: Enhance logic (e.g., check config.daysOfWeek if added back, or logs for X times/week)
            // console.warn(`'weekly' habit '${habit.title}' check simplified.`);
            return true; // Simplified for now
        case 'monthly':
             // TODO: Enhance logic (e.g., check config.daysOfMonth if added back, or logs for X times/month)
            // console.warn(`'monthly' habit '${habit.title}' check simplified.`);
            return true; // Simplified for now
        default:
            return false;
    }
};

// --- Helper for Heatmap ---
// Gets an array of Dates for the last N days, including today
export const getLastNDates = (days: number): Date[] => {
    const endDate = endOfDay(new Date()); // Ensure we include all of today
    const startDate = startOfDay(subDays(endDate, days - 1)); // Go back N-1 days to get N total days
    try {
        return eachDayOfInterval({ start: startDate, end: endDate }).reverse(); // Reverse to show most recent first if needed, or keep chronological
    } catch (e) {
        console.error("Error generating date interval:", e);
        return [];
    }
};

// Gets completion status for a specific habit on a specific date
import { HabitLogStatus } from '../types'; // Import the status type

// Define the possible heatmap statuses we'll use for coloring
export type HeatmapStatus = HabitLogStatus | 'none'; // 'right', 'wrong', 'circle', 'none'

// Updated function to return our specific HeatmapStatus type
export const getCompletionStatusForDate = (
    habitId: string,
    date: Date,
    logs: LogEntry[]
): HeatmapStatus => { // Return the specific HeatmapStatus type
    const dateString = format(date, 'yyyy-MM-dd');
    const log = logs.find(l => l.habitId === habitId && l.date === dateString);

    if (!log || !log.status) { // If no log or log has no status (e.g., count only, or old data)
        // Consider count habits here? If log exists and value > 0, maybe return 'right'?
        if (log && log.value !== undefined && log.value > 0) {
            return 'right'; // Treat positive count as 'right' for heatmap coloring
        }
        return 'none'; // Default to 'none'
    }

    // Return the status directly if it's one we recognize
    if (log.status === 'right' || log.status === 'wrong' || log.status === 'circle') {
        return log.status;
    }

    // Fallback if status is somehow invalid
    console.warn(`Unknown log status found: ${log.status} for habit ${habitId} on ${dateString}`);
    return 'none';
};
