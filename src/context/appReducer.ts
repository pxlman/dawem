// context/appReducer.ts
import { AppState, AppAction, Habit, Goal, TimeModule, LogEntry } from '@/types/index'; // Ensure correct path
import { generateId } from '../utils/helpers'; // Ensure correct path
import { AddHabitPayload } from '@/types/index';
import { ThemeType } from '@/types/index';
import { getSaturdayDateString } from '../utils/dateUtils'; // Import the shared function
import { get } from 'react-native/Libraries/TurboModule/TurboModuleRegistry';
import { format } from 'date-fns';

// Initial State with default global Time Modules
export const initialState: AppState = {
    habits: [],
    goals: [],
    timeModules: [
        { id: 'global_fajr', name: 'الفجر' },
        { id: 'global_sunrise', name: 'الشروق' },
        { id: 'global_dhuhr', name: 'الظهر' },
        { id: 'global_asr', name: 'العصر' },
        { id: 'global_sunset', name: 'المغرب' },
        { id: 'global_night', name: 'العشاء' },
    ],
    logs: [],
    settings: {
        startDayOfWeek: 6,
        theme: 'night'
    },
    // theme: 'fresh',
    // dispatch: () => { },
};

// Helper function to link a habit to a goal (returns updated goals array)
function linkHabitToGoal(goals: Goal[], habitId: string, goalId: string): Goal[] {
    // Find the goal to link to
    const goalToUpdate = goals.find((g: Goal) => g.id === goalId);

    if (!goalToUpdate) {
        console.warn(`Goal with ID ${goalId} not found.`);
        return goals;
    }

    // Check constraint: Cannot link habit to a goal with subgoals
    if (goalToUpdate.subgoals && goalToUpdate.subgoals.length > 0) {
        console.warn(`Cannot link habit to goal ${goalId} which has subgoals.`);
        return goals;
    }

    // Remove the habit from any other goals that might have it, and add to the target goal
    return goals.map((goal: Goal) => {
        if (goal.id === goalId) {
            // Add habitId to the target goal, ensuring uniqueness
            const updatedHabitsIds = Array.from(new Set([...(goal.habitsIds || []), habitId]));
            return { ...goal, habitsIds: updatedHabitsIds };
        } else if (goal.habitsIds && goal.habitsIds.includes(habitId)) {
            // Remove the habit from any other goal
            return { 
                ...goal, 
                habitsIds: goal.habitsIds.filter(id => id !== habitId) 
            };
        }
        return goal;
    });
}

// Helper function to reorder habits based on time modules
function reorderHabitsByTimeModule(habits: Habit[], timeModules: TimeModule[]): Habit[] {
    // Create a mapping of time module IDs to their indices
    const timeModuleOrder = timeModules.reduce((acc, tm, index) => {
        acc[tm.id] = index;
        return acc;
    }, {} as Record<string, number>);
    
    // Group habits by time module ID
    const habitsByModule: Record<string, Habit[]> = {};
    
    // Add habits to their respective groups
    habits.forEach(habit => {
        const moduleId = habit.timeModuleId || 'uncategorized';
        if (!habitsByModule[moduleId]) {
            habitsByModule[moduleId] = [];
        }
        habitsByModule[moduleId].push(habit);
    });
    
    // Combine all habits, ordered by time module
    const orderedHabits: Habit[] = [];
    
    // Sort time modules by their order in timeModules
    const sortedModuleIds = Object.keys(habitsByModule).sort((a, b) => {
        const indexA = timeModuleOrder[a] !== undefined ? timeModuleOrder[a] : Infinity;
        const indexB = timeModuleOrder[b] !== undefined ? timeModuleOrder[b] : Infinity;
        return indexA - indexB;
    });
    
    // Add habits from each module in the correct order
    sortedModuleIds.forEach(moduleId => {
        orderedHabits.push(...habitsByModule[moduleId]);
    });
    
    return orderedHabits;
}

export const appReducer = (state: AppState, action: AppAction): AppState => {
    // console.log(`Reducer Action: ${action.type}`); // Optional logging
    console.log(action.type, action)
    switch (action.type) {
        // --- Habits ---
        case 'ADD_HABIT': {
            const payload = action.payload as AddHabitPayload;
            // Basic validation (could be more extensive)
            if (!payload || !payload.title || !payload.timeModuleId || !payload.repetition || !payload.measurement) {
                console.error("ADD_HABIT Error: Invalid payload."); return state;
            }
            const newHabitId = generateId();
            
            // Destructure goalId from payload to exclude it from the habit object
            const { goalId, ...habitProps } = payload;
            const newHabit: Habit = {
                id: newHabitId, 
                createdAt: new Date().toISOString(),
                ...habitProps,
            };
            
            let updatedGoals = state.goals;
            
            // If a goal ID is provided, link the habit to that goal using the helper
            if (goalId) {
                updatedGoals = linkHabitToGoal(state.goals, newHabitId, goalId);
            }
            
            // Add the new habit and then reorder all habits by time module
            const updatedHabits = reorderHabitsByTimeModule([...state.habits, newHabit], state.timeModules);
            
            return { 
                ...state, 
                habits: updatedHabits,
                goals: updatedGoals
            };
        }
        case 'UPDATE_HABIT': {
            const payload = action.payload as AddHabitPayload;
            let updatedGoals = state.goals;
            // If updating goalId, use the helper to update goals
            if (payload.goalId) {
                updatedGoals = linkHabitToGoal(state.goals, payload.id || '', payload.goalId);
            }
            
            // Update the habit in the array
            const updatedHabits = state.habits.map((habit: Habit) => {
                if (habit.id === payload.id) {
                    return {
                        ...habit,
                        ...payload,
                        endDate: payload.endDate ?? null,
                    };
                }
                return habit;
            });
            
            // Reorder habits after updating
            const reorderedHabits = reorderHabitsByTimeModule(updatedHabits, state.timeModules);
            
            return {
                ...state,
                habits: reorderedHabits,
                goals: updatedGoals
            };
        }
        case 'DELETE_HABIT': {
             return { ...state, habits: state.habits.filter((habit: Habit) => habit.id !== action.payload.id), };
           }

        // --- Logs ---
        case 'LOG_HABIT': {
            const { habitId, date, status, value } = action.payload;
            if (!habitId || !date) { console.error("LOG_HABIT Error: Missing habitId or date."); return state; }
            
            // Use the exact date provided - no special handling for weekly counters anymore
            const logDate = date;

            const existingLogIndex = state.logs.findIndex((log: LogEntry) => log.habitId === habitId && log.date === logDate);
            let newLogs: LogEntry[];
            
            // Check if this is a request to delete the log (both status and value are undefined)
            if (status === undefined && value === undefined) {
                // Simply filter out the log with matching habitId and date
                if (existingLogIndex > -1) {
                    newLogs = state.logs.filter((_, index) => index !== existingLogIndex);
                } else {
                    // No log to delete
                    return state;
                }
            } else {
                // Include only defined status/value in base update
                const logBase: Partial<LogEntry> & { habitId: string, date: string, timestamp: string } = {
                    habitId, 
                    date: logDate, 
                    timestamp: new Date().toISOString(),
                    ...(status !== undefined && { status }), 
                    ...(value !== undefined && { value }),
                };

                if (existingLogIndex > -1) {
                    // Update existing log
                    const originalLogId = state.logs[existingLogIndex].id;
                    newLogs = state.logs.map((log: LogEntry, index: number) => 
                        index === existingLogIndex ? { ...log, ...logBase, id: originalLogId } : log);
                } else {
                    // Create new log
                    const newLogEntry: LogEntry = { 
                        ...logBase, 
                        id: generateId(), 
                    };
                    newLogs = [...state.logs, newLogEntry];
                }
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
            return { ...state, timeModules: state.timeModules.map((tm:TimeModule) => tm.id === action.payload.id ? { ...tm, ...restPayload } : tm ), };
           }
        case 'DELETE_TIME_MODULE': {
            const timeModuleIdToDelete = action.payload.id;
            if (state.timeModules.length <= 1) { return state; }
            const replacementModule = state.timeModules.find((tm:TimeModule) => tm.id !== timeModuleIdToDelete);
            const replacementModuleId = replacementModule?.id ?? '';
             if (!replacementModuleId) { return state; }
            
            // Update habits with new time module ID
            const updatedHabits = state.habits.map((h:Habit) => 
                h.timeModuleId === timeModuleIdToDelete ? { ...h, timeModuleId: replacementModuleId } : h
            );
            
            // Filter out the deleted time module
            const updatedTimeModules = state.timeModules.filter((tm:TimeModule) => 
                tm.id !== timeModuleIdToDelete
            );
            
            // Reorder habits after changing time modules
            const reorderedHabits = reorderHabitsByTimeModule(updatedHabits, updatedTimeModules);
            
            return {
                ...state,
                timeModules: updatedTimeModules,
                habits: reorderedHabits,
            };
        }
        case 'REORDER_TIME_MODULES': {
            // After reordering time modules, reorder habits accordingly
            const reorderedHabits = reorderHabitsByTimeModule(state.habits, action.payload);
            
            return {
                ...state,
                timeModules: action.payload,
                habits: reorderedHabits,
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
            const subGoalId = generateId();
            
            // Create the new subgoal and add it to the goals array
            const subGoal: Goal = {
                id: subGoalId,
                ...newGoal
            };
            
            // Update the parent goal to reference the new subgoal by ID
            const updatedGoals = state.goals.map((goal: Goal) => {
                if (goal.id === parentGoalId) {
                    // If the goal has habits, we can't add subgoals (constraint)
                    if (goal.habitsIds && goal.habitsIds.length > 0) {
                        console.warn(`Cannot add subgoal to goal ${parentGoalId} which has habits.`);
                        return goal;
                    }
                    
                    // Add the subgoal ID to the parent's subgoals array
                    return {
                        ...goal,
                        subgoals: [...(goal.subgoals || []), subGoalId]
                    };
                }
                return goal;
            });
            
            return {
                ...state,
                goals: [...updatedGoals, subGoal]
            };
        }

        case 'UPDATE_GOAL': {
            return {
                ...state,
                goals: state.goals.map((goal: Goal) => 
                    goal.id === action.payload.id 
                        ? { ...goal, ...action.payload } 
                        : goal
                )
            };
        }

        case 'TOGGLE_GOAL_ENABLED': {
            const { goalId, enabled } = action.payload;
            
            // Collect all goal IDs that need to be updated (the goal and all its descendants)
            const affectedGoalIds = new Set<string>();
            
            // Helper to collect a goal and all its descendant IDs
            const collectGoalIds = (currentGoalId: string) => {
                affectedGoalIds.add(currentGoalId);
                
                const goal = state.goals.find((g: Goal) => g.id === currentGoalId);
                if (goal && goal.subgoals && goal.subgoals.length > 0) {
                    goal.subgoals.forEach((subgoalId: string) => {
                        collectGoalIds(subgoalId);
                    });
                }
            };
            
            // Start collection from the target goal
            collectGoalIds(goalId);
            
            // Update all affected goals
            const updatedGoals = state.goals.map((goal: Goal) => 
                affectedGoalIds.has(goal.id) 
                    ? { ...goal, enabled } 
                    : goal
            );
            
            // Find all habits that need to be updated
            const affectedHabitIds = new Set<string>();
            
            // Collect habit IDs from all affected goals
            updatedGoals.forEach((goal: Goal) => {
                if (affectedGoalIds.has(goal.id) && goal.habitsIds) {
                    goal.habitsIds.forEach((habitId: string) => {
                        affectedHabitIds.add(habitId);
                    });
                }
            });
            
            // Update affected habits
            const updatedHabits = state.habits.map((habit:Habit) => 
                affectedHabitIds.has(habit.id) ? { ...habit, enabled } : habit
            );
            
            return {
                ...state,
                goals: updatedGoals,
                habits: updatedHabits
            };
        }

        case 'DELETE_GOAL': {
            const goalIdToDelete: string = action.payload.id;
            
            // Find all goals that need to be deleted (the goal and all its descendants)
            const goalsToDelete = new Set<string>();
            
            // Helper to collect a goal and all its descendant IDs
            const collectGoalsToDelete = (currentGoalId: string): void => {
                goalsToDelete.add(currentGoalId);
                
                const goal = state.goals.find((g: Goal) => g.id === currentGoalId);
                if (goal && goal.subgoals && goal.subgoals.length > 0) {
                    goal.subgoals.forEach((subgoalId: string) => {
                        collectGoalsToDelete(subgoalId);
                    });
                }
            };
            
            // Start collection from the target goal
            collectGoalsToDelete(goalIdToDelete);
            
            // Remove deleted goals and update subgoal references
            const updatedGoals = state.goals
                .filter((goal: Goal) => !goalsToDelete.has(goal.id))
                .map((goal: Goal) => {
                    if (goal.subgoals && goal.subgoals.some((id: string) => goalsToDelete.has(id))) {
                        // Filter out references to deleted goals
                        const updatedSubgoals = goal.subgoals.filter((id: string) => !goalsToDelete.has(id));
                        
                        if (updatedSubgoals.length === 0) {
                            // If no subgoals remain, remove the subgoals property
                            const { subgoals, ...restOfGoal } = goal;
                            return restOfGoal;
                        }
                        
                        return { ...goal, subgoals: updatedSubgoals };
                    }
                    return goal;
                });
            
            return {
                ...state,
                goals: updatedGoals
            };
        }

        case 'LINK_HABIT_TO_GOAL': {
            const { goalId, habitId } = action.payload;
            const updatedGoals = linkHabitToGoal(state.goals, habitId, goalId);
            // Update the habit with the goal ID if needed
            const updatedHabits = state.habits.map((habit:Habit) => 
                habit.id === habitId ? { ...habit, goalId } : habit
            );
            return {
                ...state,
                goals: updatedGoals,
                habits: updatedHabits
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
             const validModuleIds = new Set(mergedState.timeModules.map((tm:TimeModule) => tm.id));
             const firstValidModuleId = mergedState.timeModules[0]?.id ?? '';
             mergedState.habits = mergedState.habits.map((h:Habit) => ({...h, timeModuleId: validModuleIds.has(h.timeModuleId) ? h.timeModuleId : firstValidModuleId }));
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
            const newEndDate = format(date,'yyyy-MM-dd'); // Format as 'yyyy-MM-dd'

            // Update the habit's endDate
            const updatedHabits = state.habits.map((habit:Habit) =>
                habit.id === id ? { ...habit, endDate: newEndDate } : habit
            );

            return {
                ...state,
                habits: updatedHabits,
            };
        }
        case 'CHANGE_THEME': {
            return {
                ...state,
                settings: {
                    ...state.settings,
                    theme: action.payload,
                }
            };
        }
        case 'REORDER_HABITS_IN_MODULE': {
            const { timeModuleId, habits: orderedModuleHabitsInPayload } = action.payload;

            // 1. Prepare the newly ordered habits for the target module.
            // Ensure they have the correct timeModuleId and merge with original data if necessary.
            const finalOrderedModuleHabits = orderedModuleHabitsInPayload.map((payloadHabit: Habit) => {
                const originalHabit = state.habits.find(h => h.id === payloadHabit.id);
                return {
                    ...originalHabit, // Keep existing properties not in payload
                    ...payloadHabit,  // Apply payload updates (order comes from array sequence)
                    timeModuleId: timeModuleId, // Ensure correct module ID
                };
            });

            // 2. Filter out ALL habits that originally belonged to the target module from the main list.
            const habitsNotInTargetModule = state.habits.filter(habit => {
                const isInTargetModule =
                    habit.timeModuleId === timeModuleId ||
                    (timeModuleId === 'uncategorized' && !habit.timeModuleId);
                return !isInTargetModule;
            });

            // 3. Create a mapping of time module IDs to their indices
            const timeModuleOrder = state.timeModules.reduce((acc, tm, index) => {
                acc[tm.id] = index;
                return acc;
            }, {} as Record<string, number>);
            
            // 4. Group habits by time module ID
            const habitsByModule: Record<string, Habit[]> = {};
            
            // Add all non-target module habits to their respective groups
            habitsNotInTargetModule.forEach(habit => {
                const moduleId = habit.timeModuleId || 'uncategorized';
                if (!habitsByModule[moduleId]) {
                    habitsByModule[moduleId] = [];
                }
                habitsByModule[moduleId].push(habit);
            });
            
            // Add the newly ordered habits to their target module group
            habitsByModule[timeModuleId] = finalOrderedModuleHabits;
            
            // 5. Combine all habits, ordered first by time module, then by the user's specified order within each module
            const updatedHabits: Habit[] = [];
            
            // Sort time modules by their order in state.timeModules
            const sortedModuleIds = Object.keys(habitsByModule).sort((a, b) => {
                const indexA = timeModuleOrder[a] !== undefined ? timeModuleOrder[a] : Infinity;
                const indexB = timeModuleOrder[b] !== undefined ? timeModuleOrder[b] : Infinity;
                return indexA - indexB;
            });
            
            // Add habits from each module in the correct order
            sortedModuleIds.forEach(moduleId => {
                updatedHabits.push(...habitsByModule[moduleId]);
            });

            return {
                ...state,
                habits: updatedHabits,
            };
        }
        case 'IMPORT_DATA': {
            console.log(action.payload)
            return {
                ...state,
                ...action.payload,
                habits: {...action.payload.habits,...state.habits},
                goals: {...action.payload.goals,...state.goals},
                timeModules: {...action.payload.timeModules,...state.timeModules},
            };
        }
        case 'UPDATE_START_DAY': {
            return {
                ...state,
                settings: {
                    ...state.settings,
                    startDayOfWeek: action.payload.startDayOfWeek, // Update start day of week in settings
                },
            };
        }
// ... other cases ...

        default:
            // console.warn(`Unhandled action type: ${(action as any).type}`); // Optional
            return state;
    }
};