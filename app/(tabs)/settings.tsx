import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { useAppState, useAppDispatch } from '../../context/AppStateContext';
import Colors from '../../constants/Colors';
import { TimeModule } from '../../types';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function SettingsScreen() {
    const { timeModules, settings } = useAppState();
    const dispatch = useAppDispatch();
    const [newTimeModuleName, setNewTimeModuleName] = useState<string>('');
    const [newDayStartTime, setNewDayStartTime] = useState<Date | null>(null); // Initialize as null
    const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);

    useEffect(() => {
        if (settings.startTimeOfDay) {
            // Construct a Date object using the saved start time
            const [hours, minutes] = settings.startTimeOfDay.split(':').map(Number);
            const savedStartTime = new Date();
            savedStartTime.setHours(hours, minutes, 0, 0);
            setNewDayStartTime(savedStartTime);
        } else {
            // Default to midnight if no start time is saved
            const defaultStartTime = new Date();
            defaultStartTime.setHours(0, 0, 0, 0);
            setNewDayStartTime(defaultStartTime);
        }
    }, [settings.startTimeOfDay]);

    const handleAddTimeModule = () => {
        const trimmedName = newTimeModuleName.trim();
        if (!trimmedName) return Alert.alert("Error", "Time Module name cannot be empty.");
        if (timeModules.some(tm => tm.name.toLowerCase() === trimmedName.toLowerCase())) {
            return Alert.alert("Error", `A Time Module named "${trimmedName}" already exists.`);
        }
        dispatch({ type: 'ADD_TIME_MODULE', payload: { name: trimmedName } });
        setNewTimeModuleName('');
    };

    const handleDeleteTimeModule = (id: string, name: string) => {
        if (timeModules.length <= 1) { return Alert.alert("Error", "Cannot delete the last Time Module."); }
        Alert.alert("Confirm Delete", `Delete Time Module "${name}"?\n\nHabits using it will be reassigned.`,
            [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => dispatch({ type: 'DELETE_TIME_MODULE', payload: { id } }) }], { cancelable: true }
        );
    };

    const handleTimeChange = (event: any, selectedTime?: Date) => {
        setIsTimePickerVisible(false);
        if (selectedTime) {
            setNewDayStartTime(selectedTime);
            const formattedTime = selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            dispatch({ type: 'UPDATE_START_TIME', payload: { startTimeOfDay: formattedTime } });
        }
    };

    const renderTimeModuleItem = ({ item, drag, isActive }: { item: TimeModule; drag: () => void; isActive: boolean }) => (
        <TouchableOpacity
            onLongPress={drag}
            style={[
                styles.listItem,
                isActive && styles.activeListItem,
            ]}
        >
            <Ionicons name="time-outline" size={20} color={Colors.textSecondary} style={styles.itemIcon} />
            <Text style={styles.itemName}>{item.name}</Text>
            {timeModules.length > 1 && (
                <TouchableOpacity onPress={() => handleDeleteTimeModule(item.id, item.name)} hitSlop={15}>
                    <Ionicons name="trash-outline" size={22} color={Colors.error} />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.header}>Start Time of New Day</Text>
                <TouchableOpacity onPress={() => setIsTimePickerVisible(true)} style={styles.timePickerButton}>
                    <Text style={styles.timePickerText}>
                        {newDayStartTime
                            ? newDayStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                            : '00:00'}
                    </Text>
                </TouchableOpacity>
                {isTimePickerVisible && newDayStartTime && (
                    <DateTimePicker
                        value={newDayStartTime}
                        mode="time"
                        display="default"
                        onChange={handleTimeChange}
                    />
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.header}>Time Modules</Text>
                <DraggableFlatList
                    data={timeModules}
                    renderItem={renderTimeModuleItem}
                    keyExtractor={(item) => item.id}
                    onDragEnd={({ data }) => dispatch({ type: 'REORDER_TIME_MODULES', payload: data })}
                    contentContainerStyle={styles.timeModulesList}
                />
                <View style={styles.addSection}>
                    <Text style={styles.label}>Add New Time Module</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="New Time Module Name (e.g., Morning)"
                        value={newTimeModuleName}
                        onChangeText={setNewTimeModuleName}
                        placeholderTextColor={Colors.textSecondary}
                    />
                    <Button
                        title="Add Time Module"
                        onPress={handleAddTimeModule}
                        disabled={!newTimeModuleName.trim()}
                        color={Colors.accent}
                    />
                </View>
            </View>

            <View style={[styles.section, { marginTop: 20 }]}>
                <Text style={styles.header}>Data Management</Text>
                <Button
                    title="Reset All App Data"
                    color={Colors.error}
                    onPress={() => {
                        Alert.alert(
                            "Confirm Reset",
                            "Delete ALL habits and logs?",
                            [
                                { text: "Cancel", style: 'cancel' },
                                { text: "Reset Data", style: 'destructive', onPress: () => dispatch({ type: 'RESET_STATE' }) }
                            ],
                            { cancelable: true }
                        );
                    }}
                />
                <Text style={styles.infoText}>This will permanently delete all your tracked habit data.</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        padding: 15,
    },
    section: {
        marginBottom: 20,
        backgroundColor: Colors.surface,
        borderRadius: 8,
        padding: 15,
        elevation: 1,
        borderWidth: 1,
        borderColor: Colors.grey,
    },
    header: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: Colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightGrey,
        paddingBottom: 8,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightGrey,
        backgroundColor: Colors.surface,
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 8,
    },
    itemIcon: { marginRight: 12 },
    itemName: { fontSize: 16, flex: 1, color: Colors.text },
    addSection: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: Colors.lightGrey },
    input: {
        borderWidth: 1,
        borderColor: Colors.grey,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        marginBottom: 12,
        backgroundColor: Colors.background,
        color: Colors.text,
    },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: Colors.textSecondary },
    infoText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 10 },
    activeListItem: { backgroundColor: Colors.lightGrey },
    timePickerButton: {
        backgroundColor: Colors.accent,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    timePickerText: {
        color: Colors.surface,
        fontSize: 16,
        fontWeight: 'bold',
    },
    timeModulesList: {
        marginTop: 10,
    },
});