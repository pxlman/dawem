// app/add-edit-habit.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
// --- Removed RNPickerSelect ---
// import RNPickerSelect from 'react-native-picker-select';
// --- Added DropDownPicker ---
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAppState, useAppDispatch } from '../context/AppStateContext'; // Adjust path if needed
import Colors, { fixedColors } from '../constants/Colors'; // Adjust path if needed
import { Habit, HabitMeasurementType, HabitRepetitionType, TimeModule, RepetitionConfig } from '../types'; // Adjust path if needed
import DateTimePicker from '@react-native-community/datetimepicker'; // Import DateTimePicker
import { format } from 'date-fns'; // Ensure format is imported

const repetitionOptions = [ { label: 'Daily', value: 'daily' }, { label: 'Weekly', value: 'weekly' }, { label: 'Monthly', value: 'monthly' }, ];

export default function AddEditHabitModalScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ habitId?: string; currentDate?: string }>(); // Include currentDate in params
    const { habitId, currentDate } = params; // Destructure currentDate
    const { habits, timeModules } = useAppState();
    const dispatch = useAppDispatch();
    const [isEditMode, setIsEditMode] = useState(!!habitId);
    const habitToEdit = useMemo(() => isEditMode ? habits.find(h => h.id === habitId) : undefined, [habits, habitId, isEditMode]);

    // Ensure currentDate is a valid Date object or fallback to today
    const selectedDate = useMemo(() => {
        try {
            return currentDate ? new Date(currentDate) : new Date();
        } catch {
            return new Date(); // Fallback to today if invalid
        }
    }, [currentDate]);

    // Form State - Allow null for values set by DropDownPicker
    const [title, setTitle] = useState<string>('');
    const [color, setColor] = useState<string>(Colors.primary);
    const [repetitionType, setRepetitionType] = useState<HabitRepetitionType | null>('daily');
    const [measurementType, setMeasurementType] = useState<HabitMeasurementType>('binary');
    const [measurementUnit, setMeasurementUnit] = useState<string>('');
    const [selectedTimeModuleId, setSelectedTimeModuleId] = useState<string | null>(null);
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [daysPerWeek, setDaysPerWeek] = useState<number | null>(null);
    const [startDate, setStartDate] = useState<string | null>(format(selectedDate, 'yyyy-MM-dd')); // Default to selected date
    const [endDate, setEndDate] = useState<string | null>(null);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false); // State to toggle advanced options

    // Dropdown Open State
    const [repetitionOpen, setRepetitionOpen] = useState(false);
    const [timeModuleOpen, setTimeModuleOpen] = useState(false);

    // Picker Items
    const timeModuleItems = useMemo(() => timeModules.map(tm => ({ label: tm.name, value: tm.id })), [timeModules]);

    // Effect to populate form
    useEffect(() => {
        if (isEditMode && habitToEdit) {
            setTitle(habitToEdit.title); setColor(habitToEdit.color || Colors.primary);
            setMeasurementType(habitToEdit.measurement?.type || 'binary'); setMeasurementUnit(habitToEdit.measurement?.unit || '');
            setRepetitionType(habitToEdit.repetition?.type || 'daily');
            setSelectedTimeModuleId(habitToEdit.timeModuleId || null); // Allow null
            setStartDate(habitToEdit.startDate || format(selectedDate, 'yyyy-MM-dd')); // Use habit's startDate or default to selected date
            setEndDate(habitToEdit.endDate || null);
        } else {
            setTitle(''); setColor(Colors.primary); setRepetitionType('daily');
            setMeasurementType('binary'); setMeasurementUnit('');
            setSelectedTimeModuleId(timeModules[0]?.id || null); // Default or null
            setStartDate(format(selectedDate, 'yyyy-MM-dd')); // Default to selected date
            setEndDate(null);
        }
    }, [habitId, isEditMode, timeModules, habitToEdit, selectedDate]); // Added timeModules dependency

    // Callbacks to close other dropdowns
    const onRepetitionOpen = useCallback(() => setTimeModuleOpen(false), []);
    const onTimeModuleOpen = useCallback(() => setRepetitionOpen(false), []);

    const toggleDaySelection = (index: number) => {
        setSelectedDays(prevSelectedDays =>
            prevSelectedDays.includes(index)
                ? prevSelectedDays.filter(day => day !== index)
                : [...prevSelectedDays, index]
        );
    };

    // Handlers
    const handleSave = () => {
        // Add null checks
        if (!title.trim()) return Alert.alert('Input Error', 'Habit title is required.');
        if (!repetitionType) return Alert.alert('Input Error', 'Please select a repetition type.');
        if (!selectedTimeModuleId) return Alert.alert('Input Error', 'Please select a Time Module.');
        if (!/^#([0-9A-F]{3}){1,2}$/i.test(color)) return Alert.alert('Input Error', 'Invalid hex color (e.g., #BB86FC).');

        const config: RepetitionConfig = {};
        // Assert non-null for dispatch payload after validation
        const habitData = { title: title.trim(), color, repetition: { type: repetitionType!, config }, measurement: { type: measurementType, unit: measurementType === 'count' ? measurementUnit.trim() : undefined }, timeModuleId: selectedTimeModuleId!, startDate, endDate };

        if (isEditMode && habitId) dispatch({ type: 'UPDATE_HABIT', payload: { id: habitId, ...habitData } });
        else dispatch({ type: 'ADD_HABIT', payload: habitData as Omit<Habit, 'id' | 'createdAt'> });

        if (router.canGoBack()) router.back();
    };
     const handleDelete = () => { /* ... Keep delete logic ... */ };

    const handleClearEndDate = () => {
        setEndDate(null); // Set endDate to null to represent "forever"
    };

    const toggleAdvancedOptions = () => {
        setShowAdvancedOptions(prev => !prev);
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContentContainer} // Added paddingBottom
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true} // Helps with dropdown inside scrollview
        >
             <Stack.Screen options={{ title: isEditMode ? `Edit Habit` : 'Add New Habit' }} />

             <Text style={styles.label}>Habit Title</Text>
             <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g., Drink Water, Read..." placeholderTextColor={Colors.text} />

             <Text style={styles.label}>Color</Text>
             <View style={styles.colorPickerContainer}>
                {fixedColors.map((fixedColor) => (
                    <TouchableOpacity
                        key={fixedColor}
                        style={[
                            styles.colorOption,
                            { backgroundColor: fixedColor },
                            color === fixedColor && styles.colorOptionSelected,
                        ]}
                        onPress={() => setColor(fixedColor)}
                    />
                ))}
            </View>

             {/* Render Pickers first for potential zIndex layering */}
             {/* Repetition Dropdown */}
             <Text style={styles.label}>Repeats</Text>
             <DropDownPicker
                open={repetitionOpen} value={repetitionType} items={repetitionOptions}
                setOpen={setRepetitionOpen} setValue={setRepetitionType}
                onOpen={onRepetitionOpen}
                placeholder="Select repetition..."
                style={styles.dropdownStyle} placeholderStyle={styles.dropdownPlaceholderStyle}
                dropDownContainerStyle={styles.dropdownContainerStyle} textStyle={styles.dropdownTextStyle}
                labelStyle={styles.dropdownLabelStyle} listItemLabelStyle={styles.dropdownListItemLabelStyle}
                arrowIconStyle={styles.dropdownArrowStyle} tickIconStyle={styles.dropdownTickStyle}
                theme="DARK" mode="SIMPLE"
                // *** Use SCROLLVIEW for inline attempt ***
                listMode="SCROLLVIEW"
                zIndex={3000} // Ensure dropdown is above other elements
                zIndexInverse={1000}
             />

             {/* Time Module Dropdown */}
             <Text style={styles.label}>Assign To Time Module</Text>
              <DropDownPicker
                open={timeModuleOpen} value={selectedTimeModuleId} items={timeModuleItems}
                setOpen={setTimeModuleOpen} setValue={setSelectedTimeModuleId}
                onOpen={onTimeModuleOpen}
                placeholder="Select time module..." disabled={timeModuleItems.length === 0}
                style={styles.dropdownStyle} placeholderStyle={styles.dropdownPlaceholderStyle}
                dropDownContainerStyle={styles.dropdownContainerStyle} textStyle={styles.dropdownTextStyle}
                labelStyle={styles.dropdownLabelStyle} listItemLabelStyle={styles.dropdownListItemLabelStyle}
                arrowIconStyle={styles.dropdownArrowStyle} tickIconStyle={styles.dropdownTickStyle}
                theme="DARK" mode="SIMPLE"
                // *** Use SCROLLVIEW for inline attempt ***
                listMode="SCROLLVIEW"
                zIndex={2000} // Ensure dropdown is above other elements
                zIndexInverse={1000}
              />
               {timeModuleItems.length === 0 && <Text style={styles.infoTextError}>No Time Modules defined...</Text>}

             {/* Other Form Fields */}

             <Text style={styles.label}>Track By</Text>
             <View style={styles.switchContainer}>
                 <TouchableOpacity
                    onPress={() => setMeasurementType('binary')} // Set to 'binary' when "Completions" is pressed
                    style={[
                        styles.switchOption,
                        measurementType === 'binary' && styles.switchOptionActive,
                    ]}
                >
                    <Text
                        style={[
                            styles.switchLabel,
                            measurementType === 'binary' && styles.switchLabelActive,
                        ]}
                    >
                        Completion (✓/✕)
                    </Text>
                </TouchableOpacity>
                <Switch
                    value={measurementType === 'count'}
                    onValueChange={(isOn) => setMeasurementType(isOn ? 'count' : 'binary')}
                    trackColor={{
                        false: Colors.grey, // Dark grey for the inactive track
                        true: Colors.primary, // Primary color for the active track
                    }}
                    thumbColor={measurementType === 'count' ? Colors.surface : Colors.surface} // White thumb for both states
                    style={styles.switch}
                />
                <TouchableOpacity
                    onPress={() => setMeasurementType('count')} // Set to 'count' when "Counter" is pressed
                    style={[
                        styles.switchOption,
                        measurementType === 'count' && styles.switchOptionActive,
                    ]}
                >
                    <Text
                        style={[
                            styles.switchLabel,
                            measurementType === 'count' && styles.switchLabelActive,
                        ]}
                    >
                        Counter
                    </Text>
                </TouchableOpacity>
             </View>
             {measurementType === 'count' && (
                <>
                    <Text style={styles.label}>Target Value</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="number-pad"
                        value={measurementUnit}
                        onChangeText={setMeasurementUnit}
                        placeholder="e.g., 10"
                        placeholderTextColor={Colors.textSecondary}
                    />
                </>
            )}
            {repetitionType === 'weekly' && (
                <>
                    <Text style={styles.label}>Days of the Week</Text>
                    {/* Add a multi-select dropdown or checkboxes for days of the week */}
                    {/* Example: */}
                    <View style={styles.weekDaysContainer}>
                        {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.weekDayButton,
                                    selectedDays.includes(index) && styles.weekDayButtonSelected,
                                ]}
                                onPress={() => toggleDaySelection(index)}
                            >
                                <Text style={styles.weekDayText}>{day}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.label}>Number of Days Per Week</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="number-pad"
                        value={daysPerWeek?.toString() || ''}
                        onChangeText={(value) => setDaysPerWeek(parseInt(value, 10))}
                        placeholder="e.g., 3"
                        placeholderTextColor={Colors.textSecondary}
                    />
                </>
            )}

            <TouchableOpacity
                style={styles.toggleButton}
                onPress={toggleAdvancedOptions}
            >
                <Text style={styles.advancedOptionsTitle}>
                    Advanced Options
                </Text>
                <Ionicons
                    name={showAdvancedOptions ? 'chevron-up' : 'chevron-down'}
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
                            {startDate ? format(new Date(startDate), 'MMM d, yyyy') : 'Select Start Date'}
                        </Text>
                    </TouchableOpacity>
                    {showStartDatePicker && (
                        <DateTimePicker
                            value={startDate ? new Date(startDate) : new Date()}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowStartDatePicker(false);
                                if (selectedDate) setStartDate(selectedDate.toISOString().split('T')[0]);
                            }}
                        />
                    )}

                    <Text style={styles.label}>End Date</Text>
                    <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowEndDatePicker(true)}
                    >
                        <Text style={styles.datePickerText}>
                            {endDate ? format(new Date(endDate), 'MMM d, yyyy') : 'Forever'}
                        </Text>
                    </TouchableOpacity>
                    {showEndDatePicker && (
                        <DateTimePicker
                            value={endDate ? new Date(endDate) : new Date()}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowEndDatePicker(false);
                                if (selectedDate) setEndDate(selectedDate.toISOString().split('T')[0]);
                            }}
                        />
                    )}
                    {endDate && (
                        <TouchableOpacity onPress={handleClearEndDate} style={styles.clearButton}>
                            <Text style={styles.clearButtonText}>Clear End Date (Set to Forever)</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

             {/* Action Buttons */}
             <TouchableOpacity
                style={styles.addHabitButton}
                onPress={handleSave}
            >
                <Text style={styles.addHabitButtonText}>
                    {isEditMode ? "Save Changes" : "Add Habit"}
                </Text>
            </TouchableOpacity>
             {isEditMode && ( <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}><Text style={styles.deleteButtonText}>Delete Habit</Text></TouchableOpacity> )}
             {/* No extra space needed, handled by scrollContentContainer padding */}
        </ScrollView>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
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
        backgroundColor: Colors.primary,
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
        backgroundColor: Colors.lightGrey, // Use a lighter gray background
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
        borderRadius: 25,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#000',
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
});