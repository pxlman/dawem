import React, { useState, useCallback, useEffect } from 'react';
import { View, Button, StyleSheet, Text, SafeAreaView, Alert, Platform, Switch, Settings } from 'react-native';
import Constants from 'expo-constants';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import '../../utils/i18n';
import { useTranslation } from 'react-i18next';

import GoalTreeMindMap from '../../components/goals/GoalTreeMindMap';
import { Goal } from '@/types/index';
import {fixedColors, getColors} from '@/constants/Colors';
import { useAppDispatch, useAppState } from '@/context/AppStateContext';
let Colors = getColors()

// Keep INITIAL_GOALS for testing
const INITIAL_GOALS: Goal[] = [
  {
    id: uuidv4(),
    title: "هدف أكبر",
    color: "#00BCD4",
    enabled: true,
  },
];

const GoalsScreen: React.FC = () => {
    // Get translations
    const { t } = useTranslation();
    
    // Get app state and dispatch
    const appState = useAppState();
    const dispatch = useAppDispatch();
    const theme = appState.settings.theme;
    Colors =  getColors(theme)
    
    // Local state with INITIAL_GOALS
    // const [localGoals, setLocalGoals] = useState<Goal[]>(INITIAL_GOALS);
    
    // State to switch between local goals and app state goals for testing
    // const [useLocalGoals, setUseLocalGoals] = useState<boolean>(false);
    
    // Choose which goals to use based on testing mode
    // const goals = useLocalGoals ? localGoals : appState.goals;
    const goals = appState.goals;
    
    // If app state goals are empty and we're not in local mode, 
    // initialize them with INITIAL_GOALS once
    useEffect(() => {
        if ( goals.length === 0 && INITIAL_GOALS.length > 0) {
            // Initialize app state with initial goals
            INITIAL_GOALS.forEach(goal => {
                dispatch({
                    type: 'ADD_GOAL',
                    payload: {
                        title: goal.title,
                        color: goal.color,
                        enabled: true,
                        // Include subgoals if any
                        ...(goal.subgoals && { subgoals: goal.subgoals }),
                        // Include habitsIds if any
                        ...(goal.habitsIds && { habitsIds: goal.habitsIds })
                    }
                });
            });
        }
    }, [goals.length, dispatch]);

    // Handle adding a goal
    const handleAddGoal = useCallback(
      (parentGoalId: string | null = null) => {
        const newGoal = {
          title: t('goals.editMe'),
          color: fixedColors[5],
          enabled: true,
        };

        // Using app state
        if (parentGoalId === null) {
          dispatch({
            type: "ADD_GOAL",
            payload: newGoal,
          });
        } else {
          dispatch({
            type: "ADD_SUBGOAL",
            payload: { parentGoalId, newGoal },
          });
        }
      },
      [dispatch, t]
    );

    // Handle editing a goal
    const handleEditGoal = useCallback((goalId: string, newTitle: string, newColor: string) => {
      // Using app state
      dispatch({
        type: "UPDATE_GOAL",
        payload: {
          id: goalId,
          title: newTitle,
          color: newColor,
        },
      });
    }, [dispatch]);

    // Handle removing a goal
    const handleRemoveGoal = useCallback((goalId: string) => {
        // Using app state
        dispatch({
            type: 'DELETE_GOAL',
            payload: { id: goalId }
        });
    }, [dispatch]);

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header with testing mode toggle */}
            {/* <View style={styles.headerContainer}>
                <Text style={styles.header}>{t('goals.title')}</Text>
                <View style={styles.headerActions}>
                    <Button
                        title={t('goals.add')}
                        onPress={() => handleAddGoal(null)}
                    />
                </View>
            </View> */}
            
            {/* Display goals count for debugging */}
            <Text style={styles.debugText}>
                {t('goals.goals')}: {goals?.length || 0}
            </Text>

            {/* Mind map component */}
            <GoalTreeMindMap
                // goals={goals}
                onAddGoal={handleAddGoal}
                onEditGoal={handleEditGoal}
                onRemoveGoal={handleRemoveGoal}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.surface,
        //  paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0, // Safer status bar handling
    },
     headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        // paddingTop: 10, // Adjust as needed
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
     },
    header: {
        fontSize: 20, // Slightly smaller header
        fontWeight: 'bold',
        color: Colors.text
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    testingModeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    testingModeText: {
        fontSize: 12,
        marginRight: 5,
        color: Colors.text,
    },
    debugText: {
        fontSize: 12,
        textAlign: 'center',
        color: Colors.textSecondary,
        paddingVertical: 4,
        backgroundColor: Colors.surface,
    },
});


export default GoalsScreen;