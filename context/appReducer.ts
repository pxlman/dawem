// context/appReducer.ts
import { AppState, AppAction, Habit, TimeModule, LogEntry } from '../types';
import { generateId } from '../utils/helpers';

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
            if (!payload || !payload.title || !payload.timeModuleId) {
                console.error("ADD_HABIT Error: Invalid payload."); return state;
            }
            const newHabit: Habit = {
                id: generateId(), createdAt: new Date().toISOString(),
                title: payload.title, color: payload.color,
                repetition: payload.repetition, measurement: payload.measurement,
                timeModuleId: payload.timeModuleId,
                archived: payload.archived, icon: payload.icon,
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
                         const updatedHabit = { ...habit, ...restOfPayload };
                         if (payload.repetition) updatedHabit.repetition = { ...habit.repetition, ...payload.repetition, config: { ...(payload.repetition.config !== undefined ? payload.repetition.config : habit.repetition.config) }};
                         if (payload.measurement) updatedHabit.measurement = { ...habit.measurement, ...payload.measurement };
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
            const logBase: Partial<LogEntry> & { habitId: string, date: string, timestamp: string } = {
                habitId, date, timestamp: new Date().toISOString(),
                ...(status !== undefined && { status }), ...(value !== undefined && { value }),
            };
            if (existingLogIndex > -1) {
                const originalLogId = state.logs[existingLogIndex].id;
                newLogs = state.logs.map((log, index) => index === existingLogIndex ? { ...log, ...logBase, id: originalLogId } : log );
            } else {
                const newLogEntry: LogEntry = { ...logBase, id: generateId(), };
                newLogs = [...state.logs, newLogEntry];
            }
            return { ...state, logs: newLogs };
        }

         // --- Time Modules ---
         case 'ADD_TIME_MODULE': {
            const newTimeModule: TimeModule = { name: action.payload.name, id: generateId() };
            return { ...state, timeModules: [...state.timeModules, newTimeModule] };
         }
        case 'UPDATE_TIME_MODULE': {
             const { dayTypeId, ...restPayload } = action.payload as any;
            return { ...state, timeModules: state.timeModules.map(tm => tm.id === action.payload.id ? { ...tm, ...restPayload } : tm ), };
           }
        case 'DELETE_TIME_MODULE': {
            const timeModuleIdToDelete = action.payload.id;
            if (state.timeModules.length <= 1) { return state; } // Prevent deleting last one
            const replacementModule = state.timeModules.find(tm => tm.id !== timeModuleIdToDelete);
            const replacementModuleId = replacementModule?.id ?? '';
             if (!replacementModuleId) { return state; } // Should not happen if count > 1
            return {
                ...state,
                timeModules: state.timeModules.filter(tm => tm.id !== timeModuleIdToDelete),
                habits: state.habits.map(h => h.timeModuleId === timeModuleIdToDelete ? { ...h, timeModuleId: replacementModuleId } : h ),
            };
        }

        // --- General ---
        case 'LOAD_STATE': {
            const loadedState = action.payload;
            if (!loadedState) return initialState;
            const mergedState: AppState = {
                ...initialState,
                habits: Array.isArray(loadedState.habits) ? loadedState.habits.map(({ dayTypeId, ...rest }) => rest) : initialState.habits,
                timeModules: Array.isArray(loadedState.timeModules) ? loadedState.timeModules.map(({ dayTypeId, ...rest }) => rest) : initialState.timeModules,
                logs: Array.isArray(loadedState.logs) ? loadedState.logs : initialState.logs,
                settings: (loadedState.settings && typeof loadedState.settings === 'object') ? loadedState.settings : initialState.settings,
            };
             // Validate habit timeModuleIds
             const validModuleIds = new Set(mergedState.timeModules.map(tm => tm.id));
             const firstValidModuleId = mergedState.timeModules[0]?.id ?? '';
              mergedState.habits = mergedState.habits.map(h => ({...h, timeModuleId: validModuleIds.has(h.timeModuleId) ? h.timeModuleId : firstValidModuleId }));
            return mergedState;
        }
        case 'RESET_STATE': {
            return { ...initialState, habits: [], timeModules: [...initialState.timeModules], logs: [], settings: {} }; // Return fresh copy
          }

        default:
            return state;
    }
};