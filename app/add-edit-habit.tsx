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
import Colors from '../constants/Colors'; // Adjust path if needed
import { Habit, HabitMeasurementType, HabitRepetitionType, TimeModule, RepetitionConfig } from '../types'; // Adjust path if needed

const repetitionOptions = [ { label: 'Daily', value: 'daily' }, { label: 'Weekly', value: 'weekly' }, { label: 'Monthly', value: 'monthly' }, ];

export default function AddEditHabitModalScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ habitId?: string }>();
    const { habitId } = params;
    const { habits, timeModules } = useAppState();
    const dispatch = useAppDispatch();
    const [isEditMode, setIsEditMode] = useState(!!habitId);
    const habitToEdit = useMemo(() => isEditMode ? habits.find(h => h.id === habitId) : undefined, [habits, habitId, isEditMode]);

    // Form State - Allow null for values set by DropDownPicker
    const [title, setTitle] = useState<string>('');
    const [color, setColor] = useState<string>(Colors.primary);
    const [repetitionType, setRepetitionType] = useState<HabitRepetitionType | null>('daily');
    const [measurementType, setMeasurementType] = useState<HabitMeasurementType>('binary');
    const [measurementUnit, setMeasurementUnit] = useState<string>('');
    const [selectedTimeModuleId, setSelectedTimeModuleId] = useState<string | null>(null);

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
        } else {
            setTitle(''); setColor(Colors.primary); setRepetitionType('daily');
            setMeasurementType('binary'); setMeasurementUnit('');
            setSelectedTimeModuleId(timeModules[0]?.id || null); // Default or null
        }
    }, [habitId, isEditMode, timeModules, habitToEdit]); // Added timeModules dependency

    // Callbacks to close other dropdowns
    const onRepetitionOpen = useCallback(() => setTimeModuleOpen(false), []);
    const onTimeModuleOpen = useCallback(() => setRepetitionOpen(false), []);


    // Handlers
    const handleSave = () => {
        // Add null checks
        if (!title.trim()) return Alert.alert('Input Error', 'Habit title is required.');
        if (!repetitionType) return Alert.alert('Input Error', 'Please select a repetition type.');
        if (!selectedTimeModuleId) return Alert.alert('Input Error', 'Please select a Time Module.');
        if (!/^#([0-9A-F]{3}){1,2}$/i.test(color)) return Alert.alert('Input Error', 'Invalid hex color (e.g., #BB86FC).');

        const config: RepetitionConfig = {};
        // Assert non-null for dispatch payload after validation
        const habitData = { title: title.trim(), color, repetition: { type: repetitionType!, config }, measurement: { type: measurementType, unit: measurementType === 'count' ? measurementUnit.trim() : undefined }, timeModuleId: selectedTimeModuleId! };

        if (isEditMode && habitId) dispatch({ type: 'UPDATE_HABIT', payload: { id: habitId, ...habitData } });
        else dispatch({ type: 'ADD_HABIT', payload: habitData as Omit<Habit, 'id' | 'createdAt'> });

        if (router.canGoBack()) router.back();
    };
     const handleDelete = () => { /* ... Keep delete logic ... */ };

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
             <View style={styles.colorInputContainer}>
                 <View style={[styles.colorPreview, { backgroundColor: /^#([0-9A-F]{3}){1,2}$/i.test(color) ? color : Colors.grey }]} />
                 <TextInput style={[styles.input, styles.colorInput]} value={color} onChangeText={setColor} placeholder={Colors.primary} autoCapitalize="none" maxLength={7} placeholderTextColor={Colors.textSecondary}/>
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
                zIndex={3000} // Higher zIndex for the first picker
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
                zIndex={2000} // Lower zIndex than the one above
                zIndexInverse={2000}
              />
               {timeModuleItems.length === 0 && <Text style={styles.infoTextError}>No Time Modules defined...</Text>}

             {/* Other Form Fields */}

             <Text style={styles.label}>Track By</Text>
             <View style={styles.switchContainer}>
                 <Text style={[styles.switchLabel, measurementType === 'binary' && styles.switchLabelActive]}>Completion (✓/✕)</Text>
                 <Switch value={measurementType === 'count'} onValueChange={(isOn) => setMeasurementType(isOn ? 'count' : 'binary')} trackColor={{ false: Colors.lightGrey, true: Colors.accent }} thumbColor={measurementType === 'count' ? Colors.primary : Colors.grey} />
                 <Text style={[styles.switchLabel, measurementType === 'count' && styles.switchLabelActive]}>Quantity</Text>
             </View>
             {measurementType === 'count' && ( <><Text style={styles.label}>Unit (Optional)</Text><TextInput style={styles.input} value={measurementUnit} onChangeText={setMeasurementUnit} placeholder="e.g., glasses, pages" placeholderTextColor={Colors.textSecondary} /></> )}


             {/* Action Buttons */}
             <View style={styles.buttonContainer}><Button title={isEditMode ? "Save Changes" : "Add Habit"} onPress={handleSave} color={Colors.primary} /></View>
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
    switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 5, marginBottom: 10, backgroundColor: Colors.surface, borderRadius: 5 },
    switchLabel: { fontSize: 15, color: Colors.textSecondary, flex: 1, textAlign: 'center' },
    switchLabelActive: { color: Colors.primary, fontWeight: 'bold' },
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
});

// --- Removed pickerSelectStyles ---