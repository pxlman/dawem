// components/ActivityHeatmap.tsx
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { format, parseISO } from 'date-fns';
import Colors from '../constants/Colors';
import { LogEntry, Habit } from '../types';
import { getLastNDates, getCompletionStatusForDate } from '../utils/dateUtils';

interface ActivityHeatmapProps {
    habit: Habit;
    logs: LogEntry[];
    periodDays?: number;
    cellSize?: number;
    cellMargin?: number;
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
    habit,
    logs,
    periodDays = 90, // Default to ~3 months
    cellSize = 12, // Adjust size as needed
    cellMargin = 2,
}) => {
    const dates = getLastNDates(periodDays).reverse(); // Get dates chronologically

    const getCellColor = (status: 'completed' | 'missed' | 'partial' | 'none'): string => {
        // Define color mapping based on habit color or fixed colors
        // Example using fixed heatmap colors:
        switch (status) {
            case 'completed': return Colors.heatmapLevel4; // Darkest green for completed
            case 'partial': return Colors.heatmapLevel2;   // Medium green for partial/circle
            case 'missed': return Colors.heatmapLevel0; // Or maybe Colors.red for missed? Grey for now.
            case 'none':
            default: return Colors.heatmapLevel0; // Light grey for no data
        }
        // Example using shades of habit color (more complex):
        // const baseColor = habit.color || Colors.primary;
        // switch (status) {
        //     case 'completed': return baseColor; // Full color
        //     case 'partial': return // lighter shade of baseColor;
        //     case 'missed': return Colors.lightGrey; // Or Colors.red?
        //     case 'none':
        //     default: return Colors.heatmapLevel0;
        // }
    };

    if (dates.length === 0) {
        return <Text style={styles.errorText}>Could not generate date range.</Text>;
    }

    // Simple grid layout - adjust columns based on available width if needed
    const numColumns = 15; // Example: ~2 weeks per row for 90 days
    console.log("ActivityHeatmap rendering...");
    return (
        <View style={styles.container}>
            <View style={styles.grid}>
                {dates.map((date) => {
                    const status = getCompletionStatusForDate(habit.id, date, logs);
                    const color = getCellColor(status);
                    // Tooltip/press handling could be added here with TouchableOpacity
                    return (
                        <View
                            key={format(date, 'yyyy-MM-dd')}
                            style={[
                                styles.cell,
                                {
                                    width: cellSize,
                                    height: cellSize,
                                    backgroundColor: color,
                                    margin: cellMargin,
                                },
                            ]}
                        />
                    );
                })}
            </View>
            {/* Optional: Add a legend */}
            {/* <View style={styles.legend}> ... </View> */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 5,
        marginBottom: 15,
        alignItems: 'center', // Center the grid horizontally
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center', // Center cells within rows
        // Calculate width based on columns, cell size, margin if needed
        // width: numColumns * (cellSize + cellMargin * 2),
    },
    cell: {
        borderRadius: 2, // Slightly rounded corners
        // Add border for clarity?
        // borderWidth: 0.5,
        // borderColor: Colors.darkGrey,
    },
    errorText: {
        color: Colors.error,
        fontSize: 12,
        fontStyle: 'italic',
    },
    legend: {
        flexDirection: 'row',
        marginTop: 8,
        alignItems: 'center',
        justifyContent: 'flex-end', // Align legend to the right
        paddingHorizontal: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10,
    },
    legendColorBox: {
        width: 10,
        height: 10,
        borderRadius: 2,
        marginRight: 4,
    },
    legendText: {
        fontSize: 10,
        color: Colors.textSecondary,
    },
});

export default ActivityHeatmap;