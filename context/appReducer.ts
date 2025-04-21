// context/appReducer.ts
import { AppState, AppAction, Habit, TimeModule, LogEntry } from '../types'; // Ensure correct path
import { generateId } from '../utils/helpers'; // Ensure correct path
import { getSaturdayDateString } from '../utils/dateUtils'; // Import the shared function

// Initial State with default global Time Modules
export const initialState: AppState = {
    habits: [],
    timeModules: [
        { id: 'global_fajr', name: 'الفجر - الشروق' },
        { id: 'global_sunrise', name: 'الشروق - الظهر' },
        { id: 'global_dhuhr', name: 'الظهر - العصر' },
        { id: 'global_asr', name: 'العصر - المغرب' },
        { id: 'global_sunset', name: 'المغرب -العشاء' },
        { id: 'global_night', name: 'العشاء - النوم' },
    ],
    logs: [],
    settings: {},
    dispatch: () => { },
};

export const appReducer = (state: AppState, action: AppAction): AppState => {
    // console.log(`Reducer Action: ${action.type}`); // Optional logging

    switch (action.type) {
        // --- Habits ---
        case 'ADD_HABIT': {
            const payload = action.payload;
            // Basic validation (could be more extensive)
            if (!payload || !payload.title || !payload.timeModuleId || !payload.repetition || !payload.measurement) {
                console.error("ADD_HABIT Error: Invalid payload."); return state;
            }
            const newHabit: Habit = {
                id: generateId(), createdAt: new Date().toISOString(),
                // Spread payload ensures all top-level fields are included
                ...payload,
                // Explicitly ensure nested objects are correctly formed if needed,
                // though spread usually handles this if payload structure matches type
                 repetition: {
                     type: payload.repetition.type,
                     config: payload.repetition.config ?? {} // Ensure config exists
                 },
                 measurement: {
                      type: payload.measurement.type,
                    //   unit: payload.measurement.unit,
                      targetValue: payload.measurement.targetValue // Include targetValue
                 }
            };
            return { ...state, habits: [...state.habits, newHabit] };
        }
        case 'UPDATE_HABIT': {
            const payload = action.payload;
            return {
                ...state,
                habits: state.habits.map(habit => {
                    if (habit.id === payload.id) {
                        return {
                            ...habit,
                            ...payload,
                            endDate: payload.endDate ?? null, // Ensure endDate is explicitly set to null if not provided
                        };
                    }
                    return habit;
                }),
            };
        }
        case 'DELETE_HABIT': {
             return { ...state, habits: state.habits.filter(habit => habit.id !== action.payload.id), };
           }

        // --- Logs ---
        case 'LOG_HABIT': {
            const { habitId, date, status, value } = action.payload;
            if (!habitId || !date) { console.error("LOG_HABIT Error: Missing habitId or date."); return state; }
            
            // Find the habit being logged
            const habit = state.habits.find(h => h.id === habitId);
            
            // If it's a weekly counter habit, adjust the date to the Saturday of the current week
            let logDate = date;
            if (habit && habit.repetition.type === 'weekly' && habit.measurement.type === 'count') {
                logDate = getSaturdayDateString(date);
            }

            const existingLogIndex = state.logs.findIndex(log => log.habitId === habitId && log.date === logDate);
            let newLogs: LogEntry[];
            // Include only defined status/value in base update
            const logBase: Partial<LogEntry> & { habitId: string, date: string, timestamp: string } = {
                habitId, date: logDate, timestamp: new Date().toISOString(),
                ...(status !== undefined && { status }), ...(value !== undefined && { value }),
            };
            const isClearing = status === undefined && value === undefined; // Check if it's a clear request

            if (existingLogIndex > -1) {
                if (isClearing) { // If clearing, remove the log
                    newLogs = state.logs.filter((_, index) => index !== existingLogIndex);
                } else { // Otherwise, update the existing log
                    const originalLogId = state.logs[existingLogIndex].id;
                    newLogs = state.logs.map((log, index) => index === existingLogIndex ? { ...log, ...logBase, id: originalLogId } : log);
                }
            } else if (!isClearing) { // Add new log only if not clearing
                const newLogEntry: LogEntry = { ...logBase, id: generateId(), };
                newLogs = [...state.logs, newLogEntry];
            } else {
                newLogs = state.logs; // No change if clearing a non-existent log
            }
            return { ...state, logs: newLogs };
        }

        case 'RESET_LOGS': {
            return {
                ...state,
                logs: [], // Clear all logs
            };
        }
         // --- Time Modules ---
         case 'ADD_TIME_MODULE': {
            const newTimeModule: TimeModule = { name: action.payload.name, id: generateId() };
            return { ...state, timeModules: [...state.timeModules, newTimeModule] };
         }
        case 'UPDATE_TIME_MODULE': {
             const { ...restPayload } = action.payload as Partial<TimeModule> & { id: string; };
            return { ...state, timeModules: state.timeModules.map(tm => tm.id === action.payload.id ? { ...tm, ...restPayload } : tm ), };
           }
        case 'DELETE_TIME_MODULE': {
            const timeModuleIdToDelete = action.payload.id;
            if (state.timeModules.length <= 1) { return state; }
            const replacementModule = state.timeModules.find(tm => tm.id !== timeModuleIdToDelete);
            const replacementModuleId = replacementModule?.id ?? '';
             if (!replacementModuleId) { return state; }
            return {
                ...state,
                timeModules: state.timeModules.filter(tm => tm.id !== timeModuleIdToDelete),
                habits: state.habits.map(h => h.timeModuleId === timeModuleIdToDelete ? { ...h, timeModuleId: replacementModuleId } : h ),
            };
        }
        case 'REORDER_TIME_MODULES': {
            return {
                ...state,
                timeModules: action.payload,
            };
        }

        // --- General ---
        case 'LOAD_STATE': {
            const loadedState = action.payload;
            if (!loadedState) return initialState;
            // Perform safe merge, cleaning old fields and validating references
            const mergedState: AppState = {
                ...initialState,
                habits: Array.isArray(loadedState.habits) ? loadedState.habits.map(({ ...rest }) => ({...rest})) : initialState.habits,
                timeModules: Array.isArray(loadedState.timeModules) ? loadedState.timeModules.map(({ ...rest }) => ({...rest})) : initialState.timeModules,
                logs: Array.isArray(loadedState.logs) ? loadedState.logs : initialState.logs,
                settings: (loadedState.settings && typeof loadedState.settings === 'object') ? loadedState.settings : initialState.settings,
            };
             const validModuleIds = new Set(mergedState.timeModules.map(tm => tm.id));
             const firstValidModuleId = mergedState.timeModules[0]?.id ?? '';
             mergedState.habits = mergedState.habits.map(h => ({...h, timeModuleId: validModuleIds.has(h.timeModuleId) ? h.timeModuleId : firstValidModuleId }));
            return mergedState;
        }
        case 'RESET_STATE': {
            // Return a deep copy of initialState
            return JSON.parse(JSON.stringify(initialState));
          }
        case 'UPDATE_START_TIME': {
            return {
                ...state,
                settings: {
                    ...state.settings,
                    startTimeOfDay: action.payload.startTimeOfDay, // Update start time in settings
                },
            };
        }
        case 'DELETE_HABIT_FROM_TODAY': {
            const { id, fromDate } = action.payload;

            // Set the endDate to the selected date (inclusive)
            const newEndDate = new Date(fromDate).toISOString().split('T')[0]; // Format as 'yyyy-MM-dd'

            // Update the habit's endDate
            const updatedHabits = state.habits.map(habit =>
                habit.id === id ? { ...habit, endDate: newEndDate } : habit
            );

            return {
                ...state,
                habits: updatedHabits,
            };
        }
        default:
            // console.warn(`Unhandled action type: ${(action as any).type}`); // Optional
            return state;
    }
};