'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Download, Sun, Moon, HelpCircle } from 'lucide-react';
import { getOfflineQueue } from '@/lib/offline-queue';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaStatusBar({
  sunMode,
  onToggleSunMode,
  onSyncQueue,
  onOpenHelp,
}: {
  sunMode: boolean;
  onToggleSunMode: () => void;
  onSyncQueue: () => void;
  onOpenHelp: () => void;
}) {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    setPendingCount(getOfflineQueue().length);

    const handleOnline = () => {
      setOnline(true);
      onSyncQueue();
    };
    const handleOffline = () => setOnline(false);
    const handleQueueUpdate = () => setPendingCount(getOfflineQueue().length);
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('gadap-queue-updated', handleQueueUpdate);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('gadap-queue-updated', handleQueueUpdate);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [onSyncQueue]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 text-xs border-b ${
        sunMode
          ? 'bg-amber-50 border-slate-300 text-slate-900'
          : 'bg-slate-900/90 border-slate-800 text-slate-300'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold ${
            online
              ? 'bg-emerald-500/15 text-emerald-500'
              : 'bg-rose-500/20 text-rose-400'
          }`}
        >
          {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {online ? 'Online' : 'Offline'}
        </span>

        {pendingCount > 0 && (
          <button
            type="button"
            onClick={onSyncQueue}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-semibold hover:bg-amber-500/30"
          >
            <RefreshCw className="w-3 h-3" />
            {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {installPrompt && (
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500"
          >
            <Download className="w-3.5 h-3.5" />
            Instalar App
          </button>
        )}

        <button
          type="button"
          onClick={onToggleSunMode}
          title={sunMode ? 'Modo Escuro' : 'Modo Sol Forte (Alto Contraste)'}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium border ${
            sunMode
              ? 'bg-slate-900 text-white border-slate-700'
              : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          {sunMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          <span>{sunMode ? 'Escuro' : 'Sol'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenHelp}
          title="Central de Ajuda"
          className={`inline-flex items-center justify-center p-1.5 rounded-lg border ${
            sunMode
              ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
          aria-label="Ajuda"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
