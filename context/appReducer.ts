// context/appReducer.ts
import { AppState, AppAction, Habit, TimeModule, LogEntry } from '../types'; // Ensure correct path
import { generateId } from '../utils/helpers'; // Ensure correct path

// Initial State with default global Time Modules
export const initialState: AppState = {
    habits: [],
    timeModules: [
        { id: 'global_morning', name: 'Morning' },
        { id: 'global_afternoon', name: 'Afternoon' },
        { id: 'global_evening', name: 'Evening' },
    ],
    logs: [],
    settings: {},
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
                      unit: payload.measurement.unit,
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
                         const { dayTypeId, ...restOfPayload } = payload as any; // Exclude potential rogue field
                         const updatedHabit = { ...habit, ...restOfPayload }; // Base update

                         // --- Correct Deep Merging for Nested Objects ---
                         if (payload.repetition) {
                             updatedHabit.repetition = {
                                 ...habit.repetition, // Start with existing repetition state
                                 ...payload.repetition, // Overwrite with payload type/config
                                 // Ensure config object merges correctly, keeping old keys if not in payload.config
                                 config: {
                                     ...habit.repetition.config, // Start with existing config
                                     ...(payload.repetition.config ?? {}) // Overwrite with payload config keys
                                 }
                             };
                         }
                         if (payload.measurement) {
                             updatedHabit.measurement = {
                                 ...habit.measurement, // Start with existing measurement state
                                 ...payload.measurement // Overwrite with payload type/unit/targetValue
                             };
                         }
                         // --- End Deep Merging ---

                         return updatedHabit;
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
            const existingLogIndex = state.logs.findIndex(log => log.habitId === habitId && log.date === date);
            let newLogs: LogEntry[];
            // Include only defined status/value in base update
            const logBase: Partial<LogEntry> & { habitId: string, date: string, timestamp: string } = {
                habitId, date, timestamp: new Date().toISOString(),
                ...(status !== undefined && { status }), ...(value !== undefined && { value }),
            };
            const isClearing = status === undefined && value === undefined; // Check if it's a clear request

            if (existingLogIndex > -1) {
                 if (isClearing) { // If clearing, remove the log
                    newLogs = state.logs.filter((_, index) => index !== existingLogIndex);
                 } else { // Otherwise, update the existing log
                    const originalLogId = state.logs[existingLogIndex].id;
                    newLogs = state.logs.map((log, index) => index === existingLogIndex ? { ...log, ...logBase, id: originalLogId } : log );
                 }
            } else if (!isClearing) { // Add new log only if not clearing
                const newLogEntry: LogEntry = { ...logBase, id: generateId(), };
                newLogs = [...state.logs, newLogEntry];
            } else {
                newLogs = state.logs; // No change if clearing a non-existent log
            }
            return { ...state, logs: newLogs };
        }

         // --- Time Modules ---
         case 'ADD_TIME_MODULE': {
            const newTimeModule: TimeModule = { name: action.payload.name, id: generateId() };
            return { ...state, timeModules: [...state.timeModules, newTimeModule] };
         }
        case 'UPDATE_TIME_MODULE': {
             // Exclude potential rogue dayTypeId field safely
             const { dayTypeId, ...restPayload } = action.payload as Partial<TimeModule> & { id: string; dayTypeId?: any };
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
                habits: Array.isArray(loadedState.habits) ? loadedState.habits.map(({ dayTypeId, ...rest }) => ({...rest})) : initialState.habits,
                timeModules: Array.isArray(loadedState.timeModules) ? loadedState.timeModules.map(({ dayTypeId, ...rest }) => ({...rest})) : initialState.timeModules,
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
        default:
            // console.warn(`Unhandled action type: ${(action as any).type}`); // Optional
            return state;
    }
};