import { LocaleTexts } from "../../types/index";
const ar: LocaleTexts = {
  lang:'ar',
  questionMark: '؟',
  habits: {
    title: 'العادات',
    name: 'العادات',
    edit: 'تعديل',
    delete: 'حذف',
    'deleteAlert': {
      "title": "حذف العادة",
      "message1": "متأكد انك عايز تمسح العادة دي",
      "message2": "الخطوة دي مش ممكن التراجع عنها. هتخسر كل البيانات المرتبطة بالعادة عدى الأهداف المرتبطة.",
      "confirmButton": "حذف",
      "cancelButton": "الغاء"
    },
    noHabitsDue: 'لا توجد عادات مطلوبة اليوم',
    addeditScreen: {
      addScreenTitle: 'إضافة عادة',
      editScreenTitle: 'تعديل عادة',
      habitTitle: 'عنوان العادة',
      habitTitlePlaceholder: 'مثال: قراءة جزء، ركعة الوتر...',
      habitColor: 'اللون',
      habitTimeModule: 'تعيين للوحدة الزمنية',
      selectGoal: 'اختر هدف أو اتركها فارغة...',
      habitGoal: 'ربط بهدف (اختياري)',
      trackHabitBy: 'تتبع العادة بواسطة',
      completionStatus: 'إكمال (✓/✕)',
      counterStatus: 'عداد (+/-)',
      targetValue: 'القيمة المستهدفة',
      changeBy: 'تغيير بواسطة',
      habitRepetition: 'تكرار العادة',
      repetitionType: {
        daily: 'يومي',
        weekly: 'أسبوعي'
      },
      advancedOptions: 'خيارات متقدمة',
      startDate: 'تاريخ البداية',
      endDate: 'تاريخ النهاية',
      forever: 'الى ان يتوفانا الله',
      fromever: 'من زمان',
      clearStartDate: 'مسح تاريخ البداية',
      clearEndDate: 'مسح تاريخ النهاية',
      addButton: 'إضافة عادة',
      editButton: 'تحديث العادة',
      daysOfWeek: 'أيام الأسبوع'
    },
    allHabits: {
      title: 'كل العادات',
      repetitionType: {
        daily: 'يومي',
        weekly: 'أسبوعي'
      },
      createdAt: 'تم الإنشاء',
      startDate: 'يبدأ',
      endDate: 'تنتهي'
    },
    repetitionType: {
      daily: 'يومي',
      weekly: {
        counter: 'عداد',
        completion: 'إكمال',
        everyDay: 'يومية'
      }
    }
  },
  tabs: {
    habits: 'العادات',
    stats: 'الإحصائيات',
    goals: 'الأهداف',
    settings: 'الإعدادات'
  },
  stats: {
    title: 'إحصائيات',
    habitsTableTitle: 'جدول العادات',
    habitsColumn: 'العادات',
    currentWeekStart: 'بداية الأسبوع الحالي',
    currentMonthStart: 'بداية الشهر الحالي',
    habitStatus: {
      completed: 'خلصت',
      exceeded: 'زيادة',
      missed: 'فاتت',
      notDue: 'مش يومها',
      partial: 'قضاء',
      nodata: 'فاضية'
    },
    weeklyCounterTableTitle: 'جدول العد الأسبوعي',
    weeklyCounterColumn: 'عداد أسبوعي',
    weeklyCounterStatus: {
      completed: 'خلصت',
      exceeded: 'زيادة',
      noprogress: 'مفيش تقدم',
      partialprogress: 'تقدم جزئي',
      notDue: 'مش مطلوبة'
    }
  },
  goals: {
    title: 'الأهداف',
    goals: 'الأهداف',
    goal: 'الهدف',
    habits: 'العادات',
    edit: 'تعديل',
    editMe: 'غير اسمي!',
    done: 'تم',
    delete: 'حذف',
    add: 'إضافة',
    pause: 'فاصل',
    resume: 'استئناف',
    modifyStructure: 'العادات',
    selectHabits: 'اختيار العادات',
    "noHabitsIntro": "مفيش عادات خالص.",
    "noHabitsDescription": "ضيف عادات جديدة عشان الغي ربط عادات من الاهداف القديمة عشان ما ينفعش تربط عادة باكتر من هدف.",
    deleteAlert: {
      title: 'حذف الهدف',
      message1: 'متأكد انك عايز تمسح الهدف ده',
      message2: 'الخطوة دي مش ممكن التراجع عنها. هتخسر كل البيانات المرتبطة بالهدف ده.',
      confirmButton: 'حذف',
      cancelButton: 'الغاء'
    }
  },
  weekdays: {
    saturday: 'السبت',
    sunday: 'الأحد',
    monday: 'الإثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
    friday: 'الجمعة'
  },
  weekDaysShort: {
    saturday: 'س',
    sunday: 'ح',
    monday: 'إ',
    tuesday: 'ث',
    wednesday: 'ر',
    thursday: 'خ',
    friday: 'ج'
  },
  settings: {
    title: 'الإعدادات',
    startTimeOfDay: 'اليوم يبدأ من',
    timeModuleManagement: 'إدارة الوحدات الزمنية',
    addStartTime: 'تعيين وقت البداية',
    addTimeModule: 'إضافة وحدة زمنية',
    addTimeModulePlaceholder: 'ادخل اسم الوحدة',
    addModuleButton: 'إضافة وحدة',
    importExportData: 'استيراد/تصدير البيانات',
    importData: 'استيراد البيانات',
    exportData: 'تصدير البيانات',
    importExportDescription: 'عمل نسخة احتياطية واستعادة بيانات العادات',
    dataManagement: 'إدارة البيانات',
    resetData: 'إعادة تعيين كل البيانات',
    resetDataDescription: 'تحذير: هذا سيحذف كل عاداتك وسجلاتك',
    appSettings: 'إعدادات التطبيق',
    changeLanguage: 'تغيير اللغة',
    changeTheme: 'تغيير السمة',
    switchLanguage: 'تبديل اللغة لل',
  }
};
export default ar;