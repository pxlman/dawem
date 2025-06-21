// src/screens/SettingsScreen.tsx (or wherever your SettingsScreen is)
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  FlatList,
  Modal,
  Platform,
  Share,
  Dimensions,
} from "react-native";
// import { SafeAreaView } from 'react-native-safe-area-context'; // SafeAreaView is good practice for the root
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { Ionicons } from "@expo/vector-icons";
import { useAppState, useAppDispatch } from "../context/AppStateContext"; // Adjust path
import { getColors } from "../constants/Colors"; // Adjust path
import { TimeModule, ThemeType, AppState } from "@/types/index"; // Adjusted to import ThemeType
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker"; // Explicit event type
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Buffer } from "buffer"; // Import Buffer for base64 conversion if not globally available
import { format, set } from "date-fns";
import Sharing from "expo-sharing";
import { downloadJsonFileToDownloadsAndroid } from "@/utils/fileUtils";
import '../utils/i18n'; // Ensure i18next is initialized globally
import { saveLanguagePreference, loadSavedLanguage } from "../utils/i18n";
import { useTranslation } from 'react-i18next'; // Import the translation hook
// import { downloadJsonFile, downloadJsonFileToDownloadsAndroid } from "@/utils/fileUtils";
// import { saveJsonFileWithPicker } from "@/utils/fileUtils";
let Colors = getColors();

// Helper function to get a random element from an array
const getRandomElement = <T,>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

export default function SettingsScreen() {
  const { t, i18n } = useTranslation(); // Get i18n instance for language switching
  const state = useAppState();
  const { timeModules, settings, habits } = state;
  const dispatch = useAppDispatch();

  // Update colors whenever theme changes
  useEffect(() => {
    Colors = getColors(settings.theme);
  }, [settings.theme]);
  
  // Create a ref to store the random quote so it won't change on re-renders
  
  const quotes = [
    {
      text: "اتق الله حيثما كنت، وأتبع السيئة الحسنة تمحها، وخالق الناس بخلق حسن.",
      author: "صلى الله عليه وسلم",
    },
    {
      text: "سددوا وقاربوا واعلموا أنه لن يدخل أحدكم عمله الجنة وأن أحب الأعمال إلى الله أدومها وإن قل",
      author: "صلى الله عليه وسلم",
    },
    {
      text: "إذا أحب الله عبدا عسله. قال: يا رسول الله، وما عسله؟ قال: يوفق له عملا صالحا بين يدي أجله حتى يرضى عنه جيرانه -أو قال: من حوله-.",
      author: "صلى الله عليه وسلم",
    },
    {
      text: "قال الله عز وجل: ﴿ وَنَفْسٍ وَمَا سَوَّاهَا * فَأَلْهَمَهَا فُجُورَهَا وَتَقْوَاهَا * قَدْ أَفْلَحَ مَنْ زَكَّاهَا ﴾ [الشمس: 7 - 9] قال العلامة السعدي رحمه الله: أي: طهَّر نفسه من الذنوب، ونقَّاها من العيوب، ورقَّاها بطاعة الله، وعلَّاها بالعلم النافع، والعمل الصالح.",
      author: "",
    },
    {
      text: "حاسبوا أنفسكم قبل أن تُحاسبوا، وزِنُوا أنفسكم قبل أن تُوزنوا.",
      author: "عمر بن الخطاب رضي الله عنه",
    },
    {
      text: "وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا ۚ وَإِنَّ اللَّهَ لَمَعَ الْمُحْسِنِينَ",
      author: "سورة العنكبوت",
    },
    {
      text: "يقول الله تعالى: من تقرَّب إليَّ شبرًا تقرَّبتُ إليه ذراعًا ومن تقرَّب إليَّ ذراعًا تقرَّبتُ إليه باعًا ومن أتاني يمشي أتيتُه هَرولةً",
      author: "حديث قدسي",
    },
    {
      text: "ما تَقَرَّبَ إِلَيَّ عَبدي بِشيءٍ أحبَّ إِلَيَّ مِمّا افْتَرَضْتُهُ عليهِ، وما زالَ عَبدي يَتَقَرَّبُ إِلَيَّ بِالنَّوافِلِ حتى أُحِبَّهُ",
      author: "من حديث قدسي",
    },
    {
      text: "وَأَنْ لَيْسَ لِلإنْسَانِ إِلا مَا سَعَى (-) وَأَنَّ سَعْيَهُ سَوْفَ يُرَى",
      author: "سورة النجم",
    },
  ];
  const randomQuoteRef = useRef(getRandomElement(quotes));
  
  const [newDayStartTime, setNewDayStartTime] = useState<Date | null>(null);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [moduleToRename, setModuleToRename] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedModuleTimeValue, setSelectedModuleTimeValue] = useState(
    new Date()
  ); // Store Date value for picker
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  
  // Available themes
  const themes: ThemeType[] = ["fresh", "dark", "browny", "night"];

  // Available languages
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'العربية' }
  ];

  // Handle theme change
  const handleThemeChange = (theme: ThemeType) => {
    dispatch({
      type: "CHANGE_THEME",
      payload: theme,
    });
    setShowThemeDropdown(false); // Close dropdown after selection
  };

  // Handle language change
  const handleLanguageChange = () => {
    // Toggle between 'en' and 'ar'
    const newLanguage = i18n.language === 'en' ? 'ar' : 'en';
    saveLanguagePreference(newLanguage); // Save preference
    loadSavedLanguage(); // Load saved language
  };

  useEffect(() => {
    if (settings.startTimeOfDay) {
      const [hours, minutes] = settings.startTimeOfDay.split(":").map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        const savedStartTime = new Date();
        savedStartTime.setHours(hours, minutes, 0, 0);
        setNewDayStartTime(savedStartTime);
      } else {
        console.warn(
          "Invalid startTimeOfDay format in settings:",
          settings.startTimeOfDay
        );
        const defaultTime = new Date();
        defaultTime.setHours(0, 0, 0, 0);
        setNewDayStartTime(defaultTime);
      }
    } else {
      const defaultStartTime = new Date();
      defaultStartTime.setHours(0, 0, 0, 0); // Default to midnight
      setNewDayStartTime(defaultStartTime);
    }
  }, [settings.startTimeOfDay]);

  const handleAddTimeModule = () => {
    const trimmedName = moduleToRename?.name.trim();
    if (!trimmedName)
      return Alert.alert("Error", t("settings.addTimeModulePlaceholder"));
    if (
      timeModules.some(
        (tm: TimeModule) => tm.name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      return Alert.alert(
        "Error",
        `${t("settings.addTimeModulePlaceholder")} "${trimmedName}" ${t("settings.addTimeModulePlaceholder")}`
      );
    }
    dispatch({
      type: "ADD_TIME_MODULE",
      payload: { name: trimmedName } as Omit<TimeModule, "id">, // startTime is implicitly undefined
    });
    setModuleToRename(null);
  };

  const handleDeleteTimeModule = (id: string, name: string) => {
    if (timeModules.length <= 1) {
      return Alert.alert("Error", "Cannot delete the last Time Module.");
    }
    Alert.alert(
      t("habits.delete"),
      `${t("habits.delete")} "${name}"? Habits will be reassigned.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: t("habits.delete"),
          style: "destructive",
          onPress: () =>
            dispatch({ type: "DELETE_TIME_MODULE", payload: { id } }),
        },
      ],
      { cancelable: true }
    );
  };

  const handleDayStartTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date
  ) => {
    setIsTimePickerVisible(false); // Hide picker first
    if (event.type === "set" && selectedTime) {
      // Check event type for confirmation
      setNewDayStartTime(selectedTime);
      const formattedTime = `${selectedTime.getHours()}:${selectedTime.getMinutes()}`;
      dispatch({
        type: "UPDATE_START_TIME",
        payload: { startTimeOfDay: formattedTime },
      });
    }
  };

  const handleResetLogs = () => {
    Alert.alert(
      "Confirm Reset",
      "Delete ALL habit logs?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Logs",
          style: "destructive",
          onPress: () => dispatch({ type: "RESET_LOGS" }),
        },
      ],
      { cancelable: true }
    );
  };

  const showModuleTimePicker = (moduleId: string) => {
    const module = timeModules.find((m: TimeModule) => m.id === moduleId);
    if (!module) return;
    const timeStr = module.startTime || "00:00"; // Default to 00:00 if not set
    const [hours, minutes] = timeStr.split(":").map(Number);
    const dateForPicker = new Date();
    dateForPicker.setHours(hours, minutes, 0, 0);
    setSelectedModuleTimeValue(dateForPicker);
    setModuleToRename({ id: moduleId, name: module?.name }); // This will trigger the DateTimePicker visibility
  };

  const handleModuleTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date
  ) => {
    const currentEditingModuleId = moduleToRename?.id; // Capture before resetting
    setModuleToRename(null); // Hide picker immediately

    if (event.type === "set" && selectedTime && currentEditingModuleId) {
      const formattedTime = selectedTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      dispatch({
        type: "UPDATE_TIME_MODULE",
        payload: { id: currentEditingModuleId, startTime: formattedTime },
      });
    }
  };

  const handleClearModuleTime = (moduleId: string) => {
    dispatch({
      type: "UPDATE_TIME_MODULE",
      payload: { id: moduleId, startTime: undefined }, // Send undefined to clear
    });
  };

  const handleExportHabits = async () => {
    const exportData = {
      habits: mergeArraysWithoutDuplicates(state.habits, habits),
      timeModules: mergeArraysWithoutDuplicates(state.timeModules, timeModules),
      goals: mergeArraysWithoutDuplicates(state.goals, state.goals),
    };
    const jsonString = JSON.stringify(exportData, null, 2);

    // Format date for filename - YYYY-MM-DD_HH-MM-SS
    const now = new Date();
    const dateString = format(now, "yyyy-MM-dd_HH-mm-ss");
    const filename = `dawem-${dateString}.json`;
    const fileUri = FileSystem.cacheDirectory + filename;

    try {
      await downloadJsonFileToDownloadsAndroid(filename, jsonString);
      // Note: After sharing, you might want to delete the temporary file from cache,
      // but it's often fine to let the OS manage cache cleanup.
      // If you want to delete:
      setTimeout(async () => {
        try {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
          console.log(`Temporary file deleted: ${fileUri}`);
        } catch (deleteError) {
          console.error("Error deleting temporary file:", deleteError);
        }
      }, 20000); // Delete after 20 seconds (giving time for sharing to complete)
    } catch (error) {
      try {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json", // Helps Android suggest appropriate apps
          dialogTitle: `Save ${filename} As...`, // Title for the share dialog
          UTI: "public.json", // Uniform Type Identifier for iOS
        });
      } catch (e) {
        // The Sharing dialog will allow the user to "Save to Files" (iOS)
        // or choose a file manager app (Android) to save the file.
        // The user can typically rename the file in the system's save dialog.
        // console.log(`Sharing dialog presented for: ${fileUri}`);
        Alert.alert(
          "Save/Share Error",
          `Could not save or share the json file`
        );
      }
      // console.error("Error preparing or sharing file:", error);
    }
  };

  const handleImportHabits = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0)
        return;
      const fileContent = await FileSystem.readAsStringAsync(
        result.assets[0].uri
      );
      // Alert.alert('hi',fileContent)
      const importedData = JSON.parse(fileContent);
      if (
        !importedData.habits ||
        !Array.isArray(importedData.habits) ||
        !importedData.timeModules ||
        !Array.isArray(importedData.timeModules)
      ) {
        throw new Error(
          "Invalid file format. Missing habits or timeModules array."
        );
      }
      Alert.alert(
        t("settings.importData"),
        `Danger option read carefully, import ${importedData.habits.length} habits, ${importedData.goals.length} goals and ${importedData.timeModules.length} time modules?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: t("settings.importData"),
            onPress: () => {
              // Create merged arrays without duplicates by ID
              const mergedHabits = mergeArraysWithoutDuplicates(
                state.habits,
                importedData.habits
              );
              const mergedTimeModules = mergeArraysWithoutDuplicates(
                state.timeModules,
                importedData.timeModules
              );
              const mergedGoals = mergeArraysWithoutDuplicates(
                state.goals,
                importedData.goals
              );

              dispatch({
                type: "IMPORT_DATA",
                payload: {
                  habits: mergedHabits,
                  timeModules: mergedTimeModules,
                  goals: mergedGoals,
                },
              });
              Alert.alert("Success", "Data imported without duplicates!");
            },
          },
        ]
      );
    } catch (error) {
      console.error("Import Error:", error);
      Alert.alert(
        t("settings.importData") + " Error",
        error instanceof Error ? error.message : "Could not import data."
      );
    }
  };

  // Helper function to merge arrays while avoiding duplicate IDs
  const mergeArraysWithoutDuplicates = (
    currentArray: any[],
    importedArray: any[]
  ) => {
    // Create a map of existing IDs for quick lookup
    const existingIds = new Set(currentArray.map((item) => item.id));

    // Filter out items from importedArray that already exist in currentArray
    const uniqueImportedItems = importedArray.filter(
      (item) => !existingIds.has(item.id)
    );

    // Return the merged array
    return [...currentArray, ...uniqueImportedItems];
  };

  const renderTimeModuleItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<TimeModule>) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(item.name);
    const inputRef = useRef<TextInput>(null);

    const handleEdit = () => {
      setIsEditing(true);
      setTempName(item.name);
      inputRef.current?.focus();
    };

    const handleSubmit = () => {
      if (tempName.trim()) {
        dispatch({
          type: "UPDATE_TIME_MODULE",
          payload: { id: item.id, name: tempName },
        });
        setIsEditing(false);
      }
    };
    const handleCancel = () => {
      setTempName(item.name); // Reset to original name
      setIsEditing(false);
    };

    return (
      <TouchableWithoutFeedback onPress={() => isEditing && handleSubmit()}>
        <TouchableOpacity
          onLongPress={drag}
          style={[styles.listItem, isActive && styles.activeListItem]}
          activeOpacity={0.8}
        >
          <Ionicons
            name="reorder-three-outline"
            size={24}
            color={Colors.textSecondary}
            style={styles.dragHandleIcon}
          />
          <View style={styles.moduleInfoContainer}>
            <TextInput
              ref={inputRef}
              style={[styles.itemName, isEditing && styles.itemNameEditing]}
              value={isEditing ? tempName : item.name}
              editable={isEditing}
              onChangeText={setTempName}
              onSubmitEditing={handleSubmit}
              selectTextOnFocus
              returnKeyType="done"
            />
            {item.startTime ? (
              <View style={styles.timeContainer}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => showModuleTimePicker(item.id)}
                >
                  <Text style={styles.timeButtonText}>
                    {t("settings.startTimeOfDay")}: {item.startTime}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleClearModuleTime(item.id)}
                  style={styles.clearTimeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={Colors.error}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <></>
              // Uncomment if you want to show the button to add start time
              // <TouchableOpacity
              //   style={styles.addTimeButton}
              //   onPress={() => showModuleTimePicker(item.id)}
              // >
              //   <Text style={styles.addTimeText}>+ {t("settings.addStartTime")}</Text>
              // </TouchableOpacity>
            )}
          </View>
          <View style={styles.itemActionButtons}>
            {isEditing ? (
              <>
                <TouchableOpacity
                  onPress={handleSubmit}
                  style={styles.iconButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="checkmark-outline"
                    size={22}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCancel}
                  style={styles.iconButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="close-outline"
                    size={22}
                    color={Colors.error}
                  />
                </TouchableOpacity>
              </>
            ) : (
              timeModules.length > 1 && (
                <>
                  <TouchableOpacity
                    onPress={handleEdit}
                    style={styles.iconButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name="pencil-outline"
                      size={22}
                      color={Colors.accent}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteTimeModule(item.id, item.name)}
                    style={styles.iconButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={22}
                      color={Colors.error}
                    />
                  </TouchableOpacity>
                </>
              )
            )}
          </View>
        </TouchableOpacity>
      </TouchableWithoutFeedback>
    );
  };

  // Data for the main FlatList to structure sections
  const sectionsData = [
    { key: "quote", title: "Inspiration" },
    { key: "appSettings", title: t("settings.appSettings") },
    { key: "timeModules", title: t("settings.timeModuleManagement") },
    { key: "importExport", title: t("settings.importExportData") },
    { key: "dataManagement", title: t("settings.dataManagement") },
  ];

  const renderSection = ({ item }: { item: (typeof sectionsData)[0] }) => {
    switch (item.key) {
      case "quote":
        return (
          <View style={styles.quoteSection}>
            <Text style={styles.quoteText}>"{randomQuoteRef.current.text}"</Text>
            <Text style={styles.quoteAuthor}>- {randomQuoteRef.current.author}</Text>
          </View>
        );
      case "appSettings":
        return (
          <View style={styles.section}>
            <Text style={styles.header}>{item.title}</Text>
            
            {/* Day Start Time Setting */}
            <Text style={styles.label}>{t("settings.startTimeOfDay")}</Text>
            <TouchableOpacity
              onPress={() => setIsTimePickerVisible(true)}
              style={styles.timePickerButton}
            >
              <Text style={styles.timePickerText}>
                {newDayStartTime
                  ? newDayStartTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })
                  : t("settings.addStartTime")}
              </Text>
            </TouchableOpacity>
            
            {/* Language Setting */}
            <Text style={styles.label}>{t("settings.changeLanguage")}</Text>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLanguageChange}
            >
              <Ionicons
                name="language-outline"
                size={22}
                color={Colors.background}
                style={styles.buttonIcon}
              />
              <Text style={styles.actionButtonText}>
                {/* { t('settings.switchLanguage') + (t('lang') === 'en')? ' Arabic' : ' الانجليزية'} */}
                {`${t('settings.switchLanguage')}${t('lang') === 'en' ? ' Arabic' : 'انجليزية'}`}
              </Text>
            </TouchableOpacity>
          </View>
        );
      case "timeModules":
        return (
          <View style={styles.section}>
            <Text style={styles.header}>{item.title}</Text>
            <DraggableFlatList
              data={timeModules}
              renderItem={renderTimeModuleItem}
              keyExtractor={(tm) => tm.id}
              onDragEnd={({ data }) =>
                dispatch({ type: "REORDER_TIME_MODULES", payload: data })
              }
              containerStyle={{ marginBottom: 10 }} // Add some bottom margin to the list itself
              scrollEnabled={false} // Disable DraggableFlatList's own scroll
            />
            <View style={styles.addSection}>
              <Text style={styles.label}>{t("settings.addTimeModule")}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("settings.addTimeModulePlaceholder")}
                value={moduleToRename?.name}
                onChangeText={(v) => {
                  setModuleToRename((prev) => ({
                    id: prev?.id || "",
                    name: v,
                  }));
                }}
                placeholderTextColor={Colors.textSecondary}
              />
              <TouchableOpacity
                onPress={handleAddTimeModule}
                style={
                  moduleToRename?.name?.trim()
                    ? styles.addButton
                    : styles.addButtonDisabled
                }
                disabled={!moduleToRename?.name?.trim()}
              >
                <Text style={styles.addButtonText}>{t("settings.addModuleButton")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case "importExport":
        return (
          <View style={styles.section}>
            <Text style={styles.header}>{item.title}</Text>
            <View style={styles.importExportButtonsContainer}>
              <TouchableOpacity
                onPress={handleImportHabits}
                style={[styles.actionButtonRow, styles.secondaryButton]}
              >
                <Ionicons
                  name="arrow-down-circle-outline"
                  size={22}
                  color={Colors.background}
                  style={styles.buttonIcon}
                />
                <Text style={styles.secondaryButtonText}>{t("settings.importData")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleExportHabits}
                style={[styles.actionButtonRow, styles.secondaryButton]}
              >
                <Ionicons
                  name="arrow-up-circle-outline"
                  size={22}
                  color={Colors.background}
                  style={styles.buttonIcon}
                />
                <Text style={styles.secondaryButtonText}>{t("settings.exportData")}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.infoText}>
              {t("settings.importExportDescription")}
            </Text>
          </View>
        );
      case "dataManagement":
        return (
          <View style={styles.section}>
            <Text style={styles.header}>{item.title}</Text>
            <TouchableOpacity
              onPress={handleResetLogs}
              style={styles.resetButton}
            >
              <Ionicons
                name="refresh-circle-outline"
                size={22}
                color={Colors.text}
                style={styles.buttonIcon}
              />
              <Text style={styles.resetButtonText}>{t("settings.resetData")}</Text>
            </TouchableOpacity>
            <Text style={styles.infoText}>
              {t("settings.resetDataDescription")}
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <FlatList
        data={sectionsData}
        renderItem={renderSection}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.flatListContainer}
        showsVerticalScrollIndicator={false}
      />

      {isTimePickerVisible && newDayStartTime && (
        <DateTimePicker
          value={newDayStartTime}
          mode="time"
          display="default"
          onChange={handleDayStartTimeChange}
        />
      )}

      {moduleToRename?.id && (
        <DateTimePicker
          value={selectedModuleTimeValue}
          mode="time"
          display="default"
          onChange={handleModuleTimeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flatListContainer: {
    // Renamed for clarity
    padding: 15,
    paddingBottom: 30, // Ensure space at the bottom
  },
  section: {
    marginBottom: 20,
    backgroundColor: Colors.surface,
    borderRadius: 12, // More rounded
    padding: 15,
    elevation: 2,
    shadowColor: Colors.darkGrey,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: Platform.OS === "ios" ? 1 : 0,
    borderColor: Colors.lightGrey,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: Colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey,
    paddingBottom: 10,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGrey,
    paddingHorizontal: 10,
    marginBottom: 8,
    borderRadius: 8,
  },
  activeListItem: { backgroundColor: Colors.primary }, // Highlight active drag item
  dragHandleIcon: { marginRight: 10, color: Colors.grey },
  itemIcon: { marginRight: 12 }, // Keep if used elsewhere
  itemName: {
    fontSize: 17,
    color: Colors.text,
    fontWeight: "500",
    textAlignVertical: "bottom",
  },
  moduleInfoContainer: { flex: 1, justifyContent: "center" },
  itemActionButtons: { flexDirection: "row", alignItems: "center" }, // Renamed
  iconButton: { paddingHorizontal: 8 }, // Spacing for icons
  addSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.grey,
  },
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
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: Colors.textSecondary,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
  },
  timePickerButton: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.grey,
  },
  timePickerText: { color: Colors.primary, fontSize: 18, fontWeight: "bold" },
  addButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  addButtonDisabled: {
    backgroundColor: Colors.grey,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  addButtonText: { color: Colors.surface, fontSize: 16, fontWeight: "bold" },
  resetButton: {
    backgroundColor: Colors.error,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
  },
  resetButtonText: { color: Colors.text, fontSize: 16, fontWeight: "bold" },
  importExportButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
    marginBottom: 5,
  },
  actionButtonRow: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  secondaryButton: { backgroundColor: Colors.accent },
  buttonIcon: { marginRight: 8 },
  secondaryButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: "bold",
  }, // Changed color for better contrast
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 25,
    width: "85%",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 15,
    color: Colors.text,
    textAlign: "center",
  },
  modalText: {
    marginBottom: 15,
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.grey,
    borderRadius: 8,
    padding: 12,
    marginBottom: 25,
    color: Colors.text,
    fontSize: 16,
    backgroundColor: Colors.background,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
    minWidth: 80,
    alignItems: "center",
  },
  modalCancelButton: { backgroundColor: Colors.grey }, // Specific style for cancel
  modalConfirmButton: { backgroundColor: Colors.primary },
  modalButtonText: { color: Colors.surface, fontWeight: "bold", fontSize: 15 },
  modalCancelButtonText: {
    color: Colors.text,
    fontWeight: "bold",
    fontSize: 15,
  }, // Text color for cancel
  // Time module specific time styles
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    justifyContent: "space-between",
  },
  timeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  timeButtonText: { fontSize: 13, color: Colors.primary, fontWeight: "500" },
  clearTimeButton: { padding: 5 /* For easier touch */ },
  addTimeButton: { marginTop: 6, alignSelf: "flex-start", paddingVertical: 3 },
  addTimeText: { color: Colors.accent, fontSize: 14, fontWeight: "500" },
  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1002,
  },
  menuBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  menuContent: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 25,
    minWidth: 160,
    alignItems: "center",
    elevation: 12,
    zIndex: 1003,
    // position, top, left set dynamically
  },
  menuItem: {
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  itemNameEditing: {
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.background,
  },
  themeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginVertical: 10,
  },
  themeOption: {
    padding: 10,
    margin: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.lightGrey,
    width: 100,
  },
  selectedTheme: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  themeColorSample: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.grey,
  },
  themeText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  selectedThemeText: {
    fontWeight: "bold",
    color: Colors.primary,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey,
    marginBottom: 10,
  },
  dropdownButtonText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 10,
  },
  dropdownContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 5,
    width: Dimensions.get("window").width * 0.8,
    maxHeight: 300,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGrey,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.background,
  },
  dropdownItemText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 10,
    flex: 1,
  },
  dropdownItemTextSelected: {
    fontWeight: "bold",
    color: Colors.primary,
  },
  colorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey,
  },
  quoteSection: {
    marginBottom: 20,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: Colors.darkGrey,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: Platform.OS === "ios" ? 1 : 0,
    borderColor: Colors.lightGrey,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  quoteText: {
    fontSize: 16,
    fontStyle: "italic",
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 10,
  },
  quoteAuthor: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "right",
    fontWeight: "500",
  },
  actionButton: {
    backgroundColor: Colors.accent,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  actionButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
});
