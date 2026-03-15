import React, { useState, useRef, useEffect } from 'react';
import { getChatResponse } from '../services/geminiService';
import { useLocalization } from '../contexts/LocalizationContext';
import { TutorAvatarIcon } from '../components/icons/TutorAvatarIcon';
import ScanIcon from '../components/icons/ScanIcon';
import { ChatMessage } from '../types';
import MathRenderer from '../components/MathRenderer';
import LightbulbIcon from '../components/icons/LightbulbIcon';

interface ChatScreenProps {
    messages: ChatMessage[];
    onAddMessage: (message: ChatMessage, awardXp?: boolean) => void;
    isPro: boolean;
    onOpenPaywall: () => void;
    onNavigateToScan: () => void;
    onNavigateToEnterSolution: (problem: string) => void;
    xp: number;
    streak: number;
    brainPoints: number;
    showDailyBadge?: boolean;
    /** Режим плавающего окна (тьютор из плавающего шара): без своего заголовка */
    inFloatingWindow?: boolean;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ messages, onAddMessage, isPro, onOpenPaywall, onNavigateToScan, onNavigateToEnterSolution, xp, streak, brainPoints, showDailyBadge = false, inFloatingWindow = false }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isHomeworkMode, setIsHomeworkMode] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { t, language } = useLocalization();
    const recognitionRef = useRef<any>(null);
    const userMessageCount = useRef(messages.filter(m => m.sender === 'user').length);

    const exampleQuestions = [
        t('chat.example1'),
        t('chat.example2'),
        t('chat.example3')
    ];

    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = language === 'ru' ? 'ru-RU' : language === 'es' ? 'es-ES' : 'en-US';

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInput(prev => (prev ? prev + ' ' + transcript : transcript));
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [language]);
    
    const renderTextWithMath = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                const math = part.slice(2, -2);
                return <MathRenderer key={i} expression={math} className="mx-0.5 align-middle" />;
            }
            return part;
        });
    };

    const toggleListening = () => {
        if (!isPro) {
            onOpenPaywall();
            return;
        }
        if (!recognitionRef.current) {
            alert("Speech recognition is not supported in your browser.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setIsListening(true);
            recognitionRef.current.start();
        }
    };

    const handleSend = async (textToSend: string = input) => {
        if (!textToSend.trim() || isLoading) return;

        const userMessage: ChatMessage = { text: textToSend, sender: 'user', type: 'message' };
        onAddMessage(userMessage, true);
        userMessageCount.current += 1;
        
        const currentInput = textToSend;
        setInput('');
        setIsLoading(true);

        try {
            const aiResponseText = await getChatResponse(currentInput, language, isHomeworkMode);

            try {
                const cleanJsonResponse = aiResponseText.replace(/^```json\n/, '').replace(/\n```$/, '');
                const parsedResponse = JSON.parse(cleanJsonResponse);

                if (isHomeworkMode) {
                    if (parsedResponse.action === 'request_user_solution' && parsedResponse.problem) {
                        const aiPromptMessage: ChatMessage = {
                            text: parsedResponse.prompt_message || "Let's solve this. What's your answer?",
                            sender: 'ai', type: 'message'
                        };
                        onAddMessage(aiPromptMessage);
                        onNavigateToEnterSolution(parsedResponse.problem);
                    } else if (parsedResponse.action === 'socratic_guidance' && parsedResponse.guidance) {
                        const aiGuidanceMessage: ChatMessage = {
                            text: parsedResponse.guidance,
                            sender: 'ai', type: 'feedback'
                        };
                        onAddMessage(aiGuidanceMessage);
                    } else {
                         throw new Error("Valid JSON but not a recognized action.");
                    }
                } else {
                    throw new Error("Not in homework mode.");
                }
            } catch (e) {
                const aiMessage: ChatMessage = { 
                    text: aiResponseText.startsWith('error.') ? t(aiResponseText) : aiResponseText, 
                    sender: 'ai',
                    type: 'message'
                };
                onAddMessage(aiMessage);
            }
        } catch (error) {
            console.error("Chat error:", error);
            const errorMessage: ChatMessage = { text: t('chat.error'), sender: 'ai' };
            onAddMessage(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleExampleClick = (question: string) => {
        handleSend(question);
    };

    return (
        <div className="flex flex-col h-full bg-gradient-to-b from-[#0B0F1A] to-[#121826] text-[#E6EAF2] overflow-hidden">
            {!inFloatingWindow && (
            <header className="flex flex-wrap items-center gap-x-2 gap-y-3 px-4 py-4 bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 min-h-0 border-b border-white/5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
                {/* Строка 1: Algor AI слева, Режим ДЗ в правый верхний угол */}
                <div className="flex items-start justify-between gap-2 min-w-0 w-full">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
                            <div className="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-50 animate-pulse"></div>
                            <div className="relative w-full h-full rounded-full border border-white/10 bg-[#1A1D24] flex items-center justify-center overflow-hidden">
                               <TutorAvatarIcon variant="tutor" className="w-full h-full object-cover" />
                            </div>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h1 className="text-base font-bold leading-tight">{t('chat.title')}</h1>
                            <div className="flex items-center space-x-1.5">
                                <span className={`w-2 h-2 rounded-full transition-colors ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></span>
                                <span className="text-[11px] text-[#9AA3B2] font-medium">{isLoading ? t('chat.statusAnalyzing') : t('chat.statusActive')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className="text-xs font-medium text-gray-400">{t('chat.homeworkMode')}</span>
                        <button 
                            onClick={() => setIsHomeworkMode(!isHomeworkMode)} 
                            aria-label={isHomeworkMode ? t('chat.disableHomeworkMode') : t('chat.enableHomeworkMode')}
                            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isHomeworkMode ? 'bg-green-500' : 'bg-gray-600'}`}>
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isHomeworkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
            </header>
            )}

            <main 
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-4 pt-6 pb-32 scroll-smooth scrollbar-hide"
            >
                {messages.length === 0 ? (
                    <div className="max-w-md mx-auto space-y-6 animate-in fade-in duration-500">
                        <div className="flex flex-col items-start pt-4">
                            <div className="max-w-[90%] px-4 py-3 bg-[#1A1D24] text-[#E6EAF2] rounded-2xl rounded-tl-lg shadow-lg border border-white/5 backdrop-blur-md">
                                <p className="text-sm leading-relaxed">{t('chat.start')}</p>
                            </div>
                        </div>

                        <div className="flex flex-col space-y-3 pt-4">
                             <p className="text-[10px] text-[#9AA3B2] uppercase tracking-widest font-bold px-1">{t('chat.tryAsking')}</p>
                            <div className="grid gap-2.5">
                                {exampleQuestions.map((q, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => handleExampleClick(q)} 
                                        aria-label={q}
                                        className="text-left p-3.5 bg-[#1A1D24] border border-transparent rounded-2xl flex justify-between items-center hover:bg-white/5 active:scale-[0.98] transition-all shadow-md"
                                    >
                                        <span className="text-sm font-medium text-[#E6EAF2]">{renderTextWithMath(q)}</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-[#3A8DFF]" fill="currentColor" viewBox="0 0 20 20"><path d="M10 17l5-5-5-5v10z"></path></svg>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {messages.map((msg, index) => {
                            if (msg.type === 'widget' && msg.payload) {
                                return null; // progress panel hidden on tutor screen
                            }
                            if (msg.type === 'feedback') {
                                return (
                                    <div key={index} className="flex items-start space-x-3 animate-in fade-in duration-500">
                                        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-purple-500/20 rounded-full border border-purple-400/30 mt-1">
                                            <LightbulbIcon className="w-5 h-5 text-purple-300" />
                                        </div>
                                        <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-tl-lg shadow-xl bg-purple-900/30 backdrop-blur-md border border-purple-400/30">
                                            <p className="text-sm leading-relaxed text-purple-100/90 whitespace-pre-wrap">{renderTextWithMath(msg.text)}</p>
                                        </div>
                                    </div>
                                );
                            }
                            return (
                               <div key={index} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div 
                                        className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-300 relative ${
                                            msg.sender === 'user' 
                                                ? 'bg-[#3A8DFF] text-white rounded-tr-lg' 
                                                : 'bg-white/5 backdrop-blur-md text-[#E6EAF2] border border-white/10 rounded-tl-lg'
                                        }`}
                                    >
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderTextWithMath(msg.text)}</p>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {isLoading && (
                            <div className="flex flex-col items-start animate-in fade-in duration-300">
                                <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl rounded-tl-lg flex items-center space-x-1.5 shadow-xl">
                                    <span className="w-1.5 h-1.5 bg-[#3A8DFF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-1.5 h-1.5 bg-[#3A8DFF]/80 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-1.5 h-1.5 bg-[#3A8DFF]/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-[#0F1115]/80 backdrop-blur-xl border-t border-white/5 px-4 py-3 z-50" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
                <div className="flex items-center space-x-3">
                    <button onClick={onNavigateToScan} aria-label={t('nav.scan')} className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-[#1A1D24] hover:bg-white/10 rounded-full transition-all active:scale-90">
                        <ScanIcon active={false} className="h-5 w-5 text-[#9AA3B2]" />
                    </button>
                    <button 
                        onClick={toggleListening}
                        aria-label={isListening ? t('chat.stopListening') : t('chat.startListening')}
                        className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full transition-all active:scale-90 ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-[#1A1D24] text-[#9AA3B2] hover:bg-white/10'} ${!isPro ? 'cursor-not-allowed' : ''}`}
                    >
                         {!isPro && <div className="absolute text-yellow-400 text-[8px] font-bold -top-1 -right-1 bg-gray-900 px-1 rounded">PRO</div>}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </button>
                    <div className="flex-1 relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={t('chat.placeholder')}
                            aria-label={t('chat.placeholder')}
                            className="w-full bg-[#1A1D24] text-sm py-3 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#3A8DFF]/50 border border-white/5 transition-all pr-12"
                        />
                        <button 
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading}
                            aria-label={t('chat.send')}
                            className={`absolute right-1.5 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${input.trim() && !isLoading ? 'bg-[#3A8DFF] text-white shadow-lg' : 'text-[#9AA3B2] opacity-50'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ChatScreen;