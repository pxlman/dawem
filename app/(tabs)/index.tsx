// app/(tabs)/index.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { format, addDays, subDays } from 'date-fns';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { useAppState } from '../../context/AppStateContext';
import TimeModuleGroup from '../../components/TimeModuleGroup'; // Ensure correct import
import { isHabitDue } from '../../utils/dateUtils';
import Colors from '../../constants/Colors';
import { Habit, TimeModule } from '../../types';

// --- Date Header Component (Keep as is) ---
interface DateHeaderProps { currentDate: Date; onPrevDay: () => void; onNextDay: () => void; onShowDatePicker: () => void; }
const DateHeader: React.FC<DateHeaderProps> = ({ currentDate, onPrevDay, onNextDay, onShowDatePicker }) => (
    <View style={styles.datePickerContainer}>
        <TouchableOpacity onPress={onPrevDay} style={styles.dateArrow} hitSlop={10}><Ionicons name="chevron-back" size={24} color={Colors.primary} /></TouchableOpacity>
        <TouchableOpacity onPress={onShowDatePicker}><Text style={styles.dateText}>{format(currentDate, 'EEE, MMM d, yyyy')}</Text></TouchableOpacity>
        <TouchableOpacity onPress={onNextDay} style={styles.dateArrow} hitSlop={10}><Ionicons name="chevron-forward" size={24} color={Colors.primary} /></TouchableOpacity>
    </View>
);

// --- Type for grouped data ---
interface GroupedHabits { [key: string]: { timeModule?: TimeModule; habits: Habit[] } }
interface TimeModuleGroupData { timeModule?: TimeModule; habits: Habit[] }

// --- Main Screen Component ---
export default function HabitListScreen() {
    const router = useRouter();
    const { habits, timeModules } = useAppState();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Grouping Logic
    const groupedHabitsForDisplay: TimeModuleGroupData[] = useMemo(() => {
        const dueHabits = habits.filter(habit => !habit.archived && isHabitDue(habit, currentDate));
        const groups = timeModules.reduce<GroupedHabits>((acc, tm) => {
          acc[tm.id] = { timeModule: tm, habits: [] }; return acc;
        }, {});
        groups['uncategorized'] = { timeModule: undefined, habits: [] };
        dueHabits.forEach(habit => {
            const targetGroupId = habit.timeModuleId && groups[habit.timeModuleId] ? habit.timeModuleId : 'uncategorized';
            if (groups[targetGroupId]) groups[targetGroupId].habits.push(habit);
            else groups['uncategorized'].habits.push(habit);
        });
        // Order groups based on time module definition order + uncategorized at end? (Optional enhancement)
        const orderedGroupIds = [...timeModules.map(tm => tm.id), 'uncategorized'];
        return orderedGroupIds
                .map(id => groups[id])
                .filter(group => group && group.habits.length > 0); // Ensure group exists and is not empty

    }, [habits, timeModules, currentDate]);

    // Date Picker Handlers
    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (event.type === 'set' && selectedDate) setCurrentDate(selectedDate);
    };
    const showPicker = () => setShowDatePicker(true);
    return (
        <View style={styles.container}>
             {/* Render Date Header */}
             
             <DateHeader
                 currentDate={currentDate}
                 onPrevDay={() => setCurrentDate(subDays(currentDate, 1))}
                 onNextDay={() => setCurrentDate(addDays(currentDate, 1))}
                 onShowDatePicker={showPicker}
             />

             {/* Conditionally Render Date Picker */}

             {showDatePicker && (
                 <DateTimePicker value={currentDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onDateChange} />
             )}

             {/* ScrollView with Content */}

             <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Check if there's anything to display AT ALL */}
                {groupedHabitsForDisplay.length === 0 ? (
                     <Text style={styles.noHabitsText}>
                         No habits due on {format(currentDate, 'MMM d')}.
                     </Text>
                 ) : (
                    groupedHabitsForDisplay.map(({ timeModule, habits }) => (
                        <TimeModuleGroup
                            key={timeModule?.id ?? 'uncategorized'} // Use unique key
                            timeModule={timeModule}
                            habits={habits}
                            currentDate={currentDate}
                        />
                    ))
                 )}
                {/* Remove extra padding View, handle with scrollContent padding */}
             </ScrollView>
             {/* Floating Action Button */}
             <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-edit-habit')}>
                 <Text style={styles.addButtonText}>+</Text>
             </TouchableOpacity>
        </View>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background
    },
    datePickerContainer: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 15, backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.lightGrey,
    },
    dateArrow: { padding: 8, },
    dateText: { fontSize: 17, fontWeight: '600', color: Colors.primary, paddingVertical: 5, },
    scrollContent: { // Style for ScrollView content
        paddingBottom: 90, // Ensure space below last item for FAB
        // Removed paddingHorizontal, let TimeModuleGroup handle margins
    },
    noHabitsText: {
        textAlign: 'center', marginTop: 50, fontSize: 16,
        color: Colors.textSecondary, paddingHorizontal: 20
    },
    addButton: {
        position: 'absolute', bottom: 20, right: 20, backgroundColor: Colors.primary,
        width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center',
        elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3,
    },
    addButtonText: { color: Colors.surface, fontSize: 30, lineHeight: 34, },
});