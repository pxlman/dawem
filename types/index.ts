// types/index.ts

export type HabitRepetitionType = 'daily' | 'weekly' | 'monthly';
export type HabitMeasurementType = 'binary' | 'count';
export type HabitLogStatus = 'right' | 'wrong' | 'circle';

export interface RepetitionConfig {
    // Currently empty, future: daysOfWeek, daysOfMonth, interval etc.
}

export interface HabitRepetition {
    type: HabitRepetitionType;
    config: RepetitionConfig;
}

export interface HabitMeasurement {
    type: HabitMeasurementType;
    unit?: string;
}

export interface Habit {
    id: string;
    title: string;
    color: string;
    icon?: string;
    repetition: HabitRepetition;
    measurement: HabitMeasurement;
    timeModuleId: string; // Link to global TimeModule
    createdAt: string;
    archived?: boolean;
}

// Global Time Modules
export interface TimeModule {
    id: string;
    name: string;
    startTime?: string;
    endTime?: string;
}

export interface LogEntry {
    id: string;
    habitId: string;
    date: string; // 'yyyy-MM-dd'
    timestamp: string; // ISO String
    status?: HabitLogStatus;
    value?: number;
    notes?: string;
}

export interface AppSettings {
    // Future settings like theme, notifications etc.
}

export interface AppState {
    habits: Habit[];
    timeModules: TimeModule[]; // Global list
    logs: LogEntry[];
    settings: AppSettings;
}

export type AppAction =
    | { type: 'LOAD_STATE'; payload: AppState }
    | { type: 'RESET_STATE' }
    // Habits
    | { type: 'ADD_HABIT'; payload: Omit<Habit, 'id' | 'createdAt'> }
    | { type: 'UPDATE_HABIT'; payload: Partial<Habit> & { id: string } }
    | { type: 'DELETE_HABIT'; payload: { id: string } }
    // Logs
    | { type: 'LOG_HABIT'; payload: { habitId: string; date: string; status?: HabitLogStatus; value?: number } }
    // Time Modules
    | { type: 'ADD_TIME_MODULE'; payload: { name: string } }
    | { type: 'UPDATE_TIME_MODULE'; payload: Partial<TimeModule> & { id: string } }
    | { type: 'DELETE_TIME_MODULE'; payload: { id: string } }
    // Settings (placeholder for future)
    ;