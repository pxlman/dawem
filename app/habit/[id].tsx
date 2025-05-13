import { StyleSheet, View, Text, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  interpolate,
  withDelay
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart } from 'react-native-chart-kit';
import { format, startOfWeek, addDays, differenceInDays, parseISO, isSameWeek, getDaysInMonth, startOfMonth, isSameDay } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '../../context/AppStateContext';
import { getColors } from '../../constants/Colors';
import { Habit, HabitLogStatus, LogEntry } from '@/types/index';
import { getWeeklyHabitTotal } from '@/utils/habitUtils';

const HabitDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { habits, logs, settings } = useAppState();
  const Colors = getColors(settings.theme);
  
  // Always define all state and refs at the top
  const [habit, setHabit] = useState<Habit | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [habitStats, setHabitStats] = useState({
    totalCompletions: 0,
    currentStreak: 0,
    longestStreak: 0,
    completionRate: 0,
    weeklyData: [] as { day: string, completed: boolean, value?: number }[],
    monthlyProgress: [] as Array<number | { week: string; total: number; target: number; completed: boolean; }>
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Animation values - all defined together
  const headerOpacity = useSharedValue(0);
  const descriptionY = useSharedValue(50);
  const chartsOpacity = useSharedValue(0);
  const recentLogsOpacity = useSharedValue(0);
  
  const screenWidth = Dimensions.get("window").width - 32;

  // Define all memoized functions before using them
  const getRgbaColor = useCallback((color: string | undefined, opacity: number): string => {
    if (!color) {
      // Default fallback color
      return `rgba(98, 0, 238, ${opacity})`;
    }
    
    // If color is already in RGB format (comma separated values), use it directly
    if (color.includes(',')) {
      return `rgba(${color}, ${opacity})`;
    }
    
    return `rgba(98, 0, 238, ${opacity})`;  // Default purple
  }, []);

  // Find habit function - ensure it's defined before use
  const findHabit = useCallback(() => {
    return habits.find(h => h.id === id);
  }, [habits, id]);

  // Calculate statistics - moved outside of useEffect
  const calculateHabitStatistics = useCallback((habit: Habit) => {
    // Filter logs for this habit
    const habitLogs = logs.filter(log => log.habitId === habit.id);
    
    // Sort logs by date
    const sortedLogs = [...habitLogs].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const today = new Date();
    const startDate = habit.startDate ? parseISO(habit.startDate) : undefined;
    
    // Process days from start date or earliest log to today
    const startProcessingDate = startDate || (sortedLogs.length > 0 ? new Date(sortedLogs[0].date) : today);
    const daysSinceStart = differenceInDays(today, startProcessingDate) + 1;
    
    // Generate dates to check
    const datesToCheck = [];
    for (let i = daysSinceStart - 1; i >= 0; i--) {
      datesToCheck.push(format(addDays(today, -i), 'yyyy-MM-dd'));
    }
    
    // Calculate total completions and streaks differently based on habit type
    let totalCompletions = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let currentStreakCount = 0;
    let inStreak = false;
    let weeklyCompletions: {[weekStartDate: string]: number} = {};
    
    // For weekly counter habits, track completions by week
    if (habit.repetition.type === 'weekly' && habit.measurement.type === 'count') {
      // Group logs by week
      const weeklyTotals: {[weekStartDate: string]: number} = {};
      
      habitLogs.forEach(log => {
        const logDate = new Date(log.date);
        // Use startDayOfWeek = 6 for Saturday
        const weekStart = startOfWeek(logDate, { weekStartsOn: 6 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        
        if (!weeklyTotals[weekKey]) {
          weeklyTotals[weekKey] = 0;
        }
        
        weeklyTotals[weekKey] += log.value || 0;
      });
      
      // Check which weeks met the target
      const targetValue = habit.measurement.targetValue || 0;
      
      // Track weekly completions for visualization
      weeklyCompletions = weeklyTotals;
      
      // Count completed weeks
      totalCompletions = Object.values(weeklyTotals)
        .filter(total => total >= targetValue)
        .length;
      
      // Calculate streak - consecutive weeks where target was reached
      let weekDates = Object.keys(weeklyTotals).sort();
      let currentWeeklyStreak = 0;
      let maxWeeklyStreak = 0;
      let inWeeklyStreak = false;
      
      weekDates.forEach(weekDate => {
        if (weeklyTotals[weekDate] >= targetValue) {
          currentWeeklyStreak++;
          inWeeklyStreak = true;
        } else {
          if (inWeeklyStreak) {
            maxWeeklyStreak = Math.max(maxWeeklyStreak, currentWeeklyStreak);
            currentWeeklyStreak = 0;
            inWeeklyStreak = false;
          }
        }
      });
      
      if (inWeeklyStreak) {
        maxWeeklyStreak = Math.max(maxWeeklyStreak, currentWeeklyStreak);
      }
      
      currentStreak = currentWeeklyStreak;
      longestStreak = maxWeeklyStreak;
    } else {
      // For daily habits and binary weekly habits, check each day individually
      for (const dateString of datesToCheck) {
        const logForDate = habitLogs.find(log => log.date === dateString);
        const isCompleted = logForDate && ((habit.measurement.type === 'binary' && logForDate.status === 'right') || 
                            (habit.measurement.type === 'count' && (logForDate.value || 0) >= (habit.measurement?.targetValue || 1)));
        
        if (isCompleted) {
          totalCompletions++;
          currentStreakCount++;
          inStreak = true;
        } else {
          if (inStreak) {
            longestStreak = Math.max(longestStreak, currentStreakCount);
            currentStreakCount = 0;
            inStreak = false;
          }
        }
      }
      
      if (inStreak) {
        longestStreak = Math.max(longestStreak, currentStreakCount);
        currentStreak = currentStreakCount;
      }
    }
    
    // Calculate completion rate (completed / total days since start or last 30 days)
    const daysToConsider = Math.min(daysSinceStart, 30);
    let completionRate = 0;
    
    if (habit.repetition.type === 'weekly' && habit.measurement.type === 'count') {
      // For weekly counter habits, calculate completion rate by weeks
      const weeksToConsider = Math.ceil(daysToConsider / 7);
      const recentWeeks = [];
      
      for (let i = 0; i < weeksToConsider; i++) {
        const weekDate = addDays(today, -i * 7);
        const weekStart = startOfWeek(weekDate, { weekStartsOn: 6 });
        recentWeeks.push(format(weekStart, 'yyyy-MM-dd'));
      }
      
      const completedWeeks = recentWeeks.filter(weekDate => 
        weeklyCompletions[weekDate] && weeklyCompletions[weekDate] >= (habit.measurement.targetValue || 0)
      ).length;
      
      completionRate = (completedWeeks / weeksToConsider) * 100;
    } else {
      // For daily habits, calculate by days
      const recentLogs = habitLogs.filter(log => {
        const logDate = new Date(log.date);
        return differenceInDays(today, logDate) < daysToConsider;
      });
      
      const completedDays = recentLogs.filter(log => {
        if (habit.measurement.type === 'binary') {
          return log.status === 'right';
        } else {
          return (log.value || 0) >= (habit.measurement?.targetValue || 1);
        }
      }).length;
      
      completionRate = (completedDays / daysToConsider) * 100;
    }
    
    // Weekly data - for chart display
    const weeklyData = [];
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 6 }); // Saturday as start of week
    
    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(currentWeekStart, i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const logForDate = habitLogs.find(log => log.date === dateStr);
      
      let isCompleted = false;
      if (habit.repetition.type === 'weekly' && habit.measurement.type === 'count') {
        // For weekly counter, check if the week's total has reached target
        const weekTotal = getWeeklyHabitTotal(habit.id, currentDate, logs, 6); // 6 = Saturday
        isCompleted = weekTotal >= (habit.measurement.targetValue || 0);
      } else {
        // For daily habits, check individual day completion
        isCompleted = logForDate && ((habit.measurement.type === 'binary' && logForDate.status||null === 'right') || 
                      (habit.measurement.type === 'count' && (logForDate.value || 0) >= (habit.measurement?.targetValue || 1)));
      }
      
      weeklyData.push({
        day: format(currentDate, 'EEE'),
        completed: !!isCompleted,
        value: logForDate?.value || 0 // Store actual value for display
      });
    }
    
    // Monthly progress data
    const monthlyProgress = [];
    
    if (habit.repetition.type === 'weekly' && habit.measurement.type === 'count') {
      // For weekly counters, track weekly totals for the last 10 weeks
      const targetValue = habit.measurement.targetValue || 0;
      const weeksToShow = 10;
      
      for (let i = 0; i < weeksToShow; i++) {
        const weekDate = addDays(today, -i * 7);
        const weekStart = startOfWeek(weekDate, { weekStartsOn: 6 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        
        // Calculate total for this week
        const weekLogs = habitLogs.filter(log => {
          const logDate = new Date(log.date);
          return isSameWeek(logDate, weekStart, { weekStartsOn: 6 });
        });
        
        const weekTotal = weekLogs.reduce((sum, log) => sum + (log.value || 0), 0);
        monthlyProgress.unshift({
          week: format(weekStart, 'MMM d'),
          total: weekTotal,
          target: targetValue,
          completed: weekTotal >= targetValue
        });
      }
    } else {
      // For daily habits, track daily completions for the last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = addDays(today, -i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const logForDate = habitLogs.find(log => log.date === dateStr);
        
        if (habit.measurement.type === 'count') {
          monthlyProgress.push(logForDate?.value || 0);
        } else {
          const isCompleted = logForDate && logForDate.status === 'right';
          monthlyProgress.push(isCompleted ? 1 : 0);
        }
      }
    }
    
    setHabitStats({
      totalCompletions,
      currentStreak,
      longestStreak,
      completionRate,
      weeklyData,
      monthlyProgress
    });
  }, [logs, settings.startDayOfWeek]);

  // Build calendar data for visualization
  const buildCalendarData = useCallback((date: Date, habitId: string, habitLogs: LogEntry[]) => {
    const month = startOfMonth(date);
    const daysInMonth = getDaysInMonth(month);
    const firstDayOfMonth = startOfMonth(month);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    
    // Calculate how many days we need from the previous month to fill the first week
    const daysFromPrevMonth = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    const calendarDays = [];
    
    // Add days from previous month (if needed)
    for (let i = daysFromPrevMonth; i > 0; i--) {
      const prevMonthDay = addDays(firstDayOfMonth, -i);
      calendarDays.push({
        date: prevMonthDay,
        inCurrentMonth: false,
        hasLog: false,
        status: null,
        value: 0
      });
    }
    
    // Add days from current month
    for (let i = 0; i < daysInMonth; i++) {
      const currentDate = addDays(firstDayOfMonth, i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const log = habitLogs.find(log => log.date === dateStr);
      
      let status = null;
      if (log) {
        if (habit?.measurement.type === 'binary') {
          status = log.status;
        } else {
          // For count habits, check if target was met
          status = (log.value || 0) >= (habit?.measurement.targetValue || 1) ? 'right' : 'wrong';
        }
      }
      
      calendarDays.push({
        date: currentDate,
        inCurrentMonth: true,
        hasLog: !!log,
        status,
        value: log?.value || 0
      });
    }
    
    // Add days from next month to complete the grid
    const totalDaysSoFar = calendarDays.length;
    const remainingDays = (6 * 7) - totalDaysSoFar; // 6 rows of 7 days
    
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonthDay = addDays(addDays(firstDayOfMonth, daysInMonth), i - 1);
      calendarDays.push({
        date: nextMonthDay,
        inCurrentMonth: false,
        hasLog: false,
        status: null,
        value: 0
      });
    }
    
    return calendarDays;
  }, [habit]);

  // Animated styles - define all at once
  const headerAnimStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));
  
  const descriptionAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(descriptionY.value, [50, 0], [0, 1]),
    transform: [{ translateY: descriptionY.value }]
  }));
  
  const chartsAnimStyle = useAnimatedStyle(() => ({
    opacity: chartsOpacity.value,
  }));
  
  const logsAnimStyle = useAnimatedStyle(() => ({
    opacity: recentLogsOpacity.value,
  }));

  // Function to get gradient colors based on habit color
  const getGradientColors = useCallback((habitColor: string | undefined) => {
    // Use the habit color with the primary color as fallback
    const baseColor = habitColor || Colors.primary;
    
    // Create a gradient using the colors from the theme
    // Cast the array as const to match the required readonly tuple type
    return [baseColor, Colors.background] as const;
  }, [Colors]);

  // Main effect to load data and trigger animations
  useEffect(() => {
    const foundHabit = findHabit();
    setHabit(foundHabit);

    if (foundHabit) {
      calculateHabitStatistics(foundHabit);
    }
    
    setLoading(false);

    // Use sequential animations with delays to reduce concurrent animations
    headerOpacity.value = withTiming(1, { duration: 600 });
    descriptionY.value = withDelay(300, withTiming(0, { duration: 500 }));
    chartsOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    recentLogsOpacity.value = withDelay(900, withTiming(1, { duration: 500 }));
  }, [id, habits, logs, findHabit, calculateHabitStatistics, headerOpacity, descriptionY, chartsOpacity, recentLogsOpacity]);

  // Loading state
  if (loading || !habit) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { color: Colors.text }]}>Loading habit details...</Text>
      </View>
    );
  }

  // Memoize chart configuration to prevent rebuilding
  const chartConfig = {
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    color: (opacity = 1) => getRgbaColor(habit?.color, opacity),
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    labelColor: () => Colors.text,
  };

  const getHabitStatusIcon = (status: HabitLogStatus | undefined) => {
    if (!status) return 'remove-circle-outline';
    switch (status) {
      case 'right': return 'checkmark-circle';
      case 'wrong': return 'close-circle';
      case 'circle': return 'ellipse-outline';
      default: return 'remove-circle-outline';
    }
  };

  const getHabitStatusColor = (status: HabitLogStatus | undefined) => {
    if (!status) return Colors.grey;
    switch (status) {
      case 'right': return Colors.green;
      case 'wrong': return Colors.red;
      case 'circle': return Colors.buff;
      default: return Colors.grey;
    }
  };

  // Format the repetition text
  const getRepetitionText = () => {
    if (habit.repetition.type === 'daily') {
      return 'Daily habit';
    } else if (habit.repetition.type === 'weekly') {
      if (habit.repetition.config.daysOfWeek?.length === 7) {
        return 'Every day of the week';
      } else {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const selectedDays = habit.repetition.config.daysOfWeek || [];
        return selectedDays.map(day => days[day]).join(', ');
      }
    }
    return '';
  };

  // Prepare data for pie chart
  const pieData = [
    {
      name: "Completed",
      population: habitStats.completionRate,
      color: Colors.green,
      legendFontColor: Colors.text,
      legendFontSize: 12
    },
    {
      name: "Missed",
      population: 100 - habitStats.completionRate,
      color: Colors.red,
      legendFontColor: Colors.text,
      legendFontSize: 12
    }
  ];

  // Get recent logs for the table views
  const recentLogs = logs
    .filter(log => log.habitId === id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  // Get only logs for this habit
  const habitLogs = logs.filter(log => log.habitId === id);
  
  // Get calendar days for visualization
  const calendarDays = buildCalendarData(selectedMonth, id, habitLogs);
  
  // Group days by weeks for rendering
  const calendarWeeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    calendarWeeks.push(calendarDays.slice(i, i + 7));
  }

  // Function to navigate between months
  const changeMonth = (delta: number) => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    setSelectedMonth(newMonth);
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: Colors.background }]}
      contentContainerStyle={styles.contentContainer}
      removeClippedSubviews={true}
    >
      <LinearGradient
        colors={getGradientColors(habit.color)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Animated.View style={[styles.headerContent, headerAnimStyle]}>
          <Text style={[styles.habitTitle, { color: Colors.surface }]}>{habit.title}</Text>
          
          <View style={styles.habitMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar" size={16} color={Colors.surface} />
              <Text style={[styles.metaText, { color: Colors.surface }]}>{getRepetitionText()}</Text>
            </View>
            
            <View style={styles.metaItem}>
              <Ionicons 
                name={habit.measurement.type === 'binary' ? 'checkmark-done' : 'calculator'} 
                size={16} 
                color={Colors.surface} 
              />
              <Text style={[styles.metaText, { color: Colors.surface }]}>
                {habit.measurement.type === 'binary' 
                  ? 'Binary tracking' 
                  : `Target: ${habit.measurement.targetValue || 1} per ${habit.repetition.type}`}
              </Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: Colors.primary + '40' }]}>
              <Text style={[styles.statValue, { color: Colors.surface }]}>{habitStats.currentStreak}</Text>
              <Text style={[styles.statLabel, { color: Colors.surface }]}>Current Streak</Text>
            </View>
            
            <View style={[styles.statBox, { backgroundColor: Colors.primary + '40' }]}>
              <Text style={[styles.statValue, { color: Colors.surface }]}>{habitStats.longestStreak}</Text>
              <Text style={[styles.statLabel, { color: Colors.surface }]}>Best Streak</Text>
            </View>
            
            <View style={[styles.statBox, { backgroundColor: Colors.primary + '40' }]}>
              <Text style={[styles.statValue, { color: Colors.surface }]}>{habitStats.totalCompletions}</Text>
              <Text style={[styles.statLabel, { color: Colors.surface }]}>Total Done</Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>
      
      {habit.description && (
        <Animated.View style={[styles.card, { backgroundColor: Colors.surface }, descriptionAnimStyle]}>
          <Text style={[styles.cardTitle, { color: Colors.text }]}>Description</Text>
          <Text style={[styles.cardParagraph, { color: Colors.textSecondary }]}>{habit.description}</Text>
        </Animated.View>
      )}
      
      <Animated.View style={[styles.card, { backgroundColor: Colors.surface }, chartsAnimStyle]}>
        <Text style={[styles.cardTitle, { color: Colors.text }]}>
          {habit.repetition.type === 'weekly' && habit.measurement.type === 'count' 
            ? 'Weekly Completion Rate' 
            : 'Completion Rate'}
        </Text>
        <Text style={[styles.cardSubtext, { color: Colors.textSecondary }]}>
          {habit.repetition.type === 'weekly' && habit.measurement.type === 'count'
            ? `Last 10 weeks: ${habitStats.completionRate.toFixed(0)}%`
            : `Last 30 days: ${habitStats.completionRate.toFixed(0)}%`}
        </Text>
        <PieChart
          data={pieData}
          width={screenWidth}
          height={200}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute={false}
          center={[0, 0]}
        />
      </Animated.View>
      
      <Animated.View style={[styles.card, { backgroundColor: Colors.surface }, chartsAnimStyle]}>
        <Text style={[styles.cardTitle, { color: Colors.text }]}>Habit Calendar</Text>
        
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthButton}>
            <Ionicons name="chevron-back" size={24} color={Colors.accent} />
          </TouchableOpacity>
          
          <Text style={[styles.monthTitle, { color: Colors.text }]}>
            {format(selectedMonth, 'MMMM yyyy')}
          </Text>
          
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthButton}>
            <Ionicons name="chevron-forward" size={24} color={Colors.accent} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.calendarContainer}>
          <View style={styles.weekdayLabels}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <Text key={day} style={[styles.weekdayLabel, { color: Colors.textSecondary }]}>{day}</Text>
            ))}
          </View>
          
          {calendarWeeks.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.calendarWeek}>
              {week.map((day, dayIndex) => {
                // Determine day status styling
                let dayStyle = [styles.calendarDay];
                let textStyle = [styles.calendarDayText, { color: Colors.text }];
                
                if (!day.inCurrentMonth) {
                  dayStyle.push(styles.calendarDayOutsideMonth);
                  textStyle.push({ color: Colors.textSecondary + '80' }); 
                } else if (isSameDay(day.date, new Date())) {
                  dayStyle.push({ borderWidth: 1, borderColor: Colors.accent });
                }
                
                // Add status indicators using Colors palette
                if (day.status === 'right') {
                  dayStyle.push({
                    backgroundColor: Colors.green + '33',
                    borderWidth: 2,
                    borderColor: Colors.green
                  });
                } else if (day.status === 'wrong') {
                  dayStyle.push({
                    backgroundColor: Colors.red + '1A', 
                    borderWidth: 2,
                    borderColor: Colors.red
                  });
                } else if (day.status === 'circle') {
                  dayStyle.push({
                    backgroundColor: Colors.accent + '33',
                    borderWidth: 2,
                    borderColor: Colors.accent
                  });
                }
                
                return (
                  <View key={`day-${dayIndex}`} style={dayStyle}>
                    <Text style={textStyle}>{format(day.date, 'd')}</Text>
                    {day.hasLog && day.value > 0 && habit.measurement.type === 'count' && (
                      <Text style={[styles.calendarDayValue, { color: Colors.text }]}>{day.value}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        
        <View style={[styles.calendarLegend, { borderTopColor: Colors.textSecondary + '40' }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, { backgroundColor: Colors.green }]} />
            <Text style={[styles.legendText, { color: Colors.textSecondary }]}>Completed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, { backgroundColor: Colors.red }]} />
            <Text style={[styles.legendText, { color: Colors.textSecondary }]}>Missed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, { backgroundColor: Colors.accent }]} />
            <Text style={[styles.legendText, { color: Colors.textSecondary }]}>Late</Text>
          </View>
        </View>
      </Animated.View>
      
      <Animated.View style={[styles.card, { backgroundColor: Colors.surface }, logsAnimStyle]}>
        <Text style={[styles.cardTitle, { color: Colors.text }]}>Recent Activity</Text>
        <View style={styles.recentLogsContainer}>
          {recentLogs.length > 0 ? (
            recentLogs.map((log, index) => (
              <View 
                key={log.id} 
                style={[styles.logItem, { borderBottomColor: Colors.textSecondary + '40' }]}
              >
                <View style={styles.logDate}>
                  <Text style={{ color: Colors.text }}>{format(new Date(log.date), 'MMM dd')}</Text>
                </View>
                
                {habit.measurement.type === 'binary' ? (
                  <View style={styles.logStatus}>
                    <Ionicons 
                      name={getHabitStatusIcon(log.status as HabitLogStatus)}
                      size={24}
                      color={getHabitStatusColor(log.status as HabitLogStatus)}
                    />
                    <Text style={{ color: getHabitStatusColor(log.status as HabitLogStatus), marginLeft: 8 }}>
                      {log.status === 'right' ? 'Completed' : log.status === 'wrong' ? 'Missed' : log.status === 'circle' ? 'Late' : 'No data'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.logValue}>
                    <Text style={{ 
                      color: (log.value || 0) >= (habit.measurement.targetValue || 1) 
                        ? Colors.green 
                        : Colors.textSecondary,
                      fontWeight: 'bold'
                    }}>
                      {log.value || 0} / {habit.measurement.targetValue || 1}
                    </Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <Text style={{ color: Colors.textSecondary, textAlign: 'center', padding: 16 }}>
              No recent logs found
            </Text>
          )}
        </View>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: "#000", // Shadow color is standard for elevation
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  habitTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    // color applied inline
  },
  habitMeta: {
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  metaText: {
    marginLeft: 8,
    opacity: 0.9,
    // color applied inline
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    minWidth: 100,
    // background color applied inline
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    // color applied inline
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    // color applied inline
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    elevation: 4,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backfaceVisibility: 'hidden',
    // backgroundColor applied inline
  },
  recentLogsContainer: {
    marginTop: 8,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    // borderBottomColor applied inline
  },
  logDate: {
    width: 80,
  },
  logStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logValue: {
    alignItems: 'flex-end',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    // color applied inline
  },
  cardSubtext: {
    fontSize: 14,
    marginBottom: 10,
    // color applied inline
  },
  cardParagraph: {
    fontSize: 14,
    lineHeight: 20,
    // color applied inline
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  monthButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    // color applied inline
  },
  calendarContainer: {
    marginVertical: 10,
  },
  weekdayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  weekdayLabel: {
    fontSize: 12,
    fontWeight: '500',
    width: 36,
    textAlign: 'center',
    // color applied inline
  },
  calendarWeek: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  calendarDay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  calendarDayText: {
    fontSize: 14,
    // color applied inline
  },
  calendarDayOutsideMonth: {
    opacity: 0.3,
  },
  calendarDayValue: {
    fontSize: 10,
    fontWeight: 'bold',
    position: 'absolute',
    bottom: 1,
    // color applied inline
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    padding: 8,
    borderTopWidth: 1,
    // borderTopColor applied inline
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
    // backgroundColor applied inline
  },
  legendText: {
    fontSize: 12,
    // color applied inline
  },
});

export default HabitDetail;
