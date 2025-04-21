import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppState, useAppDispatch } from '../context/AppStateContext';
import Colors, { fixedColors } from '../constants/Colors';
import { Habit, TimeModule } from '../types';
import HabitEditModal from '../components/HabitEditModal';

// --- Type for grouped data ---
interface GroupedHabits { [key: string]: { timeModule?: TimeModule; habits: Habit[] } }
interface TimeModuleGroupData { timeModule?: TimeModule; habits: Habit[] }

// Component to display a single habit item
const HabitItem: React.FC<{
    habit: Habit,
    onEdit: (habit: Habit) => void,
    onDelete: (habit: Habit) => void
}> = ({ habit, onEdit, onDelete }) => {
    return (
        <View style={styles.habitItem}>
            <View style={[styles.habitColorIndicator, { backgroundColor: habit.color }]} />
            <View style={styles.habitContent}>
                <Text style={styles.habitTitle}>{habit.title}</Text>
                <Text style={styles.habitInfo}>
                    {habit.repetition.type} • Created: {new Date(habit.createdAt).toLocaleDateString()}
                </Text>
                {habit.startDate && <Text style={styles.habitInfo}>Start: {habit.startDate}</Text>}
                {habit.endDate && <Text style={styles.habitInfo}>End: {habit.endDate}</Text>}
            </View>
            <View style={styles.habitActions}>
                <TouchableOpacity onPress={() => onEdit(habit)} style={styles.actionButton}>
                    <Ionicons name="pencil" size={18} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(habit)} style={styles.actionButton}>
                    <Ionicons name="trash" size={18} color={Colors.error} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

// Time Module Group component
const TimeModuleGroup = ({ timeModule, habits, onEditHabit, onDeleteHabit }) => (
    <View style={styles.timeModuleGroup}>
        <Text style={styles.timeModuleTitle}>
            {timeModule ? timeModule.name : 'Uncategorized'}
        </Text>
        {habits.map(habit => (
            <HabitItem 
                key={habit.id} 
                habit={habit} 
                onEdit={onEditHabit} 
                onDelete={onDeleteHabit} 
            />
        ))}
    </View>
);

// Main All Habits Screen component
export default function AllHabitsScreen() {
    const router = useRouter();
    const { habits, timeModules } = useAppState();
    const dispatch = useAppDispatch();
    const [habitToEdit, setHabitToEdit] = React.useState<Habit | null>(null);
    const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
    const currentDate = new Date(); // Used for the edit modal

    // Group all habits by time module
    const groupedHabitsForDisplay: TimeModuleGroupData[] = useMemo(() => {
        const orderedTimeModules = [...timeModules]; // Ensure correct order
        const groups = orderedTimeModules.reduce<GroupedHabits>((acc, tm) => {
            acc[tm.id] = { timeModule: tm, habits: [] };
            return acc;
        }, {});
        groups['uncategorized'] = { timeModule: undefined, habits: [] };

        // Include ALL habits, not just due ones
        habits.forEach(habit => {
            const targetGroupId = habit.timeModuleId && groups[habit.timeModuleId] ? habit.timeModuleId : 'uncategorized';
            if (groups[targetGroupId]) groups[targetGroupId].habits.push(habit);
            else groups['uncategorized'].habits.push(habit);
        });
        
        const orderedGroupIds = [...timeModules.map(tm => tm.id), 'uncategorized'];
        return orderedGroupIds
            .map(id => groups[id])
            .filter(group => group && group.habits.length > 0); // Ensure group exists and has habits
    }, [habits, timeModules]);

    // Handle edit habit
    const openEditModal = (habit: Habit) => {
        setHabitToEdit(habit);
        setIsEditModalVisible(true);
    };

    const closeEditModal = () => {
        setHabitToEdit(null);
        setIsEditModalVisible(false);
    };

    // Handle delete habit
    const handleDeleteHabit = (habit: Habit) => {
        Alert.alert(
            'Delete Habit',
            `Are you sure you want to delete "${habit.title}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        dispatch({
                            type: 'DELETE_HABIT',
                            payload: { id: habit.id },
                        });
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>All Habits</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {groupedHabitsForDisplay.length === 0 ? (
                    <Text style={styles.noHabitsText}>No habits found.</Text>
                ) : (
                    groupedHabitsForDisplay.map(({ timeModule, habits }) => (
                        <TimeModuleGroup
                            key={timeModule?.id ?? 'uncategorized'}
                            timeModule={timeModule}
                            habits={habits}
                            onEditHabit={openEditModal}
                            onDeleteHabit={handleDeleteHabit}
                        />
                    ))
                )}
            </ScrollView>

            {/* Add habit button */}
            <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => router.push({
                    pathname: '/add-habit',
                    params: { currentDate: new Date().toISOString().split('T')[0] }
                })}
            >
                <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>

            {/* Edit modal */}
            {isEditModalVisible && habitToEdit && (
                <HabitEditModal
                    habit={habitToEdit}
                    timeModules={timeModules}
                    fixedColors={fixedColors}
                    currentDate={currentDate}
                    onClose={closeEditModal}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightGrey,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: Colors.text,
    },
    backButton: {
        padding: 8,
    },
    scrollContent: {
        paddingBottom: 90,
    },
    timeModuleGroup: {
        marginVertical: 10,
        paddingHorizontal: 15,
    },
    timeModuleTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.textSecondary,
        marginBottom: 8,
        marginTop: 5,
    },
    habitItem: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: 8,
        marginVertical: 4,
        padding: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    habitColorIndicator: {
        width: 6,
        borderRadius: 3,
        marginRight: 12,
    },
    habitContent: {
        flex: 1,
    },
    habitTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.text,
    },
    habitInfo: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    habitActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 8,
        marginLeft: 5,
    },
    noHabitsText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: Colors.textSecondary,
        paddingHorizontal: 20
    },
    addButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: Colors.primary,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    addButtonText: {
        color: Colors.surface,
        fontSize: 30,
        lineHeight: 34,
    },
});
