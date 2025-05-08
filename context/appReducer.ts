// context/appReducer.ts
import { AppState, AppAction, Habit, Goal, TimeModule, LogEntry } from '@/types/index'; // Ensure correct path
import { generateId } from '../utils/helpers'; // Ensure correct path
import { AddHabitPayload } from '@/types/index';
import { ThemeType } from '@/types/index';
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
    settings: {
        startDayOfWeek: 6,
        theme: 'night'
    },
    // dispatch: () => { },
};

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
            
            // If a goal ID is provided, link the habit to that goal
            if (goalId) {
                const goalToUpdate = state.goals.find(g => g.id === goalId);
                
                if (goalToUpdate) {
                    // Check constraint: Cannot link habit to a goal with subgoals
                    if (goalToUpdate.subgoals && goalToUpdate.subgoals.length > 0) {
                        console.warn(`Cannot link habit to goal ${goalId} which has subgoals.`);
                    } else {
                        // Update the goals array
                        updatedGoals = state.goals.map(goal => {
                            if (goal.id === goalId) {
                                // Add the new habit ID to this goal
                                const updatedHabitsIds = Array.from(new Set([
                                    ...(goal.habitsIds || []), 
                                    newHabitId
                                ]));
                                return { ...goal, habitsIds: updatedHabitsIds };
                            }
                            return goal;
                        });
                    }
                }
            }
            
            return { 
                ...state, 
                habits: [...state.habits, newHabit],
                goals: updatedGoals
            };
        }
        case 'UPDATE_HABIT': {
            const payload = action.payload;
            return {
                ...state,
                habits: state.habits.map((habit: Habit) => {
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
            // Include only defined status/value in base update
            const logBase: Partial<LogEntry> & { habitId: string, date: string, timestamp: string } = {
                habitId, date: logDate, timestamp: new Date().toISOString(),
                ...(status !== undefined && { status }), ...(value !== undefined && { value }),
            };
            const isClearing = status === undefined && value === undefined; // Check if it's a clear request

            if (existingLogIndex > -1) {
                if (isClearing) { // If clearing, remove the log
                    newLogs = state.logs.filter((_, index: number) => index !== existingLogIndex);
                } else { // Otherwise, update the existing log
                    const originalLogId = state.logs[existingLogIndex].id;
                    newLogs = state.logs.map((log: LogEntry, index: number) => index === existingLogIndex ? { ...log, ...logBase, id: originalLogId } : log);
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
            return { ...state, timeModules: state.timeModules.map((tm:TimeModule) => tm.id === action.payload.id ? { ...tm, ...restPayload } : tm ), };
           }
        case 'DELETE_TIME_MODULE': {
            const timeModuleIdToDelete = action.payload.id;
            if (state.timeModules.length <= 1) { return state; }
            const replacementModule = state.timeModules.find((tm:TimeModule) => tm.id !== timeModuleIdToDelete);
            const replacementModuleId = replacementModule?.id ?? '';
             if (!replacementModuleId) { return state; }
            return {
                ...state,
                timeModules: state.timeModules.filter((tm:TimeModule) => tm.id !== timeModuleIdToDelete),
                habits: state.habits.map((h:Habit) => h.timeModuleId === timeModuleIdToDelete ? { ...h, timeModuleId: replacementModuleId } : h ),
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
            
            // Find the goal to link to
            const goalToUpdate = state.goals.find((g: Goal) => g.id === goalId);
            
            if (!goalToUpdate) {
                console.warn(`Goal with ID ${goalId} not found.`);
                return state;
            }
            
            // Check constraint: Cannot link habit to a goal with subgoals
            if (goalToUpdate.subgoals && goalToUpdate.subgoals.length > 0) {
                console.warn(`Cannot link habit to goal ${goalId} which has subgoals.`);
                return state;
            }
            
            // First, remove the habit from any other goals that might have it
            const updatedGoals = state.goals.map((goal: Goal) => {
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
            const newEndDate = date.toISOString().split('T')[0]; // Format as 'yyyy-MM-dd'

            // Update the habit's endDate
            const updatedHabits = state.habits.map((habit:Habit) =>
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
                reorderedHabits.map((habit:Habit) => [habit.id, habit])
            );
            
            // Update the habits array
            const updatedHabits = state.habits.map((habit:Habit) => {
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

        default:
            // console.warn(`Unhandled action type: ${(action as any).type}`); // Optional
            return state;
    }
};