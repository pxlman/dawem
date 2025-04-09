// components/HabitItem.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { format } from 'date-fns';
import Colors from '../constants/Colors';
import { useAppDispatch, useAppState } from '../context/AppStateContext'; // Adjust path if needed
import { isLogForDate } from '../utils/dateUtils'; // Adjust path if needed
import { Habit, LogEntry, HabitLogStatus } from '../types'; // Adjust path if needed
import { Ionicons } from '@expo/vector-icons';

interface HabitItemProps { habit: Habit; currentDate: Date; }

const HabitItem: React.FC<HabitItemProps> = ({ habit, currentDate }) => {
    const dispatch = useAppDispatch();
    const { logs } = useAppState();
    const dateString = format(currentDate, 'yyyy-MM-dd');
    const todaysLog = logs.find(log => log.habitId === habit.id && isLogForDate(log, currentDate));
    const [countValue, setCountValue] = useState<string>(todaysLog?.value?.toString() ?? '');

    useEffect(() => { setCountValue(todaysLog?.value?.toString() ?? ''); }, [todaysLog]);

    const handleLog = (logData: HabitLogStatus | string) => {
        const payload: { habitId: string; date: string; status?: HabitLogStatus; value?: number } = {
            habitId: habit.id, date: dateString,
        };
        if (habit.measurement.type === 'binary') {
            if (['right', 'wrong', 'circle'].includes(logData as HabitLogStatus)) {
                 payload.status = logData as HabitLogStatus;
            } else { return; } // Invalid status
        } else if (habit.measurement.type === 'count') {
           const numValue = parseInt(logData, 10);
           if (!isNaN(numValue) && numValue >= 0) { payload.value = numValue; }
           else { Alert.alert("Invalid Input", "Please enter a valid non-negative number."); return; }
        } else { return; } // Unknown type
        // console.log(`Dispatching LOG_HABIT for ${habit.title} (${habit.id})`); // Optional logging
        dispatch({ type: 'LOG_HABIT', payload });
    };

    // --- FIX: Replaced comment with actual JSX ---
    const renderBinaryControls = () => (
        <View style={styles.controls}>
            <TouchableOpacity style={[styles.button, styles.rightButton, todaysLog?.status === 'right' && styles.selected]} onPress={() => handleLog('right')}>
                 <Ionicons name="checkmark-sharp" size={18} color={Colors.surface} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.wrongButton, todaysLog?.status === 'wrong' && styles.selected]} onPress={() => handleLog('wrong')}>
                 <Ionicons name="close-sharp" size={18} color={Colors.surface} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.circleButton, todaysLog?.status === 'circle' && styles.selected]} onPress={() => handleLog('circle')}>
                <Ionicons name="ellipse-outline" size={16} color={Colors.surface} />
            </TouchableOpacity>
        </View>
    );

    // --- FIX: Replaced comment with actual JSX ---
    const renderCountControls = () => (
        <View style={styles.controls}>
            <TextInput
                style={styles.countInput}
                keyboardType="number-pad"
                placeholder={typeof habit.measurement.unit === 'string' ? habit.measurement.unit : "Qty"}
                value={countValue}
                onChangeText={setCountValue} // Update local state directly
                // Decide when to log: onBlur or onSubmitEditing or explicit button
                onSubmitEditing={() => handleLog(countValue)}
                // onBlur={() => handleLog(countValue)} // Uncomment if you want log on blur
            />
             <TouchableOpacity style={[styles.button, styles.logButton]} onPress={() => handleLog(countValue)}>
                 <Text style={styles.logButtonText}>Log</Text>
            </TouchableOpacity>
        </View>
    );

    // --- FIX: Replaced comment with actual JSX ---
    console.log("HabitItem rendering...");
    return (
        <View style={[styles.container, { borderLeftColor: habit.color || Colors.primary }]}>
            <Text style={styles.title} numberOfLines={2}>{habit.title || 'Untitled Habit'}</Text>
            {habit.measurement.type === 'binary' ? renderBinaryControls() : renderCountControls()}
        </View>
    );
};

// --- Styles (Keep the corrected styles) ---
const styles = StyleSheet.create({
    container: { backgroundColor: Colors.surface, paddingVertical: 12, paddingLeft: 15, paddingRight: 10, marginVertical: 4, marginHorizontal: 10, borderRadius: 8, borderLeftWidth: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 1.0, },
    title: { fontSize: 16, fontWeight: '500', flex: 1, marginRight: 8, color: Colors.text },
    controls: { flexDirection: 'row', alignItems: 'center', },
    button: { padding: 6, borderRadius: 20, marginLeft: 5, minWidth: 32, minHeight: 32, justifyContent: 'center', alignItems: 'center', },
    rightButton: { backgroundColor: Colors.green },
    wrongButton: { backgroundColor: Colors.red },
    circleButton: { backgroundColor: Colors.blue },
    logButton: { backgroundColor: Colors.primary, paddingHorizontal: 10, borderRadius: 15 },
    logButtonText: { color: Colors.surface, fontWeight: 'bold', fontSize: 13, },
    selected: { opacity: 1.0, borderWidth: 2, borderColor: Colors.darkGrey, },
    countInput: { borderWidth: 1, borderColor: Colors.grey, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 5, minWidth: 45, textAlign: 'center', marginRight: 5, fontSize: 15 },
});

export default HabitItem;