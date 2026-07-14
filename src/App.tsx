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
  Cloud,
  LogOut,
  LogIn,
  ArrowUpDown,
  User as UserIcon
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
      // Migration: if the saved value is likely minutes (e.g. > 24), convert to hours
      if (val > 24) {
        const hours = val / 60;
        localStorage.setItem('tryrating_daily_goal', hours.toString());
        return hours;
      }
      localStorage.setItem('tryrating_daily_goal', val.toString());
      return val;
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
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showEarnings, setShowEarnings] = useState<boolean>(() => {
    const saved = localStorage.getItem('tryrating_show_earnings');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [baseRate, setBaseRate] = useState<number>(() => {
    const saved = localStorage.getItem('tryrating_base_rate');
    return saved ? parseInt(saved, 10) : 2000;
  });
  const [premiumRate, setPremiumRate] = useState<number>(() => {
    const saved = localStorage.getItem('tryrating_premium_rate');
    return saved ? parseInt(saved, 10) : 2500;
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
          } else {
            // First time logging in, push local settings to Firebase
            await setDoc(doc(db, 'users', u.uid), {
              categories,
              dailyGoal,
              baseRate,
              premiumRate,
              showEarnings
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
        showEarnings
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
      const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        ert,
        timestamp: Date.now(),
        category: selectedCategory,
      };
      
      setLogs(prev => ({
        ...prev,
        [currentDateKey]: [...(prev[currentDateKey] || []), newTask]
      }));
      
      setInputValue('');
      inputRef.current?.focus();
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
    const newBase = parseInt(tempBaseRate, 10);
    const newPremium = parseInt(tempPremiumRate, 10);
    
    if (!isNaN(newGoal) && newGoal > 0) {
      setDailyGoal(newGoal);
    }
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
    <div className="min-h-screen bg-[#f1f5f9] text-[#1e293b] font-sans overflow-x-hidden selection:bg-[#6366f1] selection:text-white pb-12">
      <div className="max-w-5xl mx-auto md:my-10 bg-[#f8fafc] md:rounded-2xl md:shadow-2xl overflow-hidden min-h-screen md:min-h-0 flex flex-col">
        {/* Navigation Bar */}
        <div className="bg-white border-b border-[#e2e8f0] flex justify-between items-center px-6 md:px-10">
          <div className="flex">
            <button 
              onClick={() => setView('tracker')}
              className={`px-4 py-4 text-sm font-bold tracking-wider uppercase transition-all border-b-2 ${view === 'tracker' ? 'border-[#6366f1] text-[#6366f1]' : 'border-transparent text-[#64748b] hover:text-[#1e293b]'}`}
            >
              Tracker
            </button>
            <button 
              onClick={() => setView('history')}
              className={`px-4 py-4 text-sm font-bold tracking-wider uppercase transition-all border-b-2 ${view === 'history' ? 'border-[#6366f1] text-[#6366f1]' : 'border-transparent text-[#64748b] hover:text-[#1e293b]'}`}
            >
              History
            </button>
          </div>
          <div className="flex items-center gap-2">
            {user && isSyncing && (
               <span className="text-xs text-[#94a3b8] flex items-center gap-1 mr-2 hidden sm:flex">
                  <Cloud size={12} className="animate-pulse" /> Syncing...
               </span>
            )}
            {user ? (
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 pr-2 shadow-sm">
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
              <button onClick={handleSignIn} className="text-xs text-[#10b981] hover:underline flex items-center gap-1 font-medium bg-[#10b981]/10 px-3 py-1.5 rounded-md transition-colors hover:bg-[#10b981]/20">
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
            <header className="bg-white border-b border-[#e2e8f0] px-6 py-6 md:px-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="header-title flex items-center gap-4">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center p-1.5 shadow-lg shadow-black/10">
                  <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight">TryRating Time Tracker</h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                    <p className="text-sm text-[#64748b] flex items-center gap-2">
                      <Calendar size={14} />
                      {formatDateLabel(currentDateKey)}
                    </p>
                    <p className="text-xs text-[#94a3b8] flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      Auto-backup: {lastBackup}
                    </p>
                  </div>
                </div>
              </div>

              {authError && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                        <LogOut size={20} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">Authentication Error</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">
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
                <button 
                  onClick={() => {
                    setTempGoal(dailyGoal.toString());
                    setTempBaseRate(baseRate.toString());
                    setTempPremiumRate(premiumRate.toString());
                    setShowGoalModal(true);
                  }}
                  className="p-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#6366f1] transition-all"
                  title="Settings"
                >
                  <Settings size={18} />
                </button>
                <button 
                  onClick={() => setShowEarnings(!showEarnings)}
                  className={`p-2.5 rounded-lg border transition-all ${showEarnings ? 'bg-white border-[#e2e8f0] text-[#64748b] hover:text-[#6366f1]' : 'bg-[#6366f1] border-[#6366f1] text-white'}`}
                  title={showEarnings ? "Hide Earnings" : "Show Earnings"}
                >
                  {showEarnings ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                <button 
                  onClick={() => copyLogForDate(currentDateKey)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm font-semibold text-[#475569] hover:bg-[#f8fafc] transition-all"
                >
                  {copyStatus === 'copied' ? <CheckCircle2 size={16} className="text-[#6366f1]" /> : <Copy size={16} />}
                  {copyStatus === 'copied' ? 'Copied!' : 'Copy Log'}
                </button>
                <button 
                  onClick={() => clearDay(currentDateKey)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#fef2f2] border border-[#fee2e2] rounded-lg text-sm font-semibold text-[#dc2626] hover:bg-[#fee2e2] transition-all"
                >
                  <RotateCcw size={16} />
                  Clear
                </button>
              </div>
            </header>

            {/* Stats Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-6 py-8 md:px-10">
              <div className="stat-card bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm">
                <div className="stat-label text-[10px] font-bold uppercase tracking-widest text-[#64748b] mb-2">Tasks Completed</div>
                <div className="stat-value text-3xl font-bold text-[#6366f1]">{tasks.length}</div>
                <div className="stat-sub text-xs text-[#94a3b8] mt-1 italic">Today's Session</div>
              </div>
              
              <div className="stat-card bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <div className="stat-label text-[10px] font-bold uppercase tracking-widest text-[#64748b] mb-2">Total ERT (Min)</div>
                    <button 
                      onClick={() => {
                        setTempGoal(dailyGoal.toString());
                        setTempBaseRate(baseRate.toString());
                        setTempPremiumRate(premiumRate.toString());
                        setShowGoalModal(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#94a3b8] hover:text-[#6366f1] transition-all"
                    >
                      <Target size={14} />
                    </button>
                  </div>
                  <div className="stat-value text-3xl font-bold text-[#6366f1]">{totalMinutes}m</div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="stat-sub text-xs text-[#94a3b8] italic">Goal: {dailyGoal}h</span>
                    <span className="text-[10px] font-bold text-[#6366f1]">{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#f1f5f9] rounded-full mt-2 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      className="h-full bg-[#6366f1] rounded-full"
                    />
                  </div>
                </div>
              </div>

              <div className="stat-card bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm">
                <div className="stat-label text-[10px] font-bold uppercase tracking-widest text-[#64748b] mb-2">In Hours</div>
                <div className="stat-value text-3xl font-bold text-[#6366f1]">
                  {hours}h {mins}m
                </div>
                <div className="stat-sub text-xs text-[#94a3b8] mt-1 italic">Equivalent Time</div>
              </div>

              <div className="stat-card bg-[#f8fafc] p-5 rounded-xl border border-[#e2e8f0] shadow-sm bg-gradient-to-br from-white to-[#f5f3ff] relative group">
                <div className="stat-label text-[10px] font-bold uppercase tracking-widest text-[#64748b] mb-2 flex justify-between items-center">
                  Current Period Payment
                  <button 
                    onClick={() => setShowSubmitPaymentModal(true)}
                    className="opacity-0 group-hover:opacity-100 text-[#6366f1] hover:underline transition-all font-bold"
                  >
                    Submit
                  </button>
                </div>
                <div className="stat-value text-3xl font-bold text-[#10b981]">
                  {showEarnings ? `₦${paymentStats.earnings.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '₦••••••'}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="stat-sub text-xs text-[#94a3b8] italic">Rate: {showEarnings ? `₦${paymentStats.rate}/hr` : '₦•••/hr'}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${paymentStats.hoursTotal >= 40 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {paymentStats.hoursTotal.toFixed(1)}h / 40h
                  </span>
                </div>
              </div>
            </section>

            {/* Input Card */}
            <section className="px-6 pb-8 md:px-10">
              <div className="input-card bg-[#6366f1] p-8 md:p-10 rounded-[1.5rem] shadow-[0_10px_15px_-3px_rgba(99,102,241,0.3)] flex flex-col md:flex-row items-center gap-6 md:gap-8">
                <div className="w-full">
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
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-white/20 text-white/90 hover:bg-white/40 transition-all flex items-center gap-1 border border-white/30"
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
                      className="flex-1 bg-white/10 border-2 border-white/20 rounded-xl px-5 py-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white transition-all text-sm font-medium"
                    />
                    <input
                      ref={inputRef}
                      type="text"
                      autoFocus
                      placeholder="ERT (e.g. 7, 1h 20m)"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="flex-[2] bg-white border-2 border-white rounded-xl px-5 py-4 text-2xl font-bold text-[#1e293b] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#4f46e5] transition-all"
                    />
                    <button 
                      type="submit"
                      className="bg-white text-[#6366f1] font-bold px-8 py-4 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                    >
                      <Plus size={20} strokeWidth={3} />
                      Log Task
                    </button>
                  </form>
                </div>
              </div>
            </section>

            {/* Table Section */}
            <section className="flex-1 px-6 pb-10 md:px-10 flex flex-col min-h-0">
              <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
                <div className="overflow-y-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#f8fafc] border-b border-[#e2e8f0] z-20">
                      <tr className="text-[10px] uppercase font-bold tracking-widest text-[#64748b]">
                        <th className="px-8 py-4 w-24">#</th>
                        <th className="px-8 py-4">Category</th>
                        <th className="px-8 py-4">Task ERT</th>
                        <th className="px-8 py-4">Running Total</th>
                        <th className="px-8 py-4 w-20 text-right">Action</th>
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
                                className="hover:bg-[#f8fafc] transition-colors"
                              >
                                <td className="px-8 py-4 text-[#64748b] font-medium">
                                  {tasks.length - index}
                                </td>
                                <td className="px-8 py-4">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6366f1] bg-[#6366f1]/10 px-2 py-1 rounded-md">
                                    {task.category || 'General'}
                                  </span>
                                </td>
                                <td className="px-8 py-4 text-[#1e293b] font-semibold">
                                  {Math.floor(task.ert / 60)}h {Math.round(task.ert % 60)}m
                                </td>
                                <td className="px-8 py-4 text-[#1e293b] font-medium opacity-70">
                                  {Math.floor(runningTotal / 60)}h {Math.round(runningTotal % 60)}m
                                </td>
                                <td className="px-8 py-4 text-right">
                                  <button 
                                    onClick={() => removeTask(task.id)}
                                    className="p-2 text-[#94a3b8] hover:text-[#ef4444] rounded-lg transition-all"
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
                          <td colSpan={4} className="px-8 py-16 text-center text-[#94a3b8] italic">
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
                <div className="bg-white border-b border-[#e2e8f0] px-6 py-6 md:px-10 flex justify-between items-center">
                  <button 
                    onClick={() => setSelectedHistoryDate(null)}
                    className="flex items-center gap-2 text-[#64748b] hover:text-[#6366f1] font-bold text-sm transition-colors"
                  >
                    <ArrowLeft size={16} />
                    Back to List
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => copyLogForDate(selectedHistoryDate)}
                      className="p-2.5 bg-slate-100 text-[#475569] rounded-lg hover:bg-slate-200 transition-all"
                    >
                      <Copy size={18} />
                    </button>
                    <button 
                      onClick={() => clearDay(selectedHistoryDate)}
                      className="p-2.5 bg-red-50 text-[#dc2626] rounded-lg hover:bg-red-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="px-6 py-8 md:px-10">
                  <h2 className="text-2xl font-bold text-[#0f172a] mb-6">{formatDateLabel(selectedHistoryDate)}</h2>
                  
                  {/* Stats snippet for history day */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-sm">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[#64748b] mb-1">Tasks</div>
                      <div className="text-2xl font-bold text-[#1e293b]">{(logs[selectedHistoryDate] || []).length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-sm">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[#64748b] mb-1">Total ERT (Day)</div>
                      <div className="text-2xl font-bold text-[#1e293b]">
                        {(() => {
                          const totalMins = (logs[selectedHistoryDate] || []).reduce((acc, t) => acc + t.ert, 0);
                          const h = Math.floor(totalMins / 60);
                          const m = Math.round(totalMins % 60);
                          return h > 0 ? `${h}h ${m}m` : `${m}m`;
                        })()}
                      </div>
                    </div>
                    <div className="bg-[#6366f1]/5 p-4 rounded-xl border border-[#6366f1]/20 shadow-sm text-center">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[#6366f1] mb-1">
                        Period Stat ({getPeriodStatsForDate(selectedHistoryDate).periodLabel})
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="text-2xl font-bold text-[#6366f1]">
                          {getPeriodStatsForDate(selectedHistoryDate).hours.toFixed(1)}h
                        </div>
                        {showEarnings && (
                          <div className="text-sm font-semibold text-[#6366f1]/60">
                            ₦{getPeriodStatsForDate(selectedHistoryDate).earnings.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                        <tr className="text-[10px] uppercase font-bold tracking-widest text-[#64748b]">
                          <th className="px-8 py-4 w-24">#</th>
                          <th className="px-8 py-4">Category</th>
                          <th className="px-8 py-4">Task ERT</th>
                          <th className="px-8 py-4 w-20 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1f5f9]">
                        {(logs[selectedHistoryDate] || []).map((task, index) => (
                          <tr key={task.id} className="hover:bg-[#f8fafc] transition-colors">
                            <td className="px-8 py-4 text-[#64748b] font-medium">{index + 1}</td>
                            <td className="px-8 py-4">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6366f1] bg-[#6366f1]/10 px-2 py-1 rounded-md">
                                {task.category || 'General'}
                              </span>
                            </td>
                            <td className="px-8 py-4 text-[#1e293b] font-semibold">
                              {Math.floor(task.ert / 60)}h {Math.round(task.ert % 60)}m
                            </td>
                            <td className="px-8 py-4 text-right">
                              <button 
                                onClick={() => removeTask(task.id, selectedHistoryDate)}
                                className="p-2 text-[#94a3b8] hover:text-[#ef4444] rounded-lg transition-all"
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
              <div className="px-6 py-8 md:px-10 flex-1 overflow-y-auto">
                <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center p-1 shadow-md">
                          <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-[#0f172a] tracking-tight">Activity History</h2>
                          <p className="text-sm text-[#64748b] mt-1">Review your historical task logs</p>
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
                          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-[#dc2626] hover:bg-[#dc2626] hover:text-white rounded-lg text-xs font-bold transition-all border border-[#fee2e2]"
                        >
                          <Trash2 size={14} />
                          Clear All Data
                        </button>
                        <button 
                          onClick={() => setShowImportModal(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-[#475569] hover:bg-[#6366f1] hover:text-white rounded-lg text-xs font-bold transition-all"
                        >
                          <Upload size={14} />
                          Bulk Import
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-[#e2e8f0] shadow-sm">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown size={14} className="text-[#64748b]" />
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as any)}
                        className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md px-2 py-1 outline-none focus:border-[#6366f1] text-[#475569]"
                      >
                        <option value="date-desc">Newest First</option>
                        <option value="date-asc">Oldest First</option>
                        <option value="hours-desc">Highest Hours</option>
                        <option value="hours-asc">Lowest Hours</option>
                      </select>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-[#64748b]">From</span>
                      <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setIsFilterActive(true);
                        }}
                        className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md px-2 py-1 outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-[#64748b]">To</span>
                      <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setIsFilterActive(true);
                        }}
                        className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md px-2 py-1 outline-none focus:border-[#6366f1]"
                      />
                    </div>
                    {isFilterActive && (
                      <button 
                        onClick={() => {
                          setIsFilterActive(false);
                          setStartDate(getTodayKey());
                          setEndDate(getTodayKey());
                        }}
                        className="text-[10px] font-bold text-[#6366f1] hover:underline"
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
                        <div className="text-center py-20 bg-white rounded-2xl border border-[#e2e8f0] border-dashed">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-[#94a3b8]">
                            <History size={32} />
                          </div>
                          <p className="text-[#64748b] font-medium">
                            {isFilterActive ? "No records found in this range." : "No logs found yet."}
                          </p>
                          {isFilterActive ? (
                            <button 
                              onClick={() => setIsFilterActive(false)}
                              className="mt-4 text-[#6366f1] font-bold text-sm hover:underline"
                            >
                              Show all records
                            </button>
                          ) : (
                            <button 
                              onClick={() => setView('tracker')}
                              className="mt-4 text-[#6366f1] font-bold text-sm hover:underline"
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
                          className="w-full text-left bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm hover:border-[#6366f1] transition-all group flex justify-between items-center"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-[#1e293b]">{formatDateLabel(dateKey)}</span>
                              {dateKey === getTodayKey() && (
                                <span className="text-[10px] bg-[#6366f1]/10 text-[#6366f1] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Today</span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-[#64748b] font-medium">
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
                            <ChevronRight size={20} className="text-[#94a3b8] group-hover:text-[#6366f1] transition-colors" />
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
                            className="flex items-center justify-between px-2 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors w-full text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                                <ChevronRight size={16} className="text-slate-400" />
                              </span>
                              <h3 className="text-sm font-bold text-slate-800">{monthName}</h3>
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
        <div className="fixed bottom-6 right-6 hidden md:flex items-center gap-3 bg-white border border-[#e2e8f0] px-5 py-3 rounded-2xl shadow-xl">
          <div className="w-10 h-10 bg-[#6366f1]/10 rounded-xl flex items-center justify-center text-[#6366f1]">
            <Target size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Quick Hint</span>
            <span className="text-xs font-semibold text-[#1e293b]">Type ERT & Hit Enter</span>
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
              <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-amber-400">
                <RotateCcw size={16} />
              </div>
              <span className="text-sm font-medium">Task removed</span>
            </div>
            <button 
              onClick={undoDelete}
              className="text-xs font-bold uppercase tracking-widest text-[#6366f1] hover:text-[#818cf8] transition-colors bg-white/10 px-4 py-2 rounded-lg"
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
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="bg-[#10b981] p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Submit for Payment</h3>
                  <p className="text-white/70 text-sm mt-1">Review and copy your period summary.</p>
                </div>
                <button 
                  onClick={() => setShowSubmitPaymentModal(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto max-h-[60vh] space-y-6">
                {/* Period Selector */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setSubmissionPeriod('current')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${submissionPeriod === 'current' ? 'bg-white shadow-sm text-[#10b981]' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Current Period
                  </button>
                  <button 
                    onClick={() => setSubmissionPeriod('previous')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${submissionPeriod === 'previous' ? 'bg-white shadow-sm text-[#10b981]' : 'text-slate-500 hover:text-slate-700'}`}
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
                        <div className="text-[#10b981] text-xs font-bold uppercase tracking-wider mb-1">Total Time</div>
                        <div className="text-2xl font-bold text-[#065f46]">{h}h {m}m</div>
                      </div>
                      {showEarnings && (
                        <div className="bg-[#6366f1]/10 border border-[#6366f1]/20 rounded-xl p-4 flex flex-col justify-center items-center">
                          <div className="text-[#6366f1] text-xs font-bold uppercase tracking-wider mb-1">Estimated Earnings</div>
                          <div className="text-2xl font-bold text-[#3730a3]">₦{stats.earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 font-mono text-sm whitespace-pre-wrap text-slate-700 relative group">
                  {generatePaymentReport()}
                  <button 
                    onClick={copyPaymentReport}
                    className="absolute top-4 right-4 p-2 bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-[#10b981] hover:border-[#10b981] shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setShowSubmitPaymentModal(false)}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all text-sm"
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
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
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
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
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
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#6366f1]"
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
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                      {editingCategoryIndex === idx ? (
                        <div className="flex-1 flex gap-2">
                          <input 
                            autoFocus
                            type="text"
                            value={editingCategoryValue}
                            onChange={(e) => setEditingCategoryValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEditedCategory()}
                            className="flex-1 bg-white border border-[#6366f1] rounded-lg px-3 py-1 text-sm outline-none"
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
                          <span className="text-sm font-semibold text-slate-700">{cat}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => startEditingCategory(idx)}
                              className="p-1.5 text-slate-400 hover:text-[#6366f1] hover:bg-white rounded-lg"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => deleteCategory(cat)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg"
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
              
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => setShowCategoryModal(false)}
                  className="w-full py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all text-sm"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Goal Settings Modal */}
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
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Account Settings</h3>
                <button 
                  onClick={() => setShowGoalModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={updateGoal} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Daily Target (Hours)
                  </label>
                  <input 
                    type="number"
                    step="0.5"
                    value={tempGoal}
                    onChange={(e) => setTempGoal(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 text-lg font-bold text-slate-900 focus:outline-none focus:border-[#6366f1] transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Rate 1 (Below 40h)
                    </label>
                    <input 
                      type="number"
                      value={tempBaseRate}
                      onChange={(e) => setTempBaseRate(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 text-md font-bold text-slate-900 focus:outline-none focus:border-[#6366f1] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Rate 2 (40h+)
                    </label>
                    <input 
                      type="number"
                      value={tempPremiumRate}
                      onChange={(e) => setTempPremiumRate(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 text-md font-bold text-slate-900 focus:outline-none focus:border-[#6366f1] transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowGoalModal(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 bg-[#6366f1] text-white font-bold rounded-xl shadow-lg shadow-[#6366f1]/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-[#6366f1] p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Bulk Import Historical Logs</h3>
                  <p className="text-white/70 text-sm mt-1">Paste your historical work data below.</p>
                </div>
                <button 
                  onClick={() => setShowImportModal(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
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
                  className="w-full h-80 bg-slate-50 border-2 border-slate-200 rounded-xl px-5 py-4 text-sm font-mono text-slate-900 focus:outline-none focus:border-[#6366f1] transition-all resize-none"
                />
              </div>

              <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50">
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
