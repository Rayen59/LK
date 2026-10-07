import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api, subscribeToLiveUpdates } from '../lib/api';
import {
  Laptop,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  X,
  Loader2,
  Lock,
  ChevronRight,
  Info
} from 'lucide-react';

interface ValidationCodeModalProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
}

export const ValidationCodeModal: React.FC<ValidationCodeModalProps> = ({
  currentUser,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [activeCode, setActiveCode] = useState<string>('------');
  const [expiresIn, setExpiresIn] = useState<number>(600);
  const [pendingSession, setPendingSession] = useState<{
    sessionId: string;
    code: string;
    deviceInfo: string;
    createdAt: string;
    expiresInSeconds: number;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Fetch current code and any pending PC sessions
  const loadCodeData = async () => {
    try {
      setLoading(true);
      const res = await api.auth.getPcValidationCode();
      if (res.activeValidationCode) {
        setActiveCode(res.activeValidationCode);
      }
      setExpiresIn(res.codeExpiresInSeconds || 600);
      setPendingSession(res.pendingSession || null);
    } catch (err: any) {
      console.error('Failed to load PC validation code:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCodeData();
      setStatusMessage(null);
    }
  }, [isOpen]);

  // Real-time listener for incoming PC login attempts or approvals
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeToLiveUpdates((event, payload) => {
      if (event === 'PC_LOGIN_ATTEMPT') {
        if (payload.userId === currentUser.id) {
          setActiveCode(payload.code);
          setPendingSession({
            sessionId: payload.sessionId,
            code: payload.code,
            deviceInfo: payload.deviceInfo,
            createdAt: payload.createdAt,
            expiresInSeconds: 600,
          });
          setExpiresIn(600);
          setStatusMessage({
            type: 'success',
            text: 'Nouvelle tentative de connexion PC détectée !',
          });
        }
      } else if (event === 'PC_LOGIN_APPROVED') {
        if (payload.userId === currentUser.id) {
          setPendingSession(null);
          setStatusMessage({
            type: 'success',
            text: 'Connexion PC autorisée avec succès !',
          });
        }
      }
    });

    return () => unsubscribe();
  }, [isOpen, currentUser.id]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || expiresIn <= 0) return;
    const timer = setInterval(() => {
      setExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, expiresIn]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCopyCode = () => {
    if (!activeCode || activeCode.includes('-')) return;
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Generate a fresh code
  const handleRegenerateCode = async () => {
    try {
      setActionLoading(true);
      const res = await api.auth.refreshValidationCode();
      setActiveCode(res.activeValidationCode);
      setExpiresIn(res.codeExpiresInSeconds || 600);
      setStatusMessage({
        type: 'success',
        text: 'Nouveau code généré avec succès !',
      });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Erreur lors de la génération du code.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Approve pending PC login with 1 click
  const handleApprovePc = async () => {
    if (!pendingSession) return;
    try {
      setActionLoading(true);
      await api.auth.approvePcLogin({ sessionId: pendingSession.sessionId });
      setPendingSession(null);
      setStatusMessage({
        type: 'success',
        text: '✅ Ordinateur déverrouillé avec succès ! La session PC est désormais active.',
      });
      setTimeout(() => {
        setStatusMessage(null);
      }, 5000);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || "Erreur lors de l'approbation du PC.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Reject pending PC login
  const handleRejectPc = async () => {
    if (!pendingSession) return;
    try {
      setActionLoading(true);
      await api.auth.rejectPcLogin({ sessionId: pendingSession.sessionId });
      setPendingSession(null);
      setStatusMessage({
        type: 'error',
        text: '❌ Connexion PC refusée.',
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Erreur lors du refus de la connexion.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-[#0c1424] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/80 dark:from-[#0f1b33] dark:via-[#0c1424] dark:to-[#121c36]">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Code de Validation
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[10px] font-extrabold text-blue-700 dark:text-blue-300">
                  PC ➔ Téléphone
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Synchronisation sécurisée des appareils et validation des connexions PC
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Notification / Toast Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl border flex items-center space-x-2.5 font-bold animate-fadeIn ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Pending PC Request Banner (If an actual PC is waiting right now) */}
          {pendingSession && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 dark:border-amber-500/40 space-y-3 animate-pulse">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-slate-900 dark:text-white text-sm">
                        Connexion PC en attente d'approbation !
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {pendingSession.deviceInfo} tente d'accéder à votre compte MK.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/80 dark:bg-[#0a1120]/80 rounded-xl border border-amber-500/20 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Code demandé par le PC :
                </span>
                <span className="font-mono text-base font-black tracking-widest text-amber-600 dark:text-amber-400">
                  {pendingSession.code}
                </span>
              </div>

              {/* Action Buttons for 1-click Approval */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleApprovePc}
                  disabled={actionLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Autoriser & Déverrouiller le PC</span>
                </button>
                <button
                  type="button"
                  onClick={handleRejectPc}
                  disabled={actionLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 font-extrabold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Refuser la connexion
                </button>
              </div>
            </div>
          )}

          {/* Main Active 6-digit Code Display Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-50 dark:bg-[#0a1120] border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-xs">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Votre code de validation actuel</span>
            </div>

            {/* Huge 6-Digit Display */}
            <div className="py-2">
              {loading ? (
                <div className="py-6 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2 sm:space-x-3 select-all">
                  {activeCode.split('').map((digit, idx) => (
                    <span
                      key={idx}
                      className="w-10 sm:w-12 h-14 sm:h-16 rounded-2xl bg-white dark:bg-[#121c33] border-2 border-blue-500/40 dark:border-blue-400/30 flex items-center justify-center font-mono text-2xl sm:text-3xl font-black text-slate-900 dark:text-white shadow-sm"
                    >
                      {digit}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Timer & Copy actions */}
            <div className="flex items-center justify-center space-x-3 text-xs">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#121c33] border border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Valable encore : <strong className="text-blue-600 dark:text-blue-400">{formatTime(expiresIn)}</strong></span>
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#121c33] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copié !' : 'Copier'}</span>
              </button>

              <button
                type="button"
                onClick={handleRegenerateCode}
                disabled={actionLoading}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition cursor-pointer disabled:opacity-50"
                title="Générer un nouveau code"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Nouveau</span>
              </button>
            </div>
          </div>

          {/* Step-by-Step Educational Guide for User */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 space-y-2.5">
            <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center space-x-2 text-xs sm:text-sm">
              <Info className="w-4 h-4 text-blue-500" />
              <span>Comment déverrouiller votre session sur PC ?</span>
            </h4>
            <ol className="space-y-2 text-slate-600 dark:text-slate-300 text-xs">
              <li className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <span>
                  Connectez-vous sur votre <strong>ordinateur (PC)</strong> avec votre email et mot de passe habituels.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <span>
                  L'écran de votre PC affiche une demande de <strong>Code de validation</strong>.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <span>
                  Saisissez les <strong>6 chiffres</strong> affichés ci-dessus dans les cases du PC, ou cliquez sur <strong>« Autoriser »</strong> lorsqu'une alerte apparaît sur ce téléphone.
                </span>
              </li>
            </ol>
          </div>

          {/* Security reassurance */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0a1120] border border-slate-200/80 dark:border-slate-800/80 flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
            <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Cette sécurité empêche toute personne non autorisée d'accéder à votre compte MK depuis un autre appareil sans votre téléphone.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0a1120]/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-extrabold text-xs transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
