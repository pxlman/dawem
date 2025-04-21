import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppState, useAppDispatch } from '../context/AppStateContext';
import Colors, { fixedColors } from '../constants/Colors';
import { Habit, TimeModule } from '../types';
import HabitEditModal from '../components/HabitEditModal';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';

// --- Type for grouped data ---
interface GroupedHabits { [key: string]: { timeModule?: TimeModule; habits: Habit[] } }
interface TimeModuleGroupData { timeModule?: TimeModule; habits: Habit[]; id: string; }

// Memoized habit item renderer to prevent re-renders
const HabitItemRenderer = React.memo(({ 
    item, 
    drag, 
    isActive,
    onEditHabit,
    onDeleteHabit
}: {
    item: Habit;
    drag: () => void;
    isActive: boolean;
    onEditHabit: (habit: Habit) => void;
    onDeleteHabit: (habit: Habit) => void;
}) => {
    return (
        <ScaleDecorator>
            <TouchableOpacity
                onLongPress={drag}
                disabled={isActive}
                style={[
                    styles.habitItem,
                    { backgroundColor: isActive ? Colors.lightGrey : Colors.surface }
                ]}
            >
                <View style={[styles.habitColorIndicator, { backgroundColor: item.color }]} />
                <View style={styles.habitContent}>
                    <Text style={styles.habitTitle}>{item.title}</Text>
                    <Text style={styles.habitInfo}>
                        {item.repetition.type} • Created: {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                    {item.startDate && <Text style={styles.habitInfo}>Start: {item.startDate}</Text>}
                    {item.endDate && <Text style={styles.habitInfo}>End: {item.endDate}</Text>}
                </View>
                <View style={styles.habitActions}>
                    <TouchableOpacity onPress={() => onEditHabit(item)} style={styles.actionButton}>
                        <Ionicons name="pencil" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onDeleteHabit(item)} style={styles.actionButton}>
                        <Ionicons name="trash" size={18} color={Colors.error} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={drag} style={styles.actionButton}>
                        <Ionicons name="menu" size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </ScaleDecorator>
    );
}, (prevProps, nextProps) => {
    // Custom equality check to prevent unnecessary re-renders
    return prevProps.item.id === nextProps.item.id && 
           prevProps.isActive === nextProps.isActive &&
           prevProps.item.title === nextProps.item.title &&
           prevProps.item.color === nextProps.item.color &&
           prevProps.item.sortOrder === nextProps.item.sortOrder;
});

// Component for time module group with draggable habits
const TimeModuleGroup = React.memo(({ 
    timeModule,
    habits,
    onEditHabit,
    onDeleteHabit
}: {
    timeModule?: TimeModule;
    habits: Habit[];
    onEditHabit: (habit: Habit) => void;
    onDeleteHabit: (habit: Habit) => void;
}) => {
    const dispatch = useAppDispatch();
    const [groupHabits, setGroupHabits] = useState(habits);
    const [isUpdating, setIsUpdating] = useState(false);

    React.useEffect(() => {
        if (!isUpdating) {
            setGroupHabits(habits);
        }
    }, [habits, isUpdating]);

    // Create a stable render function with useCallback
    const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<Habit>) => {
        return (
            <HabitItemRenderer
                item={item}
                drag={drag}
                isActive={isActive}
                onEditHabit={onEditHabit}
                onDeleteHabit={onDeleteHabit}
            />
        );
    }, [onEditHabit, onDeleteHabit]);

    // Stable key extractor
    const keyExtractor = useCallback((item: Habit) => item.id, []);

    const handleDragEnd = useCallback(({ data }: { data: Habit[] }) => {
        // Set updating flag to prevent immediate state update from parent
        setIsUpdating(true);
        
        // Batch updates to avoid multiple renders
        const updatedData = data.map((habit, index) => ({
            ...habit,
            sortOrder: index
        }));
        
        // Update the local state first for a smooth UI experience
        setGroupHabits(updatedData);
        
        // Defer the dispatch to after animations complete
        InteractionManager.runAfterInteractions(() => {
            // Update state in a single dispatch
            dispatch({
                type: 'REORDER_HABITS_IN_MODULE',
                payload: {
                    timeModuleId: timeModule?.id || 'uncategorized',
                    habits: updatedData
                }
            });
            
            // Reset updating flag after dispatch
            setTimeout(() => setIsUpdating(false), 100);
        });
    }, [dispatch, timeModule?.id]);

    return (
        <View style={styles.timeModuleGroup}>
            <Text style={styles.timeModuleTitle}>
                {timeModule ? timeModule.name : 'Uncategorized'}
            </Text>
            <DraggableFlatList
                data={groupHabits}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                onDragEnd={handleDragEnd}
                containerStyle={{ flex: 0 }}
                scrollEnabled={false}
                activationDistance={10}
                removeClippedSubviews={true}
                animationConfig={{
                    damping: 20,
                    mass: 0.2,
                    stiffness: 100,
                    overshootClamping: false,
                    restSpeedThreshold: 0.2,
                    restDisplacementThreshold: 0.2,
                }}
            />
        </View>
    );
}, (prevProps, nextProps) => {
    // Only re-render if timeModule or habits change
    if (prevProps.timeModule?.id !== nextProps.timeModule?.id) {
        return false;
    }
    
    if (prevProps.habits.length !== nextProps.habits.length) {
        return false;
    }
    
    // Check if any habit's relevant properties have changed
    for (let i = 0; i < prevProps.habits.length; i++) {
        if (prevProps.habits[i].id !== nextProps.habits[i].id ||
            prevProps.habits[i].sortOrder !== nextProps.habits[i].sortOrder) {
            return false;
        }
    }
    
    return true;
});

// Main All Habits Screen component
export default function AllHabitsScreen() {
    const router = useRouter();
    const { habits, timeModules } = useAppState();
    const dispatch = useAppDispatch();
    const [habitToEdit, setHabitToEdit] = React.useState<Habit | null>(null);
    const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
    const currentDate = new Date();

    // Group all habits by time module and sort them by sortOrder - memoized
    const groupedData = useMemo(() => {
        // Group habits by time module
        const groups: Record<string, Habit[]> = {};
        
        // Initialize groups
        timeModules.forEach(tm => {
            groups[tm.id] = [];
        });
        groups['uncategorized'] = [];
        
        // Fill groups with habits
        habits.forEach(habit => {
            const targetGroupId = habit.timeModuleId && groups[habit.timeModuleId] ? 
                habit.timeModuleId : 'uncategorized';
            
            if (!groups[targetGroupId]) groups[targetGroupId] = [];
            groups[targetGroupId].push(habit);
        });
        
        // Sort habits within each group
        Object.keys(groups).forEach(key => {
            if (groups[key] && groups[key].length > 0) {
                groups[key].sort((a, b) => {
                    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
                        return a.sortOrder - b.sortOrder;
                    }
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                });
            }
        });
        
        // Create final data structure for section list
        const result: TimeModuleGroupData[] = [];
        const orderedIds = [...timeModules.map(tm => tm.id), 'uncategorized'];
        
        orderedIds.forEach(id => {
            if (groups[id]?.length > 0) {
                result.push({
                    id,
                    timeModule: id !== 'uncategorized' ? 
                        timeModules.find(tm => tm.id === id) : undefined,
                    habits: groups[id]
                });
            }
        });
        
        return result;
    }, [habits, timeModules]);

    const openEditModal = useCallback((habit: Habit) => {
        setHabitToEdit(habit);
        setIsEditModalVisible(true);
    }, []);

    const closeEditModal = useCallback(() => {
        setHabitToEdit(null);
        setIsEditModalVisible(false);
    }, []);

    const handleDeleteHabit = useCallback((habit: Habit) => {
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
    }, [dispatch]);

    // Render a group item
    const renderGroupItem = useCallback(({ item }: { item: TimeModuleGroupData }) => {
        return (
            <TimeModuleGroup
                key={item.id}
                timeModule={item.timeModule}
                habits={item.habits}
                onEditHabit={openEditModal}
                onDeleteHabit={handleDeleteHabit}
            />
        );
    }, [openEditModal, handleDeleteHabit]);

    // Key extractor for the main list
    const keyExtractor = useCallback((item: TimeModuleGroupData) => item.id, []);

    return (
        <SafeAreaView style={styles.container}>
            {groupedData.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.noHabitsText}>No habits found.</Text>
                </View>
            ) : (
                <FlatList
                    data={groupedData}
                    renderItem={renderGroupItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={styles.scrollContent}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={4}
                    initialNumToRender={4}
                    windowSize={3}
                    updateCellsBatchingPeriod={50}
                />
            )}

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
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
