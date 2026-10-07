import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { api, subscribeToLiveUpdates } from '../lib/api';
import {
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Loader2,
  ArrowLeft,
  KeyRound,
  Check,
  Laptop,
  Smartphone,
  Copy,
  Info,
  Sparkles,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

interface AuthModalProps {
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  // Mode: 'login' | 'register' | 'forgot' | 'pc_verify'
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'pc_verify'>('login');
  // Register sub-step: 1 (informations) | 2 (vérification de sécurité)
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);

  // Détection 100% automatique et professionnelle du type d'appareil (PC / Mac / Linux vs Smartphone)
  const [detected] = useState<{
    isPc: boolean;
    deviceName: string;
    osName: string;
    browserName: string;
  }>(() => {
    if (typeof window === 'undefined') {
      return { isPc: true, deviceName: 'Ordinateur (PC)', osName: 'PC', browserName: 'Navigateur Web' };
    }
    const ua = navigator.userAgent || '';
    const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSmallScreen = window.innerWidth < 768;
    const isPc = !isMobileUA && !isIPad && !isSmallScreen;

    let osName = 'Système';
    if (/Windows/i.test(ua)) osName = 'Windows';
    else if (/Macintosh|Mac OS X/i.test(ua)) osName = 'macOS';
    else if (/Linux/i.test(ua)) osName = 'Linux';
    else if (/iPhone|iPad|iPod/i.test(ua)) osName = 'iOS';
    else if (/Android/i.test(ua)) osName = 'Android';

    let browserName = 'Navigateur';
    if (/Edg/i.test(ua)) browserName = 'Edge';
    else if (/Chrome/i.test(ua)) browserName = 'Chrome';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browserName = 'Safari';
    else if (/Firefox/i.test(ua)) browserName = 'Firefox';

    const deviceName = isPc
      ? `Ordinateur (${osName} · ${browserName})`
      : `Smartphone (${osName} · ${browserName})`;

    return { isPc, deviceName, osName, browserName };
  });

  // Cross-device PC login states
  const [pcSessionId, setPcSessionId] = useState<string | null>(null);
  const [pcPreviewCode, setPcPreviewCode] = useState<string | null>(null);
  const [pcCountdown, setPcCountdown] = useState<number>(600);
  const [pcDigits, setPcDigits] = useState<string[]>(['', '', '', '', '', '']);
  const pcDigitRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [showPhoneSimulator, setShowPhoneSimulator] = useState<boolean>(false);
  const [pcVerifying, setPcVerifying] = useState<boolean>(false);
  const [pcApprovedNotice, setPcApprovedNotice] = useState<string | null>(null);

  // Form inputs
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reactivatedBanner, setReactivatedBanner] = useState(false);

  // Verification method for register
  const [verifyType, setVerifyType] = useState<'code' | 'captcha'>('code');

  // 6-digit Code verification
  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [codeSent, setCodeSent] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [codeVerified, setCodeVerified] = useState(false);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Captcha puzzle
  const [captchaTarget, setCaptchaTarget] = useState(55);
  const [captchaSlider, setCaptchaSlider] = useState(0);
  const [captchaDone, setCaptchaDone] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotNotice, setForgotNotice] = useState<string | null>(null);

  // Timer for resend code
  useEffect(() => {
    let timer: any;
    if (codeCountdown > 0) {
      timer = setInterval(() => setCodeCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [codeCountdown]);

  // Timer for PC validation countdown
  useEffect(() => {
    let timer: any;
    if (authMode === 'pc_verify' && pcCountdown > 0) {
      timer = setInterval(() => setPcCountdown((c) => Math.max(0, c - 1)), 1000);
    }
    return () => clearInterval(timer);
  }, [authMode, pcCountdown]);

  // Real-time listener for cross-device PC approval
  useEffect(() => {
    if (authMode !== 'pc_verify' || !pcSessionId) return;

    const unsubscribe = subscribeToLiveUpdates((event, payload) => {
      if (event === 'PC_LOGIN_APPROVED' && payload.sessionId === pcSessionId) {
        setPcApprovedNotice('Connexion approuvée depuis votre téléphone !');
        setTimeout(() => {
          onSuccess(payload.user);
        }, 900);
      } else if (event === 'PC_LOGIN_REJECTED' && payload.sessionId === pcSessionId) {
        setError('La tentative de connexion a été refusée depuis votre téléphone.');
      }
    });

    return () => unsubscribe();
  }, [authMode, pcSessionId, onSuccess]);

  // Init captcha challenge
  const loadCaptcha = async () => {
    try {
      const res = await api.auth.getCaptchaChallenge();
      setCaptchaTarget(res.targetPosition);
    } catch {
      setCaptchaTarget(Math.floor(25 + Math.random() * 50));
    }
    setCaptchaSlider(0);
    setCaptchaDone(false);
  };

  // Reset errors when changing modes
  useEffect(() => {
    setError(null);
    setReactivatedBanner(false);
    setPcApprovedNotice(null);
  }, [authMode, registerStep]);

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Veuillez renseigner votre email et mot de passe.');
      return;
    }

    setLoading(true);
    try {
      const isPc = detected.isPc;
      const res = await api.auth.login({
        email: email.trim(),
        password,
        isPcDevice: isPc,
        deviceInfo: detected.deviceName
      });

      // If PC cross-device validation is required
      if (res.requirePcValidation && res.sessionId) {
        setPcSessionId(res.sessionId);
        setPcPreviewCode(res.previewCode || null);
        setPcCountdown(res.expiresInSeconds || 600);
        setPcDigits(['', '', '', '', '', '']);
        setAuthMode('pc_verify');
        return;
      }

      if ((res as any).reactivated) {
        setReactivatedBanner(true);
        setTimeout(() => {
          onSuccess(res.user!);
        }, 1200);
      } else {
        onSuccess(res.user!);
      }
    } catch (err: any) {
      setError(err.message || 'Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  // Verify PC validation digits entered on PC
  const handleVerifyPcDigits = async (codeToVerify?: string) => {
    const finalCode = (codeToVerify || pcDigits.join('')).trim();
    if (!pcSessionId) return;
    if (finalCode.length < 6) {
      setError('Veuillez saisir les 6 chiffres du code de validation.');
      return;
    }

    setPcVerifying(true);
    setError(null);
    try {
      const res = await api.auth.verifyPcLogin({
        sessionId: pcSessionId,
        code: finalCode,
      });
      setPcApprovedNotice('Code validé avec succès ! Bienvenue sur PC.');
      setTimeout(() => {
        onSuccess(res.user);
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Code de validation incorrect.');
    } finally {
      setPcVerifying(false);
    }
  };

  const handlePcDigitChange = (index: number, val: string) => {
    // Paste support
    if (val.length > 1) {
      const sanitized = val.replace(/\D/g, '').slice(0, 6);
      if (sanitized.length > 0) {
        const next = [...pcDigits];
        for (let i = 0; i < 6; i++) {
          next[i] = sanitized[i] || '';
        }
        setPcDigits(next);
        const nextFocus = Math.min(sanitized.length, 5);
        pcDigitRefs.current[nextFocus]?.focus();
        if (sanitized.length === 6) {
          handleVerifyPcDigits(sanitized);
        }
      }
      return;
    }

    const digit = val.slice(-1);
    const next = [...pcDigits];
    next[index] = digit;
    setPcDigits(next);

    if (digit && index < 5) {
      pcDigitRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== '')) {
      handleVerifyPcDigits(next.join(''));
    }
  };

  const handlePcDigitKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pcDigits[index] && index > 0) {
      pcDigitRefs.current[index - 1]?.focus();
    }
  };

  // Register: Step 1 -> Step 2
  const handleRegisterToVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Veuillez renseigner votre nom d\'utilisateur.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Veuillez entrer une adresse email valide.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setRegisterStep(2);

    // Send code automatically if code mode
    if (verifyType === 'code' && !codeSent) {
      requestVerificationCode();
    } else if (verifyType === 'captcha') {
      loadCaptcha();
    }
  };

  // Send verification code
  const requestVerificationCode = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.sendVerificationCode({
        email: email.trim(),
        purpose: 'register'
      });
      setCodeSent(true);
      setCodeCountdown(60);
      if (res.previewCode) {
        setPreviewCode(res.previewCode);
      }
    } catch (err: any) {
      setError(err.message || 'Échec de l\'envoi du code de vérification.');
    } finally {
      setLoading(false);
    }
  };

  // Handle single digit input
  const handleDigitChange = (index: number, val: string) => {
    const digit = val.slice(-1).replace(/[^0-9]/g, '');
    const newDigits = [...codeDigits];
    newDigits[index] = digit;
    setCodeDigits(newDigits);

    if (digit && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }

    if (newDigits.join('').length === 6 && !newDigits.includes('')) {
      verifyUserCode(newDigits.join(''));
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (paste.length > 0) {
      const newDigits = [...codeDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = paste[i] || '';
      }
      setCodeDigits(newDigits);
      if (paste.length === 6) {
        verifyUserCode(paste);
      }
    }
  };

  const verifyUserCode = async (codeToVerify: string) => {
    setError(null);
    setLoading(true);
    try {
      await api.auth.verifyCode({
        email: email.trim(),
        code: codeToVerify
      });
      setCodeVerified(true);
    } catch (err: any) {
      setError(err.message || 'Code de vérification invalide.');
    } finally {
      setLoading(false);
    }
  };

  // Captcha validation
  const handleCaptchaSlider = (val: number) => {
    setCaptchaSlider(val);
    if (Math.abs(val - captchaTarget) <= 5) {
      setCaptchaDone(true);
      setError(null);
    }
  };

  // Final register complete
  const handleFinalRegister = async () => {
    setError(null);
    if (verifyType === 'code' && !codeVerified) {
      setError('Veuillez saisir le code de vérification à 6 chiffres.');
      return;
    }
    if (verifyType === 'captcha' && !captchaDone) {
      setError('Veuillez glisser la pièce sur la cible pour valider le puzzle.');
      return;
    }

    setLoading(true);
    try {
      const parts = username.trim().split(' ');
      const prenom = parts[0] || 'Utilisateur';
      const nom = parts.slice(1).join(' ') || 'Membre';

      const res = await api.auth.register({
        nom,
        prenom,
        email: email.trim(),
        password,
        promo: 'Membre',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username.trim())}`,
        verificationCode: verifyType === 'code' ? codeDigits.join('') : undefined
      });

      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Échec de l\'inscription.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot password request
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setForgotNotice(null);
    if (!forgotEmail.trim()) {
      setError('Veuillez saisir votre adresse email.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.sendVerificationCode({
        email: forgotEmail.trim(),
        purpose: 'reset'
      });
      setForgotStep(2);
      setForgotNotice(`Code envoyé${res.previewCode ? ` (${res.previewCode})` : ''}`);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi du code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!forgotCode.trim() || !newPassword) {
      setError('Veuillez renseigner le code et le nouveau mot de passe.');
      return;
    }

    setLoading(true);
    try {
      await api.auth.resetPassword({
        email: forgotEmail.trim(),
        code: forgotCode.trim(),
        newPassword
      });
      setAuthMode('login');
      setEmail(forgotEmail.trim());
      setError(null);
      setForgotNotice('Mot de passe mis à jour ! Vous pouvez maintenant vous connecter.');
    } catch (err: any) {
      setError(err.message || 'Échec de la réinitialisation du mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#e8ecf2] dark:bg-[#080d1a] flex items-center justify-center p-3 sm:p-6 relative overflow-hidden font-sans selection:bg-slate-300">
      
      {/* Formes décoratives douces en arrière-plan */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-slate-300/40 dark:bg-blue-900/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-slate-400/20 dark:bg-indigo-900/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-28 left-1/4 w-96 h-96 rounded-full bg-slate-300/30 dark:bg-slate-800/20 blur-3xl pointer-events-none" />

      {/* Cadre Smartphone */}
      <div className="w-full max-w-[390px] bg-white dark:bg-[#0d1627] rounded-[44px] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border-[6px] border-white dark:border-[#131f37] ring-1 ring-slate-200/80 dark:ring-slate-800/80 p-6 sm:p-7 relative z-10 flex flex-col justify-between transition-all duration-300">
        
        {/* Barre d'état supérieure (09:41, Réseau, WiFi, Batterie) */}
        <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 pt-1 pb-3 px-1 select-none">
          <span className="text-[13px] tracking-tight font-bold">09:41</span>
          <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
            {/* Barres réseau */}
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <rect x="2" y="16" width="3" height="6" rx="1" />
              <rect x="7" y="12" width="3" height="10" rx="1" />
              <rect x="12" y="8" width="3" height="14" rx="1" />
              <rect x="17" y="4" width="3" height="18" rx="1" />
            </svg>
            {/* WiFi */}
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 18c-.8 0-1.5.7-1.5 1.5S11.2 21 12 21s1.5-.7 1.5-1.5S12.8 18 12 18zm-4.9-3.5c2.7-2.7 7.1-2.7 9.8 0l1.4-1.4c-3.5-3.5-9.2-3.5-12.6 0l1.4 1.4zm-2.8-2.8c4.3-4.3 11.2-4.3 15.4 0l1.4-1.4C15.9 5.1 8.1 5.1 3 10.3l1.3 1.4z" />
            </svg>
            {/* Batterie */}
            <div className="w-5 h-2.5 rounded-sm border border-current p-0.5 flex items-center">
              <div className="h-full w-3 bg-current rounded-2xs" />
            </div>
          </div>
        </div>

        {/* Illustration dynamique */}
        <div className="w-full flex items-center justify-center py-2">
          {authMode === 'pc_verify' && (
            <div className="w-56 h-36 relative flex items-center justify-center">
              <div className="absolute bottom-1 w-48 h-8 bg-slate-100 dark:bg-slate-800/60 rounded-full" />
              
              {/* Ordinateur PC mockup */}
              <div className="absolute left-3 bottom-3 w-28 h-20 bg-slate-900 dark:bg-slate-800 rounded-lg p-1.5 shadow-lg border border-slate-700 flex flex-col justify-between">
                <div className="w-full h-11 bg-slate-950 rounded flex flex-col items-center justify-center p-1 text-center border border-slate-800">
                  <Laptop className="w-4 h-4 text-blue-400 mb-0.5 animate-pulse" />
                  <span className="text-[7px] text-slate-400 font-mono">CONNEXION PC</span>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-sm mx-auto" />
              </div>

              {/* Signal de liaison */}
              <div className="absolute z-10 flex items-center justify-center">
                <span className="w-3 h-3 rounded-full bg-blue-500 animate-ping" />
              </div>

              {/* Téléphone Mobile mockup */}
              <div className="absolute right-3 bottom-2 w-16 h-28 bg-[#1e293b] rounded-2xl p-1.5 shadow-xl flex flex-col items-center justify-between border-2 border-blue-500/80">
                <div className="w-4 h-1 bg-slate-600 rounded-full mt-0.5" />
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-1">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-[8px] font-black text-white tracking-widest font-mono">
                    {pcPreviewCode || 'VALID'}
                  </div>
                </div>
                <div className="w-5 h-0.5 bg-slate-600 rounded-full" />
              </div>
            </div>
          )}

          {authMode === 'login' && (
            <div className="w-48 h-36 relative flex items-center justify-center">
              {/* Tapis / Ombre au sol */}
              <div className="absolute bottom-1 w-44 h-8 bg-slate-100 dark:bg-slate-800/60 rounded-full" />
              
              {/* Smartphone avec code PIN et badge de validation */}
              <div className="absolute right-4 bottom-2 w-16 h-28 bg-[#1e293b] rounded-2xl p-1.5 shadow-md flex flex-col items-center justify-between border border-slate-700">
                <div className="w-4 h-1 bg-slate-600 rounded-full mt-0.5" />
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  {/* Points PIN */}
                  <div className="grid grid-cols-3 gap-1">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    ))}
                  </div>
                </div>
                <div className="w-6 h-0.5 bg-slate-600 rounded-full" />
              </div>

              {/* Plante décorative */}
              <div className="absolute left-4 bottom-2 flex flex-col items-center">
                <div className="w-5 h-8 relative">
                  <div className="absolute -top-1 left-0 w-2.5 h-4 bg-emerald-600 rounded-full -rotate-12" />
                  <div className="absolute -top-2 right-0 w-2.5 h-4 bg-emerald-500 rounded-full rotate-12" />
                  <div className="absolute top-1 left-1.5 w-2 h-3.5 bg-emerald-400 rounded-full" />
                </div>
                <div className="w-6 h-6 bg-amber-700/80 rounded-b-md rounded-t-xs" />
              </div>

              {/* Personnage assis sereinement avec ordinateur */}
              <div className="relative z-10 flex flex-col items-center mr-8 mb-1">
                <div className="w-7 h-7 rounded-full bg-amber-200 border-2 border-slate-800 relative">
                  <div className="absolute -top-1 -right-0.5 w-4 h-4 bg-slate-800 rounded-full" />
                </div>
                <div className="w-9 h-11 bg-indigo-500 rounded-t-xl rounded-b-md relative flex items-center justify-center">
                  <div className="w-7 h-4 bg-slate-800 rounded-sm mt-2 border border-slate-600" />
                </div>
                <div className="w-14 h-4 bg-slate-800 rounded-full -mt-1" />
              </div>

              {/* Enveloppe flottante */}
              <div className="absolute top-3 right-6 text-blue-500 animate-bounce">
                <Mail className="w-4 h-4 stroke-[1.8]" />
              </div>
            </div>
          )}

          {authMode === 'register' && registerStep === 1 && (
            <div className="w-48 h-36 relative flex items-center justify-center">
              <div className="absolute bottom-1 w-44 h-8 bg-slate-100 dark:bg-slate-800/60 rounded-full" />

              {/* Téléphone mockup création de compte */}
              <div className="absolute right-6 bottom-2 w-20 h-30 bg-[#1e293b] rounded-2xl p-1.5 shadow-md flex flex-col items-center justify-between border border-slate-700">
                <div className="w-5 h-1 bg-slate-600 rounded-full mt-0.5" />
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center mb-1">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="w-12 h-1.5 bg-slate-700 rounded-full mb-1" />
                  <div className="w-8 h-1.5 bg-slate-700 rounded-full" />
                </div>
                <div className="w-6 h-0.5 bg-slate-600 rounded-full" />
              </div>

              {/* Personnage debout accueillant */}
              <div className="relative z-10 flex flex-col items-center mr-12 mb-1">
                <div className="w-7 h-7 rounded-full bg-amber-200 border-2 border-slate-800 relative" />
                <div className="w-8 h-12 bg-sky-500 rounded-t-xl rounded-b-md relative" />
                <div className="flex space-x-2 -mt-0.5">
                  <div className="w-2.5 h-10 bg-slate-800 rounded-b-full" />
                  <div className="w-2.5 h-10 bg-slate-800 rounded-b-full" />
                </div>
              </div>

              {/* Badge flottant */}
              <div className="absolute top-2 left-6 bg-emerald-500 text-white p-1 rounded-full shadow-sm">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            </div>
          )}

          {authMode === 'register' && registerStep === 2 && (
            <div className="w-48 h-36 relative flex items-center justify-center">
              <div className="absolute bottom-1 w-44 h-8 bg-slate-100 dark:bg-slate-800/60 rounded-full" />
              <div className="w-32 h-32 bg-[#1e293b] rounded-3xl p-3 shadow-lg flex flex-col items-center justify-between border border-slate-700">
                <div className="w-6 h-1 bg-slate-600 rounded-full" />
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="text-[9px] font-bold text-slate-300 tracking-wider">VÉRIFICATION</div>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="w-2.5 h-3 bg-slate-700 rounded-xs border border-slate-500" />
                    ))}
                  </div>
                </div>
                <div className="w-8 h-1 bg-slate-600 rounded-full" />
              </div>
            </div>
          )}

          {authMode === 'forgot' && (
            <div className="w-48 h-36 relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <KeyRound className="w-10 h-10" />
              </div>
            </div>
          )}
        </div>

        {/* Zone de formulaire */}
        <div className="flex-1 flex flex-col justify-center my-2">
          
          {/* Bandeau de réactivation de compte */}
          {reactivatedBanner && (
            <div className="mb-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold text-center animate-fadeIn">
              ✓ Bon retour ! Votre compte a été réactivé avec succès.
            </div>
          )}

          {/* Message d'erreur */}
          {error && (
            <div className="mb-3 px-3 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-medium text-center animate-fadeIn">
              {error}
            </div>
          )}

          {/* Message de notification */}
          {forgotNotice && (
            <div className="mb-3 px-3 py-2 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 text-xs font-medium text-center">
              {forgotNotice}
            </div>
          )}

          {/* 1. ÉCRAN DE CONNEXION */}
          {authMode === 'login' && (
            <div>
              <div className="mb-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Connexion
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Veuillez vous connecter pour continuer.
                </p>
              </div>

              {/* Reconnaissance automatique et professionnelle de l'appareil connecté */}
              <div className="mb-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#121c32] border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    detected.isPc
                      ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
                      : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {detected.isPc ? <Laptop className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5 truncate">
                      <span>{detected.isPc ? 'Ordinateur détecté' : 'Smartphone détecté'}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {detected.deviceName} · Détection automatique
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                    detected.isPc
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  }`}>
                    {detected.isPc ? '2FA Téléphone actif' : 'Accès mobile direct'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3">
                {/* Email */}
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Adresse email"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#f1f4f8] dark:bg-[#152238] border-none rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/50 transition-all font-medium"
                  />
                </div>

                {/* Mot de passe */}
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mot de passe"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-[#f1f4f8] dark:bg-[#152238] border-none rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/50 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Ligne : Se souvenir & Mot de passe oublié */}
                <div className="flex items-center justify-between pt-1 pb-1">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setRememberMe(!rememberMe)}
                      className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                        rememberMe ? 'bg-[#182538] dark:bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 ${
                          rememberMe ? 'left-4.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium select-none">
                      Se souvenir de moi
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setForgotStep(1);
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-white font-medium transition cursor-pointer"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>

                {/* Bouton de connexion */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#182538] hover:bg-[#0f172a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Se connecter</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* 1.1 ÉCRAN DE VALIDATION CROISÉE PC (PC ➔ TÉLÉPHONE) */}
          {authMode === 'pc_verify' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wide">
                    Sécurité MK 💻
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Vérification PC
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                  Validation par Téléphone 📱
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Une tentative de connexion sur PC a été initiée. Validez l'accès avec votre téléphone.
                </p>
              </div>

              {/* Bannière d'approbation instantanée via live SSE */}
              {pcApprovedNotice && (
                <div className="p-3 rounded-2xl bg-emerald-500 text-white text-xs font-black text-center flex items-center justify-center space-x-2 animate-bounce">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{pcApprovedNotice}</span>
                </div>
              )}

              {/* Guide étape par étape ultra-clair */}
              <div className="p-3.5 bg-blue-50/90 dark:bg-[#0c1830] rounded-2xl border border-blue-200 dark:border-blue-900/80 text-xs space-y-2">
                <div className="font-extrabold text-blue-900 dark:text-blue-300 flex items-center space-x-1.5">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Instructions sur votre téléphone :</span>
                </div>
                <ol className="space-y-1.5 text-slate-700 dark:text-slate-200 font-medium text-[11px] sm:text-xs">
                  <li className="flex items-start space-x-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <span>Ouvrez <strong>MK</strong> sur votre téléphone où votre compte est actif.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <span>Accédez à <strong>Menu (☰) ➔ Paramètres</strong>.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <span>Cliquez sur <strong>« Code de validation »</strong>.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      4
                    </span>
                    <span>Lisez le code à 6 chiffres affiché et écrivez-le ci-dessous sur votre PC (ou touchez <em>« Autoriser »</em>) :</span>
                  </li>
                </ol>
              </div>

              {/* 6 Cases de saisie du PIN PC */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between gap-1.5">
                  {pcDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { pcDigitRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePcDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePcDigitKeyDown(idx, e)}
                      autoFocus={idx === 0}
                      className={`w-11 sm:w-12 h-12 sm:h-14 text-center text-lg sm:text-xl font-mono font-black rounded-2xl bg-[#f1f4f8] dark:bg-[#152238] border-2 transition-all focus:outline-none ${
                        digit
                          ? 'border-blue-600 text-slate-900 dark:text-white shadow-xs'
                          : 'border-transparent text-slate-800 dark:text-white focus:border-blue-400'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Valable encore : <strong className="text-blue-600 dark:text-blue-400 font-mono">{Math.floor(pcCountdown / 60)}:{(pcCountdown % 60).toString().padStart(2, '0')}</strong></span>
                  <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Synchronisation live</span>
                  </span>
                </div>
              </div>

              {/* Bouton de validation sur PC */}
              <button
                type="button"
                onClick={() => handleVerifyPcDigits()}
                disabled={pcVerifying || pcDigits.some((d) => !d)}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {pcVerifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Valider et Déverrouiller le PC</span>
                  </>
                )}
              </button>

              {/* Actions de simulation & tests faciles */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowPhoneSimulator(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <span>📱 Ouvrir l'écran Téléphone (Mode Test / Démo)</span>
                </button>

                {pcPreviewCode && (
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Code actif pour ce test : <strong className="font-mono text-slate-800 dark:text-slate-200">{pcPreviewCode}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        const splitted = pcPreviewCode.slice(0, 6).split('');
                        setPcDigits(splitted);
                        handleVerifyPcDigits(pcPreviewCode);
                      }}
                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                    >
                      Remplir auto
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setPcDigits(['', '', '', '', '', '']);
                  }}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white font-medium transition cursor-pointer pt-1"
                >
                  ← Annuler et revenir à la connexion
                </button>
              </div>
            </div>
          )}

          {/* Simulateur Téléphone Popover pour tester directement sur un seul écran */}
          {showPhoneSimulator && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
              <div className="w-full max-w-[340px] bg-white dark:bg-[#0c1424] rounded-3xl border-4 border-slate-800 dark:border-slate-700 shadow-2xl p-4 space-y-3 relative">
                {/* En-tête smartphone */}
                <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Paramètres MK (Sur Téléphone)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPhoneSimulator(false)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-2xl border border-blue-200 dark:border-blue-900/60 text-center space-y-2">
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                    Code de Validation PC
                  </span>
                  <div className="font-mono text-3xl font-black text-slate-900 dark:text-white tracking-widest py-1">
                    {pcPreviewCode || pcDigits.join('') || '849 201'}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Ce code est actuellement affiché sur votre compte mobile dans Paramètres &gt; Code de validation.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      if (pcSessionId) {
                        try {
                          await api.auth.approvePcLogin({ sessionId: pcSessionId });
                        } catch {
                          // fallback
                        }
                      }
                      setShowPhoneSimulator(false);
                      if (pcPreviewCode) {
                        setPcDigits(pcPreviewCode.slice(0, 6).split(''));
                        handleVerifyPcDigits(pcPreviewCode);
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md flex items-center justify-center space-x-1.5 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approuver la connexion PC immédiatement</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (pcPreviewCode) {
                        navigator.clipboard.writeText(pcPreviewCode);
                        const splitted = pcPreviewCode.slice(0, 6).split('');
                        setPcDigits(splitted);
                      }
                      setShowPhoneSimulator(false);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
                  >
                    Copier le code dans le PC
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. ÉCRAN D'INSCRIPTION / CRÉATION DE COMPTE (ÉTAPE 1) */}
          {authMode === 'register' && registerStep === 1 && (
            <div>
              <div className="mb-4">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Inscription
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Créez votre compte pour nous rejoindre.
                </p>
              </div>

              <form onSubmit={handleRegisterToVerify} className="space-y-3">
                {/* Nom d'utilisateur */}
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nom d'utilisateur"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#f1f4f8] dark:bg-[#152238] border-none rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/50 transition-all font-medium"
                  />
                </div>

                {/* Email */}
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Adresse email"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#f1f4f8] dark:bg-[#152238] border-none rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/50 transition-all font-medium"
                  />
                </div>

                {/* Mot de passe */}
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mot de passe (min. 6 caractères)"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-[#f1f4f8] dark:bg-[#152238] border-none rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/50 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Ligne Se souvenir */}
                <div className="flex items-center space-x-2 pt-1 pb-1">
                  <button
                    type="button"
                    onClick={() => setRememberMe(!rememberMe)}
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                      rememberMe ? 'bg-[#182538] dark:bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 ${
                        rememberMe ? 'left-4.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium select-none">
                    Se souvenir de moi
                  </span>
                </div>

                {/* Bouton Continuer */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#182538] hover:bg-[#0f172a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Continuer l'inscription</span>
                </button>
              </form>
            </div>
          )}

          {/* 3. ÉCRAN DE VÉRIFICATION DE SÉCURITÉ (ÉTAPE 2) */}
          {authMode === 'register' && registerStep === 2 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setRegisterStep(1)}
                  className="p-1 -ml-1 text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex bg-[#f1f4f8] dark:bg-[#152238] rounded-xl p-0.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setVerifyType('code')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      verifyType === 'code'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Code Email
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyType('captcha');
                      loadCaptcha();
                    }}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      verifyType === 'captcha'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Puzzle Captcha
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Vérification
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {verifyType === 'code' 
                    ? 'Saisissez le code à 6 chiffres envoyé sur votre adresse email.' 
                    : 'Glissez le puzzle pour vérifier que vous êtes humain.'}
                </p>
              </div>

              {/* Vérification par code à 6 chiffres */}
              {verifyType === 'code' && (
                <div className="space-y-4">
                  {/* Badge code de démo */}
                  {previewCode && (
                    <div className="text-center">
                      <span className="inline-block px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 text-[11px] font-mono font-bold border border-blue-200 dark:border-blue-800">
                        Code démo : {previewCode}
                      </span>
                    </div>
                  )}

                  {/* 6 cases de saisie du PIN */}
                  <div className="flex justify-between gap-1.5" onPaste={handleDigitPaste}>
                    {codeDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { digitInputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                        className={`w-11 h-12 text-center text-base sm:text-lg font-bold rounded-2xl bg-[#f1f4f8] dark:bg-[#152238] border-2 transition-all focus:outline-none ${
                          codeVerified
                            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : digit
                            ? 'border-slate-800 dark:border-blue-500 text-slate-900 dark:text-white'
                            : 'border-transparent text-slate-800 dark:text-white focus:border-slate-400'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Renvoyer le code */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Code non reçu ?</span>
                    <button
                      type="button"
                      onClick={requestVerificationCode}
                      disabled={codeCountdown > 0 || loading}
                      className="font-bold text-slate-800 dark:text-blue-400 hover:underline disabled:opacity-50 cursor-pointer"
                    >
                      {codeCountdown > 0 ? `Renvoyer (${codeCountdown}s)` : 'Renvoyer le code'}
                    </button>
                  </div>
                </div>
              )}

              {/* Vérification par Slider Puzzle */}
              {verifyType === 'captcha' && (
                <div className="space-y-4">
                  <div className="relative h-28 bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-900 rounded-2xl overflow-hidden p-3 flex flex-col justify-between border border-slate-700">
                    <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium">
                      <span>Vérification anti-robot</span>
                      <button
                        type="button"
                        onClick={loadCaptcha}
                        className="hover:rotate-180 transition-transform cursor-pointer"
                        title="Recharger le puzzle"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Zone cible */}
                    <div
                      className="absolute top-8 w-11 h-11 border-2 border-dashed border-emerald-400/80 rounded-xl bg-emerald-500/10 pointer-events-none flex items-center justify-center"
                      style={{ left: `${captchaTarget}%` }}
                    >
                      <div className="w-4 h-4 rounded-full bg-emerald-400/30" />
                    </div>

                    {/* Pièce glissante */}
                    <div
                      className={`absolute top-8 w-11 h-11 rounded-xl shadow-lg flex items-center justify-center transition-shadow pointer-events-none ${
                        captchaDone
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white text-slate-800 border-2 border-blue-500'
                      }`}
                      style={{ left: `${captchaSlider}%` }}
                    >
                      {captchaDone ? <Check className="w-5 h-5 stroke-[3]" /> : <ShieldCheck className="w-5 h-5 text-blue-600" />}
                    </div>
                  </div>

                  {/* Curseur de glissement */}
                  <div className="pt-1">
                    <input
                      type="range"
                      min={0}
                      max={85}
                      value={captchaSlider}
                      disabled={captchaDone}
                      onChange={(e) => handleCaptchaSlider(Number(e.target.value))}
                      className="w-full accent-[#182538] dark:accent-blue-500 cursor-pointer"
                    />
                    <div className="text-center text-[11px] text-slate-500 mt-1 font-medium">
                      {captchaDone ? '✓ Vérification validée' : 'Glissez la pièce sur la cible pour valider'}
                    </div>
                  </div>
                </div>
              )}

              {/* Bouton final de validation */}
              <button
                type="button"
                onClick={handleFinalRegister}
                disabled={loading || (verifyType === 'code' ? !codeVerified : !captchaDone)}
                className="w-full mt-4 py-3.5 bg-[#182538] hover:bg-[#0f172a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Valider et créer mon compte</span>
                )}
              </button>
            </div>
          )}

          {/* 4. ÉCRAN DE MOT DE PASSE OUBLIÉ */}
          {authMode === 'forgot' && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="p-1 -ml-1 text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Mot de passe oublié
                </h2>
              </div>

              {forgotStep === 1 ? (
                <form onSubmit={handleForgotRequest} className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Entrez votre email pour recevoir votre code de réinitialisation.
                  </p>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Votre adresse email"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-[#f1f4f8] dark:bg-[#152238] border-none rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/50 transition-all font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#182538] hover:bg-[#0f172a] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Envoyer le code</span>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotReset} className="space-y-3">
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={forgotCode}
                      onChange={(e) => setForgotCode(e.target.value)}
                      placeholder="Code à 6 chiffres"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-[#f1f4f8] dark:bg-[#152238] border-none rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/50 transition-all font-medium"
                    />
                  </div>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nouveau mot de passe"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-[#f1f4f8] dark:bg-[#152238] border-none rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/50 transition-all font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#182538] hover:bg-[#0f172a] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Mettre à jour le mot de passe</span>}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Liens de bascule en bas (Pas de compte ? S'inscrire / Déjà un compte ? Se connecter) */}
        <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800/80">
          {authMode === 'login' ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pas encore de compte ?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setRegisterStep(1);
                }}
                className="font-bold text-slate-900 dark:text-white hover:underline cursor-pointer"
              >
                S'inscrire
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Déjà un compte ?{' '}
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="font-bold text-slate-900 dark:text-white hover:underline cursor-pointer"
              >
                Se connecter
              </button>
            </p>
          )}
        </div>

      </div>

    </div>
  );
};
