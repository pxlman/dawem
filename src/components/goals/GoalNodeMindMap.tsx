// --- Constants ---
export const NODE_VERTICAL_SPACING = 70;
export const NODE_HORIZONTAL_SPACING = 30;
export const NODE_WIDTH = 150; // Fixed width for easier layout calculation
export const NODE_BASE_HEIGHT = 40; // Base height, might increase with text wrapping

// src/components/GoalNodeMindMap.tsx
import React, { useRef, useState, useCallback, useMemo, useEffect, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, LayoutChangeEvent, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Goal, NodeLayout } from '../../types/index';
import {getColors}  from '@/constants/Colors';
import { useAppState } from '@/context/AppStateContext';
import '../../utils/i18n'; // Ensure translations are loaded
import { useTranslation } from 'react-i18next';
let Colors = getColors()

interface GoalNodeMindMapProps {
    nodeLayout: NodeLayout;
    isFocused: boolean;
    isEditing: boolean; // Controlled from parent
    onLayoutMeasured: (id: string, width: number, height: number) => void;
    onFocus: (id: string) => void; // To report tap/focus request
    // Callbacks for when SAVE or CANCEL happens *inside* the TextInput interaction
    onEditGoal: (goalId: string, newTitle: string, newColor: string) => void;
    onEditCancel: () => void;
}

const GoalNodeMindMap: React.FC<GoalNodeMindMapProps> = memo(({
    nodeLayout,
    isFocused,
    isEditing,
    onLayoutMeasured,
    onFocus,
    onEditGoal,
    onEditCancel,
}) => {
    const {settings} = useAppState();
    Colors =  getColors(settings.theme)
    const { id, x, y, goalData } = nodeLayout;
    const { title, color, habitsIds, enabled = true } = goalData;

    // Local state ONLY for the text input value during editing
    const [editedTitle, setEditedTitle] = useState<string>(title);
    const { t } = useTranslation();
    const inputRef = useRef<TextInput>(null);

    // Update local editedTitle when entering edit mode or title changes externally
    useEffect(() => {
        if (isEditing) {
            setEditedTitle(title); // Reset text input to current title when starting edit
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isEditing, title]);


    const handleLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        onLayoutMeasured(id, NODE_WIDTH, height);
    };

    // Internal Save/Cancel handlers now call parent callbacks
    const handleSave = () => {
        if (editedTitle.trim() === '') {
            Alert.alert('Error', 'Goal title cannot be empty.');
            return;
        }
        onEditGoal(id, editedTitle.trim(), color); // Parent handles stopping edit state
    };

    const handleCancel = () => {
        setEditedTitle(title);
        onEditCancel(); // Parent handles stopping edit state
    };

    const handleNodePress = () => {
        onFocus(id); // Just report focus request
    };

    const nodeStyle = useMemo(() => {
        return [
            styles.node,
            { 
                left: x, 
                top: y, 
                width: NODE_WIDTH, 
                backgroundColor: enabled ? color : Colors.darkGrey, // Darker gray for paused goals
                borderColor: isFocused ? Colors.text : 'transparent',
                opacity: enabled ? 1 : 0.85, // Slightly less transparent
            },
        ];
    }, [x, y, color, enabled, isFocused]);

    const statusIcon = useMemo(() => {
        if (!enabled) {
            return <Ionicons name="pause" size={16} color={Colors.lightGrey} style={styles.statusIcon} />;
        }
        return null;
    }, [enabled]);

    return (
        <View
            style={[ styles.nodeContainerBase, { left: x, top: y } ]}
            onLayout={handleLayout}
        >
            <Pressable
                onPress={handleNodePress}
                style={({ pressed }) => [
                    styles.nodePressableContent,
                    {
                        width: NODE_WIDTH,
                        backgroundColor: enabled ? (color || '#e0e0e0') : '#555555', // Darker gray for paused
                        borderColor: isFocused ? (isEditing ? '#FF9500' : '#007AFF') : '#999',
                        borderWidth: isFocused ? 1.5 : 1,
                    },
                    pressed && styles.pressedStyle
                ]}
            >
                {isEditing ? ( // Show TextInput based on isEditing prop
                    <View style={styles.editingView}>
                        <TextInput
                            ref={inputRef}
                            style={styles.textInput}
                            value={editedTitle}
                            onChangeText={setEditedTitle}
                            autoFocus
                            onBlur={handleCancel} // Cancel if input loses focus
                            onSubmitEditing={handleSave} // Save on keyboard submit
                        />
                        {/* Internal Save/Cancel buttons for TextInput */}
                        {/* <View style={styles.editActions}>
                            <TouchableOpacity onPress={handleSave} style={styles.iconButton}>
                                <Ionicons name="checkmark" size={20} color="green" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCancel} style={styles.iconButton}>
                                <Ionicons name="close" size={20} color="#555" />
                            </TouchableOpacity>
                        </View> */}
                    </View>
                ) : (
                    // Display View - NO ACTION BUTTONS HERE
                    <View style={styles.displayView}>
                        {statusIcon}
                        <Text style={[
                            styles.titleText, 
                            !enabled && styles.disabledTitleText // Apply disabled text style
                        ]}>
                            {title}
                        </Text>
                         {habitsIds && habitsIds.length > 0 && (
                            <Text style={[styles.habitText, isFocused && styles.habitTextFocused]}>
                                {t('habits.name')} {habitsIds.length}
                            </Text>
                         )}
                    </View>
                )}
            </Pressable>
        </View>
    );
});

// --- Styles ---
const styles = StyleSheet.create({
     nodeContainerBase: {
        position: 'absolute',
    },
    nodePressableContent: {
        minHeight: NODE_BASE_HEIGHT,
        borderRadius: 8,
        padding: 8,
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    pressedStyle: {
       opacity: 0.8,
    },
    displayView: { // Ensure display view takes space and pushes habit text down
       flex: 1,
       flexDirection: 'row',
       alignItems: 'center',
       minHeight: NODE_BASE_HEIGHT , // Account for padding
       justifyContent: 'space-between', // Space between title and potential habit text
    },
    editingView: {
        flex: 1,
    },
    titleText: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#111',
        flexShrink: 1,
        textAlign: 'center',
        width: '100%'
    },
    textInput: {
        fontSize: 14,
        borderBottomWidth: 1,
        borderColor: '#ccc',
        marginBottom: 5,
        paddingVertical: 2,
        backgroundColor: 'rgba(255,255,255,0.7)',
        color: '#111',
    },
    // NO actionsView needed here anymore
    editActions: { // Save/Cancel for TextInput
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 5,
    },
    iconButton: {
        paddingHorizontal: 4,
        marginLeft: 5,
    },
    habitText: {
        fontSize: 11,
        color: '#555',
        fontStyle: 'italic',
        // marginTop: 'auto', // Let flexbox handle positioning
        paddingTop: 5,
        textAlign: 'right',
    },
    habitTextFocused: {
        color: '#222',
    },
    statusIcon: {
        marginRight: 4,
    },
    node: {
        position: 'absolute',
        minHeight: NODE_BASE_HEIGHT,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3,
    },
    contentContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledTitle: {
        color: '#555',
        textShadowColor: 'transparent',
    },
    editContainer: {
        width: '100%',
    },
    input: {
        width: '100%',
        padding: 4,
        fontSize: 12,
        color: '#000',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 8,
    },
    disabledTitleText: {
        color: '#e0e0e0', // Light color text on dark background
        opacity: 0.9,
    },
});

export default GoalNodeMindMap;