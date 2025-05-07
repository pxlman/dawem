// components/HabitItem.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Vibration, Platform, Button } from 'react-native';
// Import date-fns functions for date comparison
import { format, isAfter, startOfDay } from 'date-fns';
import Colors, { fixedColors } from '../constants/Colors'; // Adjust path if needed
import { useAppDispatch, useAppState } from '../context/AppStateContext'; // Adjust path if needed
import { isLogForDate } from '../utils/dateUtils'; // Import the shared function
import { getWeeklyHabitTotal } from '../utils/habitUtils'; // Import the weekly total calculation function
import { Habit, LogEntry, HabitLogStatus, TimeModule } from '@/types/index'; // Adjust path if needed
import { Ionicons } from '@expo/vector-icons';

interface HabitItemProps {
    habit: Habit;
    currentDate: Date; // Expecting a Date object
    onEdit: () => void; // Add the edit handler prop
}

const HabitItem: React.FC<HabitItemProps> = ({ habit, currentDate, onEdit }) => {
    const dispatch = useAppDispatch();
    const { logs, timeModules, settings } = useAppState();
    const dateString = format(currentDate, 'yyyy-MM-dd');
    
    // Get the configured start day of week from settings (default to Friday if not set)
    const startDayOfWeek = settings?.startDayOfWeek || 6;
    
    // Determine if the viewed date is in the future (compare start of day)
    const isFutureDate = isAfter(startOfDay(currentDate), startOfDay(new Date()));

    // For weekly counter habits, find the log entry for the specific date being viewed
    const todaysLog = logs.find((log:LogEntry) => {
        return log.habitId === habit.id && isLogForDate(log, currentDate);
    });

    // State for the count input value
    const [countValue, setCountValue] = useState<number>(todaysLog?.value || 0);
    
    // Track weekly total using the utility function
    const [weeklyTotal, setWeeklyTotal] = useState<number>(0);
    
    useEffect(() => {
        if (habit.repetition.type === 'weekly' && habit.measurement.type === 'count') {
            // Pass logs and startDayOfWeek to the utility function
            setWeeklyTotal(getWeeklyHabitTotal(habit.id, currentDate, logs, startDayOfWeek));
        }
    }, [logs, currentDate, habit.id, habit.repetition.type, habit.measurement.type, startDayOfWeek]);

    // State for the visual appearance of the binary button
    const getInitialStatus = (): HabitLogStatus | 'none' => {
        if (!todaysLog) return 'none';
        if (['right', 'wrong', 'circle'].includes(todaysLog.status as HabitLogStatus)) {
            return todaysLog.status as HabitLogStatus;
        }
        // Also consider count logs for initial binary state display if needed
        if (todaysLog.value !== undefined && todaysLog.value > 0 && habit.measurement.type === 'binary') return 'right';
        return 'none';
    };
    const [currentButtonStatus, setCurrentButtonStatus] = useState<HabitLogStatus | 'none'>(getInitialStatus);

    // Update local state if the relevant log entry changes
    useEffect(() => {
        setCountValue(todaysLog?.value?? 0);
        setCurrentButtonStatus(getInitialStatus());
    }, [todaysLog]); // Dependency is the log entry itself

    // Helper function to dispatch log updates - now simplified, no special handling for weekly counters
    const updateLog = (newStatus?: HabitLogStatus, newValue?: number) => {
        if (isFutureDate) {
            return; // Prevent logging for future dates
        }
        if (newStatus === undefined && newValue === undefined) {
            return;
        }
        
        // Always use the actual date - no special handling for weekly counter habits
        const logDate = dateString;
        
        const payload: { habitId: string; date: string; status?: HabitLogStatus; value?: number } = {
            habitId: habit.id, 
            date: logDate,
            ...(newStatus !== undefined && { status: newStatus }),
            ...(newValue !== undefined && { value: newValue }),
        };
        dispatch({ type: 'LOG_HABIT', payload });
    };

    // --- Binary Button Handlers ---
    const handleSinglePress = () => {
        // updateLog function handles the future date check internally
        let nextStatus: HabitLogStatus | undefined;
        if (currentButtonStatus === 'right') nextStatus = 'wrong';
        else if (currentButtonStatus === 'wrong') nextStatus = 'right';
        else nextStatus = 'right'; // Default to 'right' from 'none' or 'circle'

        // Update visual state immediately only if NOT a future date
        if (!isFutureDate) {
            setCurrentButtonStatus(nextStatus ?? 'none');
        }
        updateLog(nextStatus);
    };

    const handleLongPress = () => {
         if (isFutureDate) { return; } // Prevent menu for future dates
         Vibration.vibrate(50);
         Alert.alert(
             `Log: ${habit.title}`,
             `Choose status for ${format(currentDate, 'MMM d')}:`,
             [
                 { text: 'Did (✓)', onPress: () => { setCurrentButtonStatus('right'); updateLog('right'); } },
                 { text: 'Didn\'t (✕)', onPress: () => { setCurrentButtonStatus('wrong'); updateLog('wrong'); } },
                 { text: 'Late (O)', onPress: () => { setCurrentButtonStatus('circle'); updateLog('circle'); } },
                 { text: 'Clear Log', style: 'destructive', onPress: () => {
                      setCurrentButtonStatus('none');
                      // TODO: Implement DELETE_LOG action or specific handling in LOG_HABIT for undefined status
                      console.warn("Clear log needs proper implementation in reducer.");
                      updateLog(undefined); // Attempt to clear by sending undefined status
                    }},
                 { text: 'Cancel', style: 'cancel' },
             ],
             { cancelable: true }
         );
    };

    // --- Render Functions ---
    const renderCombinedBinaryButton = () => {
        let iconName: keyof typeof Ionicons.glyphMap = 'ellipse-outline';
        let buttonStyle = styles.button_none;
        let iconColor = Colors.textSecondary; // Default icon color for dark theme 'none'

        switch (currentButtonStatus) {
            case 'right': iconName = 'checkmark-sharp'; buttonStyle = styles.button_right; iconColor = Colors.surface; break;
            case 'wrong': iconName = 'close-sharp'; buttonStyle = styles.button_wrong; iconColor = Colors.surface; break;
            case 'circle': iconName = 'ellipse-outline'; buttonStyle = styles.button_circle; iconColor = Colors.surface; break;
        }

        const combinedButtonStyle = [
            styles.button_base,
            buttonStyle,
            isFutureDate ? styles.disabled : {} // Apply disabled style conditionally
        ];
        const finalIconColor = isFutureDate ? Colors.grey : iconColor; // Dim icon when disabled

        return (
            <TouchableOpacity
                style={combinedButtonStyle}
                onPress={handleSinglePress}
                onLongPress={handleLongPress}
                delayLongPress={300}
                disabled={isFutureDate} // Disable touch interactions
                activeOpacity={isFutureDate ? 1 : 0.7} // No visual feedback when disabled
            >
                <Ionicons name={iconName} size={20} color={finalIconColor} />
            </TouchableOpacity>
        );
    };

    const renderCountControls = () => {
        const handleIncrement = () => {
            if (isFutureDate) return; // Prevent logging for future dates
            const newValue = (todaysLog?.value || 0) + 1;
            setCountValue(newValue);
            updateLog(undefined, newValue);
        };

        const handleDecrement = () => {
            if (isFutureDate) return; // Prevent logging for future dates
            const newValue = Math.max((todaysLog?.value || 0) - 1, 0); // Ensure value doesn't go below 0
            setCountValue(newValue);
            updateLog(undefined, newValue);
        };

        return (
            <View style={styles.controls}>
                <Text style={{color: Colors.textSecondary}}>+{countValue} </Text>
                <TouchableOpacity
                    style={[styles.countButton, isFutureDate ? styles.disabled : {}]}
                    onPress={handleDecrement}
                    disabled={isFutureDate}
                >
                    <Ionicons name="remove-circle-outline" size={24} color={isFutureDate ? Colors.grey : Colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.countValue, isFutureDate ? styles.textDisabled : {}]}>
                    {habit.repetition.type === 'weekly' && habit.measurement.type === 'count' 
                        ? `${weeklyTotal || '0'} / ${habit.measurement.targetValue}`
                        : `${countValue || '0'} / ${habit.measurement.targetValue}`
                    }
                </Text>
                <TouchableOpacity
                    style={[styles.countButton, isFutureDate ? styles.disabled : {}]}
                    onPress={handleIncrement}
                    disabled={isFutureDate}
                >
                    <Ionicons name="add-circle-outline" size={24} color={isFutureDate ? Colors.grey : Colors.primary} />
                </TouchableOpacity>
            </View>
        );
    };

    // --- Edit Modal State and Handlers ---
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editedName, setEditedName] = useState(habit.title);
    const [editedColor, setEditedColor] = useState(habit.color);
    const [editedTimeModuleId, setEditedTimeModuleId] = useState(habit.timeModuleId);

    const handleSaveEdit = () => {
        dispatch({
            type: 'UPDATE_HABIT',
            payload: {
                id: habit.id,
                title: editedName.trim(),
                color: editedColor,
                timeModuleId: editedTimeModuleId,
            },
        });
        setIsEditModalVisible(false);
    };

    const renderEditModal = () => (
        <View style={styles.modalOverlay}>
            <TouchableOpacity
                style={styles.modalBackground}
                activeOpacity={1}
                onPress={() => setIsEditModalVisible(false)} // Dismiss modal on outside press
            />
            <View style={styles.modalContent}>
                <Text style={styles.modalHeader}>Edit Habit</Text>
                <TextInput
                    style={styles.input}
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Habit Name"
                    placeholderTextColor={Colors.textSecondary}
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
                    {timeModules.map((tm:TimeModule) => (
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
                <View style={styles.modalActions}>
                    <Button title="Save" onPress={handleSaveEdit} color={Colors.primary} />
                    <Button title="Cancel" onPress={() => setIsEditModalVisible(false)} color={Colors.error} />
                </View>
            </View>
        </View>
    );

    // --- Main Return ---
    return (
        // Apply disabled styling to the container as well
        <View style={[styles.container, { borderLeftColor: habit.color || Colors.primary }, isFutureDate ? styles.containerDisabled : {}]}>
            <TouchableOpacity
                style={styles.touchableArea}
                onLongPress={onEdit} // Trigger the edit modal
                delayLongPress={300}
            >
                <Text style={[styles.title, isFutureDate ? styles.textDisabled : {}]}>{habit.title}</Text>
            </TouchableOpacity>
            {habit.measurement.type === 'binary' ? renderCombinedBinaryButton() : renderCountControls()}
            {isEditModalVisible && renderEditModal()}
        </View>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.surface, paddingVertical: 12, paddingLeft: 15, paddingRight: 10,
        marginVertical: 4, marginHorizontal: 10, borderRadius: 8, borderLeftWidth: 6,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        elevation: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18, shadowRadius: 1.0,
        zIndex: 1, // Ensure habit items are below the modal
    },
    containerDisabled: { // Style for future date habit item container
        opacity: 0.6, // Dim the item slightly
    },
    touchableArea: {
        flex: 1, // Allow the touchable area to expand
        marginRight: 10, // Add space before the buttons
    },
    title: {
        fontSize: 16, fontWeight: '500', color: Colors.text
    },
    controls: { flexDirection: 'row', alignItems: 'center', },
    countButton: {
        padding: 5,
    },
    countValue: {
        fontSize: 16,
        fontWeight: 'bold',
        marginHorizontal: 10,
        color: Colors.text,
    },
    textDisabled: {
        color: Colors.textSecondary,
    },
    disabled: {
        opacity: 0.5,
    },

    // --- Combined Button Styles ---
    button_base: {
        padding: 8, borderRadius: 25, minWidth: 40, minHeight: 40,
        justifyContent: 'center', alignItems: 'center', borderWidth: 1.5,
        borderColor: Colors.grey,
    },
    button_none: {
        backgroundColor: Colors.surface, borderColor: Colors.lightGrey,
    },
    button_right: {
        backgroundColor: Colors.green, borderColor: Colors.green,
    },
    button_wrong: {
        backgroundColor: Colors.red, borderColor: Colors.red,
    },
    button_circle: {
        backgroundColor: Colors.blue, borderColor: Colors.blue,
    },

    // --- Count Control Styles ---
    countInput: {
        borderWidth: 1, borderColor: Colors.grey, borderRadius: 5,
        paddingHorizontal: 10, paddingVertical: 6, minWidth: 50,
        textAlign: 'center', marginRight: 5, fontSize: 15,
        color: Colors.text, // Ensure text color for dark mode
        backgroundColor: Colors.surface, // Ensure background for dark mode
    },
    inputDisabled: { // Style for disabled text input
         backgroundColor: Colors.lightGrey, // Use a dark theme appropriate grey
         color: Colors.darkGrey,
         borderColor: Colors.darkGrey,
    },
    // Optional log button styles (if used)
    // logButton: { backgroundColor: Colors.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 15 },
    // logButtonText: { color: Colors.surface, fontWeight: 'bold', fontSize: 13, },

    // --- Modal Styles ---
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dim background
        zIndex: 1000, // Ensure the modal is above all other components
    },
    modalBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dim background
    },
    modalContent: {
        backgroundColor: Colors.surface,
        padding: 20,
        borderRadius: 8,
        width: '90%',
        maxWidth: 400, // Limit modal width for larger screens
        zIndex: 1001, // Ensure the content is above the background
        elevation: 11, // For Android
        alignItems: 'center', // Center content horizontally
    },
    modalHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 15,
        textAlign: 'center', // Center header text
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: Colors.textSecondary,
    },
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
        width: '100%', // Ensure input spans the modal width
    },
    colorPickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center', // Center color options
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
        justifyContent: 'center', // Center time module options
    },
    timeModuleOption: {
        padding: 10,
        borderWidth: 1,
        borderColor: Colors.grey,
        borderRadius: 8,
        marginRight: 10,
        marginBottom: 10,
    },
    timeModuleOptionSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    timeModuleText: {
        color: Colors.text,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%', // Ensure buttons span the modal width
    },
});

export default HabitItem;