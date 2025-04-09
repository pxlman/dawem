// app/(tabs)/stats.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native'; // Use ScrollView instead of FlatList for simplicity now
import { useAppState } from '../../context/AppStateContext';
import Colors from '../../constants/Colors';
import ActivityHeatmap from '../../components/ActivityHeatmap'; // Import the new component
import { Habit } from '../../types';

export default function StatsScreen() {
    const { habits, logs } = useAppState();
    const activeHabits = habits.filter(h => !h.archived);

    // Basic overall stats (optional, could be removed)
    const overallStats = useMemo(() => {
        // Simple completion rate (can be refined)
        const totalLogs = logs.length;
        const completedLogs = logs.filter(l => l.status === 'right' || (l.value && l.value > 0)).length;
        return {
            completion: totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : 0,
        };
    }, [logs]);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
            {/* Optional: Overall Summary */}
            {/* <Text style={styles.header}>Overall Stats</Text> */}
            {/* <View style={styles.summaryCard}> ... </View> */}

            <Text style={styles.header}>Habit Activity (Last ~3 Months)</Text>

            {activeHabits.length === 0 && (
                <Text style={styles.placeholder}>Add some habits to see their activity here.</Text>
            )}

            {activeHabits.map(habit => (
                <View key={habit.id} style={styles.habitSection}>
                    <Text style={styles.habitTitle}>{habit.title}</Text>
                    <ActivityHeatmap
                        habit={habit}
                        logs={logs} // Pass all logs, component will filter
                        periodDays={91} // Approx 13 weeks * 7 days
                        cellSize={10}
                        cellMargin={1.5}
                    />
                </View>
            ))}

            <View style={styles.legend}>
                 <Text style={styles.legendText}>Less</Text>
                 <View style={[styles.legendColorBox, { backgroundColor: Colors.heatmapLevel1 }]} />
                 <View style={[styles.legendColorBox, { backgroundColor: Colors.heatmapLevel2 }]} />
                 <View style={[styles.legendColorBox, { backgroundColor: Colors.heatmapLevel3 }]} />
                 <View style={[styles.legendColorBox, { backgroundColor: Colors.heatmapLevel4 }]} />
                 <Text style={styles.legendText}>More</Text>
             </View>

        </ScrollView>
    );
}

// Styles
const styles = StyleSheet.create({
     container: {
         flex: 1,
         backgroundColor: Colors.background
     },
    scrollContentContainer: {
        padding: 15,
        paddingBottom: 40
    },
    header: {
        fontSize: 20, // Slightly smaller header
        fontWeight: 'bold',
        marginBottom: 20, // More space after header
        color: Colors.primary,
        textAlign: 'center'
    },
    habitSection: {
        backgroundColor: Colors.surface,
        borderRadius: 8,
        paddingVertical: 15,
        paddingHorizontal: 10,
        marginBottom: 15,
        elevation: 1,
        borderWidth: 1,
        borderColor: Colors.lightGrey,
    },
    habitTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 10, // Space between title and heatmap
        textAlign: 'center',
    },
    placeholder: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginTop: 30,
        fontStyle: 'italic',
        textAlign: 'center'
    },
     legend: {
        flexDirection: 'row',
        marginTop: 15,
        marginBottom: 10,
        alignItems: 'center',
        justifyContent: 'center', // Center legend items
        paddingHorizontal: 10,
    },
    legendItem: { // Keep if using individual items later
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10,
    },
    legendColorBox: {
        width: 12, // Match heatmap cell size
        height: 12,
        borderRadius: 2,
        marginHorizontal: 1.5, // Match heatmap cell margin
    },
    legendText: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginHorizontal: 5, // Space around text
    },
});