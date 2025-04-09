// components/ActivityHeatmap.tsx
import React, { useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, ScrollView, Dimensions } from 'react-native';
import { format, getDay, getMonth, getYear } from 'date-fns';
import Colors from '../constants/Colors'; // Adjust path if needed
import { LogEntry, Habit } from '../types'; // Adjust path if needed
import { getLastNDates, getCompletionStatusForDate, HeatmapStatus } from '../utils/dateUtils'; // Adjust path if needed

interface ActivityHeatmapProps {
    habit: Habit;
    logs: LogEntry[];
    periodDays?: number;
    cellSize?: number;
    cellMargin?: number;
    columnMargin?: number;
    monthGapMultiplier?: number; // Added prop for gap size customization
    containerWidth?: number;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
    habit,
    logs,
    periodDays = 154, // Default to approx 5 months
    cellSize = 10,
    cellMargin = 1.5,
    columnMargin = 4, // Default standard gap
    monthGapMultiplier = 2.5, // Multiplier for the gap between months
    containerWidth,
}) => {
    const rawDates = useMemo(() => getLastNDates(periodDays), [periodDays]);
    const dates = useMemo(() => {
        if (!rawDates) return [];
        return [...rawDates].reverse();
    }, [rawDates]);

    const heatmapData = useMemo(() => {
        // ... (heatmapData calculation remains the same) ...
        if (!dates || dates.length === 0) return { weeks: [], monthLabels: [] };

        const weeks: { date: Date | null; status: HeatmapStatus }[][] = [];
        let currentWeek: { date: Date | null; status: HeatmapStatus }[] = [];

        if (dates.length > 0) {
            const firstDayIndex = getDay(dates[0]);
            for (let i = 0; i < firstDayIndex; i++) {
                currentWeek.push({ date: null, status: 'none' });
            }
        }

        dates.forEach((date) => {
            const dayOfWeek = getDay(date);
            const status = getCompletionStatusForDate(habit.id, date, logs);
            currentWeek.push({ date, status });
            if (dayOfWeek === 6) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        });

        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push({ date: null, status: 'none' });
            }
            weeks.push(currentWeek);
        }

        const monthLabels: { name: string; year: number; weekIndex: number }[] = [];
        const addedMonths = new Set<string>();
        weeks.forEach((week, weekIndex) => {
             const firstValidDayInWeek = week.find(d => d.date !== null);
             if (!firstValidDayInWeek || !firstValidDayInWeek.date) return;
             const monthStr = format(firstValidDayInWeek.date, 'MMM');
             const year = getYear(firstValidDayInWeek.date);
             const monthYearKey = `${monthStr}-${year}`;
             if (!addedMonths.has(monthYearKey)) {
                 monthLabels.push({ name: monthStr, year: year, weekIndex: weekIndex });
                 addedMonths.add(monthYearKey);
             }
        });
        return { weeks, monthLabels };
    }, [dates, logs, habit.id]);

    // --- Calculations for rendering ---
    const screenWidth = Dimensions.get('window').width;
    const availableWidth = containerWidth || (screenWidth - 40);
    const dayLabelWidth = 30;

    const cellTotalHeight = cellSize + cellMargin * 2;
    const cellBoxWidth = cellSize;
    const widerColumnMargin = columnMargin * monthGapMultiplier * 0.7; // Calculate the wider margin

    // --- Calculate precise grid width considering wider month gaps ---
    const gridContentWidth = useMemo(() => {
        let totalWidth = 0;
        const numWeeks = heatmapData.weeks.length;
        heatmapData.weeks.forEach((_week, weekIndex) => {
            // Determine if the *next* week starts a new month
            const isNextWeekStartOfNewMonth = heatmapData.monthLabels.some(label => label.weekIndex === weekIndex + 1);
            const margin = isNextWeekStartOfNewMonth ? widerColumnMargin : columnMargin;

            // Add cell width for the current column
            totalWidth += cellBoxWidth;

            // Add margin if it's not the very last column
            if (weekIndex < numWeeks - 1) {
                totalWidth += margin;
            }
        });
        return totalWidth;
    }, [heatmapData.weeks, heatmapData.monthLabels, cellBoxWidth, columnMargin, widerColumnMargin]);
    // --- End Grid Width Calculation ---

    // --- Helper Functions ---
    const getCellColor = (status: HeatmapStatus): string => { /* ... no changes ... */
        switch (status) {
            case 'right': return Colors.green;
            case 'wrong': return Colors.red;
            case 'circle': return Colors.blue;
            case 'none': default: return Colors.heatmapLevel0;
        }
    };
    const handleCellPress = (dayData: { date: Date | null; status: HeatmapStatus }) => { /* ... no changes ... */
        if (!dayData.date) return;
         Alert.alert(
             `${habit.title} on ${format(dayData.date, 'MMM d, yyyy')}`,
             `Status: ${dayData.status === 'none' ? 'No Log' : dayData.status.charAt(0).toUpperCase() + dayData.status.slice(1)}`
         );
    };

    // --- Error/Loading Handling ---
     if (heatmapData.weeks.length === 0 && dates.length > 0) { /* ... no changes ... */
         return <Text style={styles.errorText}>Error processing heatmap data.</Text>;
     } else if (dates.length === 0) { /* ... no changes ... */
         return <Text style={styles.errorText}>No date range available.</Text>;
     }

    // --- Dynamic Style Calculation ---
    const dayLabelsColumnHeight = 7 * cellTotalHeight;
    const dayLabelStyle = { /* ... no changes ... */
         fontSize: 9,
         color: Colors.textSecondary,
         textAlign: 'center',
         height: cellTotalHeight,
         lineHeight: cellTotalHeight,
     };

    // --- Component Return (JSX) ---
    return (
        <View style={styles.outerContainer}>
            {/* Month Labels Row */}
            {/* Use the precisely calculated gridContentWidth */}
            <View style={[
                styles.monthLabelsContainer,
                {
                    paddingLeft: dayLabelWidth,
                    width: gridContentWidth + dayLabelWidth, // Use precise width
                 }
             ]}>
                 {heatmapData.monthLabels.map(label => {
                     // --- Adjust label positioning based on precise widths ---
                     let labelLeftOffset = 0;
                     for(let i = 0; i < label.weekIndex; i++) {
                         const isNextNew = heatmapData.monthLabels.some(l => l.weekIndex === i + 1);
                         const marginForPrev = isNextNew ? widerColumnMargin : columnMargin;
                         labelLeftOffset += cellBoxWidth + marginForPrev;
                     }
                     // --- End label positioning adjustment ---

                     return (
                         <Text
                             key={`${label.name}-${label.year}-${label.weekIndex}`}
                             style={[styles.monthLabel, { left: labelLeftOffset }]} // Use calculated offset
                             numberOfLines={1}
                             ellipsizeMode='clip'
                         >
                             {label.name}
                         </Text>
                     );
                 })}
            </View>

            {/* Main Grid Area */}
            <View style={styles.gridArea}>
                {/* Day Labels Column */}
                <View style={[styles.dayLabelsColumn, { width: dayLabelWidth, height: dayLabelsColumnHeight }]}>
                    {DAY_LABELS.map((label, index) => (
                        <Text key={label} style={[dayLabelStyle, { opacity: index % 2 !== 0 ? 1 : 0 }]}>
                            {label}
                        </Text>
                    ))}
                </View>

                {/* Scrollable Weeks */}
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.scrollView}>
                    {/* Use the precisely calculated gridContentWidth */}
                    <View style={[styles.weeksContainer, { width: gridContentWidth }]}>
                        {heatmapData.weeks.map((week, weekIndex) => {
                            // --- Determine margin for THIS column ---
                            const isLastWeek = weekIndex === heatmapData.weeks.length - 1;
                            let dynamicMargin = 0; // No margin needed after the last column

                            if (!isLastWeek) {
                                // Check if the *next* week starts a new month
                                const isNextWeekStartOfNewMonth = heatmapData.monthLabels.some(label => label.weekIndex === weekIndex + 1);
                                dynamicMargin = isNextWeekStartOfNewMonth ? widerColumnMargin : columnMargin;
                            }
                            // --- End margin determination ---

                            return (
                                <View
                                    key={weekIndex}
                                    style={[
                                        styles.weekColumn,
                                        {
                                            width: cellSize,
                                            marginRight: dynamicMargin // Apply calculated margin
                                        }
                                    ]}
                                >
                                    {week.map((day, dayIndex) => {
                                        const color = getCellColor(day.status);
                                        return (
                                            <TouchableOpacity
                                                key={`${weekIndex}-${dayIndex}`}
                                                onPress={() => handleCellPress(day)}
                                                disabled={!day.date}
                                                activeOpacity={day.date ? 0.7 : 1}
                                                style={{ marginVertical: cellMargin }}
                                            >
                                                <View style={[
                                                    styles.cell,
                                                    {
                                                        width: cellSize,
                                                        height: cellSize,
                                                        backgroundColor: color,
                                                    },
                                                    !day.date && styles.placeholderCell
                                                ]}/>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>

             {/* Legend */}
             <View style={styles.legend}>
                 {/* ... (no changes needed) ... */}
                <View style={styles.legendItem}><View style={[styles.legendColorBox, { backgroundColor: Colors.green }]} /><Text style={styles.legendText}>Done</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendColorBox, { backgroundColor: Colors.red }]} /><Text style={styles.legendText}>Missed</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendColorBox, { backgroundColor: Colors.blue }]} /><Text style={styles.legendText}>Imperfect</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendColorBox, { backgroundColor: Colors.heatmapLevel0 }]} /><Text style={styles.legendText}>No Data</Text></View>
             </View>
        </View>
    );
};

// --- Styles --- (No changes needed here)
const styles = StyleSheet.create({
    outerContainer: { /* ... */ alignItems: 'flex-start', marginTop: 5, marginBottom: 15, width: '100%' },
    monthLabelsContainer: { /* ... */ flexDirection: 'row', height: 18, marginBottom: 3, position: 'relative', overflow: 'hidden' },
    monthLabel: { /* ... */ position: 'absolute', top: 0, fontSize: 10, color: Colors.textSecondary, paddingHorizontal: 1 },
    gridArea: { /* ... */ flexDirection: 'row', width: '100%' },
    dayLabelsColumn: { /* ... */ justifyContent: 'space-around', alignItems: 'center', paddingRight: 5 },
    scrollView: { /* ... */ flex: 1 },
    weeksContainer: { /* ... */ flexDirection: 'row' },
    weekColumn: { /* ... */ flexDirection: 'column' },
    cell: { /* ... */ borderRadius: 2, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' },
    placeholderCell: { /* ... */ backgroundColor: 'transparent', borderColor: 'transparent' },
    errorText: { /* ... */ color: Colors.error, fontSize: 14, fontStyle: 'italic', textAlign: 'center', padding: 20 },
    legend: { /* ... */ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, width: '100%' },
    legendItem: { /* ... */ flexDirection: 'row', alignItems: 'center', marginHorizontal: 6, marginBottom: 4 },
    legendColorBox: { /* ... */ width: 11, height: 11, borderRadius: 2, marginRight: 4, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' },
    legendText: { /* ... */ fontSize: 10, color: Colors.textSecondary },
});

export default ActivityHeatmap;