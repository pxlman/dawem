import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Habit } from '../../types/index';
import Colors from '@/constants/Colors';

// Constants for node sizing
export const HABIT_NODE_HEIGHT = 30; // Smaller than goal nodes
export const HABIT_NODE_WIDTH = 120;

interface HabitNodeMindMapProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height?: number;
  habit: Habit;
  onPress?: (habitId: string) => void;
}

const HabitNodeMindMap: React.FC<HabitNodeMindMapProps> = ({
  id,
  x,
  y,
  width = HABIT_NODE_WIDTH,
  height = HABIT_NODE_HEIGHT,
  habit,
  onPress
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress(habit.id);
    }
  };

  // Check if habit is enabled - consider both its own property and parent goal state
  const isEnabled = habit.enabled !== false; // Default to true if not specified

  return (
    <TouchableOpacity
      style={[
        styles.habitNode,
        {
          left: x,
          top: y,
          width: width,
          height: height,
          backgroundColor: isEnabled ? (habit.color || Colors.primary) : '#555555',
          opacity: isEnabled ? 1 : 0.85
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.habitContent}>
        {!isEnabled && (
          <Ionicons 
            name="pause" 
            size={12} 
            color= {Colors.lightGrey} 
            style={styles.pauseIcon}
          />
        )}
        <Text 
          style={[
            styles.habitNodeText,
            !isEnabled && styles.pausedHabitText
          ]}
          numberOfLines={1}
        >
          {habit.title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  habitNode: {
    position: 'absolute',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
    borderWidth: 1,
    borderColor: Colors.accent,
    elevation: 2,
  },
  habitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitNodeText: {
    color: Colors.darkGrey,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  pausedHabitText: {
    color: '#e0e0e0',
  },
  pauseIcon: {
    marginRight: 4,
  }
});

export default HabitNodeMindMap;
