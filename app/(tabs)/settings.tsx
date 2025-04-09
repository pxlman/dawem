// app/(tabs)/settings.tsx
import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, TextInput, FlatList, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppState, useAppDispatch } from '../../context/AppStateContext';
import Colors from '../../constants/Colors';
import { TimeModule } from '../../types'; // Only need TimeModule

export default function SettingsScreen() {
    const { timeModules } = useAppState();
    const dispatch = useAppDispatch();
    const [newTimeModuleName, setNewTimeModuleName] = useState<string>('');

    // Simplified Handlers
     const handleAddTimeModule = () => {
        const trimmedName = newTimeModuleName.trim();
        if (!trimmedName) return Alert.alert("Error", "Time Module name cannot be empty.");
        if (timeModules.some(tm => tm.name.toLowerCase() === trimmedName.toLowerCase())) {
            return Alert.alert("Error", `A Time Module named "${trimmedName}" already exists.`);
        }
        dispatch({ type: 'ADD_TIME_MODULE', payload: { name: trimmedName } });
        setNewTimeModuleName('');
    };
    const handleDeleteTimeModule = (id: string, name: string) => {
        if (timeModules.length <= 1) { return Alert.alert("Error", "Cannot delete the last Time Module."); }
        Alert.alert("Confirm Delete", `Delete Time Module "${name}"?\n\nHabits using it will be reassigned.`,
            [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => dispatch({ type: 'DELETE_TIME_MODULE', payload: { id } }) }], { cancelable: true }
        );
    };

    // Render Item
    const renderTimeModuleItem = ({ item }: { item: TimeModule }) => {
        const isLastModule = timeModules.length <= 1;
        return (
            <View style={styles.listItem}>
                <Ionicons name="time-outline" size={20} color={Colors.textSecondary} style={styles.itemIcon} />
                <Text style={styles.itemName}>{item.name}</Text>
                {!isLastModule && (
                    <TouchableOpacity onPress={() => handleDeleteTimeModule(item.id, item.name)} hitSlop={15}>
                         <Ionicons name="trash-outline" size={22} color={Colors.error} />
                    </TouchableOpacity>
                )}
            </View>
        );
    };
    console.log("Settings rendering...");
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
                <Text style={styles.header}>Time Modules</Text>
                 <FlatList data={timeModules} renderItem={renderTimeModuleItem} keyExtractor={item => item.id} scrollEnabled={false}/>
                <View style={styles.addSection}>
                     <Text style={styles.label}>Add New Time Module</Text>
                    <TextInput style={styles.input} placeholder="New Time Module Name (e.g., Morning)" value={newTimeModuleName} onChangeText={setNewTimeModuleName} />
                    <Button title="Add Time Module" onPress={handleAddTimeModule} disabled={!newTimeModuleName.trim()} color={Colors.primary}/>
                </View>
            </View>
             <View style={[styles.section, {marginTop: 20}]}>
                <Text style={styles.header}>Data Management</Text>
               <Button title="Reset All App Data" color={Colors.error} onPress={() => { Alert.alert("Confirm Reset", "Delete ALL habits and logs?", [{ text: "Cancel", style: 'cancel'}, { text: "Reset Data", style: 'destructive', onPress: () => dispatch({ type: 'RESET_STATE'})}], { cancelable: true }) }} />
               <Text style={styles.infoText}>This will permanently delete all your tracked habit data.</Text>
            </View>
        </ScrollView>
    );
}

// Styles
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background }, scrollContentContainer: { padding: 15, paddingBottom: 40 }, section: { marginBottom: 20, backgroundColor: Colors.surface, borderRadius: 8, padding: 15, elevation: 1, borderWidth: 1, borderColor: Colors.lightGrey }, header: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: Colors.primary, borderBottomWidth: 1, borderBottomColor: Colors.lightGrey, paddingBottom: 8 }, listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.lightGrey }, itemIcon: { marginRight: 12 }, itemName: { fontSize: 16, flex: 1, color: Colors.text }, addSection: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: Colors.lightGrey }, input: { borderWidth: 1, borderColor: Colors.grey, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginBottom: 12, backgroundColor: '#fff' }, label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: Colors.textSecondary }, infoText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 10, },
 });