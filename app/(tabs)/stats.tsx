// app/(tabs)/stats.tsx
import React from 'react'; // Removed useMemo if not calculating overall stats here
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAppState } from '../../context/AppStateContext';
import Colors from '../../constants/Colors';
import ActivityHeatmap from '../../components/ActivityHeatmap'; // Correct import
import { Habit } from '../../types';

export default function StatsScreen() {
    const { habits, logs } = useAppState();
    // Filter active habits directly here
    const activeHabits = habits.filter(h => !h.archived);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
            <Text style={styles.header}>Habit Activity (Last ~3 Months)</Text>

            {/* Message if no habits exist */}
            {activeHabits.length === 0 && (
                <Text style={styles.placeholder}>Add some habits to see their activity here.</Text>
            )}

            {/* Map over active habits and render a section for each */}
            {activeHabits.map(habit => (
                <View key={habit.id} style={styles.habitSection}>
                    {/* Render habit title */}
                    <Text style={styles.habitTitle}>{habit.title}</Text>
                    {/* Render the heatmap for the habit */}
                    <ActivityHeatmap
                        habit={habit}
                        logs={logs}
                        periodDays={140} // ~5 months
                        // Adjust cell size/margin if needed for your screen layout
                        cellSize={11}
                        cellMargin={1.2}
                    />
                </View>
            ))}

            {/* The Legend is now part of the ActivityHeatmap component by default */}
            {/* If you prefer a single legend at the bottom, remove it from ActivityHeatmap */}
            {/* and uncomment/add a similar legend structure here */}
             {/* Example of a single legend at the bottom:
             {activeHabits.length > 0 && ( // Only show if there are habits
                 <View style={styles.overallLegend}>
                    <View style={styles.legendItem}><View style={[styles.legendColorBox, { backgroundColor: Colors.green }]} /><Text style={styles.legendText}>Done</Text></View>
                    <View style={styles.legendItem}><View style={[styles.legendColorBox, { backgroundColor: Colors.red }]} /><Text style={styles.legendText}>Missed</Text></View>
                    <View style={styles.legendItem}><View style={[styles.legendColorBox, { backgroundColor: Colors.blue }]} /><Text style={styles.legendText}>Imperfect</Text></View>
                    <View style={styles.legendItem}><View style={[styles.legendColorBox, { backgroundColor: Colors.heatmapLevel0 }]} /><Text style={styles.legendText}>No Data</Text></View>
                 </View>
             )} */}

        </ScrollView>
    );
}

// Styles (Adjust as needed)
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
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: Colors.primary,
        textAlign: 'center'
    },
    habitSection: {
        backgroundColor: Colors.surface,
        borderRadius: 8,
        paddingVertical: 10, // Reduced vertical padding
        paddingHorizontal: 5, // Reduced horizontal padding
        marginBottom: 15,
        elevation: 1,
        borderWidth: 1,
        borderColor: Colors.lightGrey,
        alignItems: 'center', // Center title and heatmap within the section
    },
    habitTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8, // Space between title and heatmap
        textAlign: 'center',
    },
    placeholder: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginTop: 30,
        fontStyle: 'italic',
        textAlign: 'center'
    },
    // Styles for the optional overall legend (if moved from heatmap component)
    overallLegend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 15,
        marginBottom: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
        borderTopWidth: 1,
        borderTopColor: Colors.lightGrey,
        paddingTop: 15,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 6,
        marginBottom: 4,
    },
    legendColorBox: {
        width: 11,
        height: 11,
        borderRadius: 2,
        marginRight: 4,
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    legendText: {
        fontSize: 10,
        color: Colors.textSecondary,
    },
});