import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import SummarizerToolIcon from '../components/icons/SummarizerToolIcon';
import AiWriterToolIcon from '../components/icons/AiWriterToolIcon';
import BookSummarizerIcon from '../components/icons/BookSummarizerIcon';
import { TutorAvatarIcon } from '../components/icons/TutorAvatarIcon';

interface ToolsScreenProps {
    xp: number;
    streak: number;
    brainPoints: number;
    showDailyBadge?: boolean;
    onNavigateToCalculator: () => void;
    onNavigateToTranslator: () => void;
    onNavigateToSummarize: () => void;
    onNavigateToSummarizer: () => void;
    onNavigateToEssayWriter: () => void;
    onNavigateToEssayHelper: () => void;
    onNavigateToFloatingBall: () => void;
    onNavigateToChat: () => void;
    onNavigateToPracticeHub: () => void;
}

const ToolsScreen: React.FC<ToolsScreenProps> = ({ 
    xp,
    streak,
    brainPoints,
    showDailyBadge = false,
    onNavigateToCalculator, 
    onNavigateToTranslator, 
    onNavigateToSummarize, 
    onNavigateToSummarizer, 
    onNavigateToEssayWriter, 
    onNavigateToEssayHelper, 
    onNavigateToFloatingBall,
    onNavigateToChat,
    onNavigateToPracticeHub
}) => {
    const { t } = useLocalization();

    const TaskCard: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; iconBgColor: string; onClick: () => void }> = ({ icon, title, subtitle, iconBgColor, onClick }) => (
        <button 
            onClick={onClick} 
            aria-label={title + " - " + subtitle}
            className="w-full p-2.5 rounded-2xl flex flex-col justify-between h-full relative overflow-hidden animate-in fade-in duration-300 active:scale-[0.98] transition-all duration-200 border border-white/[0.08] backdrop-blur-xl text-left"
            style={{ background: 'rgba(18, 24, 38, 0.65)', boxShadow: '0 4px 24px -4px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 8px 32px -8px rgba(91, 140, 255, 0.08)' }}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-[rgba(91,140,255,0.06)] via-transparent to-[rgba(167,139,250,0.04)] pointer-events-none" aria-hidden />
            <div className="relative z-10 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center ${iconBgColor} shadow-lg ring-1 ring-white/10`}>{icon}</div>
                    <h3 className="text-sm font-semibold leading-snug text-white break-words min-w-0 flex-1 line-clamp-2">{title}</h3>
                </div>
                <p className="text-xs text-[#8A94A6] leading-tight font-medium line-clamp-2">{subtitle}</p>
            </div>
        </button>
    );

    return (
        <div className="h-full overflow-y-auto scrollbar-hide pb-20 relative min-h-full">
            {/* Background: не однотонный — градиенты и глубина */}
            <div className="fixed inset-0 -z-10 bg-[#070910]" aria-hidden />
            <div className="fixed inset-0 -z-10 opacity-100" aria-hidden style={{ background: 'radial-gradient(ellipse 140% 100% at 50% -10%, rgba(91, 140, 255, 0.18), transparent 45%), radial-gradient(ellipse 100% 80% at 90% 30%, rgba(167, 139, 250, 0.12), transparent 40%), radial-gradient(ellipse 80% 100% at 10% 70%, rgba(91, 140, 255, 0.08), transparent 45%), radial-gradient(ellipse 60% 60% at 50% 100%, rgba(139, 92, 246, 0.06), transparent 50%)' }} />
            <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#0B0F1A]/30 via-transparent to-[#0D1220]/50" aria-hidden />

            {/* Header: мягкий переход к контенту — градиент снизу */}
            <header className="sticky top-0 z-50 min-w-0 bg-[#0B0F1A]/85 backdrop-blur-xl border-b border-white/[0.06]">
                <div className="absolute inset-0 -z-10 rounded-b-2xl opacity-90" aria-hidden style={{ boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset' }} />
                <div className="absolute left-0 right-0 bottom-0 h-12 -z-10 pointer-events-none" aria-hidden style={{ background: 'linear-gradient(to bottom, transparent, rgba(11, 15, 26, 0.4) 40%, rgba(7, 9, 16, 0.7) 100%)' }} />
                <div className="relative px-4 pt-5 pb-3 flex items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img src="/logo.png" alt="AlgeBrain" className="w-10 h-10 flex-shrink-0 rounded-xl object-contain" />
                        <h1 className="text-3xl font-black tracking-tighter text-white truncate min-w-0 drop-shadow-sm leading-tight flex items-center min-h-[2.25rem]">{t('tools.title')}</h1>
                    </div>
                    <span className="flex-shrink-0 flex items-center justify-center rounded-full p-[2px] w-10 h-10 shadow-[0_0_20px_rgba(91,140,255,0.25),0_0_40px_rgba(167,139,250,0.12),inset_0_0_0_1px_rgba(255,255,255,0.08)]" aria-hidden>
                        <TutorAvatarIcon className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/20 block" variant="mascot" />
                    </span>
                </div>
            </header>

            <div className="relative p-4 pt-6 grid grid-cols-2 gap-4 mt-0" style={{ gridAutoRows: 'minmax(5.25rem, auto)' }}>
                <div className="absolute left-0 right-0 top-0 h-8 -z-10 pointer-events-none" aria-hidden style={{ background: 'linear-gradient(to bottom, rgba(11, 15, 26, 0.6), transparent)' }} />
                 <div className="col-span-2 h-full min-h-0 flex w-full min-w-0">
                    <div className="flex-1 min-w-0 w-full h-full">
                        <TaskCard
                            icon={<span className="text-2xl">🧩</span>}
                            title={t('practice.hub_title')}
                            subtitle={t('practice.hub_subtitle')}
                            iconBgColor="bg-gradient-to-br from-green-500 to-emerald-600"
                            onClick={onNavigateToPracticeHub}
                        />
                    </div>
                </div>

                <TaskCard
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                    title={t('tools.math')}
                    subtitle={t('tools.mathSubtitle')}
                    iconBgColor="bg-gradient-to-br from-[#5B8CFF] to-[#4B75D9]"
                    onClick={onNavigateToCalculator}
                />

                <TaskCard
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
                    title={t('tools.allSubjects')}
                    subtitle={t('tools.allSubjectsSubtitle')}
                    iconBgColor="bg-gradient-to-br from-[#A78BFA] to-[#8A6EE5]"
                    onClick={onNavigateToChat}
                />

                <TaskCard
                    icon={<AiWriterToolIcon />}
                    title={t('tools.aiWriter')}
                    subtitle={t('tools.aiWriterSubtitle')}
                    iconBgColor="bg-gradient-to-br from-[#A78BFA] to-[#8A6EE5]"
                    onClick={onNavigateToEssayWriter}
                />

                <TaskCard
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>}
                    title={t('tools.essayHelper')}
                    subtitle={t('tools.essayHelperSubtitle')}
                    iconBgColor="bg-gradient-to-br from-[#5B8CFF] to-[#4B75D9]"
                    onClick={onNavigateToEssayHelper}
                />

                <TaskCard
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>}
                    title={t('tools.floatingBall')}
                    subtitle={t('tools.floatingBallSubtitle')}
                    iconBgColor="bg-gradient-to-br from-[#A78BFA] to-[#8A6EE5]"
                    onClick={onNavigateToFloatingBall}
                />

                <TaskCard
                    icon={<div className="text-xl font-black">A</div>}
                    title={t('tools.translate')}
                    subtitle={t('tools.translateSubtitle')}
                    iconBgColor="bg-gradient-to-br from-[#5B8CFF] to-[#4B75D9]"
                    onClick={onNavigateToTranslator}
                />

                <TaskCard
                    icon={<BookSummarizerIcon className="h-6 w-6" />}
                    title={t('tools.summarize')}
                    subtitle={t('tools.summarizeSubtitle')}
                    iconBgColor="bg-gradient-to-br from-[#5B8CFF] to-[#4B75D9]"
                    onClick={onNavigateToSummarize}
                />

                <TaskCard
                    icon={<SummarizerToolIcon />}
                    title={t('summarizer.title')}
                    subtitle={t('tools.summarizerSubtitle')}
                    iconBgColor="bg-gradient-to-br from-[#A78BFA] to-[#8A6EE5]"
                    onClick={onNavigateToSummarizer}
                />
            </div>
        </div>
    );
};

export default ToolsScreen;