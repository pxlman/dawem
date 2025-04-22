// app/(tabs)/index.tsx
import React, { useState, useMemo, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { format, addDays, subDays } from 'date-fns'; // Ensure format is imported
import { useRouter, useNavigation } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../../context/AppStateContext';
import TimeModuleGroup from '../../components/TimeModuleGroup'; // Ensure correct import
import { isHabitDue } from '../../utils/dateUtils';
import Colors, { fixedColors } from '../../constants/Colors'; // Import fixed colors
import { Habit, TimeModule } from '../../types';
import HabitEditModal from '../../components/HabitEditModal'; // Import the new modal component

// --- Date Header Component (Reverted to original without All Habits button) ---
interface DateHeaderProps { 
    currentDate: Date; 
    onPrevDay: () => void; 
    onNextDay: () => void; 
    onShowDatePicker: () => void;
    onTodayPress: () => void; // Add new prop for going to today
}

const DateHeader: React.FC<DateHeaderProps> = ({ currentDate, onPrevDay, onNextDay, onShowDatePicker, onTodayPress }) => (
    <View style={styles.datePickerContainer}>
        <TouchableOpacity onPress={onPrevDay} style={styles.dateArrow} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onTodayPress}>
            <Text style={styles.dateText}>{format(currentDate, 'EEE, MMM d, yyyy')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onShowDatePicker} style={styles.todayButton}>
            <Ionicons name='calendar-outline' style={styles.todayButtonIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onNextDay} style={styles.dateArrow} hitSlop={10}>
            <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
        </TouchableOpacity>
    </View>
);

// --- Type for grouped data ---
interface GroupedHabits { [key: string]: { timeModule?: TimeModule; habits: Habit[] } }
interface TimeModuleGroupData { timeModule?: TimeModule; habits: Habit[] }

// --- Main Screen Component ---
export default function HabitListScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const { habits, timeModules, dispatch } = useAppState();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Add header buttons using useLayoutEffect
    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity 
                        onPress={navigateToAllHabits}
                        style={{ marginRight: 16 }}
                    >
                        <Ionicons name="list" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={navigateToSettings}
                        style={{ marginRight: 16 }}
                    >
                        <Ionicons name="settings-outline" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                </View>
            ),
        });
    }, [navigation]);

    // State for managing the edit modal
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);

    const openEditModal = (habit: Habit) => {
        setHabitToEdit(habit);
        setIsEditModalVisible(true);
    };

    const closeEditModal = () => {
        setHabitToEdit(null);
        setIsEditModalVisible(false);
    };

    // Grouping Logic
    const groupedHabitsForDisplay: TimeModuleGroupData[] = useMemo(() => {
        const dueHabits = habits.filter(habit => 
            isHabitDue(habit, currentDate) // Only check if habit is due
        );
        const orderedTimeModules = [...timeModules]; // Ensure correct order
        const groups = orderedTimeModules.reduce<GroupedHabits>((acc, tm) => {
            acc[tm.id] = { timeModule: tm, habits: [] };
            return acc;
        }, {});
        groups['uncategorized'] = { timeModule: undefined, habits: [] };
        dueHabits.forEach(habit => {
            const targetGroupId = habit.timeModuleId && groups[habit.timeModuleId] ? habit.timeModuleId : 'uncategorized';
            if (groups[targetGroupId]) groups[targetGroupId].habits.push(habit);
            else groups['uncategorized'].habits.push(habit);
        });
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

    const openAddHabitScreen = () => {
        router.push({
            pathname: '/add-habit',
            params: { currentDate: format(currentDate, 'yyyy-MM-dd') }, // Pass the selected date as a valid string
        });
    };

    const navigateToAllHabits = () => {
        router.push({
            pathname: '/all-habits'
        });
    };

    const navigateToSettings = () => {
        router.push('/settings');
    };

    // Add function to go to today's date
    const goToToday = () => {
        setCurrentDate(new Date());
    };

    return (
        <View style={styles.container}>
             {/* Render Date Header */}
             <DateHeader
                 currentDate={currentDate}
                 onPrevDay={() => setCurrentDate(subDays(currentDate, 1))}
                 onNextDay={() => setCurrentDate(addDays(currentDate, 1))}
                 onShowDatePicker={showPicker}
                 onTodayPress={goToToday}
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
                            onEditHabit={openEditModal} // Pass the edit handler
                            // onDeleteHabit={handleDeleteFromToday} // Pass the delete handler
                        />
                    ))
                 )}
                {/* Remove extra padding View, handle with scrollContent padding */}
             </ScrollView>
             {/* Floating Action Button */}
             <TouchableOpacity style={styles.addButton} onPress={openAddHabitScreen}>
                 <Text style={styles.addButtonText}>+</Text>
             </TouchableOpacity>

             {/* Render the edit modal */}
             {isEditModalVisible && (
                 <HabitEditModal
                     habit={habitToEdit}
                     timeModules={timeModules} // Pass time modules
                     fixedColors={fixedColors} // Pass fixed colors
                     currentDate={currentDate} // Pass the selected date
                     onClose={closeEditModal}
                 />
             )}
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
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingVertical: 12, 
        paddingHorizontal: 15, 
        backgroundColor: Colors.surface,
        borderBottomWidth: 1, 
        borderBottomColor: Colors.lightGrey,
    },
    dateArrow: { padding: 8 },
    dateText: { 
        fontSize: 17, 
        fontWeight: '600', 
        color: Colors.primary, 
        paddingVertical: 5,
    },
    allHabitsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightGrey,
    },
    allHabitsButtonText: {
        color: Colors.primary,
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 8,
    },
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
    todayButton: {
        backgroundColor: Colors.surface,
        paddingHorizontal: 2,
        paddingVertical: 6,
        borderRadius: 16,
        marginLeft: 8,
    },
    todayButtonIcon: {
        color: Colors.primary,
        fontWeight: 'thin',
        fontSize: 24
        // fontSize: 14,
    },
    viewAllButton: {
        // Remove this style or keep it for future reference
    },
    viewAllText: {
        // Remove this style or keep it for future reference
    },
});