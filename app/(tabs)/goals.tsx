// src/screens/GoalsScreen.tsx
import React, { useState, useCallback } from 'react';
import { ScrollView, View, Button, StyleSheet, Text, SafeAreaView, Alert } from 'react-native';
import Constants from 'expo-constants';
import 'react-native-get-random-values'; // Required for uuid
import { v4 as uuidv4 } from 'uuid';

import GoalTree from '../../components/goals/GoalTree'; // Adjust path if needed
import { Goal } from '../../types'; // Import the Goal interface

// --- Helper Functions for Immutable Updates (Typed) ---

// Recursive function to find and update a goal
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

// Recursive function to find and remove a goal
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

// Recursive function to add a subgoal
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

// --- Add Habit Linking Logic Here (Example Typed Placeholder) ---
// const linkHabitRecursive = (goals: Goal[], goalId: string, habitId: string): Goal[] => {
//     return goals.map(goal => {
//         if (goal.id === goalId) {
//             // Constraint check: Cannot add habits if subgoals exist
//             if (goal.subgoals && goal.subgoals.length > 0) {
//                 console.warn(`Attempted to link habit to goal ${goalId} which has subgoals.`);
//                 Alert.alert("Operation Failed", "Cannot link a habit to a goal that has subgoals. Remove subgoals first.");
//                 return goal; // Return unchanged goal
//             }
//             // Use Set for uniqueness, then convert back to array
//             const habitsIds = Array.from(new Set([...(goal.habitsIds ?? []), habitId]));
//             // Remove subgoals if we are adding habits (enforce constraint)
//             const { subgoals, ...rest } = goal;
//             return { ...rest, habitsIds };
//         }
//         if (goal.subgoals) {
//              const updatedSubgoals = linkHabitRecursive(goal.subgoals, goalId, habitId);
//              if (updatedSubgoals !== goal.subgoals) {
//                 return { ...goal, subgoals: updatedSubgoals };
//             }
//         }
//         return goal;
//     });
// };


// --- Initial Data Example ---
const INITIAL_GOALS: Goal[] = [ // Explicitly type the initial data
    {
        id: uuidv4(),
        title: 'Improve Fitness',
        color: '#4CAF50',
        subgoals: [
            { id: uuidv4(), title: 'Run 3 times a week', color: '#8BC34A' },
            {
                id: uuidv4(), title: 'Go to the Gym', color: '#CDDC39',
                subgoals: [
                     { id: uuidv4(), title: 'Strength Training', color: '#FFEB3B'},
                     { id: uuidv4(), title: 'Cardio Session', color: '#FFC107'}
                ]
            },
        ],
    },
    {
        id: uuidv4(),
        title: 'Learn React Native',
        color: '#2196F3',
        habitsIds: ['habit_abc', 'habit_def'], // Example IDs
    },
    {
        id: uuidv4(),
        title: 'Read More Books',
        color: '#9C27B0',
    }
];

// --- Component ---
const GoalsScreen: React.FC = () => { // No props needed for the screen itself
    const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);

    // Use useCallback for performance optimization, especially if passing down deeply
    const handleAddGoal = useCallback((parentGoalId: string | null = null) => {
        const newGoal: Goal = { // Create a new Goal object
            id: uuidv4(),
            title: 'New Goal',
            color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
            // Initially no subgoals or habits
        };

        if (parentGoalId === null) {
            // Add top-level goal
            setGoals(prevGoals => [...prevGoals, newGoal]);
        } else {
            // Add as subgoal using the recursive helper
             setGoals(prevGoals => addSubgoalRecursive(prevGoals, parentGoalId, newGoal));
        }
    }, []); // Dependency array is empty as we use functional updates

    const handleEditGoal = useCallback((goalId: string, newTitle: string, newColor: string) => {
        setGoals(prevGoals => updateGoalRecursive(prevGoals, goalId, (goal) => ({
            ...goal,
            title: newTitle,
            color: newColor, // Persist color change if needed
        })));
    }, []); // Dependency array empty

    const handleRemoveGoal = useCallback((goalId: string) => {
        setGoals(prevGoals => removeGoalRecursive(prevGoals, goalId));
    }, []); // Dependency array empty

    // Example Habit Linking Handler
    // const handleLinkHabitToGoal = useCallback((goalId: string, habitId: string) => {
    //     setGoals(prevGoals => linkHabitRecursive(prevGoals, goalId, habitId));
    // }, []);


    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                <Text style={styles.header}>My Goals</Text>
                <GoalTree
                    goals={goals}
                    onAddGoal={handleAddGoal}
                    onEditGoal={handleEditGoal}
                    onRemoveGoal={handleRemoveGoal}
                    // Pass habit linking handlers here if implemented
                />
                <View style={styles.addButtonContainer}>
                    <Button
                        title="Add Top-Level Goal"
                        onPress={() => handleAddGoal(null)} // null signifies top-level
                    />
                     {/* Example Button to Link Habit (requires more implementation) */}
                    {/* <Button
                        title="Link Habit to 'Read More'"
                        onPress={() => {
                            const readMoreGoal = goals.find(g => g.title === 'Read More Books');
                            if (readMoreGoal) {
                                // Check constraint before attempting to link
                                if (!readMoreGoal.subgoals || readMoreGoal.subgoals.length === 0) {
                                     handleLinkHabitToGoal(readMoreGoal.id, `habit_${Date.now()}`);
                                } else {
                                     Alert.alert("Cannot Link", "Goal 'Read More Books' has subgoals.");
                                }
                            } else {
                                Alert.alert("Error", "Goal not found.");
                            }
                        }}
                    /> */}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

// Styles remain the same
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
         paddingTop: Constants.statusBarHeight,
    },
    container: {
        flex: 1,
        paddingHorizontal: 15,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginVertical: 15,
        textAlign: 'center',
    },
     addButtonContainer: {
        marginVertical: 20,
        paddingHorizontal: 30,
    }
});

export default GoalsScreen;