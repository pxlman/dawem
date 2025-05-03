// src/components/GoalTree.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import GoalNode from './GoalNode';
import { Goal } from '../../types'; // Import the Goal interface

// Define Props interface
interface GoalTreeProps {
    goals: Goal[]; // Array of top-level goals
    // Pass down the callbacks needed by GoalNode
    onAddGoal: (parentGoalId: string) => void;
    onEditGoal: (goalId: string, newTitle: string, newColor: string) => void;
    onRemoveGoal: (goalId: string) => void;
    // Pass habit callbacks if needed
}

const GoalTree: React.FC<GoalTreeProps> = ({
    goals,
    onAddGoal,
    onEditGoal,
    onRemoveGoal
}) => {
    return (
        <View style={styles.treeContainer}>
            {goals.map(goal => (
                <GoalNode
                    key={goal.id}
                    goal={goal}
                    level={0} // Top-level goals are always level 0
                    onAddGoal={onAddGoal}
                    onEditGoal={onEditGoal}
                    onRemoveGoal={onRemoveGoal}
                    // Pass habit callbacks if needed
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    treeContainer: {
        paddingVertical: 10,
    },
});

export default GoalTree;