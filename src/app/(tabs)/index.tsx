// app/(tabs)/index.tsx
import React, { useState, useMemo, useLayoutEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, Animated, I18nManager } from 'react-native';
import { format, addDays, subDays } from 'date-fns'; // Ensure format is imported
import { useRouter, useNavigation } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons, Octicons } from '@expo/vector-icons';
import { useAppDispatch, useAppState } from '../../context/AppStateContext';
import TimeModuleGroup from '../../components/TimeModuleGroup'; // Ensure correct import
import { getDefaultDate, getTodayDate, isHabitDue } from '../../utils/dateUtils';
import { fixedColors, getColors } from '../../constants/Colors'; // Import fixed colors
import { Habit, TimeModule } from '@/types/index';
import '../../utils/i18n';
import { useTranslation } from 'react-i18next';
let Colors = getColors()

// --- Date Header Component (With animation for today button) ---
interface DateHeaderProps { 
    currentDate: Date; 
    onPrevDay: () => void; 
    onNextDay: () => void; 
    onShowDatePicker: () => void;
    onTodayPress: () => void; // Add new prop for going to today
}


const DateHeader: React.FC<DateHeaderProps> = ({ currentDate, onPrevDay, onNextDay, onShowDatePicker, onTodayPress }) => {
    const {settings} = useAppState()
    // Create animated values for scale and shake effects
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const { i18n } = useTranslation();
    
    // Function that triggers animation and calls onTodayPress
    const handleTodayPress = () => {
        // Start with quick scale up
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 1.15,
                duration: 150,
                useNativeDriver: true
            }),
            // Then scale back down
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true
            })
        ]).start();
        
        // Call the original onTodayPress function
        onTodayPress();
    };
    
    // Animation for going to previous day (vibrate right)
    const handlePrevDay = () => {
        // Reset position first if needed
        shakeAnim.setValue(0);
        
        // Create vibration sequence to the right
        Animated.sequence([
            // Quick move right
            Animated.timing(shakeAnim, {
                toValue: 10,
                duration: 50,
                useNativeDriver: true
            }),
            // Back to almost center
            Animated.timing(shakeAnim, {
                toValue: -5,
                duration: 50,
                useNativeDriver: true
            }),
            // Back to center
            Animated.timing(shakeAnim, {
                toValue: 0,
                duration: 50,
                useNativeDriver: true
            })
        ]).start();
        
        // Call the date change function with a slight delay
        setTimeout(() => {
            onPrevDay();
        }, 75);
    };
    
    // Animation for going to next day (vibrate left)
    const handleNextDay = () => {
        // Reset position first if needed
        shakeAnim.setValue(0);
        
        // Create vibration sequence to the left
        Animated.sequence([
            // Quick move left
            Animated.timing(shakeAnim, {
                toValue: -10,
                duration: 50,
                useNativeDriver: true
            }),
            // Back to almost center
            Animated.timing(shakeAnim, {
                toValue: 5,
                duration: 50,
                useNativeDriver: true
            }),
            // Back to center
            Animated.timing(shakeAnim, {
                toValue: 0,
                duration: 50,
                useNativeDriver: true
            })
        ]).start();
        
        // Call the date change function with a slight delay
        setTimeout(() => {
            onNextDay();
        }, 75);
    };

    // Function to check if the displayed date is today
    const isToday = () => {
        const today = getDefaultDate(settings.startTimeOfDay || '00:00')
        return (
            currentDate.getDate() === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()
        );
    };
    const {t} = useTranslation();
    
    return (
        <View style={styles.datePickerContainer}>
            <TouchableOpacity onPress={handlePrevDay} style={styles.dateArrow} hitSlop={10}>
                <Ionicons name={!I18nManager.isRTL?"chevron-back":'chevron-forward'} size={24} style={styles.dateArrowIcon} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleTodayPress}>
                <View style={styles.dateContainer}>
                    <Animated.Text 
                        style={[
                            styles.dateText, 
                            { 
                                transform: [
                                    { scale: scaleAnim },
                                    { translateX: shakeAnim }
                                ] 
                            }
                        ]}
                    >
                        {t(format(currentDate, 'EEE, MMM d, yyyy'))}
                    </Animated.Text>
                    {!isToday() && <Octicons name='dot-fill' color={Colors.primary} size={18} style={styles.todayDot} />}
                </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={onShowDatePicker} style={styles.todayButton}>
                <Ionicons name='calendar-outline' style={styles.todayButtonIcon} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNextDay} style={styles.dateArrow} hitSlop={10}>
                <Ionicons name={!I18nManager.isRTL?"chevron-forward":'chevron-back'} size={24} style={styles.dateArrowIcon} />
            </TouchableOpacity>
        </View>
    );
};

// --- Type for grouped data ---
interface GroupedHabits { [key: string]: { timeModule?: TimeModule; habits: Habit[] } }
interface TimeModuleGroupData { timeModule?: TimeModule; habits: Habit[] }

// --- Main Screen Component ---
export default function HabitListScreen() {
    const { habits, timeModules, settings} = useAppState();
    Colors = getColors(settings.theme)
    const router = useRouter();
    const navigation = useNavigation();
    const dispatch = useAppDispatch();
    const {t, i18n } = useTranslation();
    
    
    const [currentDate, setCurrentDate] = useState(getDefaultDate(settings.startTimeOfDay));
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

    // --- Popup Menu State (lifted from HabitItem) ---
    const [menuVisible, setMenuVisible] = useState(false);
    const [menuHabit, setMenuHabit] = useState<Habit | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Accept position from HabitItem
    const showHabitMenu = (habit: Habit, position: { x: number; y: number }) => {
        setMenuHabit(habit);
        setMenuPosition(position);
        setMenuVisible(true);
    };

    const hideHabitMenu = () => {
        setMenuVisible(false);
        setMenuHabit(null);
    };

    const handleMenuEdit = () => {
        if (menuHabit) {
            hideHabitMenu(); // Hide menu first for better UX
            router.push({
                pathname:'/add-edit-habit',
                params: {habitId:menuHabit.id}
            })
        }
    };

    const handleMenuDelete = () => {
        if (!menuHabit) return;
        Alert.alert(
            t('habits.deleteAlert.title'),
            `${t('habits.deleteAlert.message1')} "${menuHabit.title}"${t('questionMark')} ${t('habits.deleteAlert.message2')}`,
            [
                { text: t('habits.deleteAlert.cancelButton'), style: 'cancel' },
                { text: t('habits.deleteAlert.confirmButton'), style: 'destructive', onPress: () => {
                    dispatch({ type: 'DELETE_HABIT', payload: { id: menuHabit.id } });
                    hideHabitMenu();
                }},
            ]
        );
    };

    // Grouping Logic
    const groupedHabitsForDisplay: TimeModuleGroupData[] = useMemo(() => {
        const dueHabits = habits.filter((habit:Habit) => 
            isHabitDue(habit, currentDate) // Only check if habit is due
        );
        // habits.forEach((h:Habit) => {
        //     console.log(h.title, currentDate, isHabitDue(h, currentDate))
        // });
        const orderedTimeModules = [...timeModules]; // Ensure correct order
        const groups = orderedTimeModules.reduce<GroupedHabits>((acc, tm) => {
            acc[tm.id] = { timeModule: tm, habits: [] };
            return acc;
        }, {});
        groups['uncategorized'] = { timeModule: undefined, habits: [] };
        dueHabits.forEach((habit:Habit) => {
            const targetGroupId = habit.timeModuleId && groups[habit.timeModuleId] ? habit.timeModuleId : 'uncategorized';
            if (groups[targetGroupId]) groups[targetGroupId].habits.push(habit);
            else groups['uncategorized'].habits.push(habit);
        });
        const orderedGroupIds = [...timeModules.map((tm:TimeModule) => tm.id), 'uncategorized'];
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
            pathname: '/add-edit-habit',
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
        // console.log(getDefaultDate())
        setCurrentDate(getDefaultDate(settings.startTimeOfDay));
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
                            onShowMenu={showHabitMenu} // <-- pass down
                        />
                    ))
                 )}
                {/* Remove extra padding View, handle with scrollContent padding */}
             </ScrollView>
             {/* Popup Menu Overlay (absolute at habit location) */}
             {menuVisible && menuHabit && (
                <View style={styles.menuOverlay} pointerEvents="box-none">
                    <TouchableOpacity style={styles.menuBackground} activeOpacity={1} onPress={hideHabitMenu} />
                    <View style={[
                        styles.menuContent,
                        { position: 'absolute', top: menuPosition.y, left: menuPosition.x }
                    ]}>
                        <TouchableOpacity style={styles.menuItem} onPress={handleMenuEdit}>
                            <Text style={styles.menuItemText}>{t('habits.edit')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={handleMenuDelete}>
                            {/* <Ionicons name='pencil-outline' color={Colors.text} size={18}/> */}
                            <Text style={[styles.menuItemText, { color: Colors.red }]}>{t('habits.delete')}</Text>
                        </TouchableOpacity>
                        {/* <TouchableOpacity style={styles.menuItem} onPress={hideHabitMenu}>
                            <Text style={styles.menuItemText}>Cancel</Text>
                        </TouchableOpacity> */}
                    </View>
                </View>
            )}
             {/* Floating Action Button */}
             <TouchableOpacity style={styles.addButton} onPress={openAddHabitScreen}>
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
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingVertical: 12, 
        paddingHorizontal: 15, 
        backgroundColor: Colors.surface,
        borderBottomWidth: 1, 
        borderBottomColor: Colors.lightGrey,
    },
    dateArrow: { 
        padding: 8,
    },
    dateArrowIcon: {
        color:Colors.accent
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: { 
        fontSize: 17, 
        fontWeight: '600', 
        color: Colors.primary, 
        paddingVertical: 5,
    },
    todayDot: {
        marginLeft: 16,
    },
    allHabitsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightGrey,
    },
    allHabitsButtonText: {
        color: Colors.background,
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
        color: Colors.accent,
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
    menuOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 1002,
    },
    menuBackground: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    menuContent: {
        backgroundColor: Colors.surface,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 25,
        minWidth: 160,
        alignItems: 'center',
        elevation: 12,
        zIndex: 1003,
        // position, top, left set dynamically
    },
    menuItem: {
        paddingVertical: 12,
        width: '100%',
        alignItems: 'center',
    },
    menuItemText: {
        fontSize: 16,
        color: Colors.text,
    },
});