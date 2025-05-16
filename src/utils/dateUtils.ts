// utils/dateUtils.ts
import { isBefore, isAfter, format, getDay, getDate, isSameDay, subDays, eachDayOfInterval, startOfDay, endOfDay, endOfWeek, startOfWeek, Day, isToday } from 'date-fns'; // Ensure format is imported
import { Habit, HabitLogStatus, LogEntry, HabitRepetitionType, RepetitionConfig } from '@/types/index';

export const getTodayDate = (): Date => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now;
}

export const getTodayDateString = (): string => {
    const now = getTodayDate();
    return format(now, 'yyyy-MM-dd');
};

export const getDayOfWeek = (date: Date = getTodayDate()): number => {
  return getDay(date); // Sunday - 0, ..., Saturday - 6
};

export const getDayOfMonth = (date: Date = getTodayDate()): number => {
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
// Get default date based on current time
export const getDefaultDate = (startTimeOfDay: string|undefined) => {
    if(!startTimeOfDay) startTimeOfDay = '00:00';
    const now = new Date();
    // now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    // Assuming startTimeOfDay is 4:00 AM (04:00)
    // You can replace this with a value from your app settings if available
    const startHour =  parseInt(startTimeOfDay.split(':')[0] ?? '0');
    const startMinute = parseInt(startTimeOfDay.split(':')[1] ?? '0');
    // If current time is before the start time of day, return yesterday
    if (currentHour < startHour || (currentHour === startHour && currentMinute < startMinute)) {
        return subDays(now, 1);
    }
    // Otherwise return today
    return now;
};

// Simplified isHabitDue - checks repetition type
// Returns true for daily, weekly, monthly for now (needs enhancement later)
export function isHabitDue(habit: Habit, currentDate: Date): boolean {
    // First check if the habit is enabled, if not, return false immediately
    if (habit.enabled === false) return false;
    
    const today = format(currentDate, 'yyyy-MM-dd'); // Format as 'yyyy-MM-dd'

    if(habit.repetition.type === 'weekly' && habit.measurement.type === 'count'){
        if(habit.startDate){
            const weekend = format(getWeekBoundaries(currentDate).end, 'yyyy-MM-dd');
            if(isAfter(weekend, habit.startDate)) return true;
        }else {
            return true
        }
    }
    // Check if the habit is within its start and end dates
    if (habit.startDate && isBefore(today, habit.startDate)) return false;
    if (habit.endDate && isAfter(today, habit.endDate) ) return false;
    // if (!isBefore(currentDate, new Date())
    //     && !isToday(currentDate)) return false;

    // Handle daily habits
    if (habit.repetition.type === 'daily') {
        return true;
    }
    // Handle weekly habits
    if (habit.repetition.type === 'weekly') {
        const dayOfWeek = (currentDate.getDay() + 1 ) % 7; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        return habit.repetition.config.daysOfWeek?.includes(dayOfWeek) ?? false;
    }
    return false;
}

// --- Helper for Heatmap ---
// Gets an array of Dates for the last N days, including today
export const getLastNDates = (days: number): Date[] => {
    const endDate = endOfDay(getTodayDate()); // Ensure we include all of today
    const startDate = startOfDay(subDays(endDate, days - 1)); // Go back N-1 days to get N total days
    try {
        return eachDayOfInterval({ start: startDate, end: endDate }).reverse(); // Reverse to show most recent first if needed, or keep chronological
    } catch (e) {
        console.error("Error generating date interval:", e);
        return [];
    }
};

/**
 * Returns the date string for the last day of the week containing the given date
 * @param date The date to find the week's last day for
 * @param startDayOfWeek The day to start the week (0 = Sunday, 1 = Monday, etc.)
 * @returns ISO date string (YYYY-MM-DD) for the last day of the week
 */
export const getLastDayOfWeekString = (date: Date | string, startDayOfWeek: Day = 6): string => {
    const dateObj = new Date(date);
    const endOfWeekDate = endOfWeek(dateObj, { weekStartsOn: startDayOfWeek });
    return format(endOfWeekDate, 'yyyy-MM-dd');
};

/**
 * Returns the date range for a week containing the given date
 * @param date Any date within the week
 * @param startDayOfWeek The day to start the week (0 = Sunday, 1 = Monday, etc.)
 * @returns Object with start and end dates of the week
 */
export const getWeekBoundaries = (date: Date, startDayOfWeek: Day = 6): { start: Date, end: Date} => {
    const weekStart = startOfWeek(date, { weekStartsOn: startDayOfWeek });
    const weekEnd = endOfWeek(date, { weekStartsOn: startDayOfWeek });
    return { start: weekStart, end: weekEnd };
};

/**
 * Gets all dates in a week containing the given date
 * @param date Any date within the week
 * @param startDayOfWeek The day to start the week (0 = Sunday, 1 = Monday, etc.)
 * @returns Array of Date objects for each day in the week
 */
export const getDatesInWeek = (date: Date): Date[] => {
    const { start, end } = getWeekBoundaries(date);
    return eachDayOfInterval({ start, end });
};

// Keep the existing function for backward compatibility
export const getSaturdayDateString = (date: Date | string): string => {
    // Saturday is the last day when week starts on Sunday
    return getLastDayOfWeekString(date);
};
