/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  Calendar,
  X,
  Target,
  History,
  ChevronRight,
  ArrowLeft,
  Upload,
  Settings,
  Edit2,
  Save,
  Eye,
  EyeOff,
  Cloud, Download,
  LogOut, Sun, Moon,
  LogIn,
  ArrowUpDown,
  User as UserIcon,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Lock,
  Unlock,
  Info,
  ChevronLeft
} from 'lucide-react';
import { Task } from './types';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: { userId: auth.currentUser?.uid },
    operationType,
    path
  }
  console.error('Firestore Error: ', errInfo);
}


// Helper to get today's date string YYYY-MM-DD
const getTodayKey = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateToKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  const [logs, setLogs] = useState<Record<string, Task[]>>(() => {
    const saved = localStorage.getItem('tryrating_all_logs');
    if (saved) return JSON.parse(saved);
    
    // Migration: check old peroptyx keys
    const oldAllLogs = localStorage.getItem('peroptyx_all_logs');
    if (oldAllLogs) {
      const data = JSON.parse(oldAllLogs);
      localStorage.setItem('tryrating_all_logs', oldAllLogs);
      return data;
    }

    const legacy = localStorage.getItem('peroptyx_tasks');
    if (legacy) {
      const initialLogs = { [getTodayKey()]: JSON.parse(legacy) };
      localStorage.setItem('tryrating_all_logs', JSON.stringify(initialLogs));
      return initialLogs;
    }
    return {};
  });

  const [currentDateKey, setCurrentDateKey] = useState(getTodayKey());
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    const saved = localStorage.getItem('tryrating_daily_goal') || localStorage.getItem('peroptyx_daily_goal');
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val)) {
        if (val > 24) {
          const hours = val / 60;
          localStorage.setItem('tryrating_daily_goal', hours.toString());
          return hours;
        }
        localStorage.setItem('tryrating_daily_goal', val.toString());
        return val;
      }
    }
    return 2; // default 2 hours
  });
  
  const [view, setView] = useState<'tracker' | 'history'>('tracker');
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);
  
  const [inputValue, setInputValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('tryrating_categories');
    return saved ? JSON.parse(saved) : ['General', 'Search', 'Image', 'Mapping', 'Side-by-Side', 'Other'];
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("Install prompt is not ready. You may need to open the app in a new tab.");
      return;
    }
    
    if (window !== window.parent) {
      alert("To install the app, please open it in a new tab by clicking the arrow icon in the top right corner of the preview window.");
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    } catch (err) {
      console.error(err);
      alert("Installation prompt failed. Please try opening the app in a new tab.");
    }
  };

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showEarnings, setShowEarnings] = useState<boolean>(() => {
    const saved = localStorage.getItem('tryrating_show_earnings');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [baseRate, setBaseRate] = useState<number>(() => {
    const saved = localStorage.getItem('tryrating_base_rate');
    const val = saved ? parseInt(saved, 10) : 2000;
    return isNaN(val) ? 2000 : val;
  });
  const [premiumRate, setPremiumRate] = useState<number>(() => {
    const saved = localStorage.getItem('tryrating_premium_rate');
    const val = saved ? parseInt(saved, 10) : 2500;
    return isNaN(val) ? 2500 : val;
  });
  const [tempBaseRate, setTempBaseRate] = useState(baseRate.toString());
  const [tempPremiumRate, setTempPremiumRate] = useState(premiumRate.toString());
  const [showSubmitPaymentModal, setShowSubmitPaymentModal] = useState(false);
  const [submissionPeriod, setSubmissionPeriod] = useState<'current' | 'previous'>('current');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');

  const [tempGoal, setTempGoal] = useState(dailyGoal.toString());
  
  // 20-Hour Limit in 7-Day Window States
  const [weeklyLimit, setWeeklyLimit] = useState<number>(() => {
    const saved = localStorage.getItem('tryrating_weekly_limit');
    const val = saved ? parseFloat(saved) : 20;
    return isNaN(val) || val <= 0 ? 20 : val;
  });
  const [weeklyWindowType, setWeeklyWindowType] = useState<'calendar' | 'rolling'>(() => {
    const saved = localStorage.getItem('tryrating_weekly_window_type');
    return saved === 'rolling' ? 'rolling' : 'calendar';
  });
  const [limitEnforcement, setLimitEnforcement] = useState<'confirm' | 'block' | 'warn'>(() => {
    const saved = localStorage.getItem('tryrating_limit_enforcement');
    return (saved === 'block' || saved === 'warn' || saved === 'confirm') ? saved : 'confirm';
  });

  const [tempWeeklyLimit, setTempWeeklyLimit] = useState(weeklyLimit.toString());
  const [tempWeeklyWindowType, setTempWeeklyWindowType] = useState<'calendar' | 'rolling'>(weeklyWindowType);
  const [tempLimitEnforcement, setTempLimitEnforcement] = useState<'confirm' | 'block' | 'warn'>(limitEnforcement);

  const [pendingOverLimitTask, setPendingOverLimitTask] = useState<{ ert: number; category: string; projectedHours: number; currentHours: number } | null>(null);
  const [showStrictBlockModal, setShowStrictBlockModal] = useState<boolean>(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return formatDateToKey(d);
  });
  
  const [endDate, setEndDate] = useState(getTodayKey());
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [sortOption, setSortOption] = useState<'date-desc' | 'date-asc' | 'hours-desc' | 'hours-asc'>('date-desc');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [lastDeletedTask, setLastDeletedTask] = useState<{task: Task, dateKey: string} | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const isIframe = window.self !== window.top;
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [lastBackup, setLastBackup] = useState<string>(new Date().toLocaleTimeString());
  const inputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('tryrating_dark_mode');
    return saved !== null ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('tryrating_dark_mode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Ensure we don't sync on initial load
  const isInitializingRef = useRef(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setIsSyncing(true);
        try {
          // Load settings
          const profileDoc = await getDoc(doc(db, 'users', u.uid));
          if (profileDoc.exists()) {
            const data = profileDoc.data();
            if (data.categories) setCategories(data.categories);
            if (data.dailyGoal) setDailyGoal(data.dailyGoal);
            if (data.baseRate) setBaseRate(data.baseRate);
            if (data.premiumRate) setPremiumRate(data.premiumRate);
            if (data.showEarnings !== undefined) setShowEarnings(data.showEarnings);
            if (data.weeklyLimit) setWeeklyLimit(data.weeklyLimit);
            if (data.weeklyWindowType) setWeeklyWindowType(data.weeklyWindowType);
            if (data.limitEnforcement) setLimitEnforcement(data.limitEnforcement);
          } else {
            // First time logging in, push local settings to Firebase
            await setDoc(doc(db, 'users', u.uid), {
              categories,
              dailyGoal,
              baseRate,
              premiumRate,
              showEarnings,
              weeklyLimit,
              weeklyWindowType,
              limitEnforcement
            });
          }

          // Load logs
          const logsCol = collection(db, 'users', u.uid, 'logs');
          const logsSnap = await getDocs(logsCol);
          const newLogs: Record<string, Task[]> = {};
          logsSnap.forEach(docSnap => {
            newLogs[docSnap.id] = docSnap.data().tasks || [];
          });
          
          const currentLocalLogs = prevLogsRef.current;
          const mergedLogs = { ...currentLocalLogs };
          
          // Merge remote into local
          for (const date in newLogs) {
             if (!mergedLogs[date] || newLogs[date].length > mergedLogs[date].length) {
                 mergedLogs[date] = newLogs[date];
             }
          }
          
          // Push any local data that is missing or shorter on remote
          for (const date in mergedLogs) {
             if (!newLogs[date] || mergedLogs[date].length > newLogs[date].length) {
                 try {
                     await setDoc(doc(db, 'users', u.uid, 'logs', date), {
                         userId: u.uid,
                         dateKey: date,
                         tasks: JSON.parse(JSON.stringify(mergedLogs[date]))
                     });
                 } catch (e) {
                     console.error("Error syncing local log to remote:", e);
                 }
             }
          }
          
          prevLogsRef.current = mergedLogs;
          setLogs(mergedLogs);

        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'users');
        } finally {
          setIsSyncing(false);
          isInitializingRef.current = false;
          setUser(u);
        }
      } else {
        isInitializingRef.current = false;
        setUser(null);
      }
    });
    return unsub;
  }, []);

  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      console.error('Sign in error:', error);
      if (error.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        setAuthError(`Domain ${domain} is not authorized in Firebase Console. Add it to Authentication > Settings > Authorized domains.`);
      } else if (error.code === 'auth/popup-blocked') {
        setAuthError('Your browser blocked the sign-in popup. Please click the "Open in new tab" icon (the square with an arrow) in the top right of the preview pane to sign in.');
      } else {
        setAuthError(error.message || 'Failed to sign in. Please allow popups or open the app in a new tab.');
      }
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    try {
      await logout();
    } catch (error: any) {
      console.error('Sign out error:', error);
      setAuthError(error.message || 'Failed to sign out');
    }
  };

  const syncSettingsToFirebase = async () => {
    if (!user || isInitializingRef.current) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        categories,
        dailyGoal,
        baseRate,
        premiumRate,
        showEarnings,
        weeklyLimit,
        weeklyWindowType,
        limitEnforcement
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const syncDateLogToFirebase = async (dateKey: string, dayTasks: Task[]) => {
    if (!user || isInitializingRef.current) return;
    try {
      const safeTasks = JSON.parse(JSON.stringify(dayTasks));
      await setDoc(doc(db, 'users', user.uid, 'logs', dateKey), {
        userId: user.uid,
        dateKey,
        tasks: safeTasks
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/logs/${dateKey}`);
    }
  };

  const tasks = logs[currentDateKey] || [];
  const prevLogsRef = useRef<Record<string, Task[]>>(logs);
  const prevUserRef = useRef<User | null>(null);

  // Save logs whenever they change
  useEffect(() => {
    localStorage.setItem('tryrating_all_logs', JSON.stringify(logs));
    
    if (user && !isInitializingRef.current) {
      const userChanged = prevUserRef.current?.uid !== user.uid;
      // Find which dates changed
      for (const dateKey in logs) {
        if (logs[dateKey] !== prevLogsRef.current[dateKey] && !userChanged) {
          syncDateLogToFirebase(dateKey, logs[dateKey]);
        }
      }
      // Handle deleted dates (cleared days)
      if (!userChanged) {
        for (const dateKey in prevLogsRef.current) {
          if (!logs[dateKey]) {
            syncDateLogToFirebase(dateKey, []);
          }
        }
      }
    }
    
    prevLogsRef.current = logs;
    prevUserRef.current = user;
  }, [logs, user]);

  useEffect(() => {
    localStorage.setItem('tryrating_daily_goal', dailyGoal.toString());
    syncSettingsToFirebase();
  }, [dailyGoal]);

  useEffect(() => {
    localStorage.setItem('tryrating_categories', JSON.stringify(categories));
    syncSettingsToFirebase();
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('tryrating_show_earnings', JSON.stringify(showEarnings));
    syncSettingsToFirebase();
  }, [showEarnings]);

  useEffect(() => {
    localStorage.setItem('tryrating_base_rate', baseRate.toString());
    syncSettingsToFirebase();
  }, [baseRate]);

  useEffect(() => {
    localStorage.setItem('tryrating_premium_rate', premiumRate.toString());
    syncSettingsToFirebase();
  }, [premiumRate]);

  useEffect(() => {
    localStorage.setItem('tryrating_weekly_limit', weeklyLimit.toString());
    syncSettingsToFirebase();
  }, [weeklyLimit]);

  useEffect(() => {
    localStorage.setItem('tryrating_weekly_window_type', weeklyWindowType);
    syncSettingsToFirebase();
  }, [weeklyWindowType]);

  useEffect(() => {
    localStorage.setItem('tryrating_limit_enforcement', limitEnforcement);
    syncSettingsToFirebase();
  }, [limitEnforcement]);

  const addCategory = () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      setCategories([...categories, newCategoryName.trim()]);
      setNewCategoryName('');
    }
  };

  const deleteCategory = (cat: string) => {
    if (categories.length > 1) {
      setCategories(categories.filter(c => c !== cat));
      if (selectedCategory === cat) setSelectedCategory(categories[0] === cat ? categories[1] : categories[0]);
    } else {
      alert("You must have at least one category.");
    }
  };

  const startEditingCategory = (index: number) => {
    setEditingCategoryIndex(index);
    setEditingCategoryValue(categories[index]);
  };

  const saveEditedCategory = () => {
    if (editingCategoryIndex !== null && editingCategoryValue.trim()) {
      const updated = [...categories];
      const oldVal = updated[editingCategoryIndex];
      updated[editingCategoryIndex] = editingCategoryValue.trim();
      setCategories(updated);
      if (selectedCategory === oldVal) setSelectedCategory(editingCategoryValue.trim());
      setEditingCategoryIndex(null);
    }
  };

  // Regular interval background backup
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem('tryrating_logs_backup', JSON.stringify(logs));
      setLastBackup(new Date().toLocaleTimeString());
    }, 30000);

    return () => clearInterval(interval);
  }, [logs]);

  interface WindowDayStat {
    dateKey: string;
    dayName: string;
    shortDay: string;
    dateLabel: string;
    minutes: number;
    hours: number;
    isToday: boolean;
    isSelected: boolean;
    taskCount: number;
  }

  const getWeeklyWindowStats = (refDateKey: string = currentDateKey, type: 'calendar' | 'rolling' = weeklyWindowType) => {
    const [y, m, d] = refDateKey.split('-').map(Number);
    const refDate = new Date(y, m - 1, d);
    const todayKey = getTodayKey();
    
    let days: WindowDayStat[] = [];
    let windowLabel = '';
    let resetInfo = '';
    let timeUntilReset = '';
    let oldestDayInfo: { label: string; hours: number } | null = null;
    let nextResetDate: Date;
    
    if (type === 'calendar') {
      // Monday to Sunday calendar week
      const dayOfWeek = refDate.getDay(); // 0 is Sun, 1 is Mon...
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(y, m - 1, d + diffToMonday);
      
      for (let i = 0; i < 7; i++) {
        const cur = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        const key = formatDateToKey(cur);
        const dayTasks = logs[key] || [];
        const mins = dayTasks.reduce((acc, t) => acc + t.ert, 0);
        days.push({
          dateKey: key,
          dayName: cur.toLocaleDateString(undefined, { weekday: 'long' }),
          shortDay: cur.toLocaleDateString(undefined, { weekday: 'short' }),
          dateLabel: cur.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          minutes: mins,
          hours: mins / 60,
          isToday: key === todayKey,
          isSelected: key === currentDateKey,
          taskCount: dayTasks.length
        });
      }
      
      windowLabel = `Calendar Week (Mon ${days[0].dateLabel} – Sun ${days[6].dateLabel})`;
      
      // Next reset: next Monday at 00:00:00
      nextResetDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);
      nextResetDate.setHours(0, 0, 0, 0);
      
      const now = new Date();
      const msLeft = nextResetDate.getTime() - now.getTime();
      if (msLeft > 0) {
        const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        timeUntilReset = daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : `${hoursLeft}h`;
        resetInfo = `Resets next Monday, ${nextResetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at 00:00 (in ${timeUntilReset})`;
      } else {
        resetInfo = `Resets next Monday at 00:00`;
      }
    } else {
      // Rolling 7-day window ending on refDate
      for (let i = 6; i >= 0; i--) {
        const cur = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() - i);
        const key = formatDateToKey(cur);
        const dayTasks = logs[key] || [];
        const mins = dayTasks.reduce((acc, t) => acc + t.ert, 0);
        days.push({
          dateKey: key,
          dayName: cur.toLocaleDateString(undefined, { weekday: 'long' }),
          shortDay: cur.toLocaleDateString(undefined, { weekday: 'short' }),
          dateLabel: cur.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          minutes: mins,
          hours: mins / 60,
          isToday: key === todayKey,
          isSelected: key === currentDateKey,
          taskCount: dayTasks.length
        });
      }
      
      windowLabel = `Rolling 7 Days (${days[0].dateLabel} – ${days[6].dateLabel})`;
      
      const oldest = days[0];
      oldestDayInfo = {
        label: `${oldest.shortDay} (${oldest.dateLabel})`,
        hours: oldest.hours
      };
      
      nextResetDate = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + 1);
      nextResetDate.setHours(0, 0, 0, 0);
      const now = new Date();
      const msLeft = nextResetDate.getTime() - now.getTime();
      if (msLeft > 0) {
        const hoursLeft = Math.max(1, Math.floor(msLeft / (1000 * 60 * 60)));
        timeUntilReset = `${hoursLeft}h`;
        resetInfo = oldest.hours > 0 
          ? `${oldest.hours.toFixed(1)}h from ${oldestDayInfo.label} rolls off tomorrow at 00:00 (in ${timeUntilReset})` 
          : `Oldest day rolls off tomorrow at 00:00 (in ${timeUntilReset})`;
      } else {
        resetInfo = `Oldest day rolls off tomorrow at 00:00`;
      }
    }
    
    const totalMinutes = days.reduce((acc, d) => acc + d.minutes, 0);
    const totalHours = totalMinutes / 60;
    const remainingMinutes = Math.max(0, weeklyLimit * 60 - totalMinutes);
    const remainingHours = remainingMinutes / 60;
    const isCapReached = totalHours >= weeklyLimit;
    const isNearCap = !isCapReached && totalHours >= Math.max(0, weeklyLimit - 2);
    const percentUsed = Math.min(100, (totalMinutes / (weeklyLimit * 60)) * 100);
    const excessHours = Math.max(0, totalHours - weeklyLimit);

    return {
      days,
      windowLabel,
      resetInfo,
      timeUntilReset,
      oldestDayInfo,
      totalMinutes,
      totalHours,
      remainingMinutes,
      remainingHours,
      isCapReached,
      isNearCap,
      percentUsed,
      excessHours,
      weeklyLimit,
      type
    };
  };

  const commitTask = (ert: number, category: string) => {
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      ert,
      timestamp: Date.now(),
      category,
    };
    
    setLogs(prev => ({
      ...prev,
      [currentDateKey]: [...(prev[currentDateKey] || []), newTask]
    }));
    
    setInputValue('');
    setPendingOverLimitTask(null);
    inputRef.current?.focus();
  };

  const addTask = (e?: FormEvent) => {
    if (e) e.preventDefault();
    
    let ert = 0;
    const value = inputValue.trim().toLowerCase();
    
    if (!value) return;

    // Check for formats like "2h 30m", "1.5h", "45m"
    const hMatch = value.match(/(\d+(?:\.\d+)?)h/);
    const mMatch = value.match(/(\d+(?:\.\d+)?)m/);
    
    if (hMatch || mMatch) {
      const h = hMatch ? parseFloat(hMatch[1]) : 0;
      const m = mMatch ? parseFloat(mMatch[1]) : 0;
      ert = h * 60 + m;
    } else {
      // Fallback to plain number (minutes)
      ert = parseFloat(value);
    }

    if (!isNaN(ert) && ert > 0) {
      const curWeekly = getWeeklyWindowStats(currentDateKey, weeklyWindowType);
      const projectedTotalMins = curWeekly.totalMinutes + ert;
      const projectedHours = projectedTotalMins / 60;

      if (projectedHours > weeklyLimit || curWeekly.isCapReached) {
        if (limitEnforcement === 'block') {
          setShowStrictBlockModal(true);
          return;
        } else if (limitEnforcement === 'confirm') {
          setPendingOverLimitTask({
            ert,
            category: selectedCategory,
            projectedHours,
            currentHours: curWeekly.totalHours
          });
          return;
        }
      }

      commitTask(ert, selectedCategory);
    }
  };

  const removeTask = (id: string, dateKey: string = currentDateKey) => {
    const taskToDelete = logs[dateKey]?.find(t => t.id === id);
    if (!taskToDelete) return;

    setLastDeletedTask({ task: taskToDelete, dateKey });
    setShowUndo(true);

    setLogs(prev => ({
      ...prev,
      [dateKey]: prev[dateKey].filter(t => t.id !== id)
    }));

    // Auto-hide undo after 5 seconds
    setTimeout(() => {
      setShowUndo(prev => {
        if (prev) {
          // Check if it's still the same deleted task (simple check)
          return false;
        }
        return false;
      });
    }, 5000);
  };

  const undoDelete = () => {
    if (!lastDeletedTask) return;

    const { task, dateKey } = lastDeletedTask;
    setLogs(prev => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), task].sort((a, b) => a.timestamp - b.timestamp)
    }));

    setShowUndo(false);
    setLastDeletedTask(null);
  };

  const clearDay = (dateKey: string = currentDateKey) => {
    const dateLabel = dateKey === getTodayKey() ? 'today' : dateKey;
    if (window.confirm(`Clear all tasks for ${dateLabel}?`)) {
      setLogs(prev => {
        const next = { ...prev };
        delete next[dateKey];
        return next;
      });
      if (selectedHistoryDate === dateKey) setSelectedHistoryDate(null);
    }
  };

  const copyLogForDate = (dateKey: string) => {
    const tasksToCopy = logs[dateKey] || [];
    const dateObj = new Date(dateKey + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    let totalErt = 0;
    const taskLines = tasksToCopy.map((t, i) => {
      totalErt += t.ert;
      return `Task ${i + 1}: ${t.ert}m (Cumulative: ${totalErt}m)`;
    });

    const h = Math.floor(totalErt / 60);
    const m = Math.round(totalErt % 60);
    const timeDisplay = h > 0 ? `${h}h ${m}m` : `${totalErt}m`;

    const logText = [
      `TryRating Time Tracker Log - ${formattedDate}`,
      '-'.repeat(30),
      ...taskLines,
      '-'.repeat(30),
      `Total Tasks: ${tasksToCopy.length}`,
      `Total ERT: ${timeDisplay}`,
    ].join('\n');

    navigator.clipboard.writeText(logText).then(() => {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    });
  };

  const handleBulkImport = () => {
    if (!importText.trim()) return;

    const lines = importText.split('\n');
    let currentYear = new Date().getFullYear();
    let currentDate: string | null = null;
    const newLogs: Record<string, Task[]> = { ...logs };

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Match Year (4 digits) at start of line or alone
      if (/^20\d{2}$/.test(trimmed)) {
        currentYear = parseInt(trimmed, 10);
        return;
      }

      // Match Date (D/M or D/M/Y) e.g. 25/7 or 25/7/2024
      const dateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})(\/(\d{2,4}))?$/);
      if (dateMatch) {
        const d = parseInt(dateMatch[1], 10);
        const m = parseInt(dateMatch[2], 10);
        let y = currentYear;
        if (dateMatch[4]) {
          y = parseInt(dateMatch[4], 10);
          if (y < 100) y += 2000;
        }
        currentDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (!newLogs[currentDate]) newLogs[currentDate] = [];
        return;
      }

      if (currentDate) {
        // Handle "2hrs52mins" or similar strings
        // Also handle "1HR 27M"
        const durationPattern = /((\d+)\s*hrs?|(\d+)\s*hr)?\s*((\d+)\s*m(ins?)?|(\d+)\s*mins?)?/i;
        const durationMatch = trimmed.match(durationPattern);
        
        // If it looks like a duration AND isn't just a list of numbers
        if (durationMatch && (durationMatch[2] || durationMatch[3] || durationMatch[5] || durationMatch[7]) && !/^\d+(\s+\d+)*$/.test(trimmed)) {
          const h = parseInt(durationMatch[2] || durationMatch[3] || '0', 10);
          const m = parseInt(durationMatch[5] || durationMatch[7] || '0', 10);
          const totalMins = h * 60 + m;
          
          if (totalMins > 0 && !trimmed.includes('total')) {
             newLogs[currentDate].push({
              id: Math.random().toString(36).substr(2, 9),
              ert: totalMins,
              timestamp: Date.now() + newLogs[currentDate].length,
              category: 'Bulk Import'
            });
            return;
          }
        }

        // Handle space separated numbers
        // Regex to find numbers and decimals, ignoring everything after '='
        const numbersPart = trimmed.split('=')[0].split('total')[0];
        const numbers = numbersPart.match(/\d+(\.\d+)?/g);
        
        if (numbers) {
          numbers.forEach(n => {
            const ert = parseFloat(n);
            if (ert > 0) {
              newLogs[currentDate!].push({
                id: Math.random().toString(36).substr(2, 9),
                ert,
                timestamp: Date.now() + newLogs[currentDate!].length,
                category: 'Bulk Import'
              });
            }
          });
        }
      }
    });

    setLogs(newLogs);
    setShowImportModal(false);
    setImportText('');
    alert('Import completed successfully!');
  };

  const calculateStats = (tasksForStats: Task[]) => {
    const totalMinutes = tasksForStats.reduce((acc, t) => acc + t.ert, 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    const progressPercent = Math.min((totalMinutes / (dailyGoal * 60)) * 100, 100);
    return { totalMinutes, hours, mins, progressPercent };
  };

  const { totalMinutes, hours, mins, progressPercent } = calculateStats(tasks);

  // Period Calculation
  const getPeriodRange = (date: Date) => {
    const d = new Date(date);
    const dayOfMonth = d.getDate();
    let startDate: Date;
    let endDate: Date;

    if (dayOfMonth <= 14) {
      // Period 1: 1st to 14th
      startDate = new Date(d.getFullYear(), d.getMonth(), 1);
      endDate = new Date(d.getFullYear(), d.getMonth(), 14);
    } else {
      // Period 2: 15th to end of month
      startDate = new Date(d.getFullYear(), d.getMonth(), 15);
      endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0); // Last day of current month
    }
    return { startDate, endDate };
  };

  const getPreviousPeriodRange = (date: Date) => {
    const d = new Date(date);
    const dayOfMonth = d.getDate();
    let targetDate: Date;
    if (dayOfMonth <= 14) {
      // If today is 1st-14th, previous was 15th-End of LAST month
      targetDate = new Date(d.getFullYear(), d.getMonth() - 1, 15);
    } else {
      // If today is 15th-End, previous was 1st-14th of THIS month
      targetDate = new Date(d.getFullYear(), d.getMonth(), 1);
    }
    return getPeriodRange(targetDate);
  };

  const calculateForRange = (start: Date, end: Date) => {
    let mins = 0;
    const d = new Date(start);
    while (d <= end) {
      const key = formatDateToKey(d);
      const dayTasks = logs[key] || [];
      mins += dayTasks.reduce((acc, t) => acc + t.ert, 0);
      d.setDate(d.getDate() + 1);
    }
    const hours = mins / 60;
    const rate = hours >= 40 ? premiumRate : baseRate;
    return { hours, rate, earnings: hours * rate };
  };

  // Payment Calculation (Current Period)
  const getBiWeeklyStats = (period: 'current' | 'previous' = 'current') => {
    const now = new Date();
    const { startDate, endDate } = period === 'current' ? getPeriodRange(now) : getPreviousPeriodRange(now);
    const { hours, rate, earnings } = calculateForRange(startDate, endDate);
    return { hoursTotal: hours, rate, earnings, startDate, endDate };
  };

  // Stats for a specific date's period (for History)
  const getPeriodStatsForDate = (dateKey: string) => {
    const targetDate = new Date(dateKey + 'T00:00:00');
    const { startDate, endDate } = getPeriodRange(targetDate);
    const { hours, earnings } = calculateForRange(startDate, endDate);
    
    const startStr = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const endStr = endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    
    return { 
      hours,
      earnings, 
      periodLabel: `${startStr} - ${endStr}`
    };
  };

  const paymentStats = getBiWeeklyStats('current');
  const weeklyStats = getWeeklyWindowStats(currentDateKey, weeklyWindowType);

  const navigateDay = (offsetDays: number) => {
    const [y, m, d] = currentDateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d + offsetDays);
    setCurrentDateKey(formatDateToKey(date));
  };

  const openGoalModal = () => {
    setTempGoal(dailyGoal.toString());
    setTempWeeklyLimit(weeklyLimit.toString());
    setTempWeeklyWindowType(weeklyWindowType);
    setTempLimitEnforcement(limitEnforcement);
    setTempBaseRate(baseRate.toString());
    setTempPremiumRate(premiumRate.toString());
    setShowGoalModal(true);
  };

  const generatePaymentReport = () => {
    const stats = getBiWeeklyStats(submissionPeriod);
    
    // Convert to total minutes and recalculate hours for display
    const totalMinutes = stats.hoursTotal * 60;
    const hoursTotal = totalMinutes / 60;

    const startStr = stats.startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const endStr = stats.endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    
    const h = Math.floor(hoursTotal);
    const m = Math.round((hoursTotal % 1) * 60);
    
    let report = `Period: ${startStr} - ${endStr}\n`;
    report += `------------------------------\n`;
    report += `Total ERT: ${h}h ${m}m (${hoursTotal.toFixed(2)} hours)\n`;
    if (showEarnings) {
      report += `Estimated Earnings: ₦${stats.earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    }
    report += `------------------------------\n`;
    
    const categoryTotals: Record<string, number> = {};

    report += `Daily Breakdown:\n`;
    
    const d = new Date(stats.startDate);
    while (d <= stats.endDate) {
      const key = formatDateToKey(d);
      const dayTasks = logs[key] || [];
      const totalMins = dayTasks.reduce((acc, t) => acc + t.ert, 0);
      
      // Calculate category totals
      dayTasks.forEach(t => {
        const cat = t.category || 'Uncategorized';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + t.ert;
      });

      if (totalMins > 0) {
        const dh = Math.floor(totalMins / 60);
        const dm = Math.round(totalMins % 60);
        report += `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}: ${dh}h ${dm}m\n`;
      }
      d.setDate(d.getDate() + 1);
    }
    
    if (Object.keys(categoryTotals).length > 0) {
      report += `\n------------------------------\n`;
      report += `Category Breakdown:\n`;
      
      const sortedCategories = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);
      sortedCategories.forEach(cat => {
        const catMins = categoryTotals[cat];
        if (catMins > 0) {
          const ch = Math.floor(catMins / 60);
          const cm = Math.round(catMins % 60);
          report += `${cat}: ${ch}h ${cm}m\n`;
        }
      });
    }

    return report;
  };

  const copyPaymentReport = () => {
    const report = generatePaymentReport();
    navigator.clipboard.writeText(report).then(() => {
      alert("Payment report copied to clipboard! You can now send it to your manager.");
    });
  };

  const updateGoal = (e: FormEvent) => {
    e.preventDefault();
    const newGoal = parseFloat(tempGoal);
    const newWeekly = parseFloat(tempWeeklyLimit);
    const newBase = parseInt(tempBaseRate, 10);
    const newPremium = parseInt(tempPremiumRate, 10);
    
    if (!isNaN(newGoal) && newGoal > 0) {
      setDailyGoal(newGoal);
    }
    if (!isNaN(newWeekly) && newWeekly > 0) {
      setWeeklyLimit(newWeekly);
    }
    setWeeklyWindowType(tempWeeklyWindowType);
    setLimitEnforcement(tempLimitEnforcement);

    if (!isNaN(newBase) && newBase > 0) {
      setBaseRate(newBase);
    }
    if (!isNaN(newPremium) && newPremium > 0) {
      setPremiumRate(newPremium);
    }
    setShowGoalModal(false);
  };

  const formatDateLabel = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-sans overflow-x-hidden selection:bg-[#6366f1] selection:text-white pb-12">
      <div className="max-w-5xl mx-auto md:my-10 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-950 md:rounded-2xl md:shadow-2xl overflow-hidden min-h-screen md:min-h-0 flex flex-col">
        {/* Navigation Bar */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center px-6 md:px-10">
          <div className="flex">
            <button 
              onClick={() => setView('tracker')}
              className={`px-4 py-4 text-sm font-bold tracking-wider uppercase transition-all border-b-2 ${view === 'tracker' ? 'border-[#6366f1] text-[#6366f1]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'}`}
            >
              Tracker
            </button>
            <button 
              onClick={() => setView('history')}
              className={`px-4 py-4 text-sm font-bold tracking-wider uppercase transition-all border-b-2 ${view === 'history' ? 'border-[#6366f1] text-[#6366f1]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'}`}
            >
              History
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {user && isSyncing && (
               <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mr-2 hidden sm:flex">
                  <Cloud size={12} className="animate-pulse" /> Syncing...
               </span>
            )}
            {user ? (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg p-1 pr-2 shadow-sm">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={14} className="text-slate-400" />
                  )}
                </div>
                <span className="text-xs font-medium text-slate-600 truncate max-w-[120px] hidden sm:block" title={user.email || 'User'}>
                  {user.email}
                </span>
                <div className="w-px h-3 bg-slate-200 mx-1 hidden sm:block"></div>
                <button onClick={handleSignOut} className="text-slate-400 hover:text-red-500 transition-colors px-1" title="Sign Out">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button onClick={handleSignIn} className="text-xs text-[#10b981] dark:text-[#34d399] hover:underline flex items-center gap-1 font-medium bg-[#10b981]/10 px-3 py-1.5 rounded-md transition-colors hover:bg-[#10b981]/20">
                <LogIn size={14} />
                Sign In to Sync
              </button>
            )}
          </div>
        </div>

        {isIframe && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-700 px-6 py-2 text-xs flex justify-center text-center font-medium">
            Note: You are viewing this app in a preview. To stay signed in after refreshing, please open the app in a new tab using the icon in the top right.
          </div>
        )}

        {view === 'tracker' ? (
          <>
            {/* Tracker Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 sm:px-6 sm:py-6 md:px-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="header-title flex items-center gap-4">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center p-1.5 shadow-lg shadow-black/10">
                  <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">TryRating Time Tracker</h1>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-1.5">
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                      <button 
                        onClick={() => navigateDay(-1)}
                        className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                        title="Previous Day"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-xs font-semibold px-1 text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Calendar size={13} className="text-[#6366f1]" />
                        {formatDateLabel(currentDateKey)}
                      </span>
                      <button 
                        onClick={() => navigateDay(1)}
                        className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                        title="Next Day"
                      >
                        <ChevronRight size={14} />
                      </button>
                      {currentDateKey !== getTodayKey() && (
                        <button 
                          onClick={() => setCurrentDateKey(getTodayKey())}
                          className="text-[10px] bg-[#6366f1] text-white px-2 py-0.5 rounded font-bold hover:bg-[#4f46e5] ml-1 transition-colors"
                        >
                          Jump to Today
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      Auto-backup: {lastBackup}
                    </p>
                  </div>
                </div>
              </div>

              {authError && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                        <LogOut size={20} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Authentication Error</h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                      {authError}
                    </p>
                    <div className="flex justify-end">
                      <button
                        onClick={() => setAuthError(null)}
                        className="px-5 py-2.5 bg-[#6366f1] text-white rounded-xl text-sm font-bold hover:bg-[#4f46e5] transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 w-full sm:w-auto items-center">
                {isInstallable && (
                <button 
                  onClick={handleInstallClick}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[#10b981] hover:bg-[#10b981]/10 transition-all flex items-center gap-2 font-bold text-xs"
                  title="Install App"
                >
                  <Download size={18} />
                  <span className="hidden sm:inline">Install App</span>
                </button>
              )}
                <button 
                  onClick={openGoalModal}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-[#6366f1] transition-all"
                  title="Settings & Weekly Limit"
                >
                  <Settings size={18} />
                </button>
                <button 
                  onClick={() => setShowEarnings(!showEarnings)}
                  className={`p-2.5 rounded-lg border transition-all ${showEarnings ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-[#6366f1]' : 'bg-[#6366f1] border-[#6366f1] text-white'}`}
                  title={showEarnings ? "Hide Earnings" : "Show Earnings"}
                >
                  {showEarnings ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                <button 
                  onClick={() => copyLogForDate(currentDateKey)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:bg-slate-950 transition-all"
                >
                  {copyStatus === 'copied' ? <CheckCircle2 size={16} className="text-[#6366f1]" /> : <Copy size={16} />}
                  {copyStatus === 'copied' ? 'Copied!' : 'Copy Log'}
                </button>
                <button 
                  onClick={() => clearDay(currentDateKey)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#fef2f2] dark:bg-red-500/10 border border-[#fee2e2] dark:border-red-500/20 rounded-lg text-sm font-semibold text-[#dc2626] dark:text-red-400 hover:bg-[#fee2e2] dark:hover:bg-red-500/20 transition-all"
                >
                  <RotateCcw size={16} />
                  Clear
                </button>
              </div>
            </header>

            {/* Stats Grid */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 px-4 py-4 sm:px-6 sm:py-6 md:px-10">
              <div className="stat-card bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="stat-label text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Tasks Completed</div>
                <div className="stat-value text-2xl sm:text-3xl font-bold text-[#6366f1] dark:text-[#818cf8]">{tasks.length}</div>
                <div className="stat-sub text-xs text-slate-400 dark:text-slate-500 mt-1 italic">Today's Session</div>
              </div>
              
              <div className="stat-card bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <div className="stat-label text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Today's ERT</div>
                    <button 
                      onClick={openGoalModal}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 dark:text-slate-500 hover:text-[#6366f1] transition-all"
                      title="Adjust Daily Target"
                    >
                      <Target size={14} />
                    </button>
                  </div>
                  <div className="stat-value text-2xl sm:text-3xl font-bold text-[#6366f1] dark:text-[#818cf8]">{totalMinutes}m</div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="stat-sub text-xs text-slate-400 dark:text-slate-500 italic">Goal: {dailyGoal}h</span>
                    <span className="text-[10px] font-bold text-[#6366f1] dark:text-[#818cf8]">{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      className="h-full bg-[#6366f1] rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* 7-Day Window Stat Card */}
              <div className={`stat-card bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl border shadow-sm relative overflow-hidden group transition-all ${
                weeklyStats.isCapReached 
                  ? 'border-red-300 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/20' 
                  : weeklyStats.isNearCap 
                  ? 'border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/20' 
                  : 'border-slate-200 dark:border-slate-800'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="stat-label text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                    {weeklyStats.isCapReached ? (
                      <ShieldAlert size={12} className="text-red-500" />
                    ) : weeklyStats.isNearCap ? (
                      <AlertTriangle size={12} className="text-amber-500" />
                    ) : (
                      <ShieldCheck size={12} className="text-emerald-500" />
                    )}
                    7-Day Window
                  </div>
                  <button 
                    onClick={openGoalModal}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 dark:text-slate-500 hover:text-[#6366f1] transition-all"
                    title="Configure 20h Limit"
                  >
                    <Settings size={14} />
                  </button>
                </div>
                <div className={`stat-value text-2xl sm:text-3xl font-bold ${
                  weeklyStats.isCapReached ? 'text-red-600 dark:text-red-400' : weeklyStats.isNearCap ? 'text-amber-600 dark:text-amber-400' : 'text-[#6366f1] dark:text-[#818cf8]'
                }`}>
                  {Math.floor(weeklyStats.totalHours)}h {Math.round((weeklyStats.totalHours % 1) * 60)}m
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="stat-sub text-xs text-slate-400 dark:text-slate-500 italic">Cap: {weeklyLimit}h</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    weeklyStats.isCapReached ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' : weeklyStats.isNearCap ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' : 'text-[#6366f1] dark:text-[#818cf8]'
                  }`}>
                    {weeklyStats.isCapReached ? '100% Capped' : `${Math.round(weeklyStats.percentUsed)}%`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${weeklyStats.percentUsed}%` }}
                    className={`h-full rounded-full ${
                      weeklyStats.isCapReached ? 'bg-red-500' : weeklyStats.isNearCap ? 'bg-amber-500' : 'bg-[#6366f1]'
                    }`}
                  />
                </div>
              </div>

              {/* Payment Stats Card */}
              <div className="stat-card bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-white to-[#f5f3ff] relative group">
                <div className="stat-label text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 flex justify-between items-center">
                  Period Payment
                  <button 
                    onClick={() => setShowSubmitPaymentModal(true)}
                    className="opacity-0 group-hover:opacity-100 text-[#6366f1] hover:underline transition-all font-bold"
                  >
                    Submit
                  </button>
                </div>
                <div className="stat-value text-2xl sm:text-3xl font-bold text-[#10b981] dark:text-[#34d399]">
                  {showEarnings ? `₦${paymentStats.earnings.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '₦••••••'}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="stat-sub text-xs text-slate-400 dark:text-slate-500 italic">Rate: {showEarnings ? `₦${paymentStats.rate}/hr` : '₦•••/hr'}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${paymentStats.hoursTotal >= 40 ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                    {paymentStats.hoursTotal.toFixed(1)}h / 40h
                  </span>
                </div>
              </div>
            </section>

            {/* Dedicated 7-Day Window Work Cap Card & Visualizer */}
            <section className="px-4 pb-4 sm:px-6 sm:pb-6 md:px-10">
              <div className={`p-5 sm:p-6 rounded-2xl border transition-all shadow-sm ${
                weeklyStats.isCapReached 
                  ? 'bg-red-50/60 dark:bg-red-950/30 border-red-200 dark:border-red-900/60' 
                  : weeklyStats.isNearCap 
                  ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}>
                {/* Header row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      weeklyStats.isCapReached 
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400' 
                        : weeklyStats.isNearCap 
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {weeklyStats.isCapReached ? <ShieldAlert size={22} /> : weeklyStats.isNearCap ? <AlertTriangle size={22} /> : <ShieldCheck size={22} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                          7-Day Window Work Limit
                        </h2>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          weeklyStats.isCapReached 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : weeklyStats.isNearCap 
                            ? 'bg-amber-500 text-white' 
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {weeklyStats.isCapReached ? '20h Cap Reached' : weeklyStats.isNearCap ? 'Near Cap' : 'Active'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <Timer size={13} className="text-slate-400" />
                        {weeklyStats.windowLabel}
                      </p>
                    </div>
                  </div>

                  {/* Window Mode Switcher & Settings */}
                  <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <button 
                        onClick={() => setWeeklyWindowType('calendar')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                          weeklyWindowType === 'calendar' 
                            ? 'bg-white dark:bg-slate-900 shadow-sm text-[#6366f1] font-bold' 
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                        title="Standard Monday to Sunday work week (resets Mondays)"
                      >
                        Mon–Sun Week
                      </button>
                      <button 
                        onClick={() => setWeeklyWindowType('rolling')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                          weeklyWindowType === 'rolling' 
                            ? 'bg-white dark:bg-slate-900 shadow-sm text-[#6366f1] font-bold' 
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                        title="Continuous trailing 7-day cycle"
                      >
                        Rolling 7-Day
                      </button>
                    </div>
                    <button 
                      onClick={openGoalModal}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-[#6366f1] transition-all"
                      title="Adjust 20h Cap Settings"
                    >
                      <Settings size={16} />
                    </button>
                  </div>
                </div>

                {/* Main Progress Indicator */}
                <div className="my-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl sm:text-3xl font-extrabold ${
                        weeklyStats.isCapReached ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'
                      }`}>
                        {Math.floor(weeklyStats.totalHours)}h {Math.round((weeklyStats.totalHours % 1) * 60)}m
                      </span>
                      <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                        / {weeklyLimit}h 0m limit
                      </span>
                    </div>
                    <div className="text-right">
                      {weeklyStats.isCapReached ? (
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded-md">
                          0h remaining • Work Paused
                        </span>
                      ) : (
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                          weeklyStats.isNearCap 
                            ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50' 
                            : 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50'
                        }`}>
                          {Math.floor(weeklyStats.remainingHours)}h {Math.round((weeklyStats.remainingHours % 1) * 60)}m remaining
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar with 20h limit indicator */}
                  <div className="relative w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${weeklyStats.percentUsed}%` }}
                      className={`h-full rounded-full transition-all ${
                        weeklyStats.isCapReached 
                          ? 'bg-red-500' 
                          : weeklyStats.isNearCap 
                          ? 'bg-amber-500' 
                          : 'bg-gradient-to-r from-emerald-500 to-[#6366f1]'
                      }`}
                    />
                  </div>
                </div>

                {/* 7-Day Visual Day Breakdown */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 my-3">
                  {weeklyStats.days.map((day) => {
                    const dayHours = day.hours;
                    const maxDailyScale = Math.max(5, ...weeklyStats.days.map(d => d.hours));
                    const fillPercent = Math.min(100, (dayHours / maxDailyScale) * 100);
                    const isSelected = day.dateKey === currentDateKey;

                    return (
                      <button
                        key={day.dateKey}
                        onClick={() => setCurrentDateKey(day.dateKey)}
                        className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all group ${
                          isSelected 
                            ? 'bg-[#6366f1]/10 border-[#6366f1] text-[#6366f1] ring-2 ring-[#6366f1]/30' 
                            : day.isToday 
                            ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700' 
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                        }`}
                        title={`Click to view tasks for ${day.dayName} (${day.dateLabel}): ${dayHours.toFixed(1)}h logged`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200">
                          {day.shortDay}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                          {day.dateLabel.split(' ')[1]}
                        </span>

                        {/* Mini vertical meter */}
                        <div className="w-full h-8 bg-slate-200 dark:bg-slate-700 rounded-md my-1.5 overflow-hidden flex flex-col justify-end p-0.5">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${fillPercent}%` }}
                            className={`w-full rounded-sm ${
                              dayHours > 0 
                                ? isSelected 
                                  ? 'bg-[#6366f1]' 
                                  : 'bg-emerald-500 dark:bg-emerald-400' 
                                : 'bg-transparent'
                            }`}
                          />
                        </div>

                        <span className={`text-[11px] font-bold ${
                          dayHours > 0 
                            ? isSelected 
                              ? 'text-[#6366f1]' 
                              : 'text-slate-800 dark:text-slate-200' 
                            : 'text-slate-400 dark:text-slate-500'
                        }`}>
                          {dayHours > 0 ? `${dayHours.toFixed(1)}h` : '—'}
                        </span>
                        {day.isToday && (
                          <span className="text-[9px] font-extrabold uppercase bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1 rounded mt-0.5">
                            Today
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Reset Notice & Work Status Guidance */}
                <div className={`mt-3 p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                  weeklyStats.isCapReached 
                    ? 'bg-red-100/80 dark:bg-red-950/80 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200' 
                    : weeklyStats.isNearCap 
                    ? 'bg-amber-100/80 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200' 
                    : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  <Info size={16} className={`shrink-0 mt-0.5 ${
                    weeklyStats.isCapReached ? 'text-red-500' : weeklyStats.isNearCap ? 'text-amber-500' : 'text-[#6366f1]'
                  }`} />
                  <div className="flex-1 space-y-1">
                    {weeklyStats.isCapReached ? (
                      <div>
                        <span className="font-bold">20-Hour Weekly Limit Reached:</span> You have completed {weeklyStats.totalHours.toFixed(1)}h in this 7-day window. Per rating guidelines (TryRating), <strong>you cannot work until the next window begins</strong>.
                        <div className="font-semibold mt-0.5 text-red-900 dark:text-red-100 flex items-center gap-1.5">
                          <Clock size={12} />
                          {weeklyStats.resetInfo}
                        </div>
                      </div>
                    ) : weeklyStats.isNearCap ? (
                      <div>
                        <span className="font-bold">Approaching 20-Hour Limit:</span> You have logged {weeklyStats.totalHours.toFixed(1)}h. You only have <strong>{weeklyStats.remainingHours.toFixed(1)}h left</strong> before reaching your weekly maximum.
                        <div className="font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                          {weeklyStats.resetInfo}
                        </div>
                      </div>
                    ) : (
                      <div>
                        You can safely work up to <strong>{weeklyStats.remainingHours.toFixed(1)}h more</strong> in this 7-day window.
                        <span className="text-slate-500 dark:text-slate-400 ml-1.5 font-medium">({weeklyStats.resetInfo})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Input Card */}
            <section className="px-4 pb-6 sm:px-6 sm:pb-8 md:px-10">
              <div className="input-card bg-[#6366f1] p-5 sm:p-8 md:p-10 rounded-2xl md:rounded-[1.5rem] shadow-[0_10px_15px_-3px_rgba(99,102,241,0.3)] flex flex-col md:flex-row items-center gap-4 md:gap-8">
                <div className="w-full">
                  {/* Warning banner inside input if capped */}
                  {weeklyStats.isCapReached && (
                    <div className="mb-4 p-3 bg-red-600/30 border border-white/40 rounded-xl text-white text-xs font-semibold flex items-center gap-2.5">
                      <AlertOctagon size={18} className="shrink-0 text-red-200 animate-pulse" />
                      <span>
                        <strong>Work Paused (20h Cap Reached):</strong> You have completed {weeklyStats.totalHours.toFixed(1)}h in this 7-day window. Working further may violate program limits. You can resume when the next window begins.
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3">
                    <label className="text-sm font-medium text-white/90">Task Details</label>
                    <div className="flex flex-wrap gap-2">
                      {categories.slice(0, 5).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition-all ${selectedCategory === cat ? 'bg-white text-[#6366f1]' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                        >
                          {cat}
                        </button>
                      ))}
                      <button 
                        type="button"
                        onClick={() => setShowCategoryModal(true)}
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-white/20 text-white/90 hover:bg-white/30 transition-all flex items-center gap-1 border border-white/30"
                      >
                        <Settings size={10} />
                        Manage
                      </button>
                    </div>
                  </div>
                  <form onSubmit={addTask} className="flex flex-col md:flex-row gap-4">
                    <input
                      type="text"
                      placeholder="Category..."
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="flex-1 bg-white/10 border-2 border-white/20 rounded-xl px-4 py-3 md:px-5 md:py-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white transition-all text-sm font-medium"
                    />
                    <input
                      ref={inputRef}
                      type="text"
                      autoFocus
                      placeholder="ERT (e.g. 7, 1h 20m)"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="flex-[2] bg-white border-2 border-white rounded-xl px-4 py-3 md:px-5 md:py-4 text-xl md:text-2xl font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-white transition-all"
                    />
                    <button 
                      type="submit"
                      className={`font-bold px-6 py-3 md:px-8 md:py-4 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center md:justify-start gap-2 ${
                        weeklyStats.isCapReached 
                          ? 'bg-red-500 hover:bg-red-600 text-white' 
                          : 'bg-white text-[#6366f1]'
                      }`}
                    >
                      {weeklyStats.isCapReached ? (
                        <>
                          <Lock size={18} />
                          <span>{limitEnforcement === 'block' ? 'Limit Reached' : 'Log (Overtime)'}</span>
                        </>
                      ) : (
                        <>
                          <Plus size={20} strokeWidth={3} />
                          <span>Log Task</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </section>

            {/* Table Section */}
            <section className="flex-1 px-4 pb-6 sm:px-6 sm:pb-10 md:px-10 flex flex-col min-h-0">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
                <div className="overflow-y-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 z-20">
                      <tr className="text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400">
                        <th className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 w-12 sm:w-24">#</th>
                        <th className="px-4 sm:px-6 md:px-8 py-3 sm:py-4">Category</th>
                        <th className="px-4 sm:px-6 md:px-8 py-3 sm:py-4">Task ERT</th>
                        <th className="px-4 sm:px-6 md:px-8 py-3 sm:py-4">Running Total</th>
                        <th className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 w-16 sm:w-20 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      <AnimatePresence initial={false}>
                        {(() => {
                          let runningTotal = 0;
                          return tasks.map((task, index) => {
                            runningTotal += task.ert;
                            return (
                              <motion.tr 
                                key={task.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:bg-slate-950 transition-colors"
                              >
                                <td className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-slate-500 dark:text-slate-400 font-medium">
                                  {tasks.length - index}
                                </td>
                                <td className="px-4 sm:px-6 md:px-8 py-3 sm:py-4">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6366f1] dark:text-[#818cf8] bg-[#6366f1]/10 px-2 py-1 rounded-md">
                                    {task.category || 'General'}
                                  </span>
                                </td>
                                <td className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-slate-800 dark:text-slate-100 font-semibold">
                                  {Math.floor(task.ert / 60)}h {Math.round(task.ert % 60)}m
                                </td>
                                <td className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-slate-800 dark:text-slate-100 font-medium opacity-70">
                                  {Math.floor(runningTotal / 60)}h {Math.round(runningTotal % 60)}m
                                </td>
                                <td className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-right">
                                  <button 
                                    onClick={() => removeTask(task.id)}
                                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-[#ef4444] rounded-lg transition-all"
                                  >
                                    <X size={20} />
                                  </button>
                                </td>
                              </motion.tr>
                            );
                          }).reverse();
                        })()}
                      </AnimatePresence>
                      {tasks.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 sm:px-8 py-12 sm:py-16 text-center text-slate-400 dark:text-slate-500 italic">
                            No tasks logged for today.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        ) : (
          /* History View */
          <div className="flex-1 flex flex-col min-h-0">
            {selectedHistoryDate ? (
              /* Detailed Day View in History */
              <div className="flex-1 flex flex-col">
                <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-6 md:px-10 flex justify-between items-center">
                  <button 
                    onClick={() => setSelectedHistoryDate(null)}
                    className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-[#6366f1] font-bold text-sm transition-colors"
                  >
                    <ArrowLeft size={16} />
                    Back to List
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => copyLogForDate(selectedHistoryDate)}
                      className="p-2.5 bg-slate-100 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 transition-all"
                    >
                      <Copy size={18} />
                    </button>
                    <button 
                      onClick={() => clearDay(selectedHistoryDate)}
                      className="p-2.5 bg-red-50 dark:bg-red-500/10 text-[#dc2626] dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="px-4 py-6 sm:px-6 sm:py-8 md:px-10">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-6">{formatDateLabel(selectedHistoryDate)}</h2>
                  
                  {/* Stats snippet for history day */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
                    <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Tasks</div>
                      <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{(logs[selectedHistoryDate] || []).length}</div>
                      <div className="text-[10px] text-slate-400 italic mt-0.5">Logged that day</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Day ERT</div>
                      <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        {(() => {
                          const totalMins = (logs[selectedHistoryDate] || []).reduce((acc, t) => acc + t.ert, 0);
                          const h = Math.floor(totalMins / 60);
                          const m = Math.round(totalMins % 60);
                          return h > 0 ? `${h}h ${m}m` : `${m}m`;
                        })()}
                      </div>
                      <div className="text-[10px] text-slate-400 italic mt-0.5">Daily total</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">7-Day Window</div>
                      <div className="text-2xl font-bold text-[#6366f1] dark:text-[#818cf8]">
                        {(() => {
                          const w = getWeeklyWindowStats(selectedHistoryDate, weeklyWindowType);
                          return `${w.totalHours.toFixed(1)}h / ${weeklyLimit}h`;
                        })()}
                      </div>
                      <div className="text-[10px] text-slate-400 italic mt-0.5">
                        {(() => {
                          const w = getWeeklyWindowStats(selectedHistoryDate, weeklyWindowType);
                          return w.isCapReached ? 'Cap reached' : `${w.remainingHours.toFixed(1)}h remaining`;
                        })()}
                      </div>
                    </div>
                    <div className="bg-[#6366f1]/5 p-3 sm:p-4 rounded-xl border border-[#6366f1]/20 shadow-sm text-center">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[#6366f1] dark:text-[#818cf8] mb-1">
                        Period Stat
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="text-xl sm:text-2xl font-bold text-[#6366f1] dark:text-[#818cf8]">
                          {getPeriodStatsForDate(selectedHistoryDate).hours.toFixed(1)}h
                        </div>
                        {showEarnings && (
                          <div className="text-xs font-semibold text-[#6366f1]/70 dark:text-[#818cf8]/80">
                            ₦{getPeriodStatsForDate(selectedHistoryDate).earnings.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                        <tr className="text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400">
                          <th className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 w-12 sm:w-24">#</th>
                          <th className="px-4 sm:px-6 md:px-8 py-3 sm:py-4">Category</th>
                          <th className="px-4 sm:px-6 md:px-8 py-3 sm:py-4">Task ERT</th>
                          <th className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 w-16 sm:w-20 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1f5f9]">
                        {(logs[selectedHistoryDate] || []).map((task, index) => (
                          <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:bg-slate-950 transition-colors">
                            <td className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-slate-500 dark:text-slate-400 font-medium">{index + 1}</td>
                            <td className="px-4 sm:px-6 md:px-8 py-3 sm:py-4">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6366f1] dark:text-[#818cf8] bg-[#6366f1]/10 px-2 py-1 rounded-md">
                                {task.category || 'General'}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-slate-800 dark:text-slate-100 font-semibold">
                              {Math.floor(task.ert / 60)}h {Math.round(task.ert % 60)}m
                            </td>
                            <td className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-right">
                              <button 
                                onClick={() => removeTask(task.id, selectedHistoryDate)}
                                className="p-2 text-slate-400 dark:text-slate-500 hover:text-[#ef4444] rounded-lg transition-all"
                              >
                                <X size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* History List View */
              <div className="px-4 py-6 sm:px-6 sm:py-8 md:px-10 flex-1 overflow-y-auto">
                <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center p-1 shadow-md">
                          <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Activity History</h2>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review your historical task logs</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            if (window.confirm("Are you sure you want to PERMANENTLY delete ALL logs? This cannot be undone.")) {
                              setLogs({});
                              localStorage.removeItem('tryrating_all_logs');
                              alert('All data has been cleared.');
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-500/10 text-[#dc2626] dark:text-red-400 hover:bg-[#dc2626] dark:hover:bg-red-500 hover:text-white dark:hover:text-white rounded-lg text-xs font-bold transition-all border border-[#fee2e2] dark:border-red-500/20"
                        >
                          <Trash2 size={14} />
                          Clear All Data
                        </button>
                        <button 
                          onClick={() => setShowImportModal(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 dark:text-slate-400 hover:bg-[#6366f1] hover:text-white rounded-lg text-xs font-bold transition-all"
                        >
                          <Upload size={14} />
                          Bulk Import
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown size={14} className="text-slate-500 dark:text-slate-400" />
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as any)}
                        className="text-xs font-semibold bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 outline-none focus:border-[#6366f1] text-slate-600 dark:text-slate-300"
                      >
                        <option value="date-desc">Newest First</option>
                        <option value="date-asc">Oldest First</option>
                        <option value="hours-desc">Highest Hours</option>
                        <option value="hours-asc">Lowest Hours</option>
                      </select>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">From</span>
                      <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setIsFilterActive(true);
                        }}
                        className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">To</span>
                      <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setIsFilterActive(true);
                        }}
                        className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    {isFilterActive && (
                      <button 
                        onClick={() => {
                          setIsFilterActive(false);
                          setStartDate(getTodayKey());
                          setEndDate(getTodayKey());
                        }}
                        className="text-[10px] font-bold text-[#6366f1] dark:text-[#818cf8] hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </header>

                <div className="grid grid-cols-1 gap-4">
                  {(() => {
                    let filteredKeys = Object.keys(logs)
                      .filter(dateKey => {
                        if (!isFilterActive) return true;
                        return dateKey >= startDate && dateKey <= endDate;
                      });

                    filteredKeys.sort((a, b) => {
                      if (sortOption === 'date-desc') return b.localeCompare(a);
                      if (sortOption === 'date-asc') return a.localeCompare(b);
                      
                      const hoursA = (logs[a] || []).reduce((acc, t) => acc + t.ert, 0);
                      const hoursB = (logs[b] || []).reduce((acc, t) => acc + t.ert, 0);
                      if (sortOption === 'hours-desc') return hoursB - hoursA;
                      if (sortOption === 'hours-asc') return hoursA - hoursB;
                      return 0;
                    });

                    if (filteredKeys.length === 0) {
                      return (
                        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-500">
                            <History size={32} />
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 font-medium">
                            {isFilterActive ? "No records found in this range." : "No logs found yet."}
                          </p>
                          {isFilterActive ? (
                            <button 
                              onClick={() => setIsFilterActive(false)}
                              className="mt-4 text-[#6366f1] dark:text-[#818cf8] font-bold text-sm hover:underline"
                            >
                              Show all records
                            </button>
                          ) : (
                            <button 
                              onClick={() => setView('tracker')}
                              className="mt-4 text-[#6366f1] dark:text-[#818cf8] font-bold text-sm hover:underline"
                            >
                              Start tracking now
                            </button>
                          )}
                        </div>
                      );
                    }

                    const renderDayCard = (dateKey: string) => {
                      const dayTasks = logs[dateKey];
                      const stats = calculateStats(dayTasks);
                      return (
                        <button 
                          key={dateKey}
                          onClick={() => setSelectedHistoryDate(dateKey)}
                          className="w-full text-left bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-[#6366f1] transition-all group flex justify-between items-center"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatDateLabel(dateKey)}</span>
                              {dateKey === getTodayKey() && (
                                <span className="text-[10px] bg-[#6366f1]/10 text-[#6366f1] dark:text-[#818cf8] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Today</span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                              <span className="flex items-center gap-1"><CheckCircle2 size={12} /> {dayTasks.length} tasks</span>
                              <span className="flex items-center gap-1"><Clock size={12} /> {stats.hours}h {stats.mins}m logged</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end gap-1 mr-4 hidden sm:flex">
                              <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#6366f1]" style={{ width: `${stats.progressPercent}%` }} />
                              </div>
                              <span className="text-[9px] font-bold text-slate-400">{Math.round(stats.progressPercent)}% Goal</span>
                            </div>
                            <ChevronRight size={20} className="text-slate-400 dark:text-slate-500 group-hover:text-[#6366f1] transition-colors" />
                          </div>
                        </button>
                      );
                    };

                    if (sortOption.startsWith('hours-')) {
                      return <div className="grid grid-cols-1 gap-3">{filteredKeys.map(renderDayCard)}</div>;
                    }

                    // Grouping by Month
                    const groups: Record<string, string[]> = {};
                    filteredKeys.forEach(key => {
                      const date = new Date(key + 'T00:00:00');
                      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                      if (!groups[monthKey]) groups[monthKey] = [];
                      groups[monthKey].push(key);
                    });

                    return Object.keys(groups).sort((a, b) => sortOption === 'date-desc' ? b.localeCompare(a) : a.localeCompare(b)).map(monthKey => {
                      const monthDate = new Date(monthKey + '-01T00:00:00');
                      const monthName = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                      const daysInMonth = groups[monthKey];
                      const isExpanded = expandedMonths[monthKey] ?? true;

                      // Calculate month total hours
                      const monthTotalMins = daysInMonth.reduce((acc, dKey) => {
                        return acc + (logs[dKey] || []).reduce((tAcc, t) => tAcc + t.ert, 0);
                      }, 0);
                      const monthTotalHours = (monthTotalMins / 60).toFixed(1);

                      return (
                        <div key={monthKey} className="flex flex-col gap-2">
                          <button 
                            onClick={() => setExpandedMonths(prev => ({ ...prev, [monthKey]: !isExpanded }))}
                            className="flex items-center justify-between px-2 py-3 border-b border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 transition-colors w-full text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                                <ChevronRight size={16} className="text-slate-400" />
                              </span>
                              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{monthName}</h3>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full">
                                {daysInMonth.length} Days
                              </span>
                            </div>
                            <div className="text-xs font-bold text-[#6366f1]">
                              {monthTotalHours}h Total
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="grid grid-cols-1 gap-3 pl-4 border-l-2 border-slate-100 mt-1">
                              {daysInMonth.map(renderDayCard)}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Floating Tip - Only on tracker view */}
      {view === 'tracker' && (
        <div className="fixed bottom-6 right-6 hidden md:flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-3 rounded-2xl shadow-xl">
          <div className="w-10 h-10 bg-[#6366f1]/10 rounded-xl flex items-center justify-center text-[#6366f1] dark:text-[#818cf8]">
            <Target size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quick Hint</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">Type ERT & Hit Enter</span>
          </div>
        </div>
      )}

      {/* Undo Notification */}
      <AnimatePresence>
        {showUndo && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[60] flex items-center gap-4 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl min-w-[320px] justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white dark:bg-slate-900/10 rounded-full flex items-center justify-center text-amber-400">
                <RotateCcw size={16} />
              </div>
              <span className="text-sm font-medium">Task removed</span>
            </div>
            <button 
              onClick={undoDelete}
              className="text-xs font-bold uppercase tracking-widest text-[#6366f1] hover:text-[#818cf8] transition-colors bg-white dark:bg-slate-900/10 px-4 py-2 rounded-lg"
            >
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Submission Modal */}
      <AnimatePresence>
        {showSubmitPaymentModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSubmitPaymentModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="bg-[#10b981] p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Submit for Payment</h3>
                  <p className="text-white/70 text-sm mt-1">Review and copy your period summary.</p>
                </div>
                <button 
                  onClick={() => setShowSubmitPaymentModal(false)}
                  className="p-2 hover:bg-black/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto max-h-[60vh] space-y-6">
                {/* Period Selector */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setSubmissionPeriod('current')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${submissionPeriod === 'current' ? 'bg-white dark:bg-slate-900 shadow-sm text-[#10b981] dark:text-[#34d399]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  >
                    Current Period
                  </button>
                  <button 
                    onClick={() => setSubmissionPeriod('previous')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${submissionPeriod === 'previous' ? 'bg-white dark:bg-slate-900 shadow-sm text-[#10b981] dark:text-[#34d399]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  >
                    Previous Period
                  </button>
                </div>

                {/* Visual Summary */}
                {(() => {
                  const stats = getBiWeeklyStats(submissionPeriod);
                  const h = Math.floor(stats.hoursTotal);
                  const m = Math.round((stats.hoursTotal % 1) * 60);
                  return (
                    <div className={`grid gap-4 ${showEarnings ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl p-4 flex flex-col justify-center items-center">
                        <div className="text-[#10b981] dark:text-[#34d399] text-xs font-bold uppercase tracking-wider mb-1">Total Time</div>
                        <div className="text-2xl font-bold text-[#065f46] dark:text-[#34d399]">{h}h {m}m</div>
                      </div>
                      {showEarnings && (
                        <div className="bg-[#6366f1]/10 border border-[#6366f1]/20 rounded-xl p-4 flex flex-col justify-center items-center">
                          <div className="text-[#6366f1] text-xs font-bold uppercase tracking-wider mb-1">Estimated Earnings</div>
                          <div className="text-2xl font-bold text-[#3730a3] dark:text-[#818cf8]">₦{stats.earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 rounded-xl p-6 font-mono text-sm whitespace-pre-wrap text-slate-700 relative group">
                  {generatePaymentReport()}
                  <button 
                    onClick={copyPaymentReport}
                    className="absolute top-4 right-4 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 text-slate-400 hover:text-[#10b981] dark:hover:text-[#34d399] hover:border-[#10b981] dark:hover:border-[#34d399] shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setShowSubmitPaymentModal(false)}
                  className="flex-1 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm"
                >
                  Close
                </button>
                <button 
                  onClick={copyPaymentReport}
                  className="flex-1 py-3 bg-[#10b981] text-white font-bold rounded-xl hover:bg-[#059669] transition-all text-sm flex items-center justify-center gap-2"
                >
                  <Copy size={16} />
                  Copy Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Management Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowCategoryModal(false);
                setEditingCategoryIndex(null);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="bg-[#6366f1] p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Manage Categories</h3>
                  <p className="text-white/70 text-sm mt-1">Add, edit or remove task categories.</p>
                </div>
                <button 
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategoryIndex(null);
                  }}
                  className="p-2 hover:bg-black/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto max-h-[60vh] space-y-4">
                {/* Add New */}
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="New category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#6366f1]"
                  />
                  <button 
                    onClick={addCategory}
                    className="bg-[#6366f1] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#4f46e5] flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>

                <div className="space-y-2">
                  {categories.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 group">
                      {editingCategoryIndex === idx ? (
                        <div className="flex-1 flex gap-2">
                          <input 
                            autoFocus
                            type="text"
                            value={editingCategoryValue}
                            onChange={(e) => setEditingCategoryValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEditedCategory()}
                            className="flex-1 bg-white dark:bg-slate-950 border border-[#6366f1] rounded-lg px-3 py-1 text-sm outline-none text-slate-900 dark:text-slate-100"
                          />
                          <button 
                            onClick={saveEditedCategory}
                            className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600"
                          >
                            <Save size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{cat}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => startEditingCategory(idx)}
                              className="p-1.5 text-slate-400 hover:text-[#6366f1] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => deleteCategory(cat)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100">
                <button 
                  onClick={() => setShowCategoryModal(false)}
                  className="w-full py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Over-Limit Confirmation Modal */}
      <AnimatePresence>
        {pendingOverLimitTask && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPendingOverLimitTask(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden p-6 border border-amber-200 dark:border-amber-800/60"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    20-Hour Weekly Limit Warning
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Logging this task will exceed your 7-day window limit
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 text-xs text-amber-900 dark:text-amber-200 space-y-2 mb-4">
                <p>
                  Per TryRating and program guidelines, raters have a <strong>20-hour limit in any 7-day window</strong>. Working beyond 20 hours without an authorized overtime allowance may violate program rules.
                </p>
                <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/60 flex justify-between font-mono font-semibold">
                  <span>Current logged:</span>
                  <span>{pendingOverLimitTask.currentHours.toFixed(2)}h</span>
                </div>
                <div className="flex justify-between font-mono font-semibold">
                  <span>This task:</span>
                  <span>+{(pendingOverLimitTask.ert / 60).toFixed(2)}h ({pendingOverLimitTask.ert}m)</span>
                </div>
                <div className="flex justify-between font-mono font-bold text-amber-950 dark:text-amber-100">
                  <span>Projected total:</span>
                  <span>{pendingOverLimitTask.projectedHours.toFixed(2)}h / {weeklyLimit}h limit</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setPendingOverLimitTask(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={() => commitTask(pendingOverLimitTask.ert, pendingOverLimitTask.category)}
                  className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm shadow-md shadow-amber-600/20 transition-all"
                >
                  Override & Log
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Strict Block Modal */}
      <AnimatePresence>
        {showStrictBlockModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStrictBlockModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden p-6 border border-red-200 dark:border-red-900/60"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <Lock size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    20-Hour Weekly Cap Reached
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Task logging is paused until the next window begins
                  </p>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl p-4 text-xs text-red-900 dark:text-red-200 space-y-2 mb-4">
                <p>
                  You have logged <strong>{weeklyStats.totalHours.toFixed(1)}h</strong> in this 7-day window, reaching or exceeding the <strong>{weeklyLimit}-hour maximum</strong>.
                </p>
                <p>
                  You cannot work or log more tasks until the next window begins:
                </p>
                <div className="font-semibold text-red-950 dark:text-red-100 flex items-center gap-1.5 pt-1">
                  <Clock size={14} />
                  {weeklyStats.resetInfo}
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowStrictBlockModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-sm transition-colors"
                >
                  Close
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setShowStrictBlockModal(false);
                    openGoalModal();
                  }}
                  className="flex-1 px-4 py-2.5 bg-[#6366f1] text-white font-bold rounded-xl text-sm hover:bg-[#4f46e5] transition-all"
                >
                  Adjust Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Goal & 20h Limit Settings Modal */}
      <AnimatePresence>
        {showGoalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGoalModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden p-5 sm:p-7 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Goals & Work Limits</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Configure your daily targets and 20h weekly window</p>
                </div>
                <button 
                  onClick={() => setShowGoalModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={updateGoal} className="space-y-5">
                {/* Daily Goal & Weekly Limit Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      Daily Target (Hours)
                    </label>
                    <input 
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      value={tempGoal}
                      onChange={(e) => setTempGoal(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-base font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#6366f1] transition-all"
                    />
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Your daily pacing</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                      <span>Weekly Cap (Hours)</span>
                      <span className="text-[10px] text-[#6366f1] font-extrabold bg-[#6366f1]/10 px-1.5 py-0.2 rounded">20h Standard</span>
                    </label>
                    <input 
                      type="number"
                      step="0.5"
                      min="1"
                      max="60"
                      value={tempWeeklyLimit}
                      onChange={(e) => setTempWeeklyLimit(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-base font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#6366f1] transition-all"
                    />
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Max hours in 7-day window</span>
                  </div>
                </div>

                {/* Window Calculation Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    7-Day Window Calculation
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTempWeeklyWindowType('calendar')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        tempWeeklyWindowType === 'calendar'
                          ? 'border-[#6366f1] bg-[#6366f1]/10 text-[#6366f1] ring-1 ring-[#6366f1]'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <Calendar size={13} />
                        Mon – Sun Week
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Resets every Monday at 00:00. Standard for TryRating.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTempWeeklyWindowType('rolling')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        tempWeeklyWindowType === 'rolling'
                          ? 'border-[#6366f1] bg-[#6366f1]/10 text-[#6366f1] ring-1 ring-[#6366f1]'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <Timer size={13} />
                        Rolling 7-Day
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Continuous trailing 7 days. Hours roll off as days pass.
                      </div>
                    </button>
                  </div>
                </div>

                {/* Over-Limit Enforcement Policy */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    When 20h Limit is Reached
                  </label>
                  <div className="space-y-2">
                    <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      tempLimitEnforcement === 'confirm' 
                        ? 'border-[#6366f1] bg-[#6366f1]/5 dark:bg-[#6366f1]/10' 
                        : 'border-slate-200 dark:border-slate-700'
                    }`}>
                      <input 
                        type="radio" 
                        name="limitEnforcement" 
                        value="confirm" 
                        checked={tempLimitEnforcement === 'confirm'} 
                        onChange={() => setTempLimitEnforcement('confirm')}
                        className="mt-0.5 text-[#6366f1] focus:ring-[#6366f1]"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-100">Warn & Require Confirmation (Recommended)</span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Alerts you that 20h is reached and allows overriding only if you have authorized overtime.
                        </p>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      tempLimitEnforcement === 'block' 
                        ? 'border-[#6366f1] bg-[#6366f1]/5 dark:bg-[#6366f1]/10' 
                        : 'border-slate-200 dark:border-slate-700'
                    }`}>
                      <input 
                        type="radio" 
                        name="limitEnforcement" 
                        value="block" 
                        checked={tempLimitEnforcement === 'block'} 
                        onChange={() => setTempLimitEnforcement('block')}
                        className="mt-0.5 text-[#6366f1] focus:ring-[#6366f1]"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-100">Strict Block (Prevent Task Entry)</span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Completely pauses task logging once 20h is logged until the window resets.
                        </p>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      tempLimitEnforcement === 'warn' 
                        ? 'border-[#6366f1] bg-[#6366f1]/5 dark:bg-[#6366f1]/10' 
                        : 'border-slate-200 dark:border-slate-700'
                    }`}>
                      <input 
                        type="radio" 
                        name="limitEnforcement" 
                        value="warn" 
                        checked={tempLimitEnforcement === 'warn'} 
                        onChange={() => setTempLimitEnforcement('warn')}
                        className="mt-0.5 text-[#6366f1] focus:ring-[#6366f1]"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-100">Visual Warnings Only</span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Shows red alert badges without intercepting task submission.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Rates */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Rate 1 (Below 40h)
                    </label>
                    <input 
                      type="number"
                      value={tempBaseRate}
                      onChange={(e) => setTempBaseRate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#6366f1] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Rate 2 (40h+)
                    </label>
                    <input 
                      type="number"
                      value={tempPremiumRate}
                      onChange={(e) => setTempPremiumRate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#6366f1] transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowGoalModal(false)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-[#6366f1] text-white font-bold rounded-xl shadow-lg shadow-[#6366f1]/30 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
                  >
                    Save Settings
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowImportModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-[#6366f1] p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Bulk Import Historical Logs</h3>
                  <p className="text-white/70 text-sm mt-1">Paste your historical work data below.</p>
                </div>
                <button 
                  onClick={() => setShowImportModal(false)}
                  className="p-2 hover:bg-black/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Supported Formats:</h4>
                  <ul className="text-xs text-amber-700 space-y-1 list-disc pl-4">
                    <li>Date Headers like "25/7" or "2/8/2025"</li>
                    <li>Year Headers like "2024" or "2025"</li>
                    <li>Space-separated minutes: "3 6 9 9"</li>
                    <li>Time durations: "1hr 11m" or "2hrs 52mins"</li>
                  </ul>
                </div>

                <textarea
                  autoFocus
                  placeholder="Paste your logs here...
Example:
2024
25/7
3 6 9 9 3 3 3"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full h-80 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#6366f1] transition-all resize-none"
                />
              </div>

              <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50 dark:bg-slate-800/50">
                <button 
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-all border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleBulkImport}
                  disabled={!importText.trim()}
                  className="flex-1 px-6 py-4 bg-[#6366f1] text-white rounded-xl font-bold shadow-lg shadow-[#6366f1]/30 hover:bg-[#4f46e5] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Confirm Import
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
