// utils/dateUtils.ts
import { format, getDay, getDate, isSameDay, subDays, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns'; // Ensure format is imported
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
export function isHabitDue(habit: Habit, currentDate: Date): boolean {
    const today = currentDate.toISOString().split('T')[0]; // Format as 'yyyy-MM-dd'

    // Check if the habit is within its start and end dates
    if (habit.startDate && today < habit.startDate) return false;
    if (habit.endDate && today > habit.endDate) return false;

    // Handle daily habits
    if (habit.repetition.type === 'daily') {
        return true;
    }

    // Handle weekly habits
    if (habit.repetition.type === 'weekly') {
        const dayOfWeek = (currentDate.getDay() + 1 ) % 7; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        if (habit.repetition.config.ndaysPerWeek !== undefined ) return true;
        else
        return habit.repetition.config.daysOfWeek?.includes(dayOfWeek) ?? false;
    }
    return false;
}

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

/**
 * Returns the date string of the Saturday for the week containing the given date
 * @param date The date to find the week's Saturday for
 * @returns ISO date string (YYYY-MM-DD) for the Saturday
 */
export const getSaturdayDateString = (date: Date | string): string => {
    const d = new Date(date);
    const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Calculate the date of Saturday for the current week
    if (dayOfWeek === 0) {
        // Sunday: go back 1 day to previous Saturday
        d.setDate(d.getDate() - 1);
    } else if (dayOfWeek !== 6) {
        // Monday-Friday: go forward to next Saturday
        d.setDate(d.getDate() - (dayOfWeek + 1));
    }
    // If dayOfWeek === 6, it's already Saturday, no adjustment needed
    
    return d.toISOString().split('T')[0]; // Format as 'yyyy-MM-dd'
};
