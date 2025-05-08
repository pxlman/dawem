import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, TextInput, TouchableOpacity, Alert, FlatList, Modal, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { useAppState, useAppDispatch } from '../context/AppStateContext';
import Colors from '../constants/Colors';
import { TimeModule } from '@/types/index';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export default function SettingsScreen() {
    const { timeModules, settings, habits } = useAppState();
    const dispatch = useAppDispatch();
    const [newTimeModuleName, setNewTimeModuleName] = useState<string>('');
    const [newDayStartTime, setNewDayStartTime] = useState<Date | null>(null);
    const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
    
    // New state for rename modal
    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [moduleToRename, setModuleToRename] = useState<{id: string, name: string} | null>(null);
    const [newModuleName, setNewModuleName] = useState('');
    
    // Simplified state - no longer tracking isEditingStartTime since we only edit start time
    const [timeEditingModule, setTimeEditingModule] = useState<string | null>(null);
    const [selectedModuleTime, setSelectedModuleTime] = useState(new Date());

    useEffect(() => {
        if (settings.startTimeOfDay) {
            const [hours, minutes] = settings.startTimeOfDay.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(minutes)) {
                const savedStartTime = new Date();
                savedStartTime.setHours(hours, minutes, 0, 0);
                setNewDayStartTime(savedStartTime);
            } else {
                console.warn('Invalid startTimeOfDay format:', settings.startTimeOfDay);
                setNewDayStartTime(null); // Fallback to null if invalid
            }
        } else {
            const defaultStartTime = new Date();
            defaultStartTime.setHours(0, 0, 0, 0);
            setNewDayStartTime(defaultStartTime);
        }
    }, [settings.startTimeOfDay]);

    const handleAddTimeModule = () => {
        const trimmedName = newTimeModuleName.trim();
        if (!trimmedName) return Alert.alert("Error", "Time Module name cannot be empty.");
        if (timeModules.some((tm:TimeModule) => tm.name.toLowerCase() === trimmedName.toLowerCase())) {
            return Alert.alert("Error", `A Time Module named "${trimmedName}" already exists.`);
        }
        // Add without a default start time
        dispatch({ 
            type: 'ADD_TIME_MODULE', 
            payload: { 
                name: trimmedName,
                // No startTime property means it's not set
            } as Omit<TimeModule, 'id'>
        });
        setNewTimeModuleName('');
    };

    const handleDeleteTimeModule = (id: string, name: string) => {
        if (timeModules.length <= 1) { return Alert.alert("Error", "Cannot delete the last Time Module."); }
        Alert.alert(
          "Confirm Delete",
          `Delete Time Module "${name}"?\n\nHabits using it will be reassigned.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () =>
                dispatch({ type: "DELETE_TIME_MODULE", payload: { id } }),
            },
          ],
          { cancelable: true }
        );
    };

    const handleRenameTimeModule = (id: string, currentName: string) => {
        if (timeModules.length < 1) { 
            return Alert.alert("Error", "There is no Time Module to rename."); 
        }
        
        // For iOS, we can use Alert.prompt
        if (Platform.OS === 'ios') {
            Alert.prompt(
                "Update Time Module",
                `Enter a new name for "${currentName}":`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Rename",
                        style: 'default',
                        onPress: (newName) => {
                            processRename(id, currentName, newName);
                        },
                    },
                ],
                "plain-text",
                currentName
            );
        } else {
            // For Android, use our custom modal
            setModuleToRename({ id, name: currentName });
            setNewModuleName(currentName);
            setRenameModalVisible(true);
        }
    };
    
    // Function to process the rename action
    const processRename = (id: string, currentName: string, newName?: string) => {
        const trimmedName = newName?.trim() ?? currentName;
        if (!trimmedName) {
            return Alert.alert("Error", "Time Module name cannot be empty.");
        }
        if (timeModules.some((tm:TimeModule) => tm.id !== id && tm.name.toLowerCase() === trimmedName.toLowerCase())) {
            return Alert.alert("Error", `A Time Module named "${trimmedName}" already exists.`);
        }
        dispatch({ type: 'UPDATE_TIME_MODULE', payload: { id, name: trimmedName } });
    };

    const handleTimeChange = (event: any, selectedTime?: Date) => {
        setIsTimePickerVisible(false);
        if (selectedTime) {
            setNewDayStartTime(selectedTime);
            const formattedTime = selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            dispatch({ type: 'UPDATE_START_TIME', payload: { startTimeOfDay: formattedTime } });
        } else {
            console.warn('Invalid time selected:', selectedTime);
        }
    };

    const handleResetLogs = () => {
        Alert.alert(
            "Confirm Reset",
            "Delete ALL habit logs? This will not delete your habits.",
            [
                { text: "Cancel", style: 'cancel' },
                { 
                    text: "Reset Logs", 
                    style: 'destructive', 
                    onPress: () => dispatch({ type: 'RESET_LOGS' }) 
                }
            ],
            { cancelable: true }
        );
    };

    // Simplified to handle only start time
    const handleEditModuleTime = (moduleId: string) => {
        const module = timeModules.find((m:TimeModule) => m.id === moduleId);
        if (!module) return;
        
        const timeStr = module.startTime || '00:00';
        const [hours, minutes] = timeStr.split(':').map(Number);
        
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        
        setSelectedModuleTime(date);
        setTimeEditingModule(moduleId);
    };

    // Simplified time change handler - no start/end validation needed
    const handleModuleTimeChange = (event: any, selectedTime?: Date) => {
        setTimeEditingModule(null);
        
        if (selectedTime && timeEditingModule) {
            const formattedTime = selectedTime.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false 
            });
            
            dispatch({
                type: 'UPDATE_TIME_MODULE',
                payload: {
                    id: timeEditingModule,
                    startTime: formattedTime
                }
            });
        }
    };

    // Clear start time for a module
    const handleClearModuleTime = (moduleId: string) => {
        dispatch({
            type: 'UPDATE_TIME_MODULE',
            payload: {
                id: moduleId,
                startTime: undefined  // Clear the start time
            }
        });
    };

    // Handle exporting habits to a file
    const handleExportHabits = async () => {
        try {
            // Create a data object with habits and time modules
            const exportData = {
                habits,
                timeModules,
                exportDate: new Date().toISOString()
            };
            
            const jsonString = JSON.stringify(exportData, null, 2);
            
            // Create a filename with current date
            const date = new Date();
            // const filename = `habits_export_${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}.json`;
            
            // Share the file
            await Share.share({
                title: 'Export Habits',
                message: jsonString,
                // On iOS we could use a URL, on Android we use the data directly
                url: Platform.OS === 'ios' ? `data:text/json;base64,${Buffer.from(jsonString).toString('base64')}` : undefined
            });
        } catch (error) {
            console.error('Error exporting habits:', error);
            Alert.alert('Export Error', 'Could not export habits. Please try again.');
        }
    };

    // Handle importing habits from a file
    const handleImportHabits = async () => {
        try {
            // Show file picker
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true
            });
            
            if (result.canceled) {
                return;
            }

            // Read file content
            const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
            
            // Parse JSON
            let importedData;
            try {
                importedData = JSON.parse(fileContent);
            } catch (error) {
                throw new Error('Invalid file format. Please select a valid habits export file.');
            }
            
            // Validate imported data structure
            if (!importedData.habits || !Array.isArray(importedData.habits)) {
                throw new Error('Invalid file format. The file does not contain valid habit data.');
            }
            
            // Confirm import
            Alert.alert(
                'Confirm Import',
                `This will import ${importedData.habits.length} habits. Your existing habits will be kept. Continue?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                        text: 'Import',
                        onPress: () => {
                            // Dispatch import action
                            dispatch({ 
                                type: 'IMPORT_HABITS', 
                                payload: { 
                                    habits: importedData.habits,
                                    timeModules: importedData.timeModules || []
                                }
                            });
                            Alert.alert('Success', 'Habits imported successfully!');
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error importing habits:', error);
            Alert.alert('Import Error', error instanceof Error ? error.message : 'Could not import habits. Please try again.');
        }
    };

    // Updated render item to show optional start time with clear button
    const renderTimeModuleItem = ({ item, drag, isActive }: { item: TimeModule; drag: () => void; isActive: boolean }) => (
        <TouchableOpacity
            onLongPress={drag}
            style={[
                styles.listItem,
                isActive && styles.activeListItem,
            ]}
        >
            <Ionicons name="time-outline" size={20} color={Colors.textSecondary} style={styles.itemIcon} />
            <View style={styles.moduleInfoContainer}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.startTime ? (
                    <View style={styles.timeContainer}>
                        <TouchableOpacity 
                            style={styles.timeButton}
                            onPress={() => handleEditModuleTime(item.id)}
                        >
                            <Text style={styles.timeButtonText}>Starts at: {item.startTime}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => handleClearModuleTime(item.id)}
                            style={styles.clearTimeButton}
                            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                        >
                            <Ionicons name="close-circle" size={16} color={Colors.error} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity 
                        style={styles.addTimeButton}
                        onPress={() => handleEditModuleTime(item.id)}
                    >
                        <Text style={styles.addTimeText}>+ Add start time</Text>
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.actionButtons}>
                {timeModules.length > 1 && (
                    <>
                        <TouchableOpacity onPress={() => handleRenameTimeModule(item.id, item.name)} hitSlop={15}>
                            <Ionicons name="create-outline" size={22} color={Colors.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteTimeModule(item.id, item.name)} hitSlop={15}>
                            <Ionicons name="trash-outline" size={22} color={Colors.error} />
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <>
            <FlatList
                data={[{ key: 'timeModules' },{ key: 'startTime' }, { key: 'importExport' }, { key: 'dataManagement' }]}
                renderItem={({ item }) => {
                    if (item.key === 'startTime') {
                        return (
                            <View style={styles.section}>
                                <Text style={styles.header}>Start Time of New Day</Text>
                                <TouchableOpacity onPress={() => setIsTimePickerVisible(true)} style={styles.timePickerButton}>
                                    <Text style={styles.timePickerText}>
                                        {newDayStartTime
                                            ? newDayStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                                            : '00:00'}
                                    </Text>
                                </TouchableOpacity>
                                {isTimePickerVisible && newDayStartTime && (
                                    <DateTimePicker
                                        value={newDayStartTime}
                                        mode="time"
                                        display="default"
                                        onChange={handleTimeChange}
                                    />
                                )}
                            </View>
                        );
                    } else if (item.key === 'timeModules') {
                        return (
                            <View style={styles.section}>
                                <Text style={styles.header}>Time Modules</Text>
                                <DraggableFlatList
                                    data={timeModules}
                                    renderItem={renderTimeModuleItem}
                                    keyExtractor={(item) => item.id}
                                    onDragEnd={({ data }) => dispatch({ type: 'REORDER_TIME_MODULES', payload: data })}
                                    contentContainerStyle={styles.timeModulesList}
                                />
                                <View style={styles.addSection}>
                                    <Text style={styles.label}>Add New Time Module</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="New Time Module Name (e.g., Morning)"
                                        value={newTimeModuleName}
                                        onChangeText={setNewTimeModuleName}
                                        placeholderTextColor={Colors.textSecondary}
                                    />
                                    <TouchableOpacity
                                        onPress={handleAddTimeModule}
                                        style={newTimeModuleName.trim() ? styles.addButton : styles.addButtonDisabled}
                                        disabled={!newTimeModuleName.trim()}
                                    >
                                        <Text style={styles.addButtonText}>Add Time Module</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    } else if (item.key === 'importExport') {
                        return (
                            <View style={styles.section}>
                                <Text style={styles.header}>Import / Export</Text>
                                <View style={styles.importExportContainer}>
                                    <TouchableOpacity
                                        onPress={handleImportHabits}
                                        style={[styles.actionButton, styles.secondaryButton]}
                                    >
                                        <Ionicons name="arrow-down-circle-outline" size={22} color={Colors.background} />
                                        <Text style={styles.secondaryButtonText}>Import Habits</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleExportHabits}
                                        style={[styles.actionButton, styles.secondaryButton]}
                                    >
                                        <Ionicons name="arrow-up-circle-outline" size={22} color={Colors.background} />
                                        <Text style={styles.secondaryButtonText}>Export Habits</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.infoText}>Export your habits for backup or to transfer to another device.</Text>
                            </View>
                        );
                    } else if (item.key === 'dataManagement') {
                        return (
                            <View style={[styles.section, { marginTop: 20 }]}>
                                <Text style={styles.header}>Data Management</Text>
                                <TouchableOpacity
                                    onPress={handleResetLogs}
                                    style={styles.resetButton}
                                >
                                    <Text style={styles.resetButtonText}>Reset All Habit Logs</Text>
                                </TouchableOpacity>
                                <Text style={styles.infoText}>This will permanently delete all your habit logs but keep your habits intact.</Text>
                            </View>
                        );
                    }
                    return null;
                }}
                keyExtractor={(item) => item.key}
                contentContainerStyle={styles.flatListContentContainer} // Updated style
            />
            
            {/* Custom Rename Modal for Android */}
            <Modal
                animationType='none'
                transparent={true}
                visible={renameModalVisible}
                onRequestClose={() => setRenameModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Time Module</Text>
                        <Text style={styles.modalText}>
                            Enter a new name for "{moduleToRename?.name}":
                        </Text>
                        <TextInput
                            style={styles.modalInput}
                            value={newModuleName}
                            onChangeText={setNewModuleName}
                            autoFocus={true}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setRenameModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={() => {
                                    if (moduleToRename) {
                                        processRename(moduleToRename.id, moduleToRename.name, newModuleName);
                                    }
                                    setRenameModalVisible(false);
                                }}
                            >
                                <Text style={styles.buttonText}>Rename</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            
            {/* Time picker for module start times */}
            {timeEditingModule && (
                <DateTimePicker
                    value={selectedModuleTime}
                    mode="time"
                    display="default"
                    onChange={handleModuleTimeChange}
                />
            )}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        padding: 15,
    },
    flatListContentContainer: {
        padding: 15, // Ensure consistent padding
        backgroundColor: Colors.background, // Match the background color
    },
    section: {
        marginBottom: 15, // Reduce spacing between sections
        backgroundColor: Colors.surface,
        borderRadius: 8,
        padding: 15,
        elevation: 1,
        borderWidth: 1,
        borderColor: Colors.grey,
    },
    header: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: Colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightGrey,
        paddingBottom: 8,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightGrey,
        backgroundColor: Colors.surface,
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 8,
    },
    itemIcon: { marginRight: 12 },
    itemName: { fontSize: 18, flex: 1, color: Colors.text },
    addSection: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: Colors.lightGrey },
    input: {
        borderWidth: 1,
        borderColor: Colors.grey,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        marginBottom: 12,
        backgroundColor: Colors.background,
        color: Colors.text,
    },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: Colors.textSecondary },
    infoText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 10 },
    activeListItem: { backgroundColor: Colors.lightGrey },
    timePickerButton: {
        backgroundColor: Colors.accent, // Use primary color for better visibility
        padding: 12, // Slightly larger padding for better touch area
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    timePickerText: {
        color: Colors.surface, // Ensure good contrast with the button background
        fontSize: 16,
        fontWeight: 'bold',
    },
    addButton: {
        backgroundColor: Colors.primary, // Use primary color for enabled state
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    addButtonDisabled: {
        backgroundColor: Colors.grey, // Use grey for disabled state
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    addButtonText: {
        color: Colors.surface, // Ensure good contrast with the button background
        fontSize: 16,
        fontWeight: 'bold',
    },
    resetButton: {
        backgroundColor: Colors.error, // Use error color for destructive actions
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    resetButtonText: {
        color: Colors.text, // Ensure good contrast with the button background
        fontSize: 16,
        fontWeight: 'bold',
    },
    timeModulesList: {
        marginTop: 10,
    },
    scrollContentContainer: {
        paddingBottom: 40, // Add padding to ensure content is scrollable
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10, // Add spacing between action buttons
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderRadius: 10,
        padding: 20,
        width: '80%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 3.84,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: Colors.text,
    },
    modalText: {
        marginBottom: 15,
        color: Colors.text,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: Colors.grey,
        borderRadius: 5,
        padding: 10,
        marginBottom: 20,
        color: Colors.text,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 5,
        marginLeft: 10,
    },
    cancelButton: {
        backgroundColor: Colors.grey,
    },
    confirmButton: {
        backgroundColor: Colors.primary,
    },
    buttonText: {
        color: Colors.surface,
        fontWeight: 'bold',
    },
    cancelButtonText: {
        color: Colors.text,
        fontWeight: 'bold',
    },
    moduleInfoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    timeButton: {
        backgroundColor: Colors.accent,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 5,
        marginTop: 5,
        alignSelf: 'flex-start', // Only take up as much width as needed
    },
    timeButtonText: {
        fontSize: 12,
        color: Colors.background,
    },
    timeRangeSeparator: {
        marginHorizontal: 5,
        fontSize: 12,
        color: Colors.textSecondary,
    },
    // Updated and new styles for optional time
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    clearTimeButton: {
        marginLeft: 8,
        justifyContent: 'center',
    },
    addTimeButton: {
        marginTop: 5,
        paddingVertical: 4,
        paddingHorizontal: 0,
        backgroundColor: Colors.surface
    },
    addTimeText: {
        color: Colors.accent,
        fontSize: 14,
    },
    // Updated styles for import/export section
    importExportContainer: {
        flexDirection: 'column',
        marginTop: 10,
    },
    exportButton: {
        backgroundColor: Colors.accent,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    // New shared button style
    actionButton: {
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    secondaryButton: {
        backgroundColor: Colors.accent, 
        marginTop: 10,
    },
    actionButtonText: {
        color: Colors.surface,
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    secondaryButtonText: {
        color: Colors.background,
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
});