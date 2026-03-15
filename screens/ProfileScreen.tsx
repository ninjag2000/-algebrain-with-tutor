
import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

interface ProfileScreenProps {
    onNavigateToSettings: () => void;
    onNavigateToFloatingBall: () => void;
    onOpenPaywall: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigateToSettings, onNavigateToFloatingBall, onOpenPaywall }) => {
  const { t } = useLocalization();

  const ListItem: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
    <button onClick={onClick} className="flex items-center w-full p-4 hover:bg-gray-800 rounded-lg transition-colors text-left disabled:opacity-50" disabled={!onClick}>
      {icon}
      <span className="ml-4 font-medium text-sm">{label}</span>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
    </button>
  );

  return (
    <div className="bg-gray-900 text-white min-h-full">
      <header className="px-4 pt-6 pb-4 min-w-0" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
        <h1 className="text-3xl font-black tracking-tight truncate min-w-0">{t('nav.history')}</h1>
      </header>

      <main className="px-4 pb-10">
        {/* PRO Banner */}
        <button 
            onClick={onOpenPaywall}
            className="w-full mb-6 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] p-5 rounded-3xl flex items-center justify-between shadow-xl shadow-purple-500/20 active:scale-[0.98] transition-all border border-white/10"
        >
            <div className="flex items-center">
                <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center mr-4 text-xl shadow-inner">⚡️</div>
                <div className="text-left">
                    <h3 className="font-extrabold text-white leading-tight text-lg">Nerd AI <span className="text-yellow-300">PRO</span></h3>
                    <p className="text-[11px] text-white/80 font-bold uppercase tracking-wider">Попробовать все функции</p>
                </div>
            </div>
            <div className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/30 backdrop-blur-sm">Go</div>
        </button>

        <div className="bg-gray-800/40 rounded-3xl mb-4 overflow-hidden border border-white/5 backdrop-blur-sm">
          <ListItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label={t('profile.history')} />
          <ListItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>} label={t('profile.collection')} />
        </div>

        <div className="bg-gray-800/40 rounded-3xl mb-4 overflow-hidden border border-white/5 backdrop-blur-sm">
          <ListItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>} label={t('profile.deleteChat')} />
          <ListItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>} label={t('profile.floatingBall')} onClick={onNavigateToFloatingBall} />
        </div>

        <div className="bg-gray-800/40 rounded-3xl overflow-hidden border border-white/5 backdrop-blur-sm">
          <ListItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} label={t('profile.settings')} onClick={onNavigateToSettings} />
          <ListItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>} label={t('profile.feedback')} />
          <ListItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>} label={t('profile.rateUs')} />
          <ListItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>} label={t('profile.shareApp')} />
        </div>
      </main>
    </div>
  );
};

export default ProfileScreen;