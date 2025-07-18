import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Vibration, Platform, I18nManager, StyleProp, TextInput } from 'react-native';
// Import date-fns functions for date comparison
import { format, isAfter, startOfDay } from 'date-fns';
import {getColors} from '../constants/Colors';
import { useAppDispatch, useAppState } from '../context/AppStateContext';
import { isLogForDate } from '../utils/dateUtils';
import { getWeeklyHabitTotal } from '../utils/habitUtils';
import { Habit, LogEntry, HabitLogStatus } from '@/types/index';
import { Ionicons } from '@expo/vector-icons';
import { ColorProps } from 'react-native-svg';
import '../utils/i18n';
import { useTranslation } from 'react-i18next';
let Colors = getColors()

interface HabitItemProps {
    habit: Habit;
    currentDate: Date;
    onShowMenu: (position: { x: number; y: number }) => void;
}

const HabitItem: React.FC<HabitItemProps> = ({ habit, currentDate, onShowMenu }) => {
    const dispatch = useAppDispatch();
    const { logs, settings} = useAppState(); // Removed timeModules as it's not used
    const { t } = useTranslation();
    Colors = getColors(settings.theme)
    const dateString = format(currentDate, 'yyyy-MM-dd');
    
    // Get the configured start day of week from settings
    const startDayOfWeek = settings?.startDayOfWeek || 6;
    
    // Determine if the viewed date is in the future
    const isFutureDate = isAfter(startOfDay(currentDate), startOfDay(new Date()));

    // Find the log entry for the specific date being viewed
    const todaysLog = logs.find((log:LogEntry) => {
        return log.habitId === habit.id && isLogForDate(log, currentDate);
    });

    // State for the count input value
    const [countValue, setCountValue] = useState<number>(todaysLog?.value || 0);
    
    // Track weekly total using the utility function
    const [weeklyTotal, setWeeklyTotal] = useState<number>(0);
    
    useEffect(() => {
        if (habit.repetition.type === 'weekly' && habit.measurement.type === 'count') {
            setWeeklyTotal(getWeeklyHabitTotal(habit.id, currentDate, logs, startDayOfWeek));
        }
    }, [logs, currentDate, habit.id, habit.repetition.type, habit.measurement.type, startDayOfWeek]);

    // State for the visual appearance of the binary button
    const getInitialStatus = (): HabitLogStatus | 'none' => {
        if (!todaysLog) return 'none';
        if (['right', 'wrong', 'circle'].includes(todaysLog.status as HabitLogStatus)) {
            return todaysLog.status as HabitLogStatus;
        }
        if (todaysLog.value !== undefined && todaysLog.value||0 > 0 && habit.measurement.type === 'binary') return 'right';
        return 'none';
    };
    const [currentButtonStatus, setCurrentButtonStatus] = useState<HabitLogStatus | 'none'>(getInitialStatus);

    // Update local state if the relevant log entry changes
    useEffect(() => {
        setCountValue(todaysLog?.value?? 0);
        setCurrentButtonStatus(getInitialStatus());
    }, [todaysLog]);

    // Helper function to dispatch log updates
    const updateLog = (newStatus?: HabitLogStatus|undefined, newValue?: number) => {
        if (isFutureDate) {
            return; // Prevent logging for future dates
        }
        // Alert.alert('hi',dateString)
        const payload: { habitId: string; date: string; status?: HabitLogStatus; value?: number } = {
            habitId: habit.id, 
            date: dateString,
            ...({ status: newStatus }),
            ...({ value: newValue }),
        };
        dispatch({ type: 'LOG_HABIT', payload });
    };

    // --- Binary Button Handlers ---
    const handleSinglePress = () => {
        // updateLog function handles the future date check internally
        let nextStatus: HabitLogStatus | undefined;
        if (currentButtonStatus === 'right') nextStatus = 'circle';
        else if (currentButtonStatus === 'circle') nextStatus = 'wrong';
        else if (currentButtonStatus === 'wrong') nextStatus = 'right';
        else nextStatus = 'right'; // Default to 'right' from 'none' or 'circle'

        // Update visual state immediately only if NOT a future date
        if (!isFutureDate) {
            setCurrentButtonStatus(nextStatus ?? 'none');
        }
        updateLog(nextStatus);
    };

    const handleLongPress = () => {
        if (isFutureDate) { return; } // Prevent menu for future dates
        Vibration.vibrate(50);
        setCurrentButtonStatus('none'); updateLog(undefined,undefined);
        // Alert.alert(
        //     `Log: ${habit.title}`,
        //     `Choose status for ${format(currentDate, 'MMM d')}:`,
        //     [
        //         { text: 'Did (✓)', onPress: () => { setCurrentButtonStatus('right'); updateLog('right'); } },
        //         { text: 'Didn\'t (✕)', onPress: () => { setCurrentButtonStatus('wrong'); updateLog('wrong'); } },
        //         { text: 'Late (O)', onPress: () => { setCurrentButtonStatus('circle'); updateLog('circle'); } },
        //         { text: 'Clear Log', style: 'destructive', onPress: () => {
        //             setCurrentButtonStatus('none');
        //             // TODO: Implement DELETE_LOG action or specific handling in LOG_HABIT for undefined status
        //             console.warn("Clear log needs proper implementation in reducer.");
        //             updateLog(undefined); // Attempt to clear by sending undefined status
        //             }},
        //         { text: 'Cancel', style: 'cancel' },
        //     ],
        //     { cancelable: true }
        // );
    };

    // --- Render Functions ---
    const renderCombinedBinaryButton = () => {
        let iconName: keyof typeof Ionicons.glyphMap = 'ellipse-outline';
        let buttonStyle = styles.button_none;
        let iconColor = Colors.textSecondary; // Default icon color for dark theme 'none'

        switch (currentButtonStatus) {
            case 'right': iconName = 'checkmark-sharp'; buttonStyle = styles.button_right; iconColor = Colors.surface; break;
            case 'wrong': iconName = 'close-sharp'; buttonStyle = styles.button_wrong; iconColor = Colors.surface; break;
            case 'circle': iconName = 'ellipse-outline'; buttonStyle = styles.button_circle; iconColor = Colors.surface; break;
        }

        const combinedButtonStyle = [
            styles.button_base,
            buttonStyle,
            isFutureDate ? styles.disabled : {} // Apply disabled style conditionally
        ];
        const finalIconColor = isFutureDate ? Colors.grey : iconColor; // Dim icon when disabled

        return (
            <TouchableOpacity
                style={combinedButtonStyle}
                onPress={handleSinglePress}
                onLongPress={handleLongPress}
                delayLongPress={300}
                disabled={isFutureDate} // Disable touch interactions
                activeOpacity={isFutureDate ? 1 : 0.7} // No visual feedback when disabled
            >
                <Ionicons name={iconName} size={20} color={finalIconColor} />
            </TouchableOpacity>
        );
    };

    // Add state to track if we're in edit mode for the count input
    const [isEditingCount, setIsEditingCount] = useState(false);
    const [tempInputValue, setTempInputValue] = useState('');

    const renderCountControls = () => {
        const handleIncrement = () => {
            if (isFutureDate) return; // Prevent logging for future dates
            const newValue = (todaysLog?.value || 0) + 1;
            setCountValue(newValue);
            updateLog(undefined, newValue);
        };

        const handleDecrement = () => {
            if (isFutureDate) return; // Prevent logging for future dates
            const newValue = Math.max((todaysLog?.value || 0) - 1, 0); // Ensure value doesn't go below 0
            setCountValue(newValue);
            updateLog(undefined, newValue);
        };
        
        // Function to handle direct count value input
        const handleCountValuePress = () => {
            if (isFutureDate) return; // Prevent editing for future dates
            setTempInputValue(value.toString());
            setIsEditingCount(true);
        };
        
        // Function to save the input value
        const handleSaveCountValue = () => {
            const newValue = parseInt(tempInputValue, 10);
            // Validate that the value is a number and not negative
            if (!isNaN(newValue) && newValue >= 0) {
                setCountValue(newValue);
                updateLog(undefined, newValue);
            }
            setIsEditingCount(false);
        };
        
        let progressStyle: StyleProp<ColorProps> = { };
        let value = (habit.repetition.type === 'daily')? countValue: weeklyTotal

        if(value === (habit.measurement.targetValue||0)){
            progressStyle.color = Colors.green;
        } else if(value > (habit.measurement.targetValue||0)){
            progressStyle.color = Colors.blue;
        } else {
            // This cause if it's a weekly habit so the user can do it 
            // whenever he likes so don't bother him with the red color
            if(habit.repetition.type === 'daily') progressStyle.color = Colors.red;
        }
        
        return (
            <View style={styles.controls}>
                {habit.repetition.type === 'weekly' && (
                <Text style={{color: Colors.textSecondary}}>+{countValue} </Text>
                )}
                <TouchableOpacity
                    style={[styles.countButton, isFutureDate ? styles.disabled : {}]}
                    onPress={handleDecrement}
                    disabled={isFutureDate}
                >
                    <Ionicons name="remove-circle-outline" size={34} color={isFutureDate ? Colors.grey : Colors.accent} />
                </TouchableOpacity>
                
                {isEditingCount ? (
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.countInput}
                            value={tempInputValue}
                            onChangeText={setTempInputValue}
                            keyboardType="numeric"
                            autoFocus={true}
                            selectTextOnFocus={true}
                            onBlur={handleSaveCountValue}
                            onSubmitEditing={handleSaveCountValue}
                        />
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={handleCountValuePress}
                        disabled={isFutureDate}
                    >
                        <Text style={[styles.countValue, isFutureDate ? styles.textDisabled : {}, progressStyle]}>
                            {
                                (!I18nManager.isRTL)? `${value || '0'} / ${habit.measurement.targetValue}`: `${habit.measurement.targetValue} / ${value || '0'}`
                            }
                        </Text>
                    </TouchableOpacity>
                )}
                
                <TouchableOpacity
                    style={[styles.countButton, isFutureDate ? styles.disabled : {}]}
                    onPress={handleIncrement}
                    disabled={isFutureDate}
                >
                    <Ionicons name="add-circle-outline" size={34} color={isFutureDate ? Colors.grey : Colors.accent} />
                </TouchableOpacity>
            </View>
        );
    };

    // --- Helper function to format repetition info ---
    const renderRepetitionInfo = () => {
        if (!habit.repetition) return null;
        
        let repetitionText = '';
        let iconName: keyof typeof Ionicons.glyphMap = 'calendar-outline';
        
        if (habit.repetition.type === 'daily') {
            repetitionText = t('habits.allHabits.repetitionType.daily');
            iconName = 'calendar-outline';
        } else if (habit.repetition.type === 'weekly') {
            iconName = 'calendar-number-outline';
            
            if (habit.measurement.type === 'count') {
                repetitionText = `${t('habits.repetitionType.weekly.counter')} (${habit.measurement.targetValue})`;
            } else {
                // Format selected days
                const daysOfWeek = [
                    t('weekDaysShort.saturday'),
                    t('weekDaysShort.sunday'),
                    t('weekDaysShort.monday'),
                    t('weekDaysShort.tuesday'),
                    t('weekDaysShort.wednesday'),
                    t('weekDaysShort.thursday'),
                    t('weekDaysShort.friday')
                ];
                const selectedDays = habit.repetition.config.daysOfWeek || [];
                
                if (selectedDays.length === 7) {
                    repetitionText = t('habits.repetitionType.weekly.everyDay');
                } else {
                    const dayMarkers = daysOfWeek.filter((day, index) => 
                        selectedDays.includes(index) 
                    ).join(' ');
                    repetitionText = `${dayMarkers}`;
                }
            }
        }
        
        return (
            <View style={styles.repetitionInfo}>
                <Ionicons 
                    name={iconName} 
                    size={12} 
                    color={isFutureDate ? Colors.grey : Colors.textSecondary} 
                    style={styles.repetitionIcon} 
                />
                <Text style={[
                    styles.repetitionText, 
                    isFutureDate ? styles.textDisabled : {}
                ]}>
                    {repetitionText}
                </Text>
            </View>
        );
    };

    // Ref for measuring position
    const containerRef = React.useRef<View>(null);

    // --- Popup Menu Handler ---
    const handleLongPressMenu = () => {
        if (isFutureDate) return;
        if (containerRef.current) {
            containerRef.current.measureInWindow((x, y, width, height) => {
                // Offset y a bit for menu below the item
                onShowMenu({ x:x + 30, y: y -100 });
            });
        }
    };

    // --- Main Return ---
    return (
        <View
            ref={containerRef}
            style={[styles.container, { borderLeftColor: habit.color || Colors.accent }, isFutureDate ? styles.containerDisabled : {}]}
        >
            <TouchableOpacity
                style={styles.touchableArea}
                onLongPress={handleLongPressMenu}
                delayLongPress={300}
            >
                <Text style={[styles.title, isFutureDate ? styles.textDisabled : {}]}>{habit.title}</Text>
                {renderRepetitionInfo()}
            </TouchableOpacity>
            {habit.measurement.type === 'binary' ? renderCombinedBinaryButton() : renderCountControls()}
        </View>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingLeft: 15,
    paddingRight: 10,
    marginVertical: 4,
    marginHorizontal: 10,
    borderRadius: 8,
    borderLeftWidth: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    zIndex: 1,
  },
  containerDisabled: {
    opacity: 0.6,
  },
  touchableArea: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
  },
  controls: { flexDirection: "row", alignItems: "center" },
  countButton: {
    padding: 5,
  },
  countValue: {
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: 10,
    color: Colors.text,
  },
  textDisabled: {
    color: Colors.textSecondary,
  },
  disabled: {
    opacity: 0.5,
  },

  // --- Combined Button Styles ---
  button_base: {
    padding: 8,
    borderRadius: 25,
    minWidth: 40,
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  button_none: {
    backgroundColor: Colors.surface,
    borderColor: Colors.accent,
  },
  button_right: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  button_wrong: {
    backgroundColor: Colors.red,
    borderColor: Colors.error,
  },
  button_circle: {
    backgroundColor: Colors.buff,
    borderColor: Colors.buff,
  },

  // --- Count Control Styles ---
  countInput: {
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 70,
    textAlign: "center",
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  
  inputContainer: {
    marginHorizontal: 10,
  },

  repetitionInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  repetitionIcon: {
    marginRight: 4,
  },
  repetitionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "400",
  },
  // Removed all modal-related styles
});

export default HabitItem;