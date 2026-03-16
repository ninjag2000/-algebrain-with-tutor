import React, { useState, useCallback, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import ScanScreen from './screens/ScanScreen';
import ChatScreen from './screens/ChatScreen';
import ToolsScreen from './screens/ToolsScreen';
import DashboardScreen from './screens/DashboardScreen';
import ResultScreen from './screens/ResultScreen';
import SolutionScreen from './screens/SolutionScreen';
// FIX: Changed import of TranslatorScreen from default to named to resolve "Module has no default export" error.
import { TranslatorScreen } from './screens/TranslatorScreen';
import SummarizeScreen from './screens/SummarizeScreen';
import SummarizerScreen from './screens/SummarizerScreen';
import EssayWriterScreen from './screens/EssayWriterScreen';
// FIX: Changed import of EssayHelperScreen from default to named to resolve "Module has no default export" error.
import { EssayHelperScreen } from './screens/EssayHelperScreen';
import SettingsScreen from './screens/SettingsScreen';
import LanguageScreen from './screens/LanguageScreen';
import EssayResultScreen from './screens/EssayResultScreen';
import SummarizeResultScreen from './screens/SummarizeResultScreen';
import FloatingBallScreen from './screens/FloatingBallScreen';
import FloatingBallSettingsScreen from './screens/FloatingBallSettingsScreen';
import PaywallScreen from './screens/PaywallScreen';
import Onboarding from './screens/onboarding/Onboarding';
import HistoryScreen from './screens/HistoryScreen';
import CollectionScreen from './screens/CollectionScreen';
import EnterSolutionScreen from './screens/EnterSolutionScreen';
import AssessmentStartScreen from './screens/assessment/AssessmentStartScreen';
import AssessmentQuestionScreen from './screens/assessment/AssessmentQuestionScreen';
import AssessmentAnalysisScreen from './screens/assessment/AssessmentAnalysisScreen';
import AssessmentResultScreen from './screens/assessment/AssessmentResultScreen';
import type { AssessmentResult, SkillStats, SkillHistoryEntry } from './screens/assessment/types';
import { EMPTY_SKILL_STATS, getSkillStatsFromHistory, pruneSkillHistory } from './screens/assessment/types';
import { getStudyPlanFromResult, type StudyPlanDay } from './screens/assessment/assessmentPlan';
import { getSkillFromQuestion } from './screens/assessment/getSkillFromQuestion';
import { getTierMultiplier, getHintMultiplier, BASE_XP_PRACTICE, BASE_BP_PRACTICE, computeChallengeRewards } from './utils/rewardMultipliers';
import PracticeHubScreen from './screens/practice/PracticeHubScreen';
import PracticeScreen from './screens/practice/PracticeScreen';
import DailyChallengeHubScreen from './screens/challenge/DailyChallengeHubScreen';
import PracticeSummaryScreen from './screens/practice/PracticeSummaryScreen';
import PracticeReviewScreen from './screens/practice/PracticeReviewScreen';
import DailyChallengeSummaryScreen from './screens/challenge/DailyChallengeSummaryScreen';
import DailyChallengeReviewScreen from './screens/challenge/DailyChallengeReviewScreen';
import AchievementsScreen from './screens/rewards/AchievementsScreen';
import { Screen, CalculationResult, HistoryItem, ChatMessage, PersonalizationData, VerificationResult, PracticeQuestion, DailyChallengeSession, Achievement, ScanMode } from './types';
import ScanIcon from './components/icons/ScanIcon';
import ChatIcon from './components/icons/ChatIcon';
import ToolsIcon from './components/icons/ToolsIcon';
import ProfileIcon from './components/icons/ProfileIcon';
import { useLocalization } from './contexts/LocalizationContext';
import { getSimilarQuestions, verifySolution } from './services/geminiService';
import SolutionLoadingScreen from './components/SolutionLoadingScreen';
import ConfirmModal from './components/ConfirmModal';
import { generateDailyChallenge, generatePracticeQuestions, generatePracticeQuestionsForSkills, getLastPracticeQuestionTexts, saveLastPracticeQuestionTexts, getBaseDifficulty, generateNextPracticeQuestion, SKILL_ORDER, ACHIEVEMENTS_LIST, PLAYER_LEVELS } from './mockData';
import type { SkillKey } from './screens/assessment/types';
import TopStatusBarHUD from './components/TopStatusBarHUD';
import FloatingBallWidget from './components/FloatingBallWidget';

/** Безопасное чтение из localStorage (на iOS WebView может быть недоступен). */
function safeGet(key: string, fallback: string): string {
  try {
    const v = localStorage.getItem(key);
    return v != null ? v : fallback;
  } catch {
    return fallback;
  }
}
function safeGetJson<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    if (v == null) return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

/** Прогресс уровня (0..1) для заданного XP — так же, как в HUD. */
function getLevelProgressForXp(xpVal: number): number {
  const currentLevel = PLAYER_LEVELS.slice().reverse().find(l => xpVal >= l.minXp) || PLAYER_LEVELS[0];
  const nextLevel = PLAYER_LEVELS.find(l => xpVal < l.minXp);
  if (!nextLevel) return 1;
  const levelXpRange = nextLevel.minXp - currentLevel.minXp;
  const xpIntoLevel = xpVal - currentLevel.minXp;
  return Math.min(xpIntoLevel / levelXpRange, 1);
}

const App: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [clearDialogType, setClearDialogType] = useState<'clearChat' | 'clearHistory' | null>(null);
  const [activeScreen, setActiveScreen] = useState<Screen>(Screen.Scan);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>(() => safeGetJson('algebrain_history', []));
  const [collection, setCollection] = useState<HistoryItem[]>(() => safeGetJson('algebrain_collection', []));
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => safeGetJson('algebrain_chat', []));
  const [personalization, setPersonalization] = useState<PersonalizationData | null>(() => safeGetJson('algebrain_personalization', null));
  const [xp, setXp] = useState(() => parseInt(safeGet('algebrain_xp', '0'), 10));
  const [streak, setStreak] = useState(() => Math.max(0, parseInt(safeGet('algebrain_streak', '0'), 10)));
  const [brainPoints, setBrainPoints] = useState(() => parseInt(safeGet('algebrain_bp', '0'), 10));
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(() => safeGetJson('algebrain_achievements', []));
  const [floatingBallEnabled, setFloatingBallEnabled] = useState(() => safeGet('algebrain_floating_ball_enabled', '') === '1');
  /** Скриншот для Scan & solve из плавающего шара: после обрезки — переход к решению */
  const [screenshotForScan, setScreenshotForScan] = useState<string | null>(null);
  /** Открыто ли плавающее окно тьютора (Ask tutor из плавающего шара) */
  const [floatingTutorOpen, setFloatingTutorOpen] = useState(false);

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [writerResult, setWriterResult] = useState<{ topic: string; mode: string; result: string } | null>(null);
  const [helperResult, setHelperResult] = useState<{ topic: string; mode: string; result: string } | null>(null);
  const [summarizeResult, setSummarizeResult] = useState<{ input: string; analysisType: string; result: string } | null>(null);
  const [summarizerResult, setSummarizerResult] = useState<{ input: string; analysisType: string; result: string } | null>(null);
  /** Всего сканирований (хранится в localStorage — лимит 3 на всё время, не в день). */
  const [solveCount, setSolveCount] = useState(() => {
    try {
      const s = localStorage.getItem('algebrain_solve_count');
      if (s != null) {
        const n = parseInt(s, 10);
        if (!Number.isNaN(n) && n >= 0) return n;
      }
    } catch {}
    return 0;
  });
  const persistSolveCount = useCallback((count: number) => {
    try {
      localStorage.setItem('algebrain_solve_count', String(count));
    } catch {}
  }, []);
  const [currentItem, setCurrentItem] = useState<HistoryItem | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [practiceSession, setPracticeSession] = useState<any>(null);
  const [dailyChallengeSession, setDailyChallengeSession] = useState<DailyChallengeSession | null>(null);
  const [newlyUnlockedAchievement, setNewlyUnlockedAchievement] = useState<Achievement | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(() => {
    try {
      const saved = localStorage.getItem('algebrain_assessment_result');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [hudProgressGrowTrigger, setHudProgressGrowTrigger] = useState(0);
  const [hudBpGrowthTrigger, setHudBpGrowthTrigger] = useState(0);
  const [hudStreakGrowthTrigger, setHudStreakGrowthTrigger] = useState(0);
  const [practiceHubSelectedSkill, setPracticeHubSelectedSkill] = useState<SkillKey | null>(null);
  const [skillHistory, setSkillHistory] = useState<SkillHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('algebrain_skill_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return pruneSkillHistory(parsed);
      }
    } catch {}
    return [];
  });

  const skillStats = React.useMemo(() => getSkillStatsFromHistory(skillHistory), [skillHistory]);

  const weakSkillKeys = React.useMemo((): SkillKey[] => {
    if (!skillStats) return [];
    const items: { key: SkillKey; percent: number }[] = [
      { key: 'arithmetic', percent: skillStats.arithmetic.total > 0 ? Math.round((skillStats.arithmetic.correct / skillStats.arithmetic.total) * 100) : 50 },
      { key: 'equations', percent: skillStats.equations.total > 0 ? Math.round((skillStats.equations.correct / skillStats.equations.total) * 100) : 50 },
      { key: 'logarithms', percent: skillStats.logarithms.total > 0 ? Math.round((skillStats.logarithms.correct / skillStats.logarithms.total) * 100) : 50 },
      { key: 'trigonometry', percent: skillStats.trigonometry.total > 0 ? Math.round((skillStats.trigonometry.correct / skillStats.trigonometry.total) * 100) : 50 },
    ];
    return items.filter(s => s.percent < 80).sort((a, b) => a.percent - b.percent).map(s => s.key);
  }, [skillStats]);

  const [dailyChallengeState, setDailyChallengeState] = useState(() => {
    const saved = localStorage.getItem('algebrain_daily_challenge');
    if (saved) {
        const data = JSON.parse(saved);
        const today = new Date().toLocaleDateString();
        const streak = Math.max(0, data.streak ?? 0);
        const bestStreak = Math.max(0, data.bestStreak ?? 0);
        if (data.lastCompletionDate !== today) {
            return { ...data, streak, bestStreak, completedToday: false };
        }
        return { ...data, streak, bestStreak };
    }
    return { streak: 0, bestStreak: 0, lastCompletionDate: null, completedToday: false };
  });

  const [dailyPracticeCount, setDailyPracticeCount] = useState(() => {
    const saved = localStorage.getItem('algebrain_daily_practice');
    if (saved) {
        const { date, count } = JSON.parse(saved);
        const today = new Date().toLocaleDateString();
        if (date === today) {
            return count;
        }
    }
    return 0;
  });

  /** 14 дней: [сегодня, вчера, ..., 13 дней назад]. Для графика «прогресс за неделю» и сравнения с прошлой неделей. */
  const [weeklyProgress, setWeeklyProgress] = useState<{ date: string; values: number[] }>(() => {
    const today = new Date().toLocaleDateString();
    let todayCount = 0;
    try {
      const dp = localStorage.getItem('algebrain_daily_practice');
      if (dp) {
        const { date, count } = JSON.parse(dp);
        if (date === today) todayCount = count;
      }
    } catch {}
    const raw = localStorage.getItem('algebrain_weekly');
    if (!raw) return { date: today, values: [todayCount, ...Array(13).fill(0)] };
    try {
      const { date: storedDate, values: stored } = JSON.parse(raw);
      const vals = Array.isArray(stored) && stored.length >= 14 ? stored.slice(0, 14) : [...Array(14).fill(0)];
      const storedT = new Date(String(storedDate)).getTime();
      const now = new Date();
      const todayT = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      if (Number.isNaN(storedT) || storedT === todayT) {
        return { date: today, values: [todayCount, ...vals.slice(1, 14)] };
      }
      const daysDiff = Math.round((todayT - storedT) / 86400000);
      if (daysDiff <= 0 || daysDiff >= 14) return { date: today, values: [todayCount, ...Array(13).fill(0)] };
      const shifted = [todayCount, ...Array(daysDiff - 1).fill(0), ...vals.slice(0, 14 - daysDiff)];
      return { date: today, values: shifted.slice(0, 14) };
    } catch {
      return { date: today, values: [todayCount, ...Array(13).fill(0)] };
    }
  });

  const weeklyChartData = React.useMemo(() => {
    const thisWeek = weeklyProgress.values.slice(0, 7);
    const thisSum = thisWeek.reduce((a, b) => a + b, 0);
    const lastSum = weeklyProgress.values.slice(7, 14).reduce((a, b) => a + b, 0);
    const percentChange = lastSum > 0 ? Math.round(((thisSum - lastSum) / lastSum) * 100) : null;
    return { thisWeek, percentChange };
  }, [weeklyProgress]);

  /** После этого количества сканирований функция доступна только по подписке (3 бесплатных, с 4-го — paywall). */
  const FREE_SOLVE_LIMIT = 3;
  const FREE_PRACTICE_LIMIT = 10;
  const { t, language } = useLocalization();

  useEffect(() => { localStorage.setItem('algebrain_history', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('algebrain_collection', JSON.stringify(collection)); }, [collection]);
  useEffect(() => { localStorage.setItem('algebrain_chat', JSON.stringify(chatMessages)); }, [chatMessages]);
  useEffect(() => { if (personalization) localStorage.setItem('algebrain_personalization', JSON.stringify(personalization)); }, [personalization]);
  useEffect(() => { localStorage.setItem('algebrain_xp', xp.toString()); }, [xp]);
  useEffect(() => { localStorage.setItem('algebrain_streak', streak.toString()); }, [streak]);
  useEffect(() => { localStorage.setItem('algebrain_bp', brainPoints.toString()); }, [brainPoints]);
  useEffect(() => { localStorage.setItem('algebrain_achievements', JSON.stringify(unlockedAchievements)); }, [unlockedAchievements]);
  useEffect(() => { localStorage.setItem('algebrain_skill_history', JSON.stringify(pruneSkillHistory(skillHistory))); }, [skillHistory]);
  useEffect(() => {
    const today = new Date().toLocaleDateString();
    localStorage.setItem('algebrain_daily_practice', JSON.stringify({ date: today, count: dailyPracticeCount }));
  }, [dailyPracticeCount]);
  useEffect(() => {
    const today = new Date().toLocaleDateString();
    if (weeklyProgress.date === today) {
      setWeeklyProgress(prev => ({ ...prev, values: [dailyPracticeCount, ...prev.values.slice(1, 14)] }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyPracticeCount]);
  useEffect(() => {
    try { localStorage.setItem('algebrain_weekly', JSON.stringify(weeklyProgress)); } catch {}
  }, [weeklyProgress]);
  useEffect(() => { localStorage.setItem('algebrain_daily_challenge', JSON.stringify(dailyChallengeState)); }, [dailyChallengeState]);

  useEffect(() => {
    if (dailyChallengeState.streak > streak) setStreak(Math.max(0, dailyChallengeState.streak));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
        cameraStreamRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const handleOnboardingComplete = (data: PersonalizationData) => { setPersonalization(data); setShowOnboarding(false); };
  const handlePaywallComplete = () => { setShowPaywall(false); setIsPro(true); };

  const handleScanComplete = useCallback((scanResult: CalculationResult, mode: ScanMode) => { // Receive mode
    setScreenshotForScan(null);
    setSolveCount(prev => {
      const next = prev + 1;
      persistSolveCount(next);
      return next;
    });
    const newHistoryItem: HistoryItem = { id: `hist-${Date.now()}`, ...scanResult, mode, timestamp: Date.now() }; // Store mode
    setHistory(prev => [newHistoryItem, ...prev]);
    setCurrentItem(newHistoryItem);
    setVerificationResult(null);
    setResult(scanResult);
    setActiveScreen(Screen.Solution);
  }, [persistSolveCount]);

  const handleNavigateToEnterSolution = useCallback((scanResult: CalculationResult) => {
    if (scanResult) {
      // Ensure mode is passed through here from scanResult
      const itemToVerify: HistoryItem = { id: `temp-${Date.now()}`, ...scanResult, mode: scanResult.mode || 'math', timestamp: Date.now() }; 
      setCurrentItem(itemToVerify);
      setActiveScreen(Screen.EnterSolution);
    }
  }, []);

  const handleNavigateToEnterSolutionFromChat = useCallback((problem: string) => {
    // Default mode to 'math' for chat-initiated verification
    const itemToVerify: HistoryItem = { id: `temp-chat-${Date.now()}`, problem, solution: '', mode: 'math', timestamp: Date.now() }; 
    setCurrentItem(itemToVerify);
    setActiveScreen(Screen.EnterSolution);
  }, []);

  const handleVerificationComplete = useCallback(async (userAnswer: string) => {
    if (!currentItem) return;
    setIsProcessing(true);
    const result = await verifySolution(currentItem.problem, userAnswer, language);
    setIsProcessing(false);
    setVerificationResult({ ...result, userAnswer });
    // Add currentItem to history if it's a new entry (e.g., from chat)
    if (!history.find(h => h.id === currentItem.id)) {
        setHistory(prev => [{ ...currentItem, mode: currentItem.mode || 'math' }, ...prev]);
    }
    setActiveScreen(Screen.Solution);
  }, [currentItem, language, history]);
  
  const handleEditEquation = useCallback((problem: string, image: string) => { 
    setResult({ image, problem, solution: '', mode: 'math' }); // Default mode for editing
    setActiveScreen(Screen.Result); 
  }, []);
  
  const handleBackToScan = useCallback(() => { setResult(null); setScreenshotForScan(null); setActiveScreen(Screen.Scan); }, []);
  /** Scan & solve из плавающего шара: скриншот экрана → обрезка → решение */
  const handleFloatingBallScan = useCallback(() => {
    const el = document.querySelector('main');
    const target = el && el instanceof HTMLElement ? el : document.body;
    html2canvas(target, { useCORS: true, allowTaint: true, logging: false }).then((canvas) => {
      setScreenshotForScan(canvas.toDataURL('image/jpeg', 0.9));
      setActiveScreen(Screen.Scan);
    }).catch(() => setActiveScreen(Screen.Scan));
  }, []);
  const handleNavigateToCalculator = useCallback(() => { setResult({ image: '', problem: '', solution: '', mode: 'math' }); setActiveScreen(Screen.Result); }, []);
  const handleNavigateToTranslator = useCallback(() => setActiveScreen(Screen.Translator), []);
  const handleNavigateToSummarize = useCallback(() => setActiveScreen(Screen.Summarize), []);
  const handleNavigateToSummarizer = useCallback(() => setActiveScreen(Screen.Summarizer), []);
  const handleNavigateToEssayWriter = useCallback(() => setActiveScreen(Screen.EssayWriter), []);
  const handleNavigateToEssayHelper = useCallback(() => setActiveScreen(Screen.EssayHelper), []);
  const handleNavigateToSettings = useCallback(() => setActiveScreen(Screen.Settings), []);
  const handleNavigateToLanguage = useCallback(() => setActiveScreen(Screen.Language), []);
  const handleNavigateToFloatingBall = useCallback(() => setActiveScreen(Screen.FloatingBall), []);
  // FIX: Define handleNavigateToFloatingBallSettings to navigate to the floating ball settings screen.
  const handleNavigateToFloatingBallSettings = useCallback(() => setActiveScreen(Screen.FloatingBallSettings), []);
  const handleNavigateToHistory = useCallback(() => setActiveScreen(Screen.History), []);
  const handleNavigateToCollection = useCallback(() => setActiveScreen(Screen.Collection), []);
  const handleNavigateToAchievements = useCallback(() => setActiveScreen(Screen.Achievements), []);
  const handleClearChat = useCallback(() => setClearDialogType('clearChat'), []);
  const handleClearHistory = useCallback(() => setClearDialogType('clearHistory'), []);
  const handleBackToTools = useCallback(() => setActiveScreen(Screen.Tools), []);
  const handleBackToDashboard = useCallback(() => setActiveScreen(Screen.Dashboard), []);
  const handleBackToFloatingBall = useCallback(() => setActiveScreen(Screen.FloatingBall), []);

  const handleCalculationComplete = useCallback((problem: string, solution: string) => {
    setSolveCount(prev => {
      const next = prev + 1;
      persistSolveCount(next);
      return next;
    });
    // Default mode to 'math' for text input calculations
    const newHistoryItem: HistoryItem = { id: `hist-${Date.now()}`, problem, solution, image: result?.image, mode: 'math', timestamp: Date.now() }; 
    setHistory(prev => [newHistoryItem, ...prev]);
    setCurrentItem(newHistoryItem);
    setVerificationResult(null);
    setActiveScreen(Screen.Solution);
  }, [result, persistSolveCount]);

  const handleBackToResult = useCallback(() => {
    if (currentItem?.image && currentItem.mode === 'math') setActiveScreen(Screen.Scan); // Only go back to Scan for Math
    else if (currentItem?.id.startsWith('temp-chat-')) setActiveScreen(Screen.Chat);
    else setActiveScreen(Screen.Tools); // For translate mode or others, go back to tools
    setCurrentItem(null); setVerificationResult(null);
  }, [currentItem]);

  const handleEssayComplete = useCallback((topic: string, mode: string, result: string) => { setWriterResult({ topic, mode, result }); setHelperResult(null); setActiveScreen(Screen.EssayResult); }, []);
  const handleBackToEssayWriter = useCallback(() => setActiveScreen(Screen.EssayWriter), []);
  const handleHelperComplete = useCallback((topic: string, mode: string, result: string) => { setHelperResult({ topic, mode, result }); setWriterResult(null); setActiveScreen(Screen.EssayResult); }, []);
  const handleBackToEssayHelper = useCallback(() => setActiveScreen(Screen.EssayHelper), []);
  const handleSummarizeComplete = useCallback((input: string, analysisType: string, result: string) => { setSummarizeResult({ input, analysisType, result }); setActiveScreen(Screen.SummarizeResult); }, []);
  const handleBackToSummarize = useCallback(() => setActiveScreen(Screen.Summarize), []);
  const handleSummarizerComplete = useCallback((input: string, analysisType: string, result: string) => { setSummarizerResult({ input, analysisType, result }); setActiveScreen(Screen.SummarizeResult); }, []);
  const handleBackToSummarizer = useCallback(() => setActiveScreen(Screen.Summarizer), []);
  const handleViewHistoryItem = useCallback((item: HistoryItem) => { setCurrentItem(item); setVerificationResult(null); setActiveScreen(Screen.Solution); }, []);
  const handleToggleCollection = useCallback((item: HistoryItem) => setCollection(prev => prev.some(c => c.id === item.id) ? prev.filter(c => c.id !== item.id) : [item, ...prev]), []);
  
  const handlePracticeSimilar = useCallback(async (problem: string) => {
    setIsProcessing(true);
    const similarProblemsText = await getSimilarQuestions(problem, language);
    setIsProcessing(false);
    setChatMessages(prev => [...prev, { sender: 'ai', text: similarProblemsText, type: 'message' }]);
    setActiveScreen(Screen.Chat);
  }, [language]);

  const handleAddChatMessage = useCallback((message: ChatMessage, awardXp = false) => {
    setChatMessages(prev => [...prev, message]);
    if (awardXp) {
        setXp(prev => prev + 10);
        const lastDate = localStorage.getItem('algebrain_last_active_date');
        const today = new Date().toLocaleDateString();
        if (lastDate !== today) {
            const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
            if (lastDate === yesterday.toLocaleDateString()) setStreak(prev => prev + 1);
            else setStreak(1);
            localStorage.setItem('algebrain_last_active_date', today);
        }
    }
  }, []);
  
  const handleStartAssessment = useCallback(() => setActiveScreen(Screen.AssessmentStart), []);
  const handleAssessmentComplete = useCallback((result: AssessmentResult) => {
    setAssessmentResult(result);
    try { localStorage.setItem('algebrain_assessment_result', JSON.stringify(result)); } catch {}
    setXp(prev => prev + 250);
    const now = Date.now();
    setSkillHistory(prev => pruneSkillHistory([...prev, ...result.steps.map(s => ({ t: now, skill: s.skill, correct: s.correct }))]));
    setActiveScreen(Screen.AssessmentAnalysis);
  }, []);
  
  const handleNavigateToPracticeHub = useCallback(() => {
    setPracticeHubSelectedSkill(null);
    setActiveScreen(Screen.PracticeHub);
  }, []);
  const handleStartWeakPractice = useCallback((skillKeys: SkillKey[]) => {
    if (!isPro && dailyPracticeCount >= FREE_PRACTICE_LIMIT) {
      setShowPaywall(true);
      return;
    }
    const count = 10;
    const exclude = getLastPracticeQuestionTexts();
    const baseDifficulty = getBaseDifficulty(personalization?.level ?? null);
    const skillKeysForRound = skillKeys.length > 0 ? skillKeys : (['logarithms', 'equations'] as SkillKey[]);
    const perSkillDifficulty: Record<SkillKey, number> = { arithmetic: baseDifficulty, equations: baseDifficulty, logarithms: baseDifficulty, trigonometry: baseDifficulty };
    const firstSkill = skillKeysForRound[0]!;
    const firstQuestion = generateNextPracticeQuestion(firstSkill, baseDifficulty as 1 | 2 | 3 | 4 | 5 | 6 | 7, new Set(), exclude);
    setPracticeSession({
      mode: 'weak',
      questions: [firstQuestion],
      currentQuestionIndex: 0,
      totalCount: count,
      skillKeysForRound,
      perSkillDifficulty,
      answers: [],
      stats: { correct: 0, total: count, xpEarned: 0, bpEarned: 0 },
      consecutiveCorrect: 0,
      sessionStartXp: xp,
      sessionStartBp: brainPoints,
      sessionStartStreak: streak,
    });
    setActiveScreen(Screen.PracticeScreen);
  }, [isPro, dailyPracticeCount, personalization?.level, xp, brainPoints, streak]);

  const handleStartPractice = useCallback((mode: string, questionCount: number, skillKeys?: SkillKey[]) => {
    if (!isPro && dailyPracticeCount >= FREE_PRACTICE_LIMIT) {
      setShowPaywall(true);
      return;
    }
    const exclude = getLastPracticeQuestionTexts();
    let baseDifficulty = getBaseDifficulty(personalization?.level ?? null);
    if (mode === 'exam') baseDifficulty = Math.max(4, baseDifficulty) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
    if (mode === 'test') baseDifficulty = (5 + Math.floor(Math.random() * 3)) as 5 | 6 | 7;
    const skillKeysForRound = skillKeys?.length ? skillKeys : SKILL_ORDER;
    const perSkillDifficulty: Record<SkillKey, number> = { arithmetic: baseDifficulty, equations: baseDifficulty, logarithms: baseDifficulty, trigonometry: baseDifficulty };
    const firstSkill = skillKeysForRound[0]!;
    const firstQuestion = generateNextPracticeQuestion(firstSkill, baseDifficulty as 1 | 2 | 3 | 4 | 5 | 6 | 7, new Set(), exclude);
    setPracticeHubSelectedSkill(null);
    setPracticeSession({
        mode,
        questions: [firstQuestion],
        currentQuestionIndex: 0,
        totalCount: questionCount,
        skillKeysForRound,
        perSkillDifficulty,
        answers: [],
        stats: { correct: 0, total: questionCount, xpEarned: 0, bpEarned: 0 },
        consecutiveCorrect: 0,
        sessionStartXp: xp,
        sessionStartBp: brainPoints,
    });
    setActiveScreen(Screen.PracticeScreen);
  }, [isPro, dailyPracticeCount, personalization?.level, xp, brainPoints]);

  const handleNavigateToPracticeForSkill = useCallback((skillKey: SkillKey) => {
    setPracticeHubSelectedSkill(skillKey);
    handleStartPractice('smart', 10, [skillKey]);
  }, [handleStartPractice]);

  const handleStartPlan = useCallback((plan: StudyPlanDay[]) => {
    const first = plan?.[0];
    const count = first?.duration === '15 min' ? 15 : first?.duration === '10 min' ? 10 : 5;
    if (!isPro && dailyPracticeCount >= FREE_PRACTICE_LIMIT) {
      setShowPaywall(true);
      return;
    }
    const exclude = getLastPracticeQuestionTexts();
    const baseDifficulty = getBaseDifficulty(personalization?.level ?? null);
    const skillKeysForRound = SKILL_ORDER;
    const perSkillDifficulty: Record<SkillKey, number> = { arithmetic: baseDifficulty, equations: baseDifficulty, logarithms: baseDifficulty, trigonometry: baseDifficulty };
    const firstSkill = skillKeysForRound[0]!;
    const firstQuestion = generateNextPracticeQuestion(firstSkill, baseDifficulty as 1 | 2 | 3 | 4 | 5 | 6 | 7, new Set(), exclude);
    setPracticeSession({
      mode: 'smart',
      questions: [firstQuestion],
      currentQuestionIndex: 0,
      totalCount: count,
      skillKeysForRound,
      perSkillDifficulty,
      answers: [],
      stats: { correct: 0, total: count, xpEarned: 0, bpEarned: 0 },
      consecutiveCorrect: 0,
      sessionStartXp: xp,
      sessionStartBp: brainPoints,
      sessionStartStreak: streak,
    });
    setActiveScreen(Screen.PracticeScreen);
  }, [isPro, dailyPracticeCount, personalization?.level, xp, brainPoints, streak]);

  const handleStartDailyChallenge = useCallback(() => {
    setNewlyUnlockedAchievement(null);
    const fullChallenge = generateDailyChallenge(personalization?.level ?? undefined);
    const challengeTemplate = { ...fullChallenge, questions: [] as PracticeQuestion[] };
    const baseDifficulty = getBaseDifficulty(personalization?.level ?? null);
    const exclude = getLastPracticeQuestionTexts();
    const firstQuestion = generateNextPracticeQuestion(SKILL_ORDER[0]!, baseDifficulty as 1 | 2 | 3 | 4 | 5 | 6 | 7, new Set(), exclude);
    const DAILY_COUNT = 5;
    const perSkillDifficulty: Record<SkillKey, number> = { arithmetic: baseDifficulty, equations: baseDifficulty, logarithms: baseDifficulty, trigonometry: baseDifficulty };
    setDailyChallengeSession({
      challenge: challengeTemplate,
      answers: [],
      startTime: Date.now(),
    });
    setPracticeSession({
      mode: 'daily',
      questions: [firstQuestion],
      currentQuestionIndex: 0,
      totalCount: DAILY_COUNT,
      skillKeysForRound: SKILL_ORDER,
      perSkillDifficulty,
      stats: { correct: 0, total: DAILY_COUNT, xpEarned: 0, bpEarned: 0 },
      consecutiveCorrect: 0,
      sessionStartXp: xp,
      sessionStartBp: brainPoints,
    });
    setActiveScreen(Screen.PracticeScreen);
  }, [personalization?.level, xp, brainPoints]);

  const handleCompleteDailyChallenge = useCallback((session: DailyChallengeSession) => {
    const today = new Date().toLocaleDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const isStreakContinuing = dailyChallengeState.lastCompletionDate === yesterday.toLocaleDateString();
    const newStreak = Math.max(0, isStreakContinuing ? dailyChallengeState.streak + 1 : 1);

    setStreak(newStreak);
    setDailyChallengeState(prev => ({
        ...prev,
        completedToday: true,
        lastCompletionDate: today,
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
    }));

    setDailyPracticeCount(prev => Math.max(prev, 5));

    const totalQuestions = session.challenge.questions.length;
    const baseXpPerQuestion = totalQuestions > 0 ? (session.challenge.reward || 120) / totalQuestions : 0;
    const baseBpPerQuestion = totalQuestions > 0 ? session.challenge.brainPoints / totalQuestions : 0;
    const { xpGained, bpGained } = computeChallengeRewards(session.answers, baseXpPerQuestion, baseBpPerQuestion, isPro);
    const newTotalXp = xp + xpGained;
    setXp(newTotalXp);
    setBrainPoints(prev => prev + bpGained);

    // Check for new achievements
    const correctAnswers = session.answers.filter(a => a.isCorrect).length;
    const achievementStats = {
      streak: newStreak,
      xp: newTotalXp,
      correctAnswers,
      totalQuestions: session.challenge.questions.length,
      timeTaken: session.timeTaken
    };

    const newlyUnlocked = ACHIEVEMENTS_LIST.find(ach => 
        !unlockedAchievements.includes(ach.id) && ach.threshold(achievementStats)
    );

    if (newlyUnlocked) {
        setUnlockedAchievements(prev => [...prev, newlyUnlocked.id]);
        setNewlyUnlockedAchievement(newlyUnlocked);
    }
    
    setDailyChallengeSession(session);
    const now = Date.now();
    setSkillHistory(prev => pruneSkillHistory([...prev, ...session.answers.map(({ question, isCorrect }) => ({ t: now, skill: getSkillFromQuestion(question.question), correct: isCorrect }))]));
    setActiveScreen(Screen.DailyChallengeSummary);
  }, [dailyChallengeState, xp, isPro, unlockedAchievements]);

  const handleAnswerPracticeQuestion = useCallback((isCorrect: boolean, question?: string, meta?: { hintUsed: boolean; difficulty: number; stepsRevealedCount?: number }, userAnswerRaw?: string) => {
    if (!practiceSession) return;
    const isDaily = practiceSession.mode === 'daily';
    let newXp = 0;
    let newBp = 0;

    if (isDaily && dailyChallengeSession) {
      const currentQ = practiceSession.questions[practiceSession.currentQuestionIndex];
      if (currentQ) {
        const newAnswer = { question: currentQ, userAnswer: userAnswerRaw ?? '', isCorrect, hintUsed: meta?.hintUsed };
        setDailyChallengeSession(prev => prev ? { ...prev, answers: [...prev.answers, newAnswer] } : null);
      }
    } else {
      if (question) {
        const skill = getSkillFromQuestion(question);
        setSkillHistory(prev => pruneSkillHistory([...prev, { t: Date.now(), skill, correct: isCorrect }]));
      }
      setDailyPracticeCount(prev => prev + 1);
      const tierMult = meta ? getTierMultiplier(meta.difficulty) : 1;
      const hintMult = meta?.hintUsed ? getHintMultiplier(true) : getHintMultiplier(false);
      newXp = isCorrect ? Math.round(BASE_XP_PRACTICE * tierMult * hintMult) : 0;
      const allowedSteps = Math.max(0, (meta?.difficulty ?? 1) - 3);
      const stepsRevealed = meta?.stepsRevealedCount ?? 0;
      const noBpForTooManySteps = stepsRevealed > allowedSteps;
      newBp = isCorrect && !noBpForTooManySteps ? Math.round(BASE_BP_PRACTICE * tierMult * hintMult) : 0;
      setXp(prev => prev + newXp);
      if (newBp > 0) setBrainPoints(prev => prev + newBp);
    }

    setPracticeSession((prev: any) => {
        const nextConsecutive = isCorrect ? (prev.consecutiveCorrect ?? 0) + 1 : 0;
        const newStats = {
            ...prev.stats,
            correct: isCorrect ? prev.stats.correct + 1 : prev.stats.correct,
            xpEarned: prev.stats.xpEarned + newXp,
            bpEarned: (prev.stats.bpEarned ?? 0) + newBp,
        };
        const nextIndex = prev.currentQuestionIndex + 1;
        const isLastQuestion = nextIndex >= (prev.totalCount ?? prev.questions.length);
        if (isLastQuestion) {
            if (prev.mode === 'daily' && dailyChallengeSession) {
              const currentQ = prev.questions[prev.currentQuestionIndex];
              const lastAnswer = currentQ ? { question: currentQ, userAnswer: userAnswerRaw ?? '', isCorrect, hintUsed: meta?.hintUsed } : null;
              const finalAnswers = lastAnswer ? [...dailyChallengeSession.answers, lastAnswer] : dailyChallengeSession.answers;
              const finalSession: DailyChallengeSession = {
                ...dailyChallengeSession,
                challenge: { ...dailyChallengeSession.challenge, questions: prev.questions },
                answers: finalAnswers,
                timeTaken: Math.round((Date.now() - dailyChallengeSession.startTime) / 1000),
              };
              handleCompleteDailyChallenge(finalSession);
              setActiveScreen(Screen.DailyChallengeSummary);
            } else {
              setHudBpGrowthTrigger(0);
              setHudStreakGrowthTrigger(0);
              setHudProgressGrowTrigger(0);
              setActiveScreen(Screen.PracticeSummary);
            }
            return { ...prev, stats: newStats, consecutiveCorrect: nextConsecutive };
        }
        const maxTier = prev.mode === 'quick' ? 4 : 7;
        const minTier = prev.mode === 'exam' ? 4 : prev.mode === 'test' ? 5 : 1;
        const currentQ = prev.questions[prev.currentQuestionIndex];
        const skill = currentQ ? getSkillFromQuestion(currentQ.question) : SKILL_ORDER[0]!;
        const newPerSkill = { ...prev.perSkillDifficulty } as Record<SkillKey, number>;
        if (prev.perSkillDifficulty && skill) {
            const cur = Math.min(maxTier, Math.max(minTier, prev.perSkillDifficulty[skill] ?? 2));
            newPerSkill[skill] = Math.min(maxTier, Math.max(minTier, cur + (isCorrect ? 1 : -1)));
        }
        const nextSkill = prev.skillKeysForRound?.[nextIndex % prev.skillKeysForRound.length] ?? SKILL_ORDER[nextIndex % SKILL_ORDER.length]!;
        const nextDiff = Math.min(maxTier, Math.max(minTier, newPerSkill[nextSkill] ?? 2)) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
        const seen = new Set<string>(prev.questions.map((q: { question: string }) => q.question));
        const nextQ = generateNextPracticeQuestion(nextSkill, nextDiff, seen, getLastPracticeQuestionTexts());
        return {
            ...prev,
            questions: [...prev.questions, nextQ],
            currentQuestionIndex: nextIndex,
            perSkillDifficulty: newPerSkill,
            stats: newStats,
            consecutiveCorrect: nextConsecutive,
        };
    });
  }, [practiceSession, dailyChallengeSession, handleCompleteDailyChallenge]);

  const handleNavigateToChallengeReview = useCallback(() => {
      setActiveScreen(Screen.DailyChallengeReview);
  }, []);

  const renderScreen = () => {
    const onOpenPaywall = () => setShowPaywall(true);

    switch (activeScreen) {
      case Screen.Scan: return <ScanScreen cachedCameraStreamRef={cameraStreamRef} onScanComplete={handleScanComplete} solveCount={solveCount} onOpenPaywall={onOpenPaywall} freeSolveLimit={FREE_SOLVE_LIMIT} isPro={isPro} onEditEquation={handleEditEquation} onCheckAnswer={handleNavigateToEnterSolution} initialScreenshot={screenshotForScan} onClearInitialScreenshot={() => setScreenshotForScan(null)} />;
      case Screen.Chat: return <ChatScreen messages={chatMessages} onAddMessage={handleAddChatMessage} isPro={isPro} onOpenPaywall={onOpenPaywall} onNavigateToScan={() => setActiveScreen(Screen.Scan)} onNavigateToEnterSolution={handleNavigateToEnterSolutionFromChat} xp={xp} streak={streak} brainPoints={brainPoints} showDailyBadge={dailyChallengeSession != null} />;
      case Screen.Tools: return <ToolsScreen xp={xp} streak={streak} brainPoints={brainPoints} showDailyBadge={dailyChallengeSession != null} onNavigateToCalculator={handleNavigateToCalculator} onNavigateToTranslator={handleNavigateToTranslator} onNavigateToSummarize={handleNavigateToSummarize} onNavigateToSummarizer={handleNavigateToSummarizer} onNavigateToEssayWriter={handleNavigateToEssayWriter} onNavigateToEssayHelper={handleNavigateToEssayHelper} onNavigateToFloatingBall={handleNavigateToFloatingBall} onNavigateToChat={() => setActiveScreen(Screen.Chat)} onNavigateToPracticeHub={handleNavigateToPracticeHub} />;
      case Screen.Dashboard: return <DashboardScreen xp={xp} streak={streak} brainPoints={brainPoints} showDailyBadge={dailyChallengeSession != null} isPro={isPro} dailyGoal={5} dailyTasksCompleted={Math.min(dailyPracticeCount * 2, 5)} weeklyProgressData={weeklyChartData.thisWeek} weeklyComparisonPercent={weeklyChartData.percentChange} onNavigateToSettings={handleNavigateToSettings} onNavigateToLanguage={handleNavigateToLanguage} onNavigateToFloatingBall={handleNavigateToFloatingBall} onOpenPaywall={onOpenPaywall} onNavigateToHistory={handleNavigateToHistory} onNavigateToCollection={handleNavigateToCollection} onClearChat={handleClearChat} onClearHistory={handleClearHistory} onStartAssessment={handleStartAssessment} onStartDailyChallenge={() => setActiveScreen(Screen.DailyChallengeHub)} onNavigateToPracticeHub={handleNavigateToPracticeHub} onNavigateToPracticeForSkill={handleNavigateToPracticeForSkill} onStartWeakPractice={handleStartWeakPractice} dailyChallengeState={dailyChallengeState} onNavigateToAchievements={handleNavigateToAchievements} dashboardPlan={assessmentResult != null ? getStudyPlanFromResult(assessmentResult) : null} onStartPlan={handleStartPlan} skillStats={skillStats} hasPassedAssessment={ (assessmentResult != null && assessmentResult.steps != null && assessmentResult.steps.length > 0) || dailyChallengeState.streak >= 1 || dailyChallengeState.completedToday } />;
      case Screen.Result: return result ? <ResultScreen result={result} onBack={handleBackToScan} onCalculationComplete={handleCalculationComplete} solveCount={solveCount} onOpenPaywall={onOpenPaywall} freeSolveLimit={FREE_SOLVE_LIMIT} /> : <ScanScreen cachedCameraStreamRef={cameraStreamRef} onScanComplete={handleScanComplete} solveCount={solveCount} onOpenPaywall={onOpenPaywall} freeSolveLimit={FREE_SOLVE_LIMIT} isPro={isPro} onEditEquation={handleEditEquation} onCheckAnswer={handleNavigateToEnterSolution} />;
      case Screen.Solution: return currentItem ? <SolutionScreen item={currentItem} collection={collection} onToggleCollection={handleToggleCollection} onBack={handleBackToResult} isPro={isPro} onOpenPaywall={onOpenPaywall} onPracticeSimilar={() => handlePracticeSimilar(currentItem.problem)} verificationResult={verificationResult} /> : <ScanScreen cachedCameraStreamRef={cameraStreamRef} onScanComplete={handleScanComplete} solveCount={solveCount} onOpenPaywall={onOpenPaywall} freeSolveLimit={FREE_SOLVE_LIMIT} isPro={isPro} onEditEquation={handleEditEquation} onCheckAnswer={handleNavigateToEnterSolution} />;
      case Screen.EnterSolution: const backAction = currentItem?.id.startsWith('temp-chat-') ? () => setActiveScreen(Screen.Chat) : handleBackToScan; return currentItem ? <EnterSolutionScreen item={currentItem} onBack={backAction} onVerificationComplete={handleVerificationComplete} /> : <ScanScreen cachedCameraStreamRef={cameraStreamRef} onScanComplete={handleScanComplete} solveCount={solveCount} onOpenPaywall={onOpenPaywall} freeSolveLimit={FREE_SOLVE_LIMIT} isPro={isPro} onEditEquation={handleEditEquation} onCheckAnswer={handleNavigateToEnterSolution} />;
      case Screen.Translator: return <TranslatorScreen onBack={handleBackToTools} />;
      case Screen.Summarize: return <SummarizeScreen onBack={handleBackToTools} onSummarizeComplete={handleSummarizeComplete} />;
      case Screen.Summarizer: return <SummarizerScreen onBack={handleBackToTools} onSummarizerComplete={handleSummarizerComplete} />;
      case Screen.EssayWriter: return <EssayWriterScreen onBack={handleBackToTools} onEssayComplete={handleEssayComplete} />;
      case Screen.EssayHelper: return <EssayHelperScreen onBack={handleBackToTools} onHelperComplete={handleHelperComplete} />;
      case Screen.Settings: return <SettingsScreen onBack={handleBackToDashboard} onNavigateToLanguage={handleNavigateToLanguage} />;
      case Screen.Language: return <LanguageScreen onBack={handleBackToDashboard} />;
      case Screen.EssayResult: if (writerResult) return <EssayResultScreen topic={writerResult.topic} mode={writerResult.mode} result={writerResult.result} onBack={handleBackToEssayWriter} />; if (helperResult) return <EssayResultScreen topic={helperResult.topic} mode={helperResult.mode} result={helperResult.result} onBack={handleBackToEssayHelper} />; return <ToolsScreen xp={xp} streak={streak} brainPoints={brainPoints} showDailyBadge={dailyChallengeSession != null} onNavigateToCalculator={handleNavigateToCalculator} onNavigateToTranslator={handleNavigateToTranslator} onNavigateToSummarize={handleNavigateToSummarize} onNavigateToSummarizer={handleNavigateToSummarizer} onNavigateToEssayWriter={handleNavigateToEssayWriter} onNavigateToEssayHelper={handleNavigateToEssayHelper} onNavigateToFloatingBall={handleNavigateToFloatingBall} onNavigateToChat={() => setActiveScreen(Screen.Chat)} onNavigateToPracticeHub={handleNavigateToPracticeHub} />;
      case Screen.SummarizeResult: if (summarizerResult) return <SummarizeResultScreen input={summarizerResult.input} analysisType={summarizerResult.analysisType} result={summarizerResult.result} onBack={handleBackToSummarizer} backLabelKey='summarizer.backToTool'/>; if (summarizeResult) return <SummarizeResultScreen input={summarizeResult.input} analysisType={summarizeResult.analysisType} result={summarizeResult.result} onBack={handleBackToSummarize} backLabelKey='summarize.backToTool' />; return <ToolsScreen xp={xp} streak={streak} brainPoints={brainPoints} showDailyBadge={dailyChallengeSession != null} onNavigateToCalculator={handleNavigateToCalculator} onNavigateToTranslator={handleNavigateToTranslator} onNavigateToSummarize={handleNavigateToSummarize} onNavigateToSummarizer={handleNavigateToSummarizer} onNavigateToEssayWriter={handleNavigateToEssayWriter} onNavigateToEssayHelper={handleNavigateToEssayHelper} onNavigateToFloatingBall={handleNavigateToFloatingBall} onNavigateToChat={() => setActiveScreen(Screen.Chat)} onNavigateToPracticeHub={handleNavigateToPracticeHub} />;
      case Screen.FloatingBall: return <FloatingBallScreen onBack={handleBackToTools} onNavigateToSettings={handleNavigateToFloatingBallSettings} floatingBallEnabled={floatingBallEnabled} onFloatingBallEnabledChange={(v) => { if (v && !isPro) { setShowPaywall(true); return; } setFloatingBallEnabled(v); try { localStorage.setItem('algebrain_floating_ball_enabled', v ? '1' : '0'); } catch {} }} isPro={isPro} onOpenPaywall={() => setShowPaywall(true)} />;
      case Screen.FloatingBallSettings: return <FloatingBallSettingsScreen onBack={handleBackToFloatingBall} />;
      case Screen.History: return <HistoryScreen onBack={handleBackToDashboard} history={history} onViewHistoryItem={handleViewHistoryItem} onNavigateToScan={() => setActiveScreen(Screen.Scan)} />;
      case Screen.Collection: return <CollectionScreen onBack={handleBackToDashboard} collection={collection} onViewHistoryItem={handleViewHistoryItem} />;
      case Screen.Achievements: return <AchievementsScreen onBack={handleBackToDashboard} xp={xp} unlockedAchievements={unlockedAchievements} />;
      case Screen.AssessmentStart: return <AssessmentStartScreen onStart={() => setActiveScreen(Screen.AssessmentQuestion)} onSkip={handleBackToDashboard} />;
      case Screen.AssessmentQuestion: return <AssessmentQuestionScreen onComplete={handleAssessmentComplete} onBack={handleBackToDashboard} />;
      case Screen.AssessmentAnalysis: return <AssessmentAnalysisScreen onFinish={() => setActiveScreen(Screen.AssessmentResult)} onBack={handleBackToDashboard} />;
      case Screen.AssessmentResult: return <AssessmentResultScreen result={assessmentResult} onDone={handleBackToDashboard} onOpenPaywall={onOpenPaywall} onStartPlan={handleStartPlan} />;
      case Screen.PracticeHub: return <PracticeHubScreen onBack={handleBackToTools} onStartPractice={handleStartPractice} onOpenPaywall={onOpenPaywall} isPro={isPro} selectedSkill={practiceHubSelectedSkill} onStartWeakPractice={handleStartWeakPractice} weakSkillKeys={weakSkillKeys} />;
      case Screen.PracticeScreen: return practiceSession ? <PracticeScreen session={practiceSession} onAnswer={handleAnswerPracticeQuestion} onBack={practiceSession.mode === 'daily' ? () => setActiveScreen(Screen.DailyChallengeHub) : handleNavigateToPracticeHub} xp={xp} streak={streak} dailyGoal={5} problemsDoneToday={dailyPracticeCount} /> : <PracticeHubScreen onBack={handleBackToTools} onStartPractice={handleStartPractice} onOpenPaywall={onOpenPaywall} isPro={isPro} selectedSkill={null} onStartWeakPractice={handleStartWeakPractice} weakSkillKeys={weakSkillKeys} />;
      case Screen.PracticeSummary: return practiceSession ? <PracticeSummaryScreen stats={practiceSession.stats} streak={streak} onDone={() => { saveLastPracticeQuestionTexts(practiceSession?.questions); handleBackToTools(); }} onRetry={() => setActiveScreen(Screen.PracticeReview)} onAskAlgor={() => setActiveScreen(Screen.Chat)} onCognitiveFlyComplete={() => setHudProgressGrowTrigger(Date.now())} onBpFlyComplete={() => setHudBpGrowthTrigger(Date.now())} /> : <PracticeHubScreen onBack={handleBackToTools} onStartPractice={handleStartPractice} onOpenPaywall={onOpenPaywall} isPro={isPro} selectedSkill={null} onStartWeakPractice={handleStartWeakPractice} weakSkillKeys={weakSkillKeys} />;
      case Screen.PracticeReview: return practiceSession ? <PracticeReviewScreen questions={practiceSession.questions} onDone={handleBackToTools} /> : <PracticeHubScreen onBack={handleBackToTools} onStartPractice={handleStartPractice} onOpenPaywall={onOpenPaywall} isPro={isPro} selectedSkill={null} onStartWeakPractice={handleStartWeakPractice} weakSkillKeys={weakSkillKeys} />;
      case Screen.DailyChallengeHub: return <DailyChallengeHubScreen onBack={handleBackToDashboard} onStart={handleStartDailyChallenge} challengeState={dailyChallengeState} preparationLevel={personalization?.level ?? undefined} />;
      case Screen.DailyChallengeSummary: return dailyChallengeSession ? <DailyChallengeSummaryScreen session={dailyChallengeSession} onDone={handleBackToDashboard} isPro={isPro} streak={dailyChallengeState.streak} onReview={handleNavigateToChallengeReview} newlyUnlockedAchievement={newlyUnlockedAchievement} /> : <DailyChallengeHubScreen onBack={handleBackToDashboard} onStart={handleStartDailyChallenge} challengeState={dailyChallengeState} preparationLevel={personalization?.level ?? undefined} />;
      case Screen.DailyChallengeReview: return dailyChallengeSession ? <DailyChallengeReviewScreen session={dailyChallengeSession} onDone={handleBackToDashboard} /> : <DailyChallengeHubScreen onBack={handleBackToDashboard} onStart={handleStartDailyChallenge} challengeState={dailyChallengeState} preparationLevel={personalization?.level ?? undefined} />;
      default: return <ScanScreen cachedCameraStreamRef={cameraStreamRef} onScanComplete={handleScanComplete} solveCount={solveCount} onOpenPaywall={onOpenPaywall} freeSolveLimit={FREE_SOLVE_LIMIT} isPro={isPro} onEditEquation={handleEditEquation} onCheckAnswer={handleNavigateToEnterSolution} />;
    }
  };

  const NavItem: React.FC<{ screen: Screen; label: string; icon: React.ReactNode }> = ({ screen, label, icon }) => (
    <button onClick={() => setActiveScreen(screen)} aria-label={label} className={`flex flex-col items-center justify-center w-full transition-all duration-200 h-full ${activeScreen === screen ? 'text-[#3A8DFF] font-semibold' : 'text-[#9AA3B2]'}`}>
      <div className="flex flex-col items-center">{icon}<span className="text-[10px] mt-1.5 whitespace-nowrap leading-none tracking-tight">{label}</span></div>
    </button>
  );

  const screensWithHUD = [Screen.Scan, Screen.Tools, Screen.Dashboard, Screen.Solution, Screen.Result, Screen.PracticeSummary, Screen.DailyChallengeSummary];
  const isAssessmentScreenHidesHUD = [Screen.AssessmentStart, Screen.AssessmentQuestion, Screen.AssessmentAnalysis].includes(activeScreen);
  const isWeakPracticeHidesHUD = activeScreen === Screen.PracticeScreen && practiceSession?.mode === 'weak';
  const shouldShowFooter = [Screen.Tools, Screen.Scan, Screen.Chat, Screen.Dashboard].includes(activeScreen);
  if (showOnboarding && !personalization) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <>
      <SolutionLoadingScreen isVisible={isProcessing} streak={streak} xp={xp} brainPoints={brainPoints} />
      <ConfirmModal
        open={clearDialogType !== null}
        title={t('profile.confirmTitle')}
        message={clearDialogType === 'clearChat' ? t('profile.confirmDelete') : t('profile.confirmClearHistory')}
        confirmLabel={t('profile.modalClear')}
        cancelLabel={t('profile.modalCancel')}
        variant="danger"
        onConfirm={() => { if (clearDialogType === 'clearChat') setChatMessages([]); else if (clearDialogType === 'clearHistory') setHistory([]); }}
        onCancel={() => setClearDialogType(null)}
      />
      {showPaywall ? (
        <PaywallScreen onComplete={handlePaywallComplete} personalization={personalization} />
      ) : (
      <div className="h-screen w-screen bg-[#0F1115] flex flex-col font-sans overflow-hidden">
        {/* HUD (streak / level / gems) hidden by user request */}
        <main className={`flex-1 min-h-0 overflow-hidden relative ${activeScreen === Screen.Chat ? '' : 'pt-5'}`}>{renderScreen()}</main>
        {floatingBallEnabled && isPro && activeScreen !== Screen.FloatingBall && activeScreen !== Screen.FloatingBallSettings && shouldShowFooter && (
          <FloatingBallWidget
            onNavigateToScan={handleFloatingBallScan}
            onNavigateToChat={() => setFloatingTutorOpen(true)}
            onClose={() => { setFloatingBallEnabled(false); try { localStorage.setItem('algebrain_floating_ball_enabled', '0'); } catch {} }}
          />
        )}
        {floatingTutorOpen && (
          <>
            <div className="fixed inset-0 z-[210] bg-black/50 backdrop-blur-sm" aria-hidden onClick={() => setFloatingTutorOpen(false)} />
            <div className="fixed right-0 top-0 bottom-0 z-[211] w-full max-w-md bg-[#0F1115] shadow-2xl flex flex-col border-l border-white/10 animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
                <span className="text-base font-bold text-white">{t('nav.tutor')}</span>
                <button onClick={() => setFloatingTutorOpen(false)} aria-label={t('floatingBall.close')} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ChatScreen messages={chatMessages} onAddMessage={handleAddChatMessage} isPro={isPro} onOpenPaywall={() => setShowPaywall(true)} onNavigateToScan={() => { setFloatingTutorOpen(false); setActiveScreen(Screen.Scan); }} onNavigateToEnterSolution={handleNavigateToEnterSolutionFromChat} xp={xp} streak={streak} brainPoints={brainPoints} showDailyBadge={dailyChallengeSession != null} inFloatingWindow />
              </div>
            </div>
          </>
        )}
        {shouldShowFooter && (
          <footer className="bg-[#0F1115]/95 backdrop-blur-xl border-t border-white/5 z-40 pb-safe">
            <nav className="flex justify-around items-center h-16">
              <NavItem screen={Screen.Tools} label={t('nav.tools')} icon={<ToolsIcon active={activeScreen === Screen.Tools} />} />
              <NavItem screen={Screen.Scan} label={t('nav.scan')} icon={<ScanIcon active={activeScreen === Screen.Scan} />} />
              <NavItem screen={Screen.Chat} label={t('nav.tutor')} icon={<ChatIcon active={activeScreen === Screen.Chat} />} />
              <NavItem screen={Screen.Dashboard} label={t('nav.profile')} icon={<ProfileIcon active={activeScreen === Screen.Dashboard} />} />
            </nav>
          </footer>
        )}
      </div>
      )}
    </>
  );
};

export default App;