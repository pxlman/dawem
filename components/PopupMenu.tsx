import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

interface PopupMenuProps {
    visible: boolean;
    onDismiss: () => void;
    onEdit: () => void;
    onDelete: () => void;
    position: { x: number; y: number };
}

const PopupMenu: React.FC<PopupMenuProps> = ({ 
    visible, 
    onDismiss, 
    onEdit, 
    onDelete,
    position
}) => {
    // Calculate whether menu should appear above or below the pressed point
    const screenHeight = Dimensions.get('window').height;
    const menuHeight = 120; // Approximate height of the menu
    // Show above if we're in the bottom quarter of the screen
    const showAbove = position.y > (screenHeight * 0.75);
    
    const menuStyle = {
        position: 'absolute' as 'absolute',
        left: position.x - 100, // Center menu horizontally from tap point
        [showAbove ? 'bottom' : 'top']: showAbove ? (screenHeight - position.y + 10) : (position.y + 10),
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType='fade'
            onRequestClose={onDismiss}
        >
            <TouchableWithoutFeedback onPress={onDismiss}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.menuContainer, menuStyle]}>
                        <TouchableOpacity style={styles.menuItem} onPress={onEdit}>
                            <Ionicons name="pencil" size={20} color={Colors.primary} />
                            <Text style={styles.menuItemText}>Edit</Text>
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.menuItem} onPress={onDelete}>
                            <Ionicons name="trash-outline" size={20} color={Colors.error} />
                            <Text style={[styles.menuItemText, styles.deleteText]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    menuContainer: {
        width: 160,
        backgroundColor: Colors.surface,
        borderRadius: 8,
        elevation: 5,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.3,
        // shadowRadius: 4,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    menuItemText: {
        fontSize: 16,
        marginLeft: 12,
        color: Colors.text,
    },
    deleteText: {
        color: Colors.error,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.lightGrey,
    },
});

export default PopupMenu;
