// types/index.ts

import { useAppState } from "@/context/AppStateContext";
import { Day } from "date-fns";


export type HabitRepetitionType = "daily" | "weekly";
export type HabitMeasurementType = "binary" | "count";
export type HabitLogStatus = "right" | "wrong" | "circle";
export type prayer = "الفجر" | "الشروق" | "الظهر" | "العصر" | "المغرب" | "العشاء";
export type prayerId = "fajr" | "sunrise" | "dhuhr" | "asr" | "sunset" | "isha";
export type HabitStatus = 'empty' | 'partial' | 'completed' | 'exceeded' | 'missed' | 'notdue';
export type ThemeType = 'light' | 'dark' | 'browny' | 'fresh' | 'night';

export interface Goal {
    id: string;
    title: string;
    color: string;
    enabled: boolean;
    // subgoals?: Goal[];
    subgoals?: string[]; // sub goals ids (which should be in the same array goals)
    habitsIds?: string[]; // habits ids
}

export interface NodeLayout { // for the goal mind map
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId: string | null; // To draw lines
  goalData: Goal; // Keep original data for rendering node content
}


// --- ADDED fields to RepetitionConfig ---
export interface RepetitionConfig {
    daysOfWeek?: number[]; // 0=Sat, 1=Sun, ..., 6=Fri (For 'weekly')
    ndaysPerWeek?: number; // Number of days the habit should be done in a week
    // daysOfMonth?: number[]; // 1-31 (For 'monthly')
    // Add other future options here (interval, timesPerWeek etc.)
}

export interface HabitRepetition {
    type: HabitRepetitionType;
    config: RepetitionConfig;
}

// --- ADDED targetValue to HabitMeasurement ---
export interface HabitMeasurement {
    type: HabitMeasurementType;
    // unit?: string;
    targetValue?: number | undefined; // Target value for count habits
    // weeklyReset?: boolean; // Reset count at the end of the week
}

export interface Habit {
    id: string;
    title: string;
    color: string;
    icon?: string;
    repetition: HabitRepetition;
    measurement: HabitMeasurement;
    timeModuleId: string;
    createdAt: string;
    enabled: boolean; // New property to control if the habit is active
    // archived?: boolean;
    startDate: string; // Start date of the habit
    endDate?: string | null; // End date of the habit (null means "forever")
    // sortOrder?: number; // Track the order of habits within a time module
    // goalId?: string | null;
}

export interface TimeModule {
    id: string;
    name: string;
    startTime?: string;
}

export interface LogEntry {
    id: string;
    habitId: string;
    date: string; // 'yyyy-MM-dd'
    timestamp: string;
    status?: HabitLogStatus;
    value?: number | null;
    notes?: string;
}

export interface AppSettings {
    startTimeOfDay?: string; // New field for the start time of the day (e.g., "08:00")
    startDayOfWeek: Day; // Sun=0
    theme: ThemeType;
}

export interface AppState {
    habits: Habit[];
    goals: Goal[];
    timeModules: TimeModule[];
    logs: LogEntry[];
    settings: AppSettings;
    // theme: ThemeType;
    // dispatch: (action: AppAction) => void;
}

// Payload type for ADD_HABIT action
export interface AddHabitPayload {
    id?: string;
    title: string;
    description?: string;
    timeModuleId: string;
    repetition: HabitRepetition;
    measurement: HabitMeasurement;
    enabled: boolean;
    important?: boolean;
    startDate: string;
    endDate?: string;
    color: string;
    icon?: string;
    goalId?: string; // Optional goal ID that won't be part of the habit object
    // Add any other fields needed for creating a habit
}

// Actions remain the same, payload structure for ADD/UPDATE habit now includes the new fields
export type AppAction =
    | { type: "LOAD_STATE"; payload: AppState }
    | { type: "RESET_STATE" }
    | { type: "ADD_HABIT"; payload: AddHabitPayload }
    | { type: "UPDATE_HABIT"; payload: Partial<Habit> & { id: string } }
    | { type: "DELETE_HABIT"; payload: { id: string } }
    // Goal-related actions
    | { type: "ADD_GOAL"; payload: Omit<Goal, "id"> }
    | { type: "ADD_SUBGOAL"; payload: { parentGoalId: string, newGoal: Omit<Goal, "id"> } }
    | { type: "UPDATE_GOAL"; payload: Partial<Goal> & { id: string } }
    | { type: "TOGGLE_GOAL_ENABLED"; payload: {goalId: string, enabled:boolean} }
    | { type: "DELETE_GOAL"; payload: { id: string } }
    | {type: 'UPDATE_GOAL_SUBGOALS'; payload: { goalId: string, subGoals: Goal[] }}
    | {type: 'UPDATE_GOAL_HABITS'; payload: { goalId: string, habitsIds: string[] }}
    | { type: "LINK_HABIT_TO_GOAL"; payload: { goalId: string, habitId: string } }
    // Existing actions continue
    | {
        type: "LOG_HABIT";
        payload: {
            habitId: string;
            date: string;
            status?: HabitLogStatus;
            value?: number;
        };
    }
    | { type: "ADD_TIME_MODULE"; payload: Omit<TimeModule, 'id'> }
    | { type: "UPDATE_TIME_MODULE"; payload: Partial<TimeModule> & { id: string }; }
    | { type: "DELETE_TIME_MODULE"; payload: { id: string } }
    | { type: "UPDATE_START_TIME"; payload: { startTimeOfDay: string } }
    | {
        type: "DELETE_HABIT_FROM_TODAY";
        payload: { id: string; fromDate: string };
    }
    | { type: "REORDER_TIME_MODULES"; payload: TimeModule[] }
    | { 
        type: "REORDER_HABITS_IN_MODULE"; 
        payload: { 
            timeModuleId: string;
            habits: Habit[];
        } 
    }
    | { type: "RESET_LOGS" }
    | { type: "CHANGE_THEME"; payload: ThemeType }
    | { 
        type: "IMPORT_DATA";
        payload: {habits: Habit[], goals: Goal[], timeModules: TimeModule[]};
    }
    ;