import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { useAppDispatch, useAppState } from '@/context/AppStateContext';
import { Goal, Habit } from '@/types/index';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

interface SelectHabitModalProps {
  goal: Goal;
  visible: boolean;
  onClose: () => void;
}

const SelectHabitModal: React.FC<SelectHabitModalProps> = ({
  goal,
  visible,
  onClose,
}) => {
  const { habits, goals } = useAppState();
  const dispatch = useAppDispatch();

  const [selectedHabits, setSelectedHabits] = useState<Set<string>>(new Set());
  
  // Initialize with existing habits linked to the goal
  useEffect(() => {
    if (goal && goal.habitsIds) {
      setSelectedHabits(new Set(goal.habitsIds));
    } else {
      setSelectedHabits(new Set());
    }
  }, [goal]);

  // Check if a goal has subgoals by looking at its subgoals array
  const hasSubgoals = useMemo(() => {
    return goal && goal.subgoals && goal.subgoals.length > 0;
  }, [goal]);

  // Get available habits that can be linked
  const availableHabits = useMemo(() => {
    if (!goal || hasSubgoals) return [];
    
    // All habits that aren't already linked to another goal
    return habits.filter(habit => {
      // If it's already selected for this goal, show it
      if (selectedHabits.has(habit.id)) return true;
      
      // Check if the habit is linked to any other goal
      const isLinkedToOtherGoal = goals.some(g => 
        g.id !== goal.id && 
        g.habitsIds && 
        g.habitsIds.includes(habit.id)
      );
      
      return !isLinkedToOtherGoal;
    });
  }, [habits, goals, goal, selectedHabits, hasSubgoals]);

  const toggleHabitSelection = (habitId: string) => {
    setSelectedHabits(prev => {
      const newSelectedHabits = new Set(prev);
      if (newSelectedHabits.has(habitId)) {
        newSelectedHabits.delete(habitId);
      } else {
        newSelectedHabits.add(habitId);
      }
      return newSelectedHabits;
    });
  };

  const handleSave = () => {
    if (!goal) return;
    
    // Update the goal with selected habits
    dispatch({
      type: 'UPDATE_GOAL',
      payload: {
        id: goal.id,
        habitsIds: Array.from(selectedHabits)
      }
    });
    
    // Update each habit to link to this goal if needed
    Array.from(selectedHabits).forEach(habitId => {
      dispatch({
        type: 'LINK_HABIT_TO_GOAL',
        payload: { goalId: goal.id, habitId }
      });
    });
    
    onClose();
  };

  const renderHabitItem = ({ item }: { item: Habit }) => {
    const isSelected = selectedHabits.has(item.id);
    
    return (
      <TouchableOpacity 
        style={[styles.habitItem, isSelected && styles.habitItemSelected]} 
        onPress={() => toggleHabitSelection(item.id)}
      >
        <View style={styles.habitInfo}>
          <Text style={[styles.habitTitle, isSelected && styles.selectedText]}>{item.title}</Text>
            <Text style={[styles.habitDescription, isSelected && styles.selectedText]} numberOfLines={1}>
              {'Some stats'}
            </Text>
        </View>
        <View style={styles.checkboxContainer}>
          {isSelected && (
            <Ionicons name="checkmark" size={24} color={isSelected ? Colors.surface : Colors.primary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <TouchableOpacity
      style={styles.modalOverlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <TouchableOpacity
        style={styles.modalContent}
        activeOpacity={1}
        onPress={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <Text style={styles.modalHeader}>Select Habits</Text>
        <Text style={styles.goalTitle}>Goal: {goal.title}</Text>
        
        {availableHabits.length > 0 ? (
          <FlatList
            data={availableHabits}
            renderItem={renderHabitItem}
            keyExtractor={(item) => item.id}
            style={styles.habitsList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={Colors.grey} />
            <Text style={styles.emptyStateText}>No available habits</Text>
            <Text style={styles.emptyStateSubtext}>
              Create new habits first or remove habits from other goals
            </Text>
          </View>
        )}
        
        <View style={styles.actions}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 8,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: Colors.text,
  },
  goalTitle: {
    fontSize: 14,
    marginBottom: 15,
    color: Colors.textSecondary,
  },
  habitsList: {
    maxHeight: 350,
  },
  habitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
  },
  habitItemSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  habitInfo: {
    flex: 1,
    marginRight: 10,
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  habitDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  selectedText: {
    color: Colors.surface,
  },
  checkboxContainer: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 15,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  cancelButton: {
    backgroundColor: Colors.error,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  buttonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.text,
    marginTop: 10,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
});

export default SelectHabitModal;