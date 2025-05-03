// src/components/GoalNode.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Example using Ionicons
import { Goal } from '../../types'; // Import the Goal interface

// Define Props interface for type safety
interface GoalNodeProps {
    goal: Goal;
    level?: number; // Optional level, defaults to 0
    onAddGoal: (parentGoalId: string) => void; // Callback to add a subgoal
    onEditGoal: (goalId: string, newTitle: string, newColor: string) => void; // Callback to edit
    onRemoveGoal: (goalId: string) => void; // Callback to remove
    // Add habit linking callbacks if needed
    // onLinkHabit: (goalId: string) => void;
    // onUnlinkHabit: (goalId: string, habitId: string) => void;
}

const GoalNode: React.FC<GoalNodeProps> = ({
    goal,
    level = 0, // Default level to 0 if not provided
    onAddGoal,
    onEditGoal,
    onRemoveGoal
}) => {
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editedTitle, setEditedTitle] = useState<string>(goal.title);

    const nodeIndent = level * 25; // Indentation based on level
    const canHaveSubgoals = !goal.habitsIds || goal.habitsIds.length === 0;
    const canHaveHabits = !goal.subgoals || goal.subgoals.length === 0; // Only one can exist

    const handleEdit = () => {
        setEditedTitle(goal.title); // Reset edit text on opening
        setIsEditing(true);
    };

    const handleSave = () => {
        if (editedTitle.trim() === '') {
            Alert.alert('Error', 'Goal title cannot be empty.');
            return;
        }
        onEditGoal(goal.id, editedTitle.trim(), goal.color); // Pass current color back
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedTitle(goal.title); // Reset title if cancelled
    };

    const handleAddSubgoal = () => {
        if (canHaveSubgoals) {
             onAddGoal(goal.id); // Pass parent ID
        } else {
            Alert.alert("Cannot Add Subgoal", "This goal already has habits linked. Remove habits to add subgoals.");
        }
    };

    const handleRemove = () => {
        Alert.alert(
            'Confirm Deletion',
            `Are you sure you want to remove the goal "${goal.title}"?${goal.subgoals && goal.subgoals.length > 0 ? ' This will also remove all its subgoals.' : ''}`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => onRemoveGoal(goal.id) },
            ]
        );
    };

    // TODO: Add logic/button to link/unlink habits if needed
    // const handleLinkHabit = () => {
    //     if (canHaveHabits) {
    //         // Call prop like onLinkHabit(goal.id);
    //         // This might open a modal to select habits
    //     } else {
    //         Alert.alert("Cannot Link Habit", "This goal already has subgoals. Remove subgoals to link habits.");
    //     }
    // };

    return (
        <View>
            <View style={[styles.nodeContainer, { marginLeft: nodeIndent }]}>
                <View style={[styles.colorIndicator, { backgroundColor: goal.color || '#cccccc' }]} />
                {isEditing ? (
                    <View style={styles.editingView}>
                        <TextInput
                            style={styles.textInput}
                            value={editedTitle}
                            onChangeText={setEditedTitle} // No need for explicit event type here
                            autoFocus={true}
                            onSubmitEditing={handleSave} // Save on submit
                            onBlur={handleCancel} // Cancel if losing focus without saving explicitly
                        />
                        <TouchableOpacity onPress={handleSave} style={styles.iconButton}>
                            <Ionicons name="checkmark-circle" size={24} color="green" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleCancel} style={styles.iconButton}>
                             <Ionicons name="close-circle" size={24} color="grey" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.displayView}>
                        <Text style={styles.titleText}>{goal.title}</Text>
                        <View style={styles.actionsView}>
                             <TouchableOpacity onPress={handleEdit} style={styles.iconButton}>
                                <Ionicons name="pencil" size={20} color="#444" />
                            </TouchableOpacity>
                           {canHaveSubgoals && (
                                <TouchableOpacity onPress={handleAddSubgoal} style={styles.iconButton}>
                                    <Ionicons name="add-circle-outline" size={22} color="blue" />
                                </TouchableOpacity>
                           )}
                           {/* Add button for Habits
                           {canHaveHabits && (
                                <TouchableOpacity onPress={handleLinkHabit} style={styles.iconButton}>
                                    <Ionicons name="link-outline" size={22} color="purple" />
                                </TouchableOpacity>
                           )}
                           */}
                            <TouchableOpacity onPress={handleRemove} style={styles.iconButton}>
                                <Ionicons name="trash-outline" size={20} color="red" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            {/* Render Children */}
            <View style={styles.childrenContainer}>
                {/* Render Subgoals recursively */}
                {goal.subgoals?.map(subgoal => ( // Use optional chaining
                    <GoalNode
                        key={subgoal.id}
                        goal={subgoal}
                        level={level + 1}
                        onAddGoal={onAddGoal}
                        onEditGoal={onEditGoal}
                        onRemoveGoal={onRemoveGoal}
                        // Pass habit callbacks if needed
                    />
                ))}
                {/* Render Habit Info if present */}
                {goal.habitsIds && goal.habitsIds.length > 0 && (
                     <View style={[styles.habitsInfo, { marginLeft: nodeIndent + 25 }]}>
                        <Text style={styles.habitsText}>
                           Habits Linked: {goal.habitsIds.length} {/* Consider showing names */}
                        </Text>
                         {/* Add button here to manage linked habits 
                         <TouchableOpacity onPress={() => { Open habit management }} style={styles.iconButton}>
                              <Ionicons name="settings-outline" size={18} color="#555" />
                         </TouchableOpacity> */}
                    </View>
                )}
            </View>
        </View>
    );
};

// Styles remain the same as before
const styles = StyleSheet.create({
    nodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        minHeight: 50,
    },
    colorIndicator: {
        width: 6,
        height: '80%',
        borderRadius: 3,
        marginRight: 8,
    },
    displayView: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    editingView: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    titleText: {
        fontSize: 16,
        flexShrink: 1,
        marginRight: 10,
    },
    textInput: {
        flex: 1,
        borderBottomWidth: 1,
        borderColor: '#ccc',
        paddingVertical: 4,
        fontSize: 16,
        marginRight: 10,
    },
    actionsView: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        paddingHorizontal: 5,
        marginLeft: 5,
    },
    childrenContainer: {
       // Indentation handled by node margin
    },
    habitsInfo: {
        paddingVertical: 5,
        paddingHorizontal: 10, // Align with children text roughly
        marginTop: 5,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        // backgroundColor: '#f0f0f0',
        borderLeftWidth: 2,
        borderLeftColor: '#aaa'
    },
    habitsText: {
        fontSize: 13,
        color: '#555',
        fontStyle: 'italic',
    },
});

export default GoalNode;