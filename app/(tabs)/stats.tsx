import React, { useMemo, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAppState } from '../../context/AppStateContext';
import { getColors } from '../../constants/Colors';
import { Habit, HabitStatus, LogEntry, HabitRepetitionType } from '@/types/index';
import { Ionicons } from '@expo/vector-icons';
import { isHabitDue } from '../../utils/dateUtils';
import { addDays, subDays, isBefore, startOfWeek, endOfWeek, format, addWeeks, subWeeks, 
    startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { getSaturdayDateString } from '../../utils/dateUtils';
import { getWeeklyHabitTotal } from '@/utils/habitUtils';
import { getTextColorForBackground } from '@/utils/colorUtils';
import { useNavigation } from 'expo-router';
let Colors = getColors()

export default function StatsScreen() {
    const navigation = useNavigation();
    const { habits, logs, settings } = useAppState();
    getColors(settings.theme)
    
    // State for view mode (weekly or monthly)
    const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
    const cellsize = viewMode === 'weekly' ? 28 : 16;
    
    // State for navigation offset (0 = current, -1 = previous, etc.)
    const [timeOffset, setTimeOffset] = useState(0);
    
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
    
    // Generate dates for the selected period in reverse order (most recent first)
    const dates = useMemo(() => {
        const result = [];
        const { firstDay, lastDay } = displayedPeriod;
        
        let endDate;
        if (timeOffset === 0 && viewMode === 'monthly') {
            // Current period: Use today as the end date
            endDate = new Date();
        } else {
            // Past period: Use the last day of the period
            endDate = new Date(lastDay);
        }
        
        // Make sure we don't go beyond the last day of the period
        if (endDate > lastDay) {
            endDate = new Date(lastDay);
        }
        
        // Start from end date and go backwards to first day of period
        const currentDate = new Date(endDate);
        
        // Continue until we reach before the first day of the period
        while (currentDate >= firstDay) {
            result.push(new Date(currentDate)); // Add a copy of the date
            currentDate.setDate(currentDate.getDate() - 1); // Go back one day
        }
        
        return result;
    }, [displayedPeriod, timeOffset]);

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
            if(d.getDay() === 6)
                weeks.push({
                    startDate: d,
                    endDate: addDays(weekStartDay, 7)
                });
        })
        
        return weeks;
    }, [dates]);

    // Split habits by repetition type and measurement type
    const { dailyHabits, weeklyBinaryHabits, weeklyCounterHabits } = useMemo(() => {
        return {
            dailyHabits: habits.filter((h:Habit) => 
                h.repetition.type === 'daily' && h.enabled !== false),
            weeklyBinaryHabits: habits.filter((h:Habit) => 
                h.repetition.type === 'weekly' && 
                h.measurement.type === 'binary' && 
                h.enabled !== false),
            weeklyCounterHabits: habits.filter((h:Habit) => 
                h.repetition.type === 'weekly' && 
                h.measurement.type === 'count' && 
                h.enabled !== false)
        };
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
        let isDue = isHabitDue(habit, date);
        console.log(habit.title, date, isDue)
        
        if (value > targetValue) {
            return { status: 'exceeded', value, isDue, percentage: Math.round((value / targetValue) * 100) }; // Exceeded status
        } else if (value === targetValue) {
            return { status: 'completed', value, isDue, percentage: 100 };
        } else if (value > 0) {
            const percentage = targetValue > 0 ? Math.min(100, Math.round((value / targetValue) * 100)) : 0;
            return { status: 'partial', value, isDue, percentage };
        } else {
            return { status: 'missed', value: 0, isDue, percentage: 0 };
        }
    };

    // Render table for daily or weekly binary habits
    const renderTable = (tableHabits: Habit[], title: string) => {
        if (tableHabits.length === 0) return null;
        
        return (
            <View style={styles.tableContainer}>
                <Text style={styles.tableTitle}>{title}</Text>
                
                <View style={styles.tableContent}>
                    {/* Fixed left column for habit names */}
                    <View style={styles.fixedColumn}>
                        {/* Header cell */}
                        <View style={[styles.habitNameCell, styles.headerNameCell]}>
                            <Text style={styles.headerText}>Habit</Text>
                        </View>
                        
                        {/* Habit name cells */}
                        {tableHabits.map(habit => (
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
                    </View>
                    
                    {/* Scrollable right part */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={viewMode === 'monthly'} style={styles.scrollableArea}>
                        <View style={styles.rowsContainer}>
                            {/* Header row with dates */}
                            <View style={styles.headerRow}>
                                {dates.map((date, index) => (
                                    <View 
                                        key={`date-${index}`} 
                                        style={[
                                            styles.dateCell,
                                            {width:cellsize},
                                            date.getDay() === 5 && styles.startOfWeekCell, // Week start at saturday
                                            // Highlight today for current month (should be first day in the list)
                                            isToday(date) && styles.todayCellHeader,
                                        ]}
                                    >
                                        <Text style={styles.dateText}>
                                            {date.getDate()}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                            
                            {/* Habit data rows */}
                            {tableHabits.map(habit => (
                                <View key={habit.id} style={styles.habitRow}>
                                    {/* Data cells for each date */}
                                    {dates.map((date, index) => {
                                        const status = getHabitStatus(habit, date);
                                        let cellStyle = styles.emptyCell;
                                        
                                        if (status.status === 'completed') {
                                            cellStyle = styles.completedCell;
                                        } else if (status.status === 'exceeded') {
                                            cellStyle = styles.exceededCell; // New style for exceeded
                                        } else if (status.status === 'partial') {
                                            cellStyle = styles.partialCell;
                                        } else if (status.status === 'missed' && !isToday(date)) {
                                            cellStyle = styles.missedCell;
                                        } else if (status.status === 'notdue') {
                                            cellStyle = styles.emptyCell;
                                        } else {
                                            cellStyle = styles.emptyCell;
                                        }
                                        
                                        // Add not-due styling
                                        const notDueStyle = status.status === 'notdue' ? styles.notDueCell : {};
                                        return (
                                            <View 
                                                key={`${habit.id}-${index}`} 
                                                style={[
                                                    styles.dataCell, 
                                                    {width:cellsize},
                                                    notDueStyle, // Apply not-due styling
                                                    cellStyle,
                                                    date.getDay() === 5 && styles.startOfWeekCell, // Week start at saturday
                                                    isToday(date) && styles.todayCellIndicator
                                                ]}
                                            >
                                                {/* Show lock icon for non-due habits */}
                                                { status.status === 'notdue' && (
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
                        </View>
                    </ScrollView>
                </View>
                
                {/* Legend for this table - updated to include exceeded */}
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: Colors.blue }]} />
                        <Text style={styles.legendText}>Exceeded</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: Colors.green }]} />
                        <Text style={styles.legendText}>Completed</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: Colors.red }]} />
                        <Text style={styles.legendText}>Missed</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: Colors.buff }]} />
                        <Text style={styles.legendText}>Partial</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: Colors.darkGrey }]} />
                        <Text style={styles.legendText}>No Data</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <Ionicons name="lock-closed" size={10} color={Colors.darkGrey} style={{marginRight: 4}} />
                        <Text style={styles.legendText}>Not Due</Text>
                    </View>
                </View>
            </View>
        );
    };

    // Render table for weekly counter habits
    const renderWeeklyCounterTable = (tableHabits: Habit[]) => {
        if (tableHabits.length === 0) return null;

        return (
            <View style={styles.tableContainer}>
                <Text style={styles.tableTitle}>Weekly Counters </Text>
                
                <View style={styles.tableContent}>
                    {/* Fixed left column for habit names */}
                    <View style={styles.fixedColumn}>
                        {/* Header cell */}
                        <View style={[styles.habitNameCell, styles.headerNameCell]}>
                            <Text style={styles.headerText}>Habit/Week</Text>
                        </View>
                        
                        {/* Habit name cells */}
                        {tableHabits.map(habit => (
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
                    </View>
                    
                    {/* Scrollable right part */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollableArea}>
                        <View style={styles.rowsContainer}>
                            {/* Header row with weeks */}
                            <View style={styles.headerRow}>
                                {weeklyDates.map((week, index) => (
                                    <View 
                                        key={`week-${index}`} 
                                        style={[
                                            styles.weekCell,
                                            // Highlight current week
                                            isBefore(new Date(), week.endDate) && styles.todayCell
                                        ]}
                                    >
                                        <Text style={styles.weekDateText}>
                                            {format(week.startDate, 'dd/MM')}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                            
                            {/* Habit data rows */}
                            {tableHabits.map(habit => (
                                <View key={habit.id} style={styles.habitRow}>
                                    {/* Data cells for each week */}
                                    {weeklyDates.map((week, index) => {
                                        const status = getWeeklyCounterStatus(habit, week.startDate);
                                        let cellStyle = styles.emptyCell;
                                        
                                        if (status.status === 'exceeded') {
                                            cellStyle = styles.exceededCell; // New style for exceeded
                                        } else if (status.status === 'completed') {
                                            cellStyle = styles.completedCell;
                                        } else if (status.status === 'partial') {
                                            cellStyle = styles.partialCell;
                                        } else if (status.status === 'missed') {
                                            cellStyle = styles.missedCell;
                                        }
                                        
                                        // Add not-due styling
                                        const notDueStyle = !status.isDue ? styles.notDueCell : {};
                                        
                                        return (
                                            <View 
                                                key={`${habit.id}-week-${index}`} 
                                                style={[
                                                    styles.weekDataCell, 
                                                    cellStyle,
                                                    notDueStyle,
                                                ]}
                                            >
                                                {/* Show value and percentage */}
                                                {status.value > 0 && (
                                                    <Text style={[
                                                        styles.weekCountText,
                                                        !status.isDue && styles.notDueText,
                                                        // Use darker text for buff background
                                                        status.status === 'exceeded' && styles.exceededCountText
                                                    ]}>
                                                        {status.value}/{habit.measurement.targetValue || 0} ({status.percentage}%)
                                                    </Text>
                                                )}
                                                
                                                {/* Show lock icon for non-due habits with no data */}
                                                {!status.isDue && status.value === 0 && (
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
                        </View>
                    </ScrollView>
                </View>
                
                {/* Legend for this table */}
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: Colors.blue }]} />
                        <Text style={styles.legendText}>Exceeded Target</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: Colors.green }]} />
                        <Text style={styles.legendText}>Completed (100%)</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: Colors.buff }]} />
                        <Text style={styles.legendText}>Partial Progress</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: Colors.red }]} />
                        <Text style={styles.legendText}>No Progress</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <Ionicons name="lock-closed" size={10} color={Colors.darkGrey} style={{marginRight: 4}} />
                        <Text style={styles.legendText}>Not Due</Text>
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
            return viewMode === 'weekly' ? "Current to week start" : "Current to month start";
        }
        return "";
    }, [dates, timeOffset, viewMode]);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
            {/* Period navigation in the header */}
            <View style={styles.pageHeader}>
                <TouchableOpacity 
                    onPress={goToPrevious} 
                    style={styles.navButtonHeader}
                >
                    <Ionicons name="chevron-back" size={24} color={Colors.primary} />
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
                            {viewMode === 'weekly' 
                                ? "(Go to current week)" 
                                : "(Go to current month)"}
                        </Text>
                    )}
                    {headerText && (
                        <Text style={styles.daysRemainingText}>
                            {headerText}
                        </Text>
                    )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                    onPress={goToNext} 
                    style={[
                        styles.navButtonHeader,
                        timeOffset === 0 && styles.disabledButton
                    ]}
                    disabled={timeOffset === 0}
                >
                    <Ionicons 
                        name="chevron-forward" 
                        size={24} 
                        color={timeOffset === 0 ? Colors.darkGrey : Colors.primary} 
                    />
                </TouchableOpacity>
            </View>

            {/* Message if no habits exist */}
            {dailyHabits.length === 0 && weeklyBinaryHabits.length === 0 && weeklyCounterHabits.length === 0 && (
                <Text style={styles.placeholder}>Add some habits to see their activity here.</Text>
            )}

            {/* Render tables for daily and weekly habits */}
            {renderTable(dailyHabits.concat(weeklyBinaryHabits), "Habits")}
            {/* {renderTable(dailyHabits, "Daily Habits")}
            {renderTable(weeklyBinaryHabits, "Weekly Habits")} */}
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
        position: 'relative',
    },
    fixedColumn: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 10,
        backgroundColor: Colors.surface,
        borderRightWidth: 1,
        borderRightColor: Colors.grey,
        // Shadow for the fixed column (Android)
        elevation: 4,
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    scrollableArea: {
        marginLeft: 115, // Match the width of habitNameCell
        marginRight: 13
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
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightGrey,
        minWidth: 250,
        justifyContent:'center',
    },
    rowsContainer: {
        // backgroundColor: 'black',
        // width: 300
    },
    headerNameCell: {
        height: 50, // Fixed height to match headerRow
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightGrey,
        // textAlign:'center'
    },
    headerText: {
        fontWeight: '600',
        fontSize: 14,
        color: Colors.primary,
        textAlign:'center'
    },
    habitRow: {
        flexDirection: 'row',
        height: 40, // Fixed height to match habitNameCell
        alignItems: 'center',
        minWidth: 250,
        justifyContent:'center',
    },
    habitNameCell: {
        width: 110,
        height: 40, // Fixed height to match habitRow
        padding: 8,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
    },
    habitNameText: {
        fontSize: 14,
        color: Colors.text,
        fontWeight: '500',
        textAlign:'center'
    },
    dateCell: {
        width: 16, // GitHub-style cell width
        alignItems: 'center',
        padding: 0, // Minimal padding
        marginHorizontal: 1, // Small margin between date cells
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
        fontSize: 8, // Smaller font for dates
        color: Colors.textSecondary,
        textAlign: 'center',
        margin:'auto'
    },
    dataCell: {
        width: 16, // GitHub-style cell width
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
        borderColor: Colors.primary + '66', // Subtle border to indicate today
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
        borderWidth: 1,
        borderColor: Colors.primary + '66', // Subtle border to indicate today
    },
    todayCellHeader: {
        backgroundColor: Colors.primary + '55', // Stronger highlight for today in header
        borderWidth: 1,
        borderColor: Colors.primary,
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
        width: 70, // Wider cell for weekly view
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
});