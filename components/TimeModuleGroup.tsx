// components/TimeModuleGroup.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HabitItem from './HabitItem'; // Adjust path
import Colors from '../constants/Colors'; // Adjust path
import { TimeModule, Habit } from '@/types/index'; // Adjust path

interface TimeModuleGroupProps {
    timeModule?: TimeModule;
    habits: Habit[];
    currentDate: Date;
    onEditHabit: (habit: Habit) => void; // Add the edit handler prop
}

const TimeModuleGroup: React.FC<TimeModuleGroupProps> = ({ timeModule, habits, currentDate, onEditHabit }) => {
  if (!habits || habits.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Apply new style to the header Text */}
      <Text style={styles.timeModuleHeader}>
          {timeModule?.name?.toUpperCase() ?? <Text>UNASSIGNED</Text>}
      </Text>
      {/* Render HabitItems */}
      {habits.map(habit => (
        <HabitItem key={habit.id} habit={habit} currentDate={currentDate} onEdit={() => onEditHabit(habit)} />
      ))}
    </View>
  );
};

// --- Updated Styles ---
const styles = StyleSheet.create({
  container: {
    marginBottom: 10, // Space below each group
    // Remove marginTop, handle spacing in the list screen
  },
  timeModuleHeader: { // New style for the header
    fontSize: 14, // Slightly smaller
    fontWeight: '600', // Medium weight
    color: Colors.textSecondary, // Use secondary color
    // textAlign: 'center', // Center the text
    marginLeft: 15, // Keep left margin consistent with items
    marginBottom: 8, // More space below header
    marginTop: 20, // Space above the *first* header in the list
    letterSpacing: 0.5, // Add letter spacing
    textTransform: 'uppercase', // Make it uppercase
  },
});

export default TimeModuleGroup;