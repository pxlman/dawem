import { LocaleTexts } from '../../types/index';
const en: LocaleTexts = {
  lang: 'en',
  questionMark: '?',
  "habits": {
    "title": "Habits",
    "name": "habits",
    "edit": "Edit",
    "delete": "Delete",
    'deleteAlert': {
      "title": "Delete Habit",
      "message1": "Are you sure you want to delete this habit",
      'message2': "This action cannot be undone.",
      "confirmButton": "Delete",
      "cancelButton": "Cancel"
    },
    "noHabitsDue": "No habits due today",
    "addeditScreen": {
      "addScreenTitle": "Add Habit",
      "editScreenTitle": "Edit Habit",
      "habitTitle": "Habit title",
      "habitTitlePlaceholder": "e.g. قراءة جزء, ركعة الوتر...",
      "habitColor": "Color",
      "habitTimeModule": "Assign to time module",
      "selectGoal": "Select Goal or none...",
      "habitGoal": "Link to goal (optional)",
      "trackHabitBy": "Track habit by",
      "completionStatus": "Completion (✓/✕)",
      "counterStatus": "Counter (+/-)",
      "targetValue": "Target value",
      "changeBy": "Change by",
      "habitRepetition": "Habit repetition",
      "repetitionType": {
        "daily": "Daily",
        "weekly": "Weekly"
      },
      "advancedOptions": "Advanced options",
      "startDate": "Start date",
      "endDate": "End date",
      "forever": "Forever",
      "fromever": "From ever",
      "clearStartDate": "Clear start date",
      "clearEndDate": "Clear end date",
      "addButton": "ADD HABIT",
      "editButton": "UPDATE HABIT",
      "daysOfWeek": "Days of the week"
    },
    "allHabits": {
      "title": "All Habits",
      "repetitionType": {
        "daily": "Daily",
        "weekly": "Weekly"
      },
      "createdAt": "Created",
      "startDate": "Starts",
      "endDate": "Ends"
    },
    "repetitionType": {
      "daily": "Daily",
      "weekly": {
        "counter": "Counter",
        "completion": "Completion",
        "everyDay": "Every day"
      }
    }
  },
  "tabs":{
    "habits": "Habits",
    "stats": "Stats",
    "goals": "Goals",
    "settings": "Settings"
  },
  "stats":{
    "title": "Statistics",
    "habitsTableTitle": "Habits Table",
    "habitsColumn": "Habits",
    "currentWeekStart": "Current Week Start",
    "currentMonthStart": "Current Month Start",
    "habitStatus": {
      "completed": "Completed",
      "exceeded": "Exceeded",
      "missed": "Missed",
      "notDue": "Not Due",
      "partial": "Partial",
      "nodata": "No Data"
    },
    "weeklyCounterTableTitle": "Weekly Counter Table",
    "weeklyCounterColumn": "Weekly Counter",
    "weeklyCounterStatus":{
      "completed": "Completed",
      "exceeded": "Exceeded",
      "noprogress": "No Progress",
      "partialprogress": "Partial Progress",
      "notDue": "Not Due"
    }
  },
  "goals": {
    "title": "Goals",
    "goals": "Goals",
    "goal": "Goal",
    "habits": "Habits",
    "edit": "Edit",
    "editMe": "Edit me!",
    "done": "Done",
    "delete": "Delete",
    "add": "Add",
    "pause": "Pause",
    "resume": "Resume",
    "modifyStructure": "Modify Structure",
    "selectHabits": "Select Habits",
    "noHabitsIntro": "No available habits.",
    "noHabitsDescription": "Create new habits first or remove habits from other goals.",
    "deleteAlert": {
      "title": "Delete Goal",
      "message1": "Are you sure you want to delete this goal",
      "message2": "This action cannot be undone.",
      "confirmButton": "Delete",
      "cancelButton": "Cancel"
    }
  },
  "weekdays": {
    "saturday": "Saturday",
    "sunday": "Sunday",
    "monday": "Monday",
    "tuesday": "Tuesday",
    "wednesday": "Wednesday",
    "thursday": "Thursday",
    "friday": "Friday"
  },
  "weekDaysShort": {
    "saturday": "Sat",
    "sunday": "Sun",
    "monday": "Mon",
    "tuesday": "Tue",
    "wednesday": "Wed",
    "thursday": "Thu",
    "friday": "Fri"
  },
  "settings": {
    "title": "Settings",
    "startTimeOfDay": "Day starts at",
    "timeModuleManagement": "Time Module Management",
    "addStartTime": "Set start time",
    "addTimeModule": "Add time module",
    "addTimeModulePlaceholder": "Enter module name",
    "addModuleButton": "Add Module",
    "importExportData": "Import/Export Data",
    "importData": "Import Data",
    "exportData": "Export Data",
    "importExportDescription": "Backup and restore your habit data",
    "dataManagement": "Data Management",
    "resetData": "Reset All Data",
    "resetDataDescription": "Warning: This will delete all your habits and logs",
    "appSettings": "App Settings",
    "changeLanguage": "Change Language",
    "changeTheme": "Change Theme",
    "switchLanguage": "Switch Language",
  }
};

export default en;