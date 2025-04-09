import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Colors from '../constants/Colors';
import { Habit, TimeModule } from '../types';
import { useAppDispatch } from '../context/AppStateContext';
import { format } from 'date-fns'; // Ensure format is imported

interface HabitEditModalProps {
    habit: Habit | null;
    timeModules: TimeModule[];
    fixedColors: string[];
    currentDate: Date; // Add currentDate prop
    onClose: () => void;
}

const HabitEditModal: React.FC<HabitEditModalProps> = ({ habit, timeModules, fixedColors, currentDate, onClose }) => {
    const dispatch = useAppDispatch();
    const [editedName, setEditedName] = useState(habit?.title || '');
    const [editedColor, setEditedColor] = useState(habit?.color || '');
    const [editedTimeModuleId, setEditedTimeModuleId] = useState(habit?.timeModuleId || '');

    const handleSave = () => {
        if (!habit) return;
        dispatch({
            type: 'UPDATE_HABIT',
            payload: {
                id: habit.id,
                title: editedName.trim(),
                color: editedColor,
                timeModuleId: editedTimeModuleId,
            },
        });
        onClose();
    };

    const handleDelete = () => {
        if (!habit) return;
        Alert.alert(
            'Delete Habit',
            'Choose how you want to delete this habit:',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete Entirely',
                    style: 'destructive',
                    onPress: () => {
                        dispatch({ type: 'DELETE_HABIT', payload: { id: habit.id } });
                        onClose();
                    },
                },
                {
                    text: 'Delete From Here',
                    style: 'default',
                    onPress: () => {
                        const selectedDate = format(currentDate, 'yyyy-MM-dd'); // Use the selected date
                        dispatch({ type: 'DELETE_HABIT_FROM_TODAY', payload: { id: habit.id, fromDate: selectedDate } });
                        onClose();
                    },
                },
            ]
        );
    };

    return (
        <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={onClose} // Close modal when pressing outside
        >
            <TouchableOpacity
                style={styles.modalContent}
                activeOpacity={1}
                onPress={() => {}} // Prevent closing when pressing inside the modal
            >
                <Text style={styles.modalHeader}>Edit Habit</Text>
                <TextInput
                    style={styles.input}
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Habit Name"
                />
                <Text style={styles.label}>Color</Text>
                <View style={styles.colorPickerContainer}>
                    {fixedColors.map((color) => (
                        <TouchableOpacity
                            key={color}
                            style={[
                                styles.colorOption,
                                { backgroundColor: color },
                                editedColor === color && styles.colorOptionSelected,
                            ]}
                            onPress={() => setEditedColor(color)}
                        />
                    ))}
                </View>
                <Text style={styles.label}>Time Module</Text>
                <View style={styles.timeModulePicker}>
                    {timeModules.map((tm) => (
                        <TouchableOpacity
                            key={tm.id}
                            style={[
                                styles.timeModuleOption,
                                editedTimeModuleId === tm.id && styles.timeModuleOptionSelected,
                            ]}
                            onPress={() => setEditedTimeModuleId(tm.id)}
                        >
                            <Text style={styles.timeModuleText}>{tm.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.buttonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                        <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteButtonText}>Delete Habit</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: Colors.surface,
        padding: 20,
        borderRadius: 8,
        width: '90%',
        maxWidth: 400,
        alignItems: 'center',
    },
    modalHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: Colors.text,
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.grey,
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        width: '100%',
        color: Colors.text,
        backgroundColor: Colors.background,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: Colors.textSecondary,
    },
    colorPickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 15,
    },
    colorOption: {
        width: 40,
        height: 40,
        borderRadius: 20,
        margin: 5,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorOptionSelected: {
        borderColor: Colors.primary,
    },
    timeModulePicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 15,
        justifyContent: 'center',
    },
    timeModuleOption: {
        padding: 10,
        borderWidth: 1,
        borderColor: Colors.grey,
        borderRadius: 8,
        marginRight: 10,
        marginBottom: 10,
        color: Colors.green,
    },
    timeModuleOptionSelected: {
        borderColor: Colors.primary,
        color: Colors.darkGrey,
    },
    timeModuleText: {
        color: Colors.text,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 15,
    },
    saveButton: {
        backgroundColor: Colors.primary, // Use primary color for better visibility
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    cancelButton: {
        backgroundColor: Colors.error, // Use error color for cancel actions
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        flex: 1,
    },
    buttonText: {
        color: Colors.surface, // Ensure good contrast with the button background
        fontSize: 16,
        fontWeight: 'bold',
    },
    deleteButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: Colors.error,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default HabitEditModal;
