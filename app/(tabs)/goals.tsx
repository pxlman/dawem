import React, { useState, useCallback, useEffect } from 'react';
import { View, Button, StyleSheet, Text, SafeAreaView, Alert, Platform, Switch } from 'react-native';
import Constants from 'expo-constants';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import GoalTreeMindMap from '../../components/goals/GoalTreeMindMap';
import { Goal } from '../../types';
import Colors from '@/constants/Colors';
import { useAppDispatch, useAppState } from '@/context/AppStateContext';

// Keep INITIAL_GOALS for testing
const INITIAL_GOALS: Goal[] = [
    {
        id: uuidv4(),
        title: 'Improve Fitness Plan for the Year End',
        color: '#4CAF50', // Green
        enabled:true,
        subgoals: [
            { id: uuidv4(), title: 'Run 3 times a week consistently', color: '#8BC34A', enabled: true },
            {
                id: uuidv4(), title: 'Go to the Gym Regularly', color: '#CDDC39',
                subgoals: [
                     { id: uuidv4(), title: 'Strength Training Focus', color: '#FFEB3B', enabled: true},
                     { id: uuidv4(), title: 'Cardio Session Planning', color: '#FFC107', enabled: true}
                ],
                enabled: true
            },
             { id: uuidv4(), title: 'Improve Flexibility', color: '#00BCD4', subgoals: [
                 { id: uuidv4(), title: 'Daily Stretching', color: '#009688', enabled: true},
                 { id: uuidv4(), title: 'Yoga Class Once a Week', color: '#00796B', enabled: true}
             ],
             enabled: true
            },
        ],
    },
    {
        id: uuidv4(),
        title: 'Learn React Native & Expo',
        color: '#2196F3', // Blue
        habitsIds: ['habit_read_docs', 'habit_build_project'], // Example linked habits
        enabled:true
    },
    {
        id: uuidv4(),
        title: 'Read More Books',
        color: '#9C27B0', // Purple
        enabled:true,
        subgoals: [
             { id: uuidv4(), title: 'Finish 1 Book/Month', color: '#7B1FA2', enabled:true},
             { id: uuidv4(), title: 'Explore New Genres', color: '#673AB7', enabled: true}
        ]
    }
];

const GoalsScreen: React.FC = () => {
    // Get app state and dispatch
    const appState = useAppState();
    const dispatch = useAppDispatch();
    
    // Local state with INITIAL_GOALS
    // const [localGoals, setLocalGoals] = useState<Goal[]>(INITIAL_GOALS);
    
    // State to switch between local goals and app state goals for testing
    // const [useLocalGoals, setUseLocalGoals] = useState<boolean>(false);
    
    // Choose which goals to use based on testing mode
    // const goals = useLocalGoals ? localGoals : appState.goals;
    const goals = appState.goals;
    
    // If app state goals are empty and we're not in local mode, 
    // initialize them with INITIAL_GOALS once
    useEffect(() => {
        if ( goals.length === 0 && INITIAL_GOALS.length > 0) {
            // Initialize app state with initial goals
            INITIAL_GOALS.forEach(goal => {
                dispatch({
                    type: 'ADD_GOAL',
                    payload: {
                        title: goal.title,
                        color: goal.color,
                        enabled: true,
                        // Include subgoals if any
                        ...(goal.subgoals && { subgoals: goal.subgoals }),
                        // Include habitsIds if any
                        ...(goal.habitsIds && { habitsIds: goal.habitsIds })
                    }
                });
            });
        }
    }, [goals.length, dispatch]);

    // Handle adding a goal
    const handleAddGoal = useCallback(
      (parentGoalId: string | null = null) => {
        const newGoal = {
          title: "New Goal - Edit Me!",
          color: `#${Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0")}`,
            enabled: true
        };

        // Using app state
        if (parentGoalId === null) {
          dispatch({
            type: "ADD_GOAL",
            payload: newGoal,
          });
        } else {
          dispatch({
            type: "ADD_SUBGOAL",
            payload: { parentGoalId, newGoal },
          });
        }
      },
      [dispatch]
    );

    // Handle editing a goal
    const handleEditGoal = useCallback((goalId: string, newTitle: string, newColor: string) => {
      // Using app state
      dispatch({
        type: "UPDATE_GOAL",
        payload: {
          id: goalId,
          title: newTitle,
          color: newColor,
        },
      });
    }, [dispatch]);

    // Handle removing a goal
    const handleRemoveGoal = useCallback((goalId: string) => {
        // Using app state
        dispatch({
            type: 'DELETE_GOAL',
            payload: { id: goalId }
        });
    }, [dispatch]);

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header with testing mode toggle */}
            <View style={styles.headerContainer}>
                <Text style={styles.header}>My Goals Map</Text>
                <View style={styles.headerActions}>
                    {/* Testing mode toggle */}
                    <Button
                        title="Add Top Goal"
                        onPress={() => handleAddGoal(null)}
                    />
                </View>
            </View>
            
            {/* Display goals count for debugging */}
            <Text style={styles.debugText}>
                Goals: {goals?.length || 0} ({'App State'})
            </Text>

            {/* Mind map component */}
            <GoalTreeMindMap
                // goals={goals}
                onAddGoal={handleAddGoal}
                onEditGoal={handleEditGoal}
                onRemoveGoal={handleRemoveGoal}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.surface,
         paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0, // Safer status bar handling
    },
     headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 10, // Adjust as needed
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
     },
    header: {
        fontSize: 20, // Slightly smaller header
        fontWeight: 'bold',
        color: Colors.text
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    testingModeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    testingModeText: {
        fontSize: 12,
        marginRight: 5,
        color: Colors.text,
    },
    debugText: {
        fontSize: 12,
        textAlign: 'center',
        color: Colors.textSecondary,
        paddingVertical: 4,
        backgroundColor: Colors.surface,
    },
});

// Helper functions remain the same
const updateGoalRecursive = (goals: Goal[], goalId: string, updateFn: (goal: Goal) => Goal): Goal[] => {
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
    return goals.map(goal => {
        if (goal.id === parentGoalId) {
             // Constraint check: Cannot add subgoal if habits exist
             if (goal.habitsIds && goal.habitsIds.length > 0) {
                 console.warn(`Attempted to add subgoal to goal ${parentGoalId} which has habits.`);
                 Alert.alert("Operation Failed", "Cannot add a subgoal to a goal that has linked habits. Remove habits first.");
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

export default GoalsScreen;