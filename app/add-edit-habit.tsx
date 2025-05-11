// app/add-habit.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Platform, StatusBar } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAppState, useAppDispatch } from '../context/AppStateContext'; // Adjust path if needed
import { fixedColors, getColors } from '../constants/Colors'; // Adjust path if needed
import { Habit, HabitMeasurementType, HabitRepetitionType, TimeModule, RepetitionConfig, Goal, AddHabitPayload } from '@/types/index'; // Adjust path if needed
import DateTimePicker from '@react-native-community/datetimepicker'; // Import DateTimePicker
import { format } from 'date-fns'; // Ensure format is imported
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { habitById, getGoalOfHabit } from '@/utils/goalUtils';
let Colors = getColors()

const repetitionOptions = [ { label: 'Daily', value: 'daily' }, { label: 'Weekly', value: 'weekly' }, ];

export default function AddHabitModalScreen() {
    const router = useRouter();
    const { habitId, currentDate, goalId } = useLocalSearchParams<{ habitId?: string; currentDate?: string; goalId?:string }>(); // Include currentDate in params
    const { habits, timeModules, goals, settings } = useAppState(); // Add goals to destructuring
    Colors = getColors(settings.theme)
    const dispatch = useAppDispatch();
      let chabit = {
        // id: habitId?? null,
        title: "",
        color: Colors.primary,
        repetition: {
          type: "daily",
          config: {
            
          },
        },
        measurement: {
          type: "binary",
          targetValue:0
        },
        timeModuleId: timeModules[0].id,
        enabled: true,
        startDate: currentDate,
        endDate: null,
      } as Habit;
      if (habitId) {
        chabit = habitById(habitId);
      }
    // Ensure currentDate is a valid Date object or fallback to today
    const selectedDate = useMemo(() => {
        try {
            return currentDate ? new Date(currentDate) : new Date();
        } catch {
            return new Date(); // Fallback to today if invalid
        }
    }, [currentDate]);

    // Form State - Use a single useState for habit
    const [habit, setHabit] = useState<Habit>(chabit);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false); // State to toggle advanced options
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(
        goalId || (habitId ? getGoalOfHabit(habitId)?.id?? null  : null)
    );

    // Dropdown Open State
    const [repetitionOpen, setRepetitionOpen] = useState(false);
    const [timeModuleOpen, setTimeModuleOpen] = useState(false);
    const [goalOpen, setGoalOpen] = useState(false);

    // Picker Items
    const timeModuleItems = useMemo(() => timeModules.map((tm:TimeModule) => ({ label: tm.name, value: tm.id })), [timeModules]);
    const goalItems = useMemo(() => {
      // Filter to include only goals without subgoals (leaf goals)
      const leafGoals = (goals || []).filter((goal:Goal) => {
        // Filter out goals that have subgoals
        // This assumes goals have a property like 'subgoals' or 'hasSubgoals'
        return !goal.subgoals || goal.subgoals.length === 0;
      });
      
      // Add a "None" option at the beginning
      return [
        { label: 'None', value: null },
        ...leafGoals.map((goal:Goal) => ({ label: goal.title, value: goal.id }))
      ];
    }, [goals]);

    // Effect to populate form
    useEffect(() => {
        setHabit({
            ...chabit,
            timeModuleId: chabit.timeModuleId ||  timeModules[0]?.id,
            startDate: format(selectedDate, 'yyyy-MM-dd'),
            endDate: null,
        });
    }, [habitId, timeModules, selectedDate]);

    // Callbacks to close other dropdowns
    const onRepetitionOpen = useCallback(() => {
      setTimeModuleOpen(false);
      setGoalOpen(false);
    }, []);
    
    const onTimeModuleOpen = useCallback(() => {
      setRepetitionOpen(false);
      setGoalOpen(false);
    }, []);
    
    const onGoalOpen = useCallback(() => {
      setRepetitionOpen(false);
      setTimeModuleOpen(false);
    }, []);

    const toggleDaySelection = (index: number) => {
        setHabit(prev => ({
            ...prev,
            repetition: {
                ...prev.repetition,
                config: {
                    ...prev.repetition.config,
                    daysOfWeek: prev.repetition.config.daysOfWeek?.includes(index)
                        ? prev.repetition.config.daysOfWeek.filter(day => day !== index)
                        : [...(prev.repetition.config.daysOfWeek || []), index]
                }
            }
        }));
    };

    // Handlers
    const handleSave = () => {
        // Add null checks
        if (!habit.title.trim()) return Alert.alert('Input Error', 'Habit title is required.');
        if (!habit.repetition.type) return Alert.alert('Input Error', 'Please select a repetition type.');
        if (!habit.timeModuleId) return Alert.alert('Input Error', 'Please select a Time Module.');
        if (!/^#([0-9A-F]{3}){1,2}$/i.test(habit.color)) return Alert.alert('Input Error', 'Invalid hex color (e.g., #BB86FC).');

        // Validate that at least one day is selected for weekly binary habits
        if (habit.repetition.type === 'weekly' && habit.measurement.type === 'binary' && (!habit.repetition.config.daysOfWeek || habit.repetition.config.daysOfWeek.length === 0)) {
            return Alert.alert('Input Error', 'Please select at least one day of the week.');
        }

        let config: RepetitionConfig = {
            daysOfWeek: habit.repetition.config.daysOfWeek ?? [],
            // ndaysPerWeek: habit.repetition.config.ndaysPerWeek ?? undefined,
        };

        // Adjust config for measurement type
        if (habit.measurement.type === 'binary') {
          habit.measurement.targetValue = undefined;
        } else {
            config.daysOfWeek = [];
        }

        const habitData = {
            ...habit,
            goalId: selectedGoalId,
        };

        if (!habitId) {
            dispatch({ type: 'ADD_HABIT', payload: habitData as Omit<AddHabitPayload, 'id' | 'createdAt'> });
        } else {
            dispatch({ type: 'UPDATE_HABIT', payload: habitData as Omit<AddHabitPayload, 'id' | 'createdAt'> });
        }

        if (router.canGoBack()) router.back();
    };

    const handleClearEndDate = () => {
        setHabit(prev => ({ ...prev, endDate: null }));
    };

    const toggleAdvancedOptions = () => {
        setShowAdvancedOptions(prev => !prev);
    };

    return (
      
      // <SafeAreaProvider>
        // {/* <StatusBar barStyle="light-content" backgroundColor={Colors.background} /> */}
        // <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContentContainer} // Added paddingBottom
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true} // Helps with dropdown inside scrollview
        >
          <Stack.Screen 
            options={{ 
              title: (!habitId)? "Add New Habit": "Edit habit",
              headerShadowVisible: false,
              contentStyle: { backgroundColor: Colors.background }
            }} 
          />

          <Text style={styles.label}>Habit Title</Text>
          <TextInput
            style={styles.input}
            value={habit.title}
            onChangeText={text => setHabit(prev => ({ ...prev, title: text }))}
            placeholder="e.g., صلاة الوتر, قراءة جزء..."
            placeholderTextColor={Colors.textSecondary}
          />

          <Text style={styles.label}>Color</Text>
          <View style={styles.colorPickerContainer}>
            {fixedColors.map((fixedColor) => (
              <TouchableOpacity
                key={fixedColor}
                style={[
                  styles.colorOption,
                  { backgroundColor: fixedColor },
                  habit.color === fixedColor && styles.colorOptionSelected,
                ]}
                onPress={() => setHabit(prev => ({ ...prev, color: fixedColor }))}
              />
            ))}
          </View>
          {/* Time Module Dropdown */}
          <Text style={styles.label}>Assign To Time Module</Text>
          <DropDownPicker
            open={timeModuleOpen}
            value={habit.timeModuleId}
            items={timeModuleItems}
            setOpen={setTimeModuleOpen}
            setValue={val => setHabit(prev => ({ ...prev, timeModuleId: val('')||'' }))}
            onOpen={onTimeModuleOpen}
            placeholder="Select time module..."
            disabled={timeModuleItems.length === 0}
            style={styles.dropdownStyle}
            placeholderStyle={styles.dropdownPlaceholderStyle}
            dropDownContainerStyle={styles.dropdownContainerStyle}
            textStyle={styles.dropdownTextStyle}
            labelStyle={styles.dropdownLabelStyle}
            listItemLabelStyle={styles.dropdownListItemLabelStyle}
            // arrowIconStyle={styles.dropdownArrowStyle}
            // tickIconStyle={styles.dropdownTickStyle}
            theme="DARK"
            mode="SIMPLE"
            listMode="SCROLLVIEW"
            zIndex={4000} // Ensure dropdown is above other elements
            zIndexInverse={1000}
          />
          {timeModuleItems.length === 0 && (
            <Text style={styles.infoTextError}>No Time Modules defined...</Text>
          )}

          {/* Goal Dropdown */}
          <Text style={styles.label}>Link to Goal (Optional)</Text>
          <DropDownPicker
            open={goalOpen}
            value={selectedGoalId}
            items={goalItems}
            setOpen={setGoalOpen}
            setValue={setSelectedGoalId}
            onOpen={onGoalOpen}
            placeholder="Select goal or none..."
            style={styles.dropdownStyle}
            placeholderStyle={styles.dropdownPlaceholderStyle}
            dropDownContainerStyle={styles.dropdownContainerStyle}
            textStyle={styles.dropdownTextStyle}
            labelStyle={styles.dropdownLabelStyle}
            listItemLabelStyle={styles.dropdownListItemLabelStyle}
            theme="DARK"
            mode="SIMPLE"
            listMode="SCROLLVIEW"
            zIndex={3500} // Between time module and repetition
            zIndexInverse={1500}
          />
          {goalItems.length <= 1 && (
            <Text style={styles.infoTextError}>No eligible goals available. Only goals without subgoals can have habits.</Text>
          )}

          {/* Render Pickers first for potential zIndex layering */}
          {/* Repetition Dropdown */}
          <Text style={styles.label}>Repeats</Text>
          <DropDownPicker
            open={repetitionOpen}
            value={habit.repetition.type}
            items={repetitionOptions}
            setOpen={setRepetitionOpen}
            setValue={val => setHabit(prev => ({
                ...prev,
                repetition: { ...prev.repetition, type: val(prev) }
            }))}
            onOpen={onRepetitionOpen}
            placeholder="Select repetition..."
            style={styles.dropdownStyle}
            placeholderStyle={styles.dropdownPlaceholderStyle}
            dropDownContainerStyle={styles.dropdownContainerStyle}
            textStyle={styles.dropdownTextStyle}
            labelStyle={styles.dropdownLabelStyle}
            listItemLabelStyle={styles.dropdownListItemLabelStyle}
            // arrowIconStyle={styles.dropdownArrowStyle}
            // tickIconStyle={styles.dropdownTickStyle}
            theme="DARK"
            mode="SIMPLE"
            // *** Use SCROLLVIEW for inline attempt ***
            listMode="SCROLLVIEW"
            zIndex={3000} // Ensure dropdown is above other elements
            zIndexInverse={1000}
          />

          {/* Other Form Fields */}

          <Text style={styles.label}>Track By</Text>
          <View style={styles.segmentedControlContainer}>
            <TouchableOpacity
              style={[
                styles.segmentedControlOption,
                habit.measurement.type === "binary" &&
                  styles.segmentedControlOptionActive,
              ]}
              onPress={() => setHabit(prev => ({
                  ...prev,
                  measurement: { ...prev.measurement, type: "binary" }
              }))}
            >
              <Text
                style={[
                  styles.segmentedControlText,
                  habit.measurement.type === "binary" &&
                    styles.segmentedControlTextActive,
                ]}
              >
                Completion (✓/✕)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentedControlOption,
                habit.measurement.type === "count" &&
                  styles.segmentedControlOptionActive,
              ]}
              onPress={() => setHabit(prev => ({
                  ...prev,
                  measurement: { ...prev.measurement, type: "count" }
              }))}
            >
              <Text
                style={[
                  styles.segmentedControlText,
                  habit.measurement.type === "count" &&
                    styles.segmentedControlTextActive,
                ]}
              >
                Counter
              </Text>
            </TouchableOpacity>
          </View>

          {habit.repetition.type === "daily" && habit.measurement.type === "count" && (
            <>
              <Text style={styles.label}>Target Value</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={habit.measurement.targetValue?.toString() || ''}
                onChangeText={text => setHabit(prev => ({
                    ...prev,
                    measurement: {
                        ...prev.measurement,
                        targetValue: parseInt(text) || 0
                    }
                }))}
                placeholder="e.g., 3"
                placeholderTextColor={Colors.textSecondary}
              />
            </>
          )}
          {habit.repetition.type === "weekly" && (
            <>
              {habit.measurement.type === "count" && (
                <>
                  <Text style={styles.label}>Target value per week</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={habit.measurement.targetValue?.toString() || ''}
                    onChangeText={text => setHabit(prev => ({
                        ...prev,
                        measurement: {
                          ...prev.measurement,
                          targetValue: parseInt(text) || 0
                        }
                    }))}
                    placeholder="e.g., 3"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </>
              )}
              {habit.measurement.type === "binary" && (
                <>
                  <Text style={styles.label}>Days of the Week</Text>
                  <View style={styles.weekDaysContainer}>
                    {["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"].map(
                      (day, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.weekDayButton,
                            habit.repetition.config.daysOfWeek?.includes(index) &&
                              styles.weekDayButtonSelected,
                          ]}
                          onPress={() => toggleDaySelection(index)}
                        >
                          <Text style={styles.weekDayText}>{day}</Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </>
              )}
            </>
          )}

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={toggleAdvancedOptions}
          >
            <Text style={styles.advancedOptionsTitle}>Advanced Options</Text>
            <Ionicons
              name={showAdvancedOptions ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.textSecondary}
              style={styles.toggleButtonIcon}
            />
          </TouchableOpacity>

          {showAdvancedOptions && (
            <View style={styles.advancedOptionsContainer}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  {habit.startDate
                    ? format(new Date(habit.startDate), "MMM d, yyyy")
                    : "Select Start Date"}
                </Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={habit.startDate ? new Date(habit.startDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                      setShowStartDatePicker(false);
                      if (selectedDate)
                          setHabit(prev => ({
                              ...prev,
                              startDate: selectedDate.toISOString().split("T")[0]
                          }));
                  }}
                />
              )}

              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  {habit.endDate ? format(new Date(habit.endDate), "MMM d, yyyy") : "Forever"}
                </Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={habit.endDate ? new Date(habit.endDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                      setShowEndDatePicker(false);
                      if (selectedDate)
                          setHabit(prev => ({
                              ...prev,
                              endDate: selectedDate.toISOString().split("T")[0]
                          }));
                  }}
                />
              )}
              {habit.endDate && (
                <TouchableOpacity
                  onPress={handleClearEndDate}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearButtonText}>
                    Clear End Date (Set to Forever)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <TouchableOpacity style={styles.addHabitButton} onPress={handleSave}>
            <Text style={styles.addHabitButtonText}>{(!habitId)? "Add Habit": "Save"}</Text>
          </TouchableOpacity>
        </ScrollView>
      // {/* </SafeAreaView>
      // </SafeAreaProvider> */}
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    container: { flex: 1, backgroundColor: Colors.background },
    scrollContentContainer: { // Style the content container
        padding: 20,
        paddingBottom: 250, // Increased padding significantly for dropdown space
    },
    label: { fontSize: 16, fontWeight: 'bold', marginTop: 18, marginBottom: 6, color: Colors.textSecondary },
    input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.grey, borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 16, marginBottom: 10, color: Colors.text },
    colorInputContainer: { flexDirection: 'row', alignItems: 'center' },
    colorPreview: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: Colors.grey, marginRight: 10 },
    colorInput: { flex: 1, marginBottom: 10 },
    switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 5, marginBottom: 10, backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.grey },
    switchOption: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: Colors.surface,
    },
    switchOptionActive: {
        backgroundColor: Colors.surface, // Highlight active option
    },
    switchLabel: {
        fontSize: 15,
        color: Colors.textSecondary,
        fontWeight: 'bold',
    },
    switchLabelActive: {
        color: Colors.primary, // Light text for active option
        fontWeight: 'bold',
    },
    switch: {
        marginHorizontal: 10, // Add spacing around the switch
    },
    buttonContainer: { marginTop: 30, marginBottom: 15 },
    deleteButton: { marginTop: 0, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20 },
    deleteButtonText: { color: Colors.error, fontSize: 16, fontWeight: 'bold' },
    infoTextError: { fontSize: 13, fontStyle: 'italic', color: Colors.error, marginTop: -5, marginBottom: 10 },

    // --- Dropdown Styles ---
    dropdownStyle: {
        backgroundColor: Colors.surface, borderColor: Colors.grey,
        marginBottom: 10, // Spacing below closed picker
    },
    dropdownPlaceholderStyle: { color: Colors.textSecondary, },
    dropdownContainerStyle: { // Style for the container holding the dropdown list
        backgroundColor: Colors.surface, borderColor: Colors.grey,
        // No marginBottom needed here, spacing handled by dropdownStyle
    },
    dropdownTextStyle: { fontSize: 16, color: Colors.text, },
    dropdownLabelStyle: { color: Colors.text, }, // Selected item text
    dropdownListItemLabelStyle: { color: Colors.text, }, // List item text
    dropdownArrowStyle: { tintColor: Colors.textSecondary, },
    dropdownTickStyle: { tintColor: Colors.primary, },
    weekDaysContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    weekDayButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        marginHorizontal: 2,
        borderRadius: 5,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.grey,
    },
    weekDayButtonSelected: {
        borderColor: Colors.primary,
        borderWidth: 3
    },
    weekDayText: {
        color: Colors.text,
    },
    colorPickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start', // Align items to the start of the row
        marginBottom: 15,
        paddingHorizontal: 5, // Add padding for alignment
    },
    colorOption: {
        width: 40,
        height: 40,
        borderRadius: 20,
        margin: 5, // Add consistent spacing around each color
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorOptionSelected: {
        borderColor: Colors.primary,
    },
    datePickerButton: {
        backgroundColor: Colors.surface,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.grey, // Add a border to distinguish the button
    },
    datePickerText: {
        color: Colors.textSecondary, // Use secondary text color for a dimmer look
        fontSize: 16,
    },
    clearButton: {
        marginTop: 10,
        alignItems: 'center',
    },
    clearButtonText: {
        color: Colors.error,
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.grey,
        marginBottom: 10,
    },
    toggleButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    toggleButtonIcon: {
        marginLeft: 8,
    },
    advancedOptionsContainer: {
        backgroundColor: Colors.background, // Use a lighter gray background
        borderColor: Colors.text,
        borderStyle: 'dashed',
        borderWidth: 1,
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
    },
    advancedOptionsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary, // Use the primary color for the title
    },
    timeModuleOption: {
        padding: 10,
        borderWidth: 1,
        borderColor: Colors.grey,
        borderRadius: 8,
        marginRight: 10,
        marginBottom: 10,
        backgroundColor: Colors.surface, // Dark background for time module option
    },
    timeModuleOptionSelected: {
        backgroundColor: Colors.primary, // Highlight selected option with primary color
        borderColor: Colors.primary,
    },
    timeModuleText: {
        color: Colors.text, // Light color for text to match dark background
    },
    addHabitButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: Colors.surface,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5, // For Android shadow
    },
    addHabitButtonText: {
        color: Colors.surface,
        fontSize: 16,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    segmentedControlContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.grey,
        marginBottom: 15,
    },
    segmentedControlOption: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    segmentedControlOptionActive: {
        backgroundColor: Colors.accent,
    },
    segmentedControlText: {
        fontSize: 15,
        color: Colors.textSecondary,
        fontWeight: 'bold',
    },
    segmentedControlTextActive: {
        color: Colors.surface,
    },
});