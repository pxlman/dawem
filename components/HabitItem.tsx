// components/HabitItem.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Vibration, Platform } from 'react-native';
// Import date-fns functions for date comparison
import { format, isAfter, startOfDay } from 'date-fns';
import Colors from '../constants/Colors'; // Adjust path if needed
import { useAppDispatch, useAppState } from '../context/AppStateContext'; // Adjust path if needed
import { isLogForDate } from '../utils/dateUtils'; // Adjust path if needed
import { Habit, LogEntry, HabitLogStatus } from '../types'; // Adjust path if needed
import { Ionicons } from '@expo/vector-icons';

interface HabitItemProps {
    habit: Habit;
    currentDate: Date; // Expecting a Date object
}

const HabitItem: React.FC<HabitItemProps> = ({ habit, currentDate }) => {
    const dispatch = useAppDispatch();
    const { logs } = useAppState();
    const dateString = format(currentDate, 'yyyy-MM-dd');

    // Determine if the viewed date is in the future (compare start of day)
    const isFutureDate = isAfter(startOfDay(currentDate), startOfDay(new Date()));

    // Find the log entry for this habit on the specific date being viewed
    const todaysLog = logs.find(log => log.habitId === habit.id && isLogForDate(log, currentDate));

    // State for the count input value
    const [countValue, setCountValue] = useState<string>(todaysLog?.value?.toString() ?? '');

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
        setCountValue(todaysLog?.value?.toString() ?? '');
        setCurrentButtonStatus(getInitialStatus());
    }, [todaysLog]); // Dependency is the log entry itself

    // Helper function to dispatch log updates, now includes future date check
    const updateLog = (newStatus?: HabitLogStatus, newValue?: number) => {
        if (isFutureDate) {
            // console.log("Blocked logging for future date."); // Optional log
            return; // Prevent logging for future dates
        }
        if (newStatus === undefined && newValue === undefined) {
            // Basic check for empty update - enhance if 'undo' needed
            return;
        }
        const payload: { habitId: string; date: string; status?: HabitLogStatus; value?: number } = {
            habitId: habit.id, date: dateString,
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
                 { text: 'Imperfect (◌)', onPress: () => { setCurrentButtonStatus('circle'); updateLog('circle'); } },
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
        const handleCountSubmit = () => {
            const numValue = parseInt(countValue, 10);
            // updateLog handles the future date check
            if (!isNaN(numValue) && numValue >= 0) {
                updateLog(undefined, numValue);
            } else if (countValue === '' && todaysLog?.value !== undefined) {
                // If input cleared, treat as clearing the value (send 0 or handle delete)
                 console.warn("Clearing count log needs proper implementation in reducer.");
                 updateLog(undefined, 0); // Or dispatch DELETE_LOG
            } else {
                // Revert to previous value if input is invalid and changed
                 if(countValue !== (todaysLog?.value?.toString() ?? '')) {
                    Alert.alert("Invalid Input", "Please enter a valid number.");
                    setCountValue(todaysLog?.value?.toString() ?? '');
                 }
            }
        }

        return (
            <View style={styles.controls}>
                <TextInput
                    style={[styles.countInput, isFutureDate ? styles.inputDisabled : {}]}
                    keyboardType="number-pad"
                    placeholder={habit.measurement.unit || "Qty"}
                    value={countValue}
                    onChangeText={setCountValue}
                    onSubmitEditing={handleCountSubmit} // Log on submit
                    onBlur={handleCountSubmit} // Log on blur
                    editable={!isFutureDate} // Disable editing
                    placeholderTextColor={isFutureDate ? Colors.darkGrey : Colors.textSecondary}
                    selectTextOnFocus={!isFutureDate} // Disable selection
                />
                {/* Optional explicit Log button can also be disabled */}
                {/* <TouchableOpacity style={[styles.logButton, isFutureDate ? styles.disabled : {}]} disabled={isFutureDate} onPress={handleCountSubmit} activeOpacity={isFutureDate ? 1 : 0.7}>
                     <Text style={styles.logButtonText}>Log</Text>
                </TouchableOpacity> */}
            </View>
        );
    };

    // --- Main Return ---
    return (
        // Apply disabled styling to the container as well
        <View style={[styles.container, { borderLeftColor: habit.color || Colors.primary }, isFutureDate ? styles.containerDisabled : {}]}>
            <Text style={[styles.title, isFutureDate ? styles.textDisabled : {}]}>{habit.title}</Text>
            {habit.measurement.type === 'binary' ? renderCombinedBinaryButton() : renderCountControls()}
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
    },
    containerDisabled: { // Style for future date habit item container
        opacity: 0.6, // Dim the item slightly
    },
    title: {
        fontSize: 16, fontWeight: '500', flex: 1, marginRight: 10, color: Colors.text
    },
    textDisabled: { // Style for text on future date items
         color: Colors.textSecondary, // Dim the text
    },
    controls: { flexDirection: 'row', alignItems: 'center', },

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

    // General disabled style
    disabled: {
        opacity: 0.5, // Make buttons/inputs more transparent
    },
});

export default HabitItem;