import React, { useMemo, useState, useLayoutEffect, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, I18nManager } from 'react-native';
import { useAppDispatch, useAppState } from '../../context/AppStateContext';
import { getColors } from '../../constants/Colors';
import { Habit, HabitStatus, LogEntry, HabitRepetitionType } from '@/types/index';
import { Ionicons } from '@expo/vector-icons';
import { isHabitDue } from '../../utils/dateUtils';
import { addDays, subDays, isBefore, startOfWeek, endOfWeek, format, addWeeks, subWeeks, 
    startOfMonth, endOfMonth, addMonths, subMonths, 
    set,
    Day} from 'date-fns';
import { getWeeklyHabitTotal } from '@/utils/habitUtils';
import { useNavigation } from 'expo-router';
import DropDownPicker from 'react-native-dropdown-picker';
import '../../utils/i18n'; // Import i18n for translations
import { useTranslation } from 'react-i18next';
let Colors = getColors()

export default function StatsScreen() {
    const navigation = useNavigation();
    const { habits, logs, settings, timeModules } = useAppState();
    const dispatch = useAppDispatch();
    getColors(settings.theme)
    const { t } = useTranslation(); // Initialize translation hook
    
    // State for view mode (weekly or monthly)
    const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
    const cellsize = viewMode === 'weekly' ? 28 : 16;
    
    // State for navigation offset (0 = current, -1 = previous, etc.)
    const [timeOffset, setTimeOffset] = useState(0);

    // Start day of week
    const [startDayOfWeek, setStartDayOfWeek] = useState(settings.startDayOfWeek || 6); // Default to Saturday (6)
    const [dropDownStartdw, setDropDownStartdw] = useState(false); // Default to Saturday (6)
    
    // Create separate refs for daily and weekly scrolling
    const dailyScrollViewRef = useRef<ScrollView>(null);
    const weeklyScrollViewRef = useRef<ScrollView>(null);
    const todayCellRef = useRef<View>(null);
    
    // Add header buttons using useLayoutEffect
    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity 
                        onPress={toggleViewMode}
                        style={{ marginRight: 16 }}
                    >
                        <Ionicons 
                            name={viewMode === 'weekly' ? "calendar" : "calendar-outline"} 
                            size={24} 
                            color={Colors.primary} 
                        />
                    </TouchableOpacity>
                </View>
            ),
        });
    }, [navigation, viewMode]);

    // Toggle view mode handler
    const toggleViewMode = () => {
        setViewMode(prev => prev === 'weekly' ? 'monthly' : 'weekly');
        setTimeOffset(0); // Reset to current period when switching views
    };
    
    // Get current date
    const currentDate = useMemo(() => new Date(), []);
    
    // Calculate the first and last day of the displayed period (week or month)
    const displayedPeriod = useMemo(() => {
        const date = new Date();
        
        if (viewMode === 'weekly') {
            // Weekly view logic
            const startDay = settings.startDayOfWeek || 6; // 6 is Saturday
            
            // Add the week offset
            date.setDate(date.getDate() + (timeOffset * 7));
            
            // Get start and end of week
            const firstDay = startOfWeek(date, { weekStartsOn: startDay as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
            const lastDay = endOfWeek(date, { weekStartsOn: startDay as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
            
            return {
                firstDay,
                lastDay,
                displayText: `${format(firstDay, 'MMM d')} - ${format(lastDay, 'MMM d')}`,
                year: firstDay.getFullYear()
            };
        } else {
            // Monthly view logic
            date.setMonth(date.getMonth() + timeOffset);
            
            // Get start and end of month
            const firstDay = startOfMonth(date);
            const lastDay = endOfMonth(date);
            
            return {
                firstDay,
                lastDay,
                displayText: format(firstDay, 'MMMM yyyy'),
                year: firstDay.getFullYear()
            };
        }
    }, [timeOffset, viewMode, settings.startDayOfWeek]);
    
    // Generate dates for the selected period in chronological order (oldest first)
    const dates = useMemo(() => {
        const result = [];
        const { firstDay, lastDay } = displayedPeriod;
        
        let currentDate = new Date(firstDay);
        
        // Start from first day and go forward to end of period or today
        while (currentDate <= lastDay) {
            result.push(new Date(currentDate)); // Add a copy of the date
            currentDate.setDate(currentDate.getDate() + 1); // Advance one day
        }
        
        return result;
    }, [displayedPeriod, timeOffset]);

    // Find index of today's date in the dates array
    const todayIndex = useMemo(() => {
        const today = new Date();
        return dates.findIndex(date => 
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    }, [dates]);

    // Scroll to today's date when dates change or when the component mounts
    useEffect(() => {
        if (timeOffset === 0 && todayIndex !== -1) {
            // Allow layout to complete before scrolling
            setTimeout(() => {
                // For daily habits table
                if (dailyScrollViewRef.current) {
                    // Calculate the appropriate scroll offset based on cell size
                    const scrollTo = todayIndex * (cellsize + 2); // cellsize + margins
                    dailyScrollViewRef.current.scrollTo({ x: scrollTo, animated: true });
                }
                
                // For weekly habits, find current week
                if (weeklyScrollViewRef.current) {
                    const today = new Date();
                    // Find the index of the current week
                    const chronologicalWeeklyDates = dates
                        .filter(date => date.getDay() === startDayOfWeek)
                        .map(date => ({
                            startDate: date,
                            endDate: addDays(date, 6)
                        }));
                    
                    const currentWeekIndex = chronologicalWeeklyDates.findIndex(
                        week => today >= week.startDate && today <= week.endDate
                    );
                    
                    if (currentWeekIndex !== -1) {
                        // Weekly cells are wider, adjust scroll position accordingly
                        const weeklyScrollTo = currentWeekIndex * 76; // 70 (cell width) + margins
                        weeklyScrollViewRef.current.scrollTo({ x: weeklyScrollTo, animated: true });
                    }
                }
            }, 300); // Increase timeout to ensure layout is complete
        }
    }, [dates, todayIndex, timeOffset, viewMode]);

    // Navigation handlers
    const goToPrevious = () => setTimeOffset(prev => prev - 1);
    const goToNext = () => setTimeOffset(prev => Math.min(0, prev + 1)); // Prevent going beyond current period
    const goToCurrent = () => setTimeOffset(0);
    
    // Check if date is today
    const isToday = (date: Date): boolean => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    // Group dates by week (for weekly counter habits)
    const weeklyDates = useMemo(() => {
        const weeks: { startDate: Date, endDate: Date }[] = [];
        
        if (dates.length === 0) return weeks;
        
        // For weekly counter habit view, we'll use the current week
        const weekStartDay = dates[dates.length - 1]; // First day in the list (in reverse order)
        dates.map(d => {
            if(d.getDay() === startDayOfWeek)
                weeks.push({
                    startDate: d,
                    endDate: addDays(weekStartDay, 7)
                });
        })
        
        return weeks;
    }, [dates]);

    // Split habits by repetition type and measurement type
    const { dailyAndWeeklyBinaryHabits, weeklyCounterHabits } = useMemo(() => {
        // Filter habits but preserve original order from state.habits
        const filtered = {
            dailyAndWeeklyBinaryHabits: [] as Habit[],
            weeklyCounterHabits: [] as Habit[]
        };
        
        // Process habits in their original order
        habits.forEach((habit: Habit) => {
            if (habit.enabled === false) return;
            
            if (habit.repetition.type === 'daily' || 
                (habit.repetition.type === 'weekly' && habit.measurement.type === 'binary')) {
                filtered.dailyAndWeeklyBinaryHabits.push((habit));
            } else if (habit.repetition.type === 'weekly' && habit.measurement.type === 'count') {
                filtered.weeklyCounterHabits.push(habit);
            }
        });
        
        return filtered;
    }, [habits]);

    // Get habit status for a specific date - updated to include due status and exceeded status
    const getHabitStatus = (habit: Habit, date: Date) : {status: HabitStatus, value: number} => {
        // First check if the habit is due on this date
        const status : HabitStatus = 'empty';
        let isDue = isHabitDue(habit, date) && (isBefore(date, new Date()) || isToday(date));
        if(!isDue) return {status:'notdue', value:0}
        const dateStr = format(date, 'yyyy-MM-dd');
        const log = logs.find((l:LogEntry) => l.habitId === habit.id && l.date === dateStr);
        if (habit.measurement.type === 'binary') {
            if (!log || log.value === null) {
                return { status: 'empty', value: 0};
            }
            // For binary habits: right = completed, wrong = missed
            if (log.status === 'right') {
                return { status: 'completed', value: 0};
            } else if (log.status === 'wrong') {
                return { status: 'missed', value: 0};
            } else if (log.status === 'circle') {
                return { status: 'partial', value: 0};
            }
            return { status: 'empty', value: 0};
        } else {
            // For counting habits
            const target = habit.measurement.targetValue || 0;
            const value = log?.value || 0;
            
            if (value > target && target > 0) {
                return { status: 'exceeded', value }; 
            } else if (value === target && target > 0) {
                return { status: 'completed', value };
            } else if (value > 0) {
                return { status: 'partial', value };
            } else {
                // When value is 0, check if it's due
                // If not due, return 'empty' status so it shows the lock icon
                return { status: !isDue ? 'empty' : 'missed', value };
            }
        }
    };

    // Get weekly counter habit status for a specific week (using Saturday's value)
    const getWeeklyCounterStatus = (habit: Habit, date: Date) => {
        // For weekly counter habits, use the Saturday date as the key date
        let value = getWeeklyHabitTotal(habit.id, date, logs, settings.startDayOfWeek);
        let targetValue = habit.measurement.targetValue || 0;
        
        // Check if the week is in the future
        const today = new Date();
        const weekStart = date; // This is already the start of the week (Saturday)
        const weekEnd = addDays(weekStart, 6);
        const isFutureWeek = weekStart > today;
        const isCurrentWeek = today >= weekStart && today <= weekEnd;
        const isPastWeek = weekEnd < today;
        
        // If it's a future week, it's not due yet
        if (isFutureWeek) {
            return { 
                status: 'notdue', 
                value: 0, 
                isDue: false, 
                percentage: 0, 
                isFutureWeek, 
                isCurrentWeek,
                isPastWeek
            };
        }
        
        // For current or past weeks
        let isDue = isHabitDue(habit, date);
        
        if (value > targetValue && targetValue > 0) {
            return { 
                status: 'exceeded', 
                value, 
                isDue, 
                percentage: Math.round((value / targetValue) * 100),
                isFutureWeek, 
                isCurrentWeek,
                isPastWeek
            };
        } else if (value === targetValue && targetValue > 0) {
            return { 
                status: 'completed', 
                value, 
                isDue, 
                percentage: 100,
                isFutureWeek, 
                isCurrentWeek,
                isPastWeek
            };
        } else if (value > 0) {
            const percentage = targetValue > 0 ? Math.min(100, Math.round((value / targetValue) * 100)) : 0;
            return { 
                status: 'partial', 
                value, 
                isDue, 
                percentage,
                isFutureWeek, 
                isCurrentWeek,
                isPastWeek
            };
        } else if (isPastWeek) {
            return { 
                status: 'missed', 
                value: 0, 
                isDue: true, // Past weeks are considered due
                percentage: 0,
                isFutureWeek, 
                isCurrentWeek,
                isPastWeek
            };
        } else {
            return { 
                status: 'empty', 
                value: 0, 
                isDue, 
                percentage: 0,
                isFutureWeek, 
                isCurrentWeek,
                isPastWeek
            };
        }
    };

    // Render table for daily or weekly binary habits
    const renderTable = (tableHabits: Habit[], title: string) => {
        if (tableHabits.length === 0) return null;
        
        // Create a mapping of timeModuleId to module name
        const moduleIdToName = Object.fromEntries(
            timeModules.map(module => [module.id, module.name])
        );
        
        // Group habits by timeModule
        const habitsByModule: Record<string, Habit[]> = {};
        
        tableHabits.forEach(habit => {
            const moduleId = habit.timeModuleId || 'uncategorized';
            const moduleName = habit.timeModuleId && moduleIdToName[habit.timeModuleId] 
                ? moduleIdToName[habit.timeModuleId] 
                : 'Uncategorized';
                
            if (!habitsByModule[moduleName]) {
                habitsByModule[moduleName] = [];
            }
            habitsByModule[moduleName].push(habit);
        });
        
        return (
            <View style={styles.tableContainer}>
                <Text style={styles.tableTitle}>{title}</Text>
                
                <View style={styles.tableContent}>
                    {/* Fixed left column for habit names */}
                    <View style={styles.fixedColumn}>
                        {/* Header cell */}
                        <View style={[styles.habitNameCell, styles.headerNameCell]}>
                            <Text style={styles.headerText}>{t('stats.habitsColumn')}</Text>
                        </View>
                        
                        {/* Render habits by module with dividers */}
                        {Object.entries(habitsByModule).map(([moduleName, moduleHabits], moduleIndex) => (
                            <React.Fragment key={`module-${moduleName}`}>
                                {/* Module divider */}
                                <View style={styles.moduleDividerContainer}>
                                    <View style={styles.moduleDividerLine} />
                                    <Text style={styles.moduleDividerText}>{moduleName}</Text>
                                </View>
                                
                                {/* Module habits */}
                                {moduleHabits.map(habit => (
                                    <View key={`fixed-${habit.id}`} style={styles.habitNameCell}>
                                        <Text 
                                            style={styles.habitNameText}
                                            numberOfLines={1}
                                            ellipsizeMode="tail"
                                        >
                                            {habit.title}
                                        </Text>
                                    </View>
                                ))}
                            </React.Fragment>
                        ))}
                    </View>
                    
                    {/* Scrollable right part */}
                    <ScrollView 
                        ref={dailyScrollViewRef}
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        scrollEnabled={true} 
                        style={styles.scrollableArea}
                    >
                        <View style={styles.rowsContainer}>
                            {/* Header row with dates */}
                            <View style={styles.headerRow}>
                                {dates.map((date, index) => (
                                    <View 
                                        key={`date-${index}`} 
                                        ref={isToday(date) ? todayCellRef : null}
                                        style={[
                                            styles.dateCell,
                                            {width:cellsize},
                                            date.getDay() === startDayOfWeek && styles.startOfWeekCell,
                                            isToday(date) && styles.todayCellHeader,
                                        ]}
                                    >
                                        {viewMode === 'weekly' && (<Text style={styles.dayOfWeekText}>
                                            { date.toLocaleDateString(t('lang') === 'ar'? 'ar-SA': 'en-US', { weekday: t('lang') === 'en'? 'short': 'narrow'})}
                                        </Text>
                                        )}
                                        <Text style={styles.dateText}>
                                            {date.getDate()}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                            
                            {/* Render data rows by module with dividers */}
                            {Object.entries(habitsByModule).map(([moduleName, moduleHabits], moduleIndex) => (
                                <React.Fragment key={`data-${moduleName}`}>
                                    {/* Module divider row (with visible divider line) */}
                                    <View style={styles.moduleDividerRow}>
                                        <View style={styles.scrollableDividerLine} />
                                        {dates.map((date, dateIndex) => (
                                            <View 
                                                key={`divider-${dateIndex}`}
                                                style={[
                                                    styles.dividerCell,
                                                    {width: cellsize}
                                                ]}
                                            />
                                        ))}
                                    </View>
                                    
                                    {/* Module habit data rows */}
                                    {moduleHabits.map(habit => (
                                        <View key={habit.id} style={styles.habitRow}>
                                            {/* Data cells for each date */}
                                            {dates.map((date, index) => {
                                                const status = getHabitStatus(habit, date);
                                                let cellStyle = styles.emptyCell;
                                                
                                                if (status.status === 'completed') {
                                                    cellStyle = styles.completedCell;
                                                } else if (status.status === 'exceeded') {
                                                    cellStyle = styles.exceededCell;
                                                } else if (status.status === 'partial') {
                                                    cellStyle = styles.partialCell;
                                                } else if (status.status === 'missed') {
                                                    if(!isToday(date) || habit.measurement.type !== 'count'){
                                                        cellStyle = styles.missedCell;
                                                    }
                                                } else if (status.status === 'notdue') {
                                                    cellStyle = styles.emptyCell;
                                                } else {
                                                    cellStyle = styles.emptyCell;
                                                }
                                                
                                                const notDueStyle = status.status === 'notdue' ? styles.notDueCell : {};
                                                const todayHighlight = isToday(date) ? styles.cellHighlight : {};
                                                
                                                return (
                                                    <View 
                                                        key={`${habit.id}-${index}`} 
                                                        style={[
                                                            styles.dataCell, 
                                                            {width:cellsize},
                                                            notDueStyle,
                                                            cellStyle,
                                                            date.getDay() === startDayOfWeek && styles.startOfWeekCell,
                                                            isToday(date) && styles.todayCellIndicator,
                                                            todayHighlight,
                                                        ]}
                                                    >
                                                        {status.status === 'notdue' && (
                                                            <Ionicons 
                                                                name="lock-closed" 
                                                                size={8} 
                                                                color={Colors.grey} 
                                                            />
                                                        )}
                                                        
                                                        {habit.measurement.type === 'count' && status.value > 0 && (
                                                            <Text style={[
                                                                styles.countText,
                                                                status.status === 'notdue' && styles.notDueText,
                                                                (status.status === 'exceeded' && styles.exceededCountText),
                                                            ]}>
                                                                {status.value}
                                                            </Text>
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    ))}
                                </React.Fragment>
                            ))}
                        </View>
                    </ScrollView>
                </View>
                
                {/* Legend for this table */}
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: Colors.blue }]} />
                        <Text style={styles.legendText}>{t('stats.habitStatus.exceeded')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: Colors.green }]} />
                        <Text style={styles.legendText}>{t('stats.habitStatus.completed')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: Colors.red }]} />
                        <Text style={styles.legendText}>{t('stats.habitStatus.missed')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: Colors.buff }]} />
                        <Text style={styles.legendText}>{t('stats.habitStatus.partial')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: Colors.darkGrey }]} />
                        <Text style={styles.legendText}>{t('stats.habitStatus.nodata')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <Ionicons name="lock-closed" size={10} color={Colors.darkGrey} style={{marginRight: 4}} />
                        <Text style={styles.legendText}>{t('stats.habitStatus.notDue')}</Text>
                    </View>
                </View>
            </View>
        );
    };

    // Render table for weekly counter habits
    const renderWeeklyCounterTable = (tableHabits: Habit[]) => {
        if (tableHabits.length === 0) return null;

        // Create a mapping of timeModuleId to module name
        const moduleIdToName = Object.fromEntries(
            timeModules.map(module => [module.id, module.name])
        );
        
        // Group habits by timeModule
        const habitsByModule: Record<string, Habit[]> = {};
        
        tableHabits.forEach(habit => {
            const moduleId = habit.timeModuleId || 'uncategorized';
            const moduleName = habit.timeModuleId && moduleIdToName[habit.timeModuleId] 
                ? moduleIdToName[habit.timeModuleId] 
                : 'Uncategorized';
                
            if (!habitsByModule[moduleName]) {
                habitsByModule[moduleName] = [];
            }
            habitsByModule[moduleName].push(habit);
        });

        // Modify weekly dates array to align with the chronological order
        const chronologicalWeeklyDates = useMemo(() => {
            const weeks: { startDate: Date, endDate: Date }[] = [];
            
            if (dates.length === 0) return weeks;
            
            // Group dates by week
            for (let i = 0; i < dates.length; i++) {
                if (dates[i].getDay() === startDayOfWeek) { // Saturday (week start)
                    weeks.push({
                        startDate: dates[i],
                        endDate: addDays(dates[i], 7)
                    });
                }
            }
            
            return weeks;
        }, [dates]);

        return (
            <View style={styles.tableContainer}>
                <Text style={styles.tableTitle}>{t('stats.weeklyCounterTableTitle')}</Text>
                
                <View style={styles.tableContent}>
                    {/* Fixed left column for habit names */}
                    <View style={styles.fixedColumn}>
                        {/* Header cell */}
                        <View style={[styles.habitNameCell, styles.headerNameCell]}>
                            <Text style={styles.headerText}>{t('stats.weeklyCounterColumn')}</Text>
                        </View>
                        
                        {/* Render habits by module with dividers */}
                        {Object.entries(habitsByModule).map(([moduleName, moduleHabits], moduleIndex) => (
                            <React.Fragment key={`module-${moduleName}`}>
                                {/* Module divider */}
                                <View style={styles.moduleDividerContainer}>
                                    <View style={styles.moduleDividerLine} />
                                    <Text style={styles.moduleDividerText}>{moduleName}</Text>
                                </View>
                                
                                {/* Module habits */}
                                {moduleHabits.map(habit => (
                                    <View key={`fixed-${habit.id}`} style={styles.habitNameCell}>
                                        <Text 
                                            style={styles.habitNameText}
                                            numberOfLines={1}
                                            ellipsizeMode="tail"
                                        >
                                            {habit.title}
                                        </Text>
                                    </View>
                                ))}
                            </React.Fragment>
                        ))}
                    </View>
                    
                    {/* Scrollable right part */}
                    <ScrollView 
                        ref={weeklyScrollViewRef}
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        style={styles.scrollableArea}
                    >
                        <View style={styles.rowsContainer}>
                            {/* Header row with weeks */}
                            <View style={styles.headerRow}>
                                {chronologicalWeeklyDates.map((week, index) => {
                                    const today = new Date();
                                    const isCurrentWeek = today >= week.startDate && today <= week.endDate;
                                    
                                    return (
                                        <View 
                                            key={`week-${index}`} 
                                            style={[
                                                styles.weekCell,
                                                isCurrentWeek && styles.currentWeekHeaderCell
                                            ]}
                                        >
                                            <Text style={[
                                                styles.weekDateText,
                                                isCurrentWeek && styles.currentWeekHeaderText
                                            ]}>
                                                {format(week.startDate, 'dd/MM')}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                            
                            {/* Render data rows by module with dividers */}
                            {Object.entries(habitsByModule).map(([moduleName, moduleHabits], moduleIndex) => (
                                <React.Fragment key={`data-${moduleName}`}>
                                    {/* Module divider row (with visible divider line) */}
                                    <View style={styles.moduleDividerRow}>
                                        <View style={styles.scrollableDividerLine} />
                                        {chronologicalWeeklyDates.map((week, weekIndex) => (
                                            <View 
                                                key={`divider-${weekIndex}`}
                                                style={[styles.dividerCell, { width: 70 }]}
                                            />
                                        ))}
                                    </View>
                                    
                                    {/* Module habit data rows */}
                                    {moduleHabits.map(habit => (
                                        <View key={habit.id} style={styles.habitRow}>
                                            {/* Data cells for each week */}
                                            {chronologicalWeeklyDates.map((week, index) => {
                                                const status = getWeeklyCounterStatus(habit, week.startDate);
                                                let cellStyle = styles.emptyCell;
                                                
                                                // Style based on status
                                                if (status.status === 'exceeded') {
                                                    cellStyle = styles.exceededCell;
                                                } else if (status.status === 'completed') {
                                                    cellStyle = styles.completedCell;
                                                } else if (status.status === 'partial') {
                                                    cellStyle = styles.partialCell;
                                                } else if (status.status === 'missed') {
                                                    cellStyle = styles.missedCell;
                                                }
                                                
                                                // Additional styles based on week timing
                                                const weekTimingStyle = status.isCurrentWeek ? {...styles.currentWeekCell,...styles.cellHighlight} : 
                                                                        status.isFutureWeek ? styles.futureWeekCell : {};
                                                
                                                return (
                                                    <View 
                                                        key={`${habit.id}-week-${index}`} 
                                                        style={[
                                                            styles.weekDataCell, 
                                                            cellStyle,
                                                            weekTimingStyle,
                                                            status.isFutureWeek && styles.notDueCell, // Apply not-due styling to future weeks
                                                        ]}
                                                    >
                                                        {/* Show value and percentage for non-empty cells */}
                                                        {status.value > 0 && (
                                                            <Text style={[
                                                                styles.weekCountText,
                                                                status.isFutureWeek && styles.notDueText,
                                                                status.status === 'exceeded' && styles.exceededCountText
                                                            ]}>
                                                                {status.value}/{habit.measurement.targetValue || 0} ({status.percentage}%)
                                                            </Text>
                                                        )}
                                                        
                                                        {/* Show lock icon for future weeks */}
                                                        {status.isFutureWeek && (
                                                            <Ionicons 
                                                                name="lock-closed" 
                                                                size={12} 
                                                                color={Colors.darkGrey} 
                                                            />
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    ))}
                                </React.Fragment>
                            ))}
                        </View>
                    </ScrollView>
                </View>
                
                {/* Legend for this table */}
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: Colors.blue }]} />
                        <Text style={styles.legendText}>{t('stats.weeklyCounterStatus.exceeded')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: Colors.green }]} />
                        <Text style={styles.legendText}>{t('stats.weeklyCounterStatus.completed')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: Colors.buff }]} />
                        <Text style={styles.legendText}>{t('stats.weeklyCounterStatus.partialprogress')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: Colors.red }]} />
                        <Text style={styles.legendText}>{t('stats.weeklyCounterStatus.noprogress')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <Ionicons name="lock-closed" size={10} color={Colors.darkGrey} style={{marginRight: 4}} />
                        <Text style={styles.legendText}>{t('stats.weeklyCounterStatus.notDue')}</Text>
                    </View>
                </View>
            </View>
        );
    };

    // Determine if we should show "Days Remaining" text for current month
    const showDaysRemainingText = useMemo(() => {
        return timeOffset === 0 && dates.length > 0;
    }, [timeOffset, dates]);

    // Update text to show appropriate day range
    const headerText = useMemo(() => {
        if (timeOffset === 0) {
            return viewMode === 'weekly' ? t('stats.currentWeekStart') : t('stats.currentMonthStart');
        }
        return "";
    }, [dates, timeOffset, viewMode, t]);

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContentContainer}
        nestedScrollEnabled={true} // Helps with dropdown inside scrollview
        keyboardShouldPersistTaps='handled'
      >
        {/* Period navigation in the header */}
        <View style={styles.pageHeader}>
          <TouchableOpacity
            onPress={goToPrevious}
            style={styles.navButtonHeader}
          >
            <Ionicons
              name={!I18nManager.isRTL ? "chevron-back" : "chevron-forward"}
              size={24}
              color={Colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={goToCurrent}
            style={styles.monthDisplayHeader}
          >
            <Text style={styles.monthTextHeader}>
              {displayedPeriod.displayText}
            </Text>
            {timeOffset !== 0 && (
              <Text style={styles.returnToCurrentText}>
                {viewMode === "weekly"
                  ? `(${t('tabs.stats')})`
                  : `(${t('tabs.stats')})`}
              </Text>
            )}
            {headerText && (
              <Text style={styles.daysRemainingText}>{headerText}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={goToNext}
            style={[
              styles.navButtonHeader,
              timeOffset === 0 && styles.disabledButton,
            ]}
            disabled={timeOffset === 0}
          >
            <Ionicons
              name={!I18nManager.isRTL ? "chevron-forward" : "chevron-back"}
              size={24}
              color={timeOffset === 0 ? Colors.darkGrey : Colors.primary}
            />
          </TouchableOpacity>
        </View>
        {/* Change start day of week if the view mode is weekly using a dropdown picker */}
        <DropDownPicker
            scrollViewProps={{nestedScrollEnabled: true,overScrollMode: 'always'}}
            open={dropDownStartdw}
            value={startDayOfWeek}
            items={[
                {label: t('weekdays.saturday'), value: 6 as Day},
                {label: t('weekdays.sunday'), value: 0 as Day},
                {label: t('weekdays.monday'), value: 1 as Day},
                {label: t('weekdays.tuesday'), value: 2 as Day},
                {label: t('weekdays.wednesday'), value: 3 as Day},
                {label: t('weekdays.thursday'), value: 4 as Day},
                {label: t('weekdays.friday'), value: 5 as Day}
            ]}
            setOpen={setDropDownStartdw}
            setValue={(val) =>{
                setStartDayOfWeek(val)
                dispatch({ type: 'UPDATE_START_DAY', payload: {startDayOfWeek: val('')} });
            }}
            placeholder={t('settings.startTimeOfDay')}
            style={styles.dropdownStyle}
            placeholderStyle={styles.dropdownPlaceholderStyle}
            dropDownContainerStyle={styles.dropdownContainerStyle}
            textStyle={styles.dropdownTextStyle}
            labelStyle={styles.dropdownLabelStyle}
            listItemLabelStyle={styles.dropdownListItemLabelStyle}
            theme="DARK"
            mode='SIMPLE'
            listMode='SCROLLVIEW'
            zIndex={5000} // Ensure dropdown appears above other elements
            zIndexInverse={1000} // Ensure dropdown appears above other elements
        />

        {/* Message if no habits exist */}
        {dailyAndWeeklyBinaryHabits.length === 0 &&
          weeklyCounterHabits.length === 0 && (
            <Text style={styles.placeholder}>
              {t('habits.noHabitsDue')}
            </Text>
          )}

        {/* Render tables for daily and weekly habits */}
        {renderTable(dailyAndWeeklyBinaryHabits, t('stats.habitsTableTitle'))}
        {renderWeeklyCounterTable(weeklyCounterHabits)}
      </ScrollView>
    );
}

// Updated styles for fixed habit names column
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background
    },
    scrollContentContainer: {
        padding: 15,
        paddingBottom: 40
    },
    pageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        paddingVertical: 5,
    },
    navButtonHeader: {
        padding: 8,
        borderRadius: 20,
    },
    monthDisplayHeader: {
        alignItems: 'center',
        flex: 1,
    },
    monthTextHeader: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.primary,
        textAlign: 'center',
    },
    returnToCurrentText: {
        fontSize: 12,
        fontStyle: 'italic',
        color: Colors.primary,
        marginTop: 2,
    },
    disabledButton: {
        opacity: 0.5,
    },
    placeholder: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginTop: 30,
        fontStyle: 'italic',
        textAlign: 'center'
    },
    tableContainer: {
        marginBottom: 25,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.lightGrey,
        backgroundColor: Colors.surface,
        overflow: 'hidden',
        elevation: 2,
    },
    tableContent: {
        flexDirection: 'row',
        width: '100%', // Ensure the table takes full width
    },
    fixedColumn: {
        width: '35%', // Increased from 30% to 40% of the container width
        flexShrink: 0, // Prevent shrinking
        backgroundColor: Colors.surface,
        borderRightWidth: 1,
        borderRightColor: Colors.grey,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        zIndex: 10,
    },
    scrollableArea: {
        flex: 1, // Take the remaining 60%
        marginLeft: 4,
        marginRight: 4,
    },
    tableTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        padding: 10,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightGrey,
        textAlign: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems:'stretch',
        height: 50, // Fixed height to match headerNameCell
        // borderBottomWidth: 1,
        // borderBottomColor: Colors.lightGrey,
        justifyContent:'center',
    },
    rowsContainer: {
        flexGrow: 1, // Take up available space
        flexShrink: 1, // Allow shrinking if needed
    },
    headerNameCell: {
        height: 50, // Fixed height to match headerRow
        backgroundColor: Colors.surface,
        // borderBottomWidth: 1,
        // borderBottomColor: Colors.lightGrey,
    },
    headerText: {
        fontWeight: '600',
        fontSize: 14,
        color: Colors.primary,
        textAlign:'center'
    },
    habitRow: {
        flexDirection: 'row',
        height: 50, // Match the increased height of habitNameCell
        alignItems: 'center',
        justifyContent:'center',
    },
    habitNameCell: {
        width: '100%', // Take full width of the fixed column
        height: 50, // Increased height to accommodate module name
        padding: 8,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
    },
    habitNameText: {
        fontSize: 14,
        color: Colors.text,
        fontWeight: '500',
        textAlign: 'center',
        paddingHorizontal: 6, // Add some padding to give more room for text
    },
    moduleNameText: {
        fontSize: 11,
        color: Colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 2,
    },
    dateCell: {
        width: 18, // GitHub-style cell width
        alignItems: 'center',
        padding: 0, // Minimal padding
        marginHorizontal: 1, // Small margin between date cells
        justifyContent: 'center', // Center content vertically
    },
    firstOfMonthCell: {
        borderLeftWidth: 1,
        borderLeftColor: Colors.grey,
        paddingLeft: 1,
    },
    firstDayCell: {
        borderLeftWidth: 1,
        borderLeftColor: Colors.primary,
        paddingLeft: 1,
    },
    todayCell: {
        backgroundColor: Colors.primary + '33', // Using primary color with opacity
    },
    dateText: {
        fontSize: 9, // Smaller font for dates
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    dayOfWeekText: {
        fontSize: 10, // Even smaller font for day of week
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: 1, // Small spacing between day name and date
    },
    dataCell: {
        width: 18, // GitHub-style cell width
        height: 16, // GitHub-style cell height
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 2, // Slightly rounded corners
        marginHorizontal: 1, // Small margin between cells
        marginVertical: 1, // Small margin between rows
    },
    startOfWeekCell: {
        marginLeft: 10, // Add slightly more space between weeks
    },
    firstDayIndicator: {
        borderWidth: 1,
        borderColor: Colors.primary + '66', // Subtle b35order to indicate today
    },
    completedCell: {
        backgroundColor: Colors.green,
    },
    exceededCell: {
        backgroundColor: Colors.blue,
    },
    partialCell: {
        backgroundColor: Colors.buff,
    },
    missedCell: {
        backgroundColor: Colors.red,
    },
    emptyCell: {
        backgroundColor: Colors.darkGrey,
    },
    countText: {
        fontSize: 8, // Very small but still legible text
        fontWeight: 'bold',
        color: 'white',
    },
    legendContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: Colors.lightGrey,
        backgroundColor: Colors.surface,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 8,
        marginVertical: 4,
    },
    legendColorBox: {
        width: 10, // Match the cell size for legend
        height: 10,
        borderRadius: 2,
        marginRight: 4,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    legendText: {
        fontSize: 10,
        color: Colors.textSecondary,
    },
    todayCellIndicator: {
        borderWidth: 2, // Increased from 1 to 2 for better visibility
        borderColor: Colors.primary, // Changed to full primary color (was using opacity)
    },
    todayCellHeader: {
        backgroundColor: Colors.primary + '55', // Stronger highlight for today in header
        borderWidth: 2, // Increased from 1 to 2 for better visibility
        borderColor: Colors.primary,
    },
    cellHighlight: {
        // Add a subtle glow effect to today's cells
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 5, // For Android
        zIndex: 5, // Ensure highlighted cells appear above others
    },
    daysRemainingText: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    notDueCell: {
        opacity: 0.35,  // Make the cell appear dimmed
        borderWidth: 0.5,
        borderColor: Colors.darkGrey,
    },
    
    notDueText: {
        color: Colors.darkGrey, // Darker text for not due items
    },
    // New styles for weekly counter habits table
    weekCell: {
        width: 70, // Keep this width for now
        flexShrink: 1, // Allow shrinking if space is constrained
        minWidth: 50, // Set a minimum width
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
        marginHorizontal: 2,
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightGrey,
    },
    weekDateText: {
        fontSize: 10,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    weekDataCell: {
        width: 70, // Match width of weekCell
        flexShrink: 1, // Allow shrinking if space is constrained
        minWidth: 50, // Set a minimum width
        height: 30, // Taller to fit more content
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
        marginHorizontal: 2,
        marginVertical: 2,
        padding: 2,
    },
    weekCountText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
    },
    exceededCountText: {
        color: 'white', // Changed from black to white since blue background requires white text
    },
    currentWeekCell: {
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    
    futureWeekCell: {
        backgroundColor: Colors.lightGrey,
        opacity: 0.5,
    },
    currentWeekHeaderCell: {
        backgroundColor: Colors.primary + '33', // Light version of primary color
        borderBottomWidth: 2,
        borderBottomColor: Colors.primary,
    },
    
    currentWeekHeaderText: {
        color: Colors.primary,
        fontWeight: 'bold',
    },
    dropdownStyle: {
        backgroundColor: Colors.surface, borderColor: Colors.grey,
        marginBottom: 10, // Spacing below closed picker
    },
    dropdownPlaceholderStyle: { color: Colors.textSecondary, },
    dropdownContainerStyle: { // Style for the container holding the dropdown list
        backgroundColor: Colors.surface, borderColor: Colors.grey,
        elevation:3,
        // No marginBottom needed here, spacing handled by dropdownStyle
    },
    dropdownTextStyle: { fontSize: 16, color: Colors.text, },
    dropdownLabelStyle: { color: Colors.text, }, // Selected item text
    dropdownListItemLabelStyle: { color: Colors.text, }, // List item text
    dropdownArrowStyle: { tintColor: Colors.textSecondary, },
    dropdownTickStyle: { tintColor: Colors.primary, },
    moduleDividerContainer: {
        position: 'relative',
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moduleDividerLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: Colors.lightGrey,
    },
moduleDividerText: {
        position: 'absolute',
        backgroundColor: Colors.surface,
        paddingHorizontal: 10,
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '800',
    },
    moduleDividerRow: {
        flexDirection: 'row',
        height: 30,
        alignItems: 'center',
        position: 'relative', // To position the divider line
    },
    scrollableDividerLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: Colors.lightGrey,
        zIndex: 1, // Ensure the line appears below the cells
    },
    dividerCell: {
        height: 30,
        marginHorizontal: 1,
        // Make the divider cells transparent to show the line
        backgroundColor: 'transparent',
        zIndex: 2,
    },
});