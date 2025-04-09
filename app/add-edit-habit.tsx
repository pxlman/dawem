// app/add-edit-habit.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import RNPickerSelect from 'react-native-picker-select'; // Correct import
import { Ionicons } from '@expo/vector-icons';

import { useAppState, useAppDispatch } from '../context/AppStateContext';
import Colors from '../constants/Colors';
import { Habit, HabitMeasurementType, HabitRepetitionType, TimeModule, RepetitionConfig } from '../types';

const repetitionOptions = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
];

export default function AddEditHabitModalScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ habitId?: string }>();
    const { habitId } = params;

    const { habits, timeModules } = useAppState();
    const dispatch = useAppDispatch();

    const [isEditMode, setIsEditMode] = useState(!!habitId);
    const habitToEdit = useMemo(() => isEditMode ? habits.find(h => h.id === habitId) : undefined, [habits, habitId, isEditMode]);

    // Form State
    const [title, setTitle] = useState<string>('');
    const [color, setColor] = useState<string>(Colors.primary);
    const [repetitionType, setRepetitionType] = useState<HabitRepetitionType>('daily');
    const [measurementType, setMeasurementType] = useState<HabitMeasurementType>('binary');
    const [measurementUnit, setMeasurementUnit] = useState<string>('');
    const [selectedTimeModuleId, setSelectedTimeModuleId] = useState<string>('');

    // Picker Data
    const timeModuleOptions = useMemo(() => timeModules.map(tm => ({ label: tm.name, value: tm.id })), [timeModules]);

    // Effects
    useEffect(() => {
        if (isEditMode && habitToEdit) {
            setTitle(habitToEdit.title);
            setColor(habitToEdit.color || Colors.primary);
            setMeasurementType(habitToEdit.measurement?.type || 'binary');
            setMeasurementUnit(habitToEdit.measurement?.unit || '');
            setRepetitionType(habitToEdit.repetition?.type || 'daily');
            setSelectedTimeModuleId(habitToEdit.timeModuleId || '');
        } else {
            setTitle(''); setColor(Colors.primary); setRepetitionType('daily');
            setMeasurementType('binary'); setMeasurementUnit('');
            setSelectedTimeModuleId(timeModules[0]?.id || ''); // Default to first module
        }
    }, [habitId, isEditMode, timeModules, habitToEdit]); // Added timeModules

    // Handlers
    const handleSave = () => {
        if (!title.trim()) return Alert.alert('Error', 'Habit title needed.');
        if (!selectedTimeModuleId) return Alert.alert('Error', 'Please select a Time Module.');
        if (!/^#([0-9A-F]{3}){1,2}$/i.test(color)) return Alert.alert('Error', 'Invalid hex color.');

        const config: RepetitionConfig = {};
        const habitData = {
            title: title.trim(), color,
            repetition: { type: repetitionType, config },
            measurement: { type: measurementType, unit: measurementType === 'count' ? measurementUnit.trim() : undefined },
            timeModuleId: selectedTimeModuleId,
        };

        if (isEditMode && habitId) dispatch({ type: 'UPDATE_HABIT', payload: { id: habitId, ...habitData } });
        else dispatch({ type: 'ADD_HABIT', payload: habitData as Omit<Habit, 'id' | 'createdAt'> });

        if (router.canGoBack()) router.back();
    };
     const handleDelete = () => { /* ... (Keep as is) ... */ };

    return (
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
             <Stack.Screen options={{ title: isEditMode ? `Edit Habit` : 'Add New Habit' }} />
             {/* Form Fields */}
             <Text style={styles.label}>Habit Title</Text>
             <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g., Drink Water" />
             <Text style={styles.label}>Color</Text>
             <View style={styles.colorInputContainer}>
                 <View style={[styles.colorPreview, { backgroundColor: /^#([0-9A-F]{3}){1,2}$/i.test(color) ? color : Colors.lightGrey }]} />
                 <TextInput style={[styles.input, styles.colorInput]} value={color} onChangeText={setColor} placeholder="#6200ee" autoCapitalize="none" maxLength={7} />
             </View>
             <Text style={styles.label}>Track By</Text>
             <View style={styles.switchContainer}>
                 <Text style={measurementType === 'binary' ? styles.switchLabelActive : styles.switchLabel}>Completion (✓/✕)</Text>
                 <Switch value={measurementType === 'count'} onValueChange={(isOn) => setMeasurementType(isOn ? 'count' : 'binary')} trackColor={{ false: Colors.lightGrey, true: Colors.accent }} thumbColor={measurementType === 'count' ? Colors.primary : Colors.grey} />
                 <Text style={measurementType === 'count' ? styles.switchLabelActive : styles.switchLabel}>Quantity</Text>
             </View>
             {measurementType === 'count' && ( <><Text style={styles.label}>Unit (Optional)</Text><TextInput style={styles.input} value={measurementUnit} onChangeText={setMeasurementUnit} placeholder="e.g., glasses, pages" /></> )}
             <Text style={styles.label}>Repeats</Text>
             <RNPickerSelect value={repetitionType} onValueChange={(value) => value && setRepetitionType(value as HabitRepetitionType)} items={repetitionOptions} style={pickerSelectStyles} useNativeAndroidPickerStyle={false} placeholder={{ label: "Select repetition...", value: null }} Icon={() => <Ionicons name="chevron-down" size={20} color={Colors.grey} />} />
             <Text style={styles.label}>Assign To Time Module</Text>
              <RNPickerSelect value={selectedTimeModuleId} onValueChange={(value) => value && setSelectedTimeModuleId(value)} items={timeModuleOptions} style={pickerSelectStyles} useNativeAndroidPickerStyle={false} placeholder={{ label: "Select time module...", value: null }} Icon={() => <Ionicons name="chevron-down" size={20} color={Colors.grey} />} disabled={timeModuleOptions.length === 0} />
               {timeModuleOptions.length === 0 && <Text style={styles.infoTextError}>No Time Modules defined. Add one in Settings.</Text>}
             {/* Action Buttons */}
             <View style={styles.buttonContainer}><Button title={isEditMode ? "Save Changes" : "Add Habit"} onPress={handleSave} color={Colors.primary} /></View>
             {isEditMode && ( <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}><Text style={styles.deleteButtonText}>Delete Habit</Text></TouchableOpacity> )}
             <View style={{ height: 50 }} />
        </ScrollView>
    );
}

// Styles
const styles = StyleSheet.create({ container: { flex: 1, padding: 20, backgroundColor: Colors.background }, label: { fontSize: 16, fontWeight: 'bold', marginTop: 18, marginBottom: 6, color: Colors.textSecondary }, input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.grey, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginBottom: 10 }, colorInputContainer: { flexDirection: 'row', alignItems: 'center' }, colorPreview: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: Colors.grey, marginRight: 10 }, colorInput: { flex: 1, marginBottom: 10 }, switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 5, marginBottom: 10 }, switchLabel: { fontSize: 15, color: Colors.textSecondary, flex: 1, textAlign: 'center' }, switchLabelActive: { fontSize: 15, color: Colors.primary, fontWeight: 'bold', flex: 1, textAlign: 'center' }, buttonContainer: { marginTop: 30, marginBottom: 15 }, deleteButton: { marginTop: 0, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20 }, deleteButtonText: { color: Colors.error, fontSize: 16, fontWeight: 'bold' }, infoText: { fontSize: 13, fontStyle: 'italic', color: Colors.textSecondary, marginTop: 5 }, infoTextError: { fontSize: 13, fontStyle: 'italic', color: Colors.error, marginTop: 5 }, });
const pickerSelectStyles = StyleSheet.create({ inputIOS: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: Colors.grey, borderRadius: 8, color: Colors.text, paddingRight: 30, backgroundColor: Colors.surface, marginBottom: 10, }, inputAndroid: { fontSize: 16, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: Colors.grey, borderRadius: 8, color: Colors.text, paddingRight: 30, backgroundColor: Colors.surface, marginBottom: 10, }, placeholder: { color: Colors.textSecondary, }, iconContainer: { top: Platform.OS === 'android' ? 15 : 15, right: 12, }, });