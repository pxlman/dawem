// app/add-habit.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, StatusBar } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAppState, useAppDispatch } from '../context/AppStateContext'; // Adjust path if needed
import { fixedColors, getColors } from '../constants/Colors'; // Adjust path if needed
import { Habit, TimeModule, RepetitionConfig, Goal, AddHabitPayload } from '@/types/index'; // Adjust path if needed
import DateTimePicker from '@react-native-community/datetimepicker'; // Import DateTimePicker
import { format } from 'date-fns'; // Ensure format is imported
import { habitById, getGoalOfHabit } from '@/utils/goalUtils';
import { useTranslation } from 'react-i18next'; // Import translation hook

let Colors = getColors();

export default function AddHabitModalScreen() {
    const { t } = useTranslation(); // Initialize translation hook
    const router = useRouter();
    const { habitId, currentDate, goalId } = useLocalSearchParams<{ habitId?: string; currentDate?: string; goalId?: string }>(); // Include currentDate in params
    const { timeModules, goals, settings } = useAppState(); // Add goals to destructuring
    Colors = getColors(settings.theme);
    const dispatch = useAppDispatch();

    const translatedRepetitionOptions = useMemo(() => [
        { label: t('habits.addeditScreen.repetitionType.daily'), value: 'daily' },
        { label: t('habits.addeditScreen.repetitionType.weekly'), value: 'weekly' },
    ], [t]);

    let chabit = {
        title: "",
        color: Colors.primary,
        repetition: {
            type: "daily",
            config: {},
        },
        measurement: {
            type: "binary",
            targetValue: 0
        },
        timeModuleId: timeModules[0]?.id,
        enabled: true,
        startDate: null,
        endDate: null,
    } as Habit;

    if (habitId) {
        chabit = habitById(habitId);
    }

    const selectedDate = useMemo(() => {
        try {
            return currentDate ? new Date(currentDate) : new Date();
        } catch {
            return new Date();
        }
    }, [currentDate]);

    const [habit, setHabit] = useState<Habit>(chabit);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(
        goalId || (habitId ? getGoalOfHabit(habitId)?.id ?? null : null)
    );

    const [repetitionOpen, setRepetitionOpen] = useState(false);
    const [timeModuleOpen, setTimeModuleOpen] = useState(false);
    const [goalOpen, setGoalOpen] = useState(false);

    const timeModuleItems = useMemo(() => timeModules.map((tm: TimeModule) => ({ label: tm.name, value: tm.id })), [timeModules]);
    const goalItems = useMemo(() => {
        const leafGoals = (goals || []).filter((goal: Goal) => !goal.subgoals || goal.subgoals.length === 0);
        return [
            { label: t('habits.addeditScreen.none'), value: '' },
            ...leafGoals.map((goal: Goal) => ({ label: goal.title, value: goal.id }))
        ];
    }, [goals, t]);

    useEffect(() => {
        setHabit({
            ...chabit,
            timeModuleId: chabit.timeModuleId || timeModules[0]?.id,
            startDate: chabit.startDate,
            endDate: chabit.endDate,
        });
    }, [habitId, timeModules, selectedDate]);

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

    const handleSave = () => {
        if (!habit.title.trim()) return Alert.alert(t('errors.inputError'), t('errors.habitTitleRequired'));
        if (!habit.repetition.type) return Alert.alert(t('errors.inputError'), t('errors.repetitionTypeRequired'));
        if (!habit.timeModuleId) return Alert.alert(t('errors.inputError'), t('errors.timeModuleRequired'));
        if (!/^#([0-9A-F]{3}){1,2}$/i.test(habit.color)) return Alert.alert(t('errors.inputError'), t('errors.invalidHexColor'));

        if (habit.repetition.type === 'weekly' && habit.measurement.type === 'binary' && (!habit.repetition.config.daysOfWeek || habit.repetition.config.daysOfWeek.length === 0)) {
            return Alert.alert(t('errors.inputError'), t('errors.selectAtLeastOneDay'));
        }

        let config: RepetitionConfig = {
            daysOfWeek: habit.repetition.config.daysOfWeek ?? [],
        };

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
            dispatch({ type: 'UPDATE_HABIT', payload: habitData as Omit<Habit, 'id' | 'createdAt'> & { id: string, goalId?: string } });
        }

        if (router.canGoBack()) router.back();
    };

    const handleClearEndDate = () => {
        setHabit(prev => ({ ...prev, endDate: null }));
    };

    const toggleAdvancedOptions = () => {
        setShowAdvancedOptions(prev => !prev);
    };

    const weekdayNames = [
        t('weekdays.saturday'),
        t('weekdays.sunday'),
        t('weekdays.monday'),
        t('weekdays.tuesday'),
        t('weekdays.wednesday'),
        t('weekdays.thursday'),
        t('weekdays.friday')
    ].map(day => day.substring(0, 3));

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContentContainer}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
        >
            <Stack.Screen
                options={{
                    title: habitId ? t('habits.addeditScreen.editScreenTitle') : t('habits.addeditScreen.addScreenTitle'),
                    headerShadowVisible: false,
                    contentStyle: { backgroundColor: Colors.background }
                }}
            />

            <Text style={styles.label}>{t('habits.addeditScreen.habitTitle')}</Text>
            <TextInput
                style={styles.input}
                value={habit.title}
                onChangeText={text => setHabit(prev => ({ ...prev, title: text }))}
                placeholder={t('habits.addeditScreen.habitTitlePlaceholder')}
                placeholderTextColor={Colors.textSecondary}
            />

            <Text style={styles.label}>{t('habits.addeditScreen.habitColor')}</Text>
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

            <Text style={styles.label}>{t('habits.addeditScreen.habitTimeModule')}</Text>
            <DropDownPicker
                open={timeModuleOpen}
                value={habit.timeModuleId}
                items={timeModuleItems}
                setOpen={setTimeModuleOpen}
                setValue={val => setHabit(prev => ({ ...prev, timeModuleId: val('') || '' }))}
                onOpen={onTimeModuleOpen}
                placeholder={t('habits.addeditScreen.habitTimeModule')}
                disabled={timeModuleItems.length === 0}
                style={styles.dropdownStyle}
                placeholderStyle={styles.dropdownPlaceholderStyle}
                dropDownContainerStyle={styles.dropdownContainerStyle}
                textStyle={styles.dropdownTextStyle}
                labelStyle={styles.dropdownLabelStyle}
                listItemLabelStyle={styles.dropdownListItemLabelStyle}
                theme="DARK"
                mode="SIMPLE"
                listMode="SCROLLVIEW"
                zIndex={4000}
                zIndexInverse={1000}
            />
            {timeModuleItems.length === 0 && (
                <Text style={styles.infoTextError}>{t('errors.noTimeModules')}</Text>
            )}

            <Text style={styles.label}>{t('habits.addeditScreen.habitGoal')}</Text>
            <DropDownPicker
                open={goalOpen}
                value={selectedGoalId}
                items={goalItems}
                setOpen={setGoalOpen}
                setValue={setSelectedGoalId}
                onOpen={onGoalOpen}
                placeholder={t('habits.addeditScreen.selectGoal')}
                style={styles.dropdownStyle}
                placeholderStyle={styles.dropdownPlaceholderStyle}
                dropDownContainerStyle={styles.dropdownContainerStyle}
                textStyle={styles.dropdownTextStyle}
                labelStyle={styles.dropdownLabelStyle}
                listItemLabelStyle={styles.dropdownListItemLabelStyle}
                theme="DARK"
                mode="SIMPLE"
                listMode="SCROLLVIEW"
                zIndex={3500}
                zIndexInverse={1500}
            />
            {goalItems.length <= 1 && (
                <Text style={styles.infoTextError}>{t('errors.noEligibleGoals')}</Text>
            )}

            <Text style={styles.label}>{t('habits.addeditScreen.habitRepetition')}</Text>
            <DropDownPicker
                open={repetitionOpen}
                value={habit.repetition.type}
                items={translatedRepetitionOptions}
                setOpen={setRepetitionOpen}
                setValue={val => setHabit(prev => ({
                    ...prev,
                    repetition: { ...prev.repetition, type: val(prev) }
                }))}
                onOpen={onRepetitionOpen}
                placeholder={t('habits.addeditScreen.habitRepetition')}
                style={styles.dropdownStyle}
                placeholderStyle={styles.dropdownPlaceholderStyle}
                dropDownContainerStyle={styles.dropdownContainerStyle}
                textStyle={styles.dropdownTextStyle}
                labelStyle={styles.dropdownLabelStyle}
                listItemLabelStyle={styles.dropdownListItemLabelStyle}
                theme="DARK"
                mode="SIMPLE"
                listMode="SCROLLVIEW"
                zIndex={3000}
                zIndexInverse={1000}
            />

            <Text style={styles.label}>{t('habits.addeditScreen.trackHabitBy')}</Text>
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
                        {t('habits.addeditScreen.completionStatus')}
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
                        {t('habits.addeditScreen.counterStatus')}
                    </Text>
                </TouchableOpacity>
            </View>

            {habit.repetition.type === "daily" && habit.measurement.type === "count" && (
                <>
                    <Text style={styles.label}>{t('habits.addeditScreen.targetValue')}</Text>
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
                            <Text style={styles.label}>{t('habits.addeditScreen.targetValue')}</Text>
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
                            <Text style={styles.label}>{t('habits.addeditScreen.daysOfWeek')}</Text>
                            <View style={styles.weekDaysContainer}>
                                {weekdayNames.map(
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
                <Text style={styles.advancedOptionsTitle}>{t('habits.addeditScreen.advancedOptions')}</Text>
                <Ionicons
                    name={showAdvancedOptions ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={Colors.textSecondary}
                    style={styles.toggleButtonIcon}
                />
            </TouchableOpacity>

            {showAdvancedOptions && (
                <View style={styles.advancedOptionsContainer}>
                    <Text style={styles.label}>{t('habits.addeditScreen.startDate')}</Text>
                    <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowStartDatePicker(true)}
                    >
                        <Text style={styles.datePickerText}>
                            {habit.startDate
                                ? format(new Date(habit.startDate), "MMM d, yyyy")
                                : t('habits.addeditScreen.fromever')}
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
                                        startDate: format(selectedDate, 'yyyy-MM-dd')
                                    }));
                            }}
                        />
                    )}
                    {habit.startDate && (
                        <TouchableOpacity
                            onPress={() => setHabit(prev => ({ ...prev, startDate: null }))}
                            style={styles.clearButton}
                        >
                            <Text style={styles.clearButtonText}>
                                {t('habits.addeditScreen.clearStartDate')}
                            </Text>
                        </TouchableOpacity>
                    )}

                    <Text style={styles.label}>{t('habits.addeditScreen.endDate')}</Text>
                    <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowEndDatePicker(true)}
                    >
                        <Text style={styles.datePickerText}>
                            {habit.endDate ? format(new Date(habit.endDate), "MMM d, yyyy") : t('habits.addeditScreen.forever')}
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
                                        endDate: format(selectedDate, 'yyyy-MM-dd')
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
                                {t('habits.addeditScreen.clearEndDate')}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <TouchableOpacity style={styles.addHabitButton} onPress={handleSave}>
                <Text style={styles.addHabitButtonText}>
                    {habitId ? t('habits.addeditScreen.editButton') : t('habits.addeditScreen.addButton')}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    container: { flex: 1, backgroundColor: Colors.background },
    scrollContentContainer: {
        padding: 20,
        paddingBottom: 250,
    },
    label: { fontSize: 16, fontWeight: 'bold', marginTop: 18, marginBottom: 6, color: Colors.textSecondary },
    input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.grey, borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 16, marginBottom: 10, color: Colors.text },
    colorPickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    colorOption: {
        width: 40,
        height: 40,
        borderRadius: 20,
        margin: 5,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorOptionSelected: {
        borderColor: Colors.primary,
    },
    dropdownStyle: {
        backgroundColor: Colors.surface, borderColor: Colors.grey,
        marginBottom: 10,
    },
    dropdownPlaceholderStyle: { color: Colors.textSecondary, },
    dropdownContainerStyle: {
        backgroundColor: Colors.surface, borderColor: Colors.grey,
    },
    dropdownTextStyle: { fontSize: 16, color: Colors.text, },
    dropdownLabelStyle: { color: Colors.text, },
    dropdownListItemLabelStyle: { color: Colors.text, },
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
    datePickerButton: {
        backgroundColor: Colors.surface,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.grey,
    },
    datePickerText: {
        color: Colors.textSecondary,
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
    toggleButtonIcon: {
        marginLeft: 8,
    },
    advancedOptionsContainer: {
        backgroundColor: Colors.background,
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
        color: Colors.primary,
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
        elevation: 5,
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
    infoTextError: { fontSize: 13, fontStyle: 'italic', color: Colors.error, marginTop: -5, marginBottom: 10 },
});