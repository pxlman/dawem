// context/appReducer.ts
import { AppState, AppAction, Habit, Goal, TimeModule, LogEntry } from '../types'; // Ensure correct path
import { generateId } from '../utils/helpers'; // Ensure correct path
import { getSaturdayDateString } from '../utils/dateUtils'; // Import the shared function
import { get } from 'react-native/Libraries/TurboModule/TurboModuleRegistry';

// Initial State with default global Time Modules
export const initialState: AppState = {
    habits: [],
    goals: [],
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
    // dispatch: () => { },
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
                 },
                 startDate: getSaturdayDateString(payload.startDate)
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
                            endDate: payload.endDate ?? null,
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
            const payload = action.payload;
            // Basic validation
            if (!payload || !payload.name) {
                console.error("ADD_TIME_MODULE Error: Invalid payload."); 
                return state;
            }
            const newTimeModule: TimeModule = {
                id: generateId(),
                ...payload
            };
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

        // --- Goals ---
        case 'ADD_GOAL': {
            const newGoal: Goal = {
                id: generateId(),
                ...action.payload
            };
            return {
                ...state,
                goals: [...state.goals, newGoal]
            };
        }

        case 'ADD_SUBGOAL': {
            const { parentGoalId, newGoal } = action.payload;
            const subGoal: Goal = {
                id: generateId(),
                ...newGoal
            };
            return {
                ...state,
                goals: addSubgoalRecursive(state.goals, parentGoalId, subGoal)
            };
        }

        case 'UPDATE_GOAL': {
            return {
                ...state,
                goals: updateGoalRecursive(state.goals, action.payload.id, goal => ({
                    ...goal,
                    ...action.payload
                }))
            };
        }

        case 'TOGGLE_GOAL_ENABLED': {
            const { goalId, enabled } = action.payload;
            
            // Update goals recursively as before
            const updatedGoals = updateGoalEnabledStateRecursive(state.goals, goalId, enabled);
            
            // Find all habits that need to be updated
            const affectedHabitIds = new Set<string>();
            
            // Helper to collect habit IDs from a goal and all its subgoals
            const collectHabitIds = (goals: Goal[], targetId: string): boolean => {
                for (const goal of goals) {
                    if (goal.id === targetId) {
                        // This goal matches, collect its habit IDs
                        if (goal.habitsIds) {
                            goal.habitsIds.forEach(id => affectedHabitIds.add(id));
                        }
                        
                        // Also collect from all subgoals regardless of their IDs
                        // since all subgoals are affected
                        if (goal.subgoals) {
                            goal.subgoals.forEach(subgoal => {
                                if (subgoal.habitsIds) {
                                    subgoal.habitsIds.forEach(id => affectedHabitIds.add(id));
                                }
                                // And also from their subgoals
                                if (subgoal.subgoals) {
                                    collectHabitIds(subgoal.subgoals, subgoal.id);
                                }
                            });
                        }
                        
                        return true;
                    }
                    // Check subgoals
                    if (goal.subgoals && collectHabitIds(goal.subgoals, targetId)) {
                        return true;
                    }
                }
                return false;
            };
            
            // Collect affected habit IDs
            collectHabitIds(updatedGoals, goalId);
            
            // Update affected habits
            const updatedHabits = state.habits.map(habit => 
                affectedHabitIds.has(habit.id) ? { ...habit, enabled } : habit
            );
            
            return {
                ...state,
                goals: updatedGoals,
                habits: updatedHabits
            };
        }

        case 'DELETE_GOAL': {
            return {
                ...state,
                goals: removeGoalRecursive(state.goals, action.payload.id)
            };
        }

        case 'LINK_HABIT_TO_GOAL': {
            const { goalId, habitId } = action.payload;
            return {
                ...state,
                goals: updateGoalRecursive(state.goals, goalId, (goal) => {
                    // Constraint Check: Cannot link if subgoals exist
                    if (goal.subgoals && goal.subgoals.length > 0) {
                        console.warn(`Reducer: Cannot link habit to goal ${goalId} which already has subgoals.`);
                        return goal; // Return unchanged goal
                    }
                    // Add habitId, ensuring uniqueness and creating array if needed
                    const updatedHabitsIds = Array.from(new Set([...(goal.habitsIds ?? []), habitId]));
                    // Remove subgoals key if it exists (enforce constraint)
                    const { subgoals, ...restOfGoal } = goal;
                    return {
                        ...restOfGoal, // Keep other goal properties
                        habitsIds: updatedHabitsIds, // Set the updated habits array
                    };
                }),
                habits: state.habits.map(habit => 
                    habit.id === habitId ? { ...habit, goalId } : habit
                )
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
                goals: Array.isArray(loadedState.goals) ? loadedState.goals : initialState.goals,
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

            // Set the endDate to the day before the selected date
            const date = new Date(fromDate);
            date.setDate(date.getDate() - 1);
            const newEndDate = date.toISOString().split('T')[0]; // Format as 'yyyy-MM-dd'

            // Update the habit's endDate
            const updatedHabits = state.habits.map(habit =>
                habit.id === id ? { ...habit, endDate: newEndDate } : habit
            );

            return {
                ...state,
                habits: updatedHabits,
            };
        }
        case 'REORDER_HABITS_IN_MODULE': {
            const { timeModuleId, habits: reorderedHabits } = action.payload;
            
            // Create a map of habit IDs to their updated habits with sort orders
            const reorderedHabitsMap = new Map(
                reorderedHabits.map(habit => [habit.id, habit])
            );
            
            // Update the habits array
            const updatedHabits = state.habits.map(habit => {
                // Check if this habit belongs to the time module we're reordering
                const isInTargetModule = 
                    habit.timeModuleId === timeModuleId || 
                    (timeModuleId === 'uncategorized' && !habit.timeModuleId);
                    
                if (isInTargetModule && reorderedHabitsMap.has(habit.id)) {
                    return {
                        ...habit,
                        ...reorderedHabitsMap.get(habit.id)
                    };
                }
                return habit;
            });
            
            return {
                ...state,
                habits: updatedHabits,
            };
        }

        case 'IMPORT_HABITS': {
            const { habits: importedHabits, timeModules: importedModules } = action.payload;
            
            // Get existing habit and module IDs to avoid duplicates
            const existingHabitIds = new Set(state.habits.map(h => h.id));
            const existingModuleIds = new Set(state.timeModules.map(m => m.id));
            
            // Filter out any imported items that already exist
            const newHabits = importedHabits.filter(h => !existingHabitIds.has(h.id));
            const newModules = importedModules.filter(m => !existingModuleIds.has(m.id));
            
            // Create maps of imported module IDs to ensure we have valid module references
            const importedModuleIds = new Set(importedModules.map(m => m.id));
            
            // Default to the first existing module if imported module doesn't exist
            const defaultModuleId = state.timeModules[0]?.id || '';
            
            // Add imported items to the state, ensuring each habit has a valid module ID
            return {
                ...state,
                habits: [
                    ...state.habits,
                    ...newHabits.map(habit => ({
                        ...habit,
                        // If the habit's module doesn't exist in current or imported modules, use default
                        timeModuleId: existingModuleIds.has(habit.timeModuleId) || 
                                      importedModuleIds.has(habit.timeModuleId) ? 
                                      habit.timeModuleId : defaultModuleId
                    }))
                ],
                timeModules: [
                    ...state.timeModules,
                    ...newModules
                ]
            };
        }

        default:
            // console.warn(`Unhandled action type: ${(action as any).type}`); // Optional
            return state;
    }
};

// Recursive helper functions need to be added here if not already present
const updateGoalRecursive = (goals: Goal[], goalId: string, updateFn: (goal: Goal) => Goal): Goal[] => {
    // ...existing implementation from goals.tsx...
    return goals.map(goal => {
        if (goal.id === goalId) {
            return updateFn(goal); // Apply the update
        }
        if (goal.subgoals) {
            const updatedSubgoals = updateGoalRecursive(goal.subgoals, goalId, updateFn);
            if (updatedSubgoals !== goal.subgoals) { // Check for reference change
                return { ...goal, subgoals: updatedSubgoals };
            }
        }
        return goal; // No change
    });
};

const removeGoalRecursive = (goals: Goal[], goalId: string): Goal[] => {
    // ...existing implementation from goals.tsx...
    // Filter out the goal at the current level
    const filteredGoals = goals.filter(goal => goal.id !== goalId);

    // If the length is the same, the goal wasn't at this level, so check subgoals
    if (filteredGoals.length === goals.length) {
        return goals.map(goal => {
            if (goal.subgoals) {
                const updatedSubgoals = removeGoalRecursive(goal.subgoals, goalId);
                if (updatedSubgoals !== goal.subgoals) { // Check for reference change
                     // Ensure subgoals isn't empty array if it was removed entirely
                     if (updatedSubgoals.length === 0) {
                         const { subgoals, ...rest } = goal; // Remove subgoals key
                         return rest;
                     }
                    return { ...goal, subgoals: updatedSubgoals };
                }
            }
            return goal;
        });
    }
    // Goal was removed at this level
    return filteredGoals;
};

const addSubgoalRecursive = (goals: Goal[], parentGoalId: string, newGoal: Goal): Goal[] => {
    // ...existing implementation from goals.tsx...
    return goals.map(goal => {
        if (goal.id === parentGoalId) {
             // Constraint check: Cannot add subgoal if habits exist
             if (goal.habitsIds && goal.habitsIds.length > 0) {
                 console.warn(`Attempted to add subgoal to goal ${parentGoalId} which has habits.`);
                 return goal; // Return unchanged goal
             }
            const subgoals = [...(goal.subgoals ?? []), newGoal]; // Use nullish coalescing
            // Remove habitsIds if we are adding subgoals (enforce constraint)
            const { habitsIds, ...rest } = goal;
            return { ...rest, subgoals };
        }
        // Recurse into subgoals if they exist
        if (goal.subgoals) {
            const updatedSubgoals = addSubgoalRecursive(goal.subgoals, parentGoalId, newGoal);
             if (updatedSubgoals !== goal.subgoals) { // Check for reference change
                return { ...goal, subgoals: updatedSubgoals };
            }
        }
        return goal; // No change
    });
};

const updateGoalEnabledStateRecursive = (goals: Goal[], goalId: string, enabled: boolean): Goal[] => {
    return goals.map(goal => {
        if (goal.id === goalId) {
            // When we find the target goal, update it AND recursively update ALL its subgoals
            // regardless of their IDs (this is what was missing)
            return {
                ...goal,
                enabled,
                // Apply the same enabled state to ALL subgoals without checking their IDs
                subgoals: goal.subgoals ? goal.subgoals.map(subgoal => ({
                    ...subgoal,
                    enabled,
                    // Recursively apply to any deeper subgoals
                    subgoals: subgoal.subgoals ? 
                        updateGoalEnabledStateRecursive(subgoal.subgoals, subgoal.id, enabled) : 
                        subgoal.subgoals
                })) : goal.subgoals
            };
        }
        
        // For non-matching goals, still check their subgoals
        if (goal.subgoals) {
            const updatedSubgoals = updateGoalEnabledStateRecursive(goal.subgoals, goalId, enabled);
            if (updatedSubgoals !== goal.subgoals) {
                return { ...goal, subgoals: updatedSubgoals };
            }
        }
        return goal;
    });
};