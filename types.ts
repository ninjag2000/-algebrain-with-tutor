export enum Screen {
  Scan,
  Chat,
  Tools,
  More,
  Result,
  Solution,
  Translator,
  Summarize,
  Summarizer,
  EssayWriter,
  EssayHelper,
  Settings,
  Language,
  EssayResult,
  SummarizeResult,
  FloatingBall,
  FloatingBallSettings,
  History,
  Collection,
  EnterSolution,
  Dashboard,
  AssessmentStart,
  AssessmentQuestion,
  AssessmentAnalysis,
  AssessmentResult,
  PracticeHub,
  PracticeScreen,
  PracticeSummary,
  PracticeReview,
  DailyChallengeHub,
  DailyChallengeSummary,
  DailyChallengeReview,
  Achievements,
}

export type ScanMode = 'translate' | 'general' | 'math' | 'spelling' | 'graph' | 'handwritten';

export interface CalculationResult {
  image: string;
  problem: string;
  solution: string;
  mode?: ScanMode; // Add mode to CalculationResult
}

/** Уровень сложности: 1–7 (тир 1 = лёгкий, тир 7 = сложный). */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface PracticeQuestion {
  question: string;
  answer: string;
  difficulty: DifficultyLevel;
  /** Дополнительные допустимые варианты (например десятичная форма при точном ответе) */
  acceptedAnswers?: string[];
}

export interface DailyChallenge {
    id: string;
    title: string;
    description: string;
    questions: PracticeQuestion[];
    timeLimit: number; // in seconds
    reward: number; // XP reward
    brainPoints: number; // BP reward
    aiNarrative: string;
}

export interface DailyChallengeSession {
    challenge: DailyChallenge;
    answers: { question: PracticeQuestion; userAnswer: string; isCorrect: boolean; hintUsed?: boolean }[];
    startTime: number;
    timeTaken?: number;
}

export interface TranslationResult {
  mainTranslation: string;
  alternatives?: string[];
  definition?: string;
  detectedLanguage?: string;
  extractedSourceText?: string; // Added for scanned text preview
}

export interface HistoryItem {
  id: string;
  problem: string;
  solution: string;
  image?: string;
  timestamp: number;
  mode?: ScanMode; // Added to store the scan mode
}

export interface ChatMessage {
  text: string;
  sender: 'user' | 'ai';
  type?: 'message' | 'widget' | 'feedback';
  payload?: any;
}

export interface PersonalizationData {
  level: 'middle' | 'high' | 'advanced' | null;
  wantsExplanations: boolean;
}

export interface VerificationResult {
  isCorrect: boolean;
  feedback: string;
  userAnswer: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or SVG path
  threshold: (stats: { streak?: number, xp?: number, correctAnswers?: number, totalQuestions?: number, timeTaken?: number }) => boolean;
}

export interface PlayerLevel {
  name: string;
  minXp: number;
  badgeColor: string;
}