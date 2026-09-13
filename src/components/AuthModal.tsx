import React, { useState } from 'react';
import { User } from '../types';
import { api, fileToDataUrl } from '../lib/api';
import { ShieldAlert, Sparkles, User as UserIcon, Mail, Lock, Camera, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  onSuccess: (user: User) => void;
}

const GENERAL_PROFILES = [
  { value: 'Membre', label: 'Membre' },
  { value: 'Créateur', label: 'Créateur de contenu' },
  { value: 'Artiste', label: 'Artiste & Photographe' },
  { value: 'Technophile', label: 'Passionné Tech & Digital' },
  { value: 'Voyageur', label: 'Voyage & Lifestyle' },
  { value: 'Professionnel', label: 'Professionnel' },
  { value: 'Autre', label: 'Autre' },
];

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1594824813580-c1192e3416e9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
];

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Registration states
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [promo, setPromo] = useState('Membre');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(PRESET_AVATARS[0]);
  const [customAvatarPreview, setCustomAvatarPreview] = useState<string | null>(null);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("L'image est trop volumineuse (max 2 Mo).");
        return;
      }
      try {
        const dataUrl = await fileToDataUrl(file);
        setCustomAvatarPreview(dataUrl);
        setAvatarUrl(dataUrl);
      } catch {
        setError("Erreur lors du traitement de l'image.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.auth.login({ email: email.trim(), password });
        onSuccess(res.user);
      } else {
        if (!nom.trim() || !prenom.trim() || !email.trim() || !password) {
          setError("Veuillez renseigner tous les champs obligatoires.");
          setLoading(false);
          return;
        }

        const res = await api.auth.register({
          nom: nom.trim(),
          prenom: prenom.trim(),
          email: email.trim(),
          password,
          promo,
          bio: bio.trim(),
          avatarUrl: customAvatarPreview || avatarUrl,
        });
        onSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Container Box */}
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
        
        {/* Header Banner with MK Branding */}
        <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-8 py-8 text-white border-b border-indigo-900/50">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <span className="text-xl font-black tracking-tighter">MK</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-widest text-teal-400 bg-teal-950/80 px-2.5 py-0.5 rounded-full border border-teal-800">
                  Réseau Social
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white mt-1">
                Bienvenue sur MK
              </h1>
            </div>
          </div>
          <p className="text-slate-300 text-sm mt-3 leading-relaxed">
            Rejoignez MK pour partager des publications, des reels vidéo, échanger en direct avec vos amis et participer aux discussions communautaires.
          </p>

          {/* Tab Switcher */}
          <div className="flex bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 mt-6 max-w-md">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                isLogin
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Connexion
            </button>
            <button
              id="tab-register-btn"
              type="button"
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                !isLogin
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Créer un compte
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5 bg-white">
          {error && (
            <div className="flex items-start space-x-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-shake">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {!isLogin && (
            <>
              {/* Name and Surname */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="input-prenom"
                      type="text"
                      required
                      placeholder="Votre prénom"
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="input-nom"
                      type="text"
                      required
                      placeholder="Votre nom"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Avatar Chooser */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Photo de Profil
                </label>
                <div className="flex items-center space-x-4">
                  <div className="relative group">
                    <img
                      src={customAvatarPreview || avatarUrl}
                      alt="Avatar"
                      className="w-16 h-16 rounded-full object-cover border-2 border-teal-500 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition">
                      <Camera className="w-5 h-5 text-white" />
                      <input
                        id="input-avatar-file"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-1.5">
                      Choisissez un avatar ou importez le vôtre :
                    </span>
                    <div className="flex space-x-2">
                      {PRESET_AVATARS.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setAvatarUrl(url);
                            setCustomAvatarPreview(null);
                          }}
                          className={`w-8 h-8 rounded-full overflow-hidden border-2 transition ${
                            avatarUrl === url && !customAvatarPreview
                              ? 'border-teal-600 ring-2 ring-teal-200'
                              : 'border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Catégorie / Statut de profil */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Catégorie de profil <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Sparkles className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    id="select-promo"
                    value={promo}
                    onChange={(e) => setPromo(e.target.value)}
                    className="w-full pl-11 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                  >
                    {GENERAL_PROFILES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Email (Strictly unique) */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Adresse Email <span className="text-red-500">*</span>
              </label>
              {!isLogin && (
                <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-medium">
                  Usage unique garanti
                </span>
              )}
            </div>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="input-email"
                type="email"
                required
                placeholder="nom@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Mot de passe <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="input-password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Bio / Présentation (optionnel)
              </label>
              <textarea
                id="input-bio"
                rows={2}
                placeholder="Présentez-vous en quelques mots, vos passions, vos projets..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all resize-none"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-600/25 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>{isLogin ? 'Se connecter à MK' : 'Finaliser mon inscription sur MK'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Footer Assurance */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center space-x-2 text-xs text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            <span>MK — Réseau social connecté, sécurisé et modéré par IA</span>
          </div>
        </form>
      </div>
    </div>
  );
};
