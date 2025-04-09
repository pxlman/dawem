// types/index.ts

export type HabitRepetitionType = 'daily' | 'weekly' | 'monthly';
export type HabitMeasurementType = 'binary' | 'count';
export type HabitLogStatus = 'right' | 'wrong' | 'circle';

// --- ADDED fields to RepetitionConfig ---
export interface RepetitionConfig {
    daysOfWeek?: number[]; // 0=Sat, 1=Sun, ..., 6=Fri (For 'weekly')
    daysPerWeek?: number; // Number of days the habit should be done in a week
    daysOfMonth?: number[]; // 1-31 (For 'monthly')
    // Add other future options here (interval, timesPerWeek etc.)
}

export interface HabitRepetition { type: HabitRepetitionType; config: RepetitionConfig; }

// --- ADDED targetValue to HabitMeasurement ---
export interface HabitMeasurement {
    type: HabitMeasurementType;
    unit?: string;
    targetValue?: number; // Target value for count habits
    weeklyReset?: boolean; // Reset count at the end of the week
}

export interface Habit {
    id: string; title: string; color: string; icon?: string;
    repetition: HabitRepetition; measurement: HabitMeasurement; // Uses updated types
    timeModuleId: string; createdAt: string; archived?: boolean;
}

export interface TimeModule { id: string; name: string; startTime?: string; endTime?: string; }

export interface LogEntry {
    id: string; habitId: string; date: string; // 'yyyy-MM-dd'
    timestamp: string; status?: HabitLogStatus; value?: number; notes?: string;
}

export interface AppSettings {
    startTimeOfDay?: string; // New field for the start time of the day (e.g., "08:00")
}

export interface AppState {
    habits: Habit[]; timeModules: TimeModule[]; logs: LogEntry[]; settings: AppSettings;
}

// Actions remain the same, payload structure for ADD/UPDATE habit now includes the new fields
export type AppAction =
    | { type: 'LOAD_STATE'; payload: AppState }
    | { type: 'RESET_STATE' }
    | { type: 'ADD_HABIT'; payload: Omit<Habit, 'id' | 'createdAt'> }
    | { type: 'UPDATE_HABIT'; payload: Partial<Habit> & { id: string } }
    | { type: 'DELETE_HABIT'; payload: { id: string } }
    | { type: 'LOG_HABIT'; payload: { habitId: string; date: string; status?: HabitLogStatus; value?: number } }
    | { type: 'ADD_TIME_MODULE'; payload: { name: string } }
    | { type: 'UPDATE_TIME_MODULE'; payload: Partial<TimeModule> & { id: string } }
    | { type: 'DELETE_TIME_MODULE'; payload: { id: string } }
    | { type: 'UPDATE_START_TIME'; payload: { startTimeOfDay: string } };