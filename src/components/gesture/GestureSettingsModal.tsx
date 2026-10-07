import React from 'react';
import {
  Sparkles,
  X,
  Volume2,
  VolumeX,
  MousePointer2,
  MoveVertical,
  ZoomIn,
  Camera,
  Eye,
  Sliders,
  CheckCircle2,
  Layers
} from 'lucide-react';

interface GestureSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEnabled: boolean;
  onToggleEnabled: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  showDiagnosticPreview: boolean;
  onToggleDiagnosticPreview: () => void;
  dwellClickEnabled: boolean;
  onToggleDwellClick: () => void;
  smoothingLevel: number;
  onChangeSmoothingLevel: (val: number) => void;
  onTriggerManualCapture: () => void;
}

export const GestureSettingsModal: React.FC<GestureSettingsModalProps> = ({
  isOpen,
  onClose,
  isEnabled,
  onToggleEnabled,
  soundEnabled,
  onToggleSound,
  showDiagnosticPreview,
  onToggleDiagnosticPreview,
  dwellClickEnabled,
  onToggleDwellClick,
  smoothingLevel,
  onChangeSmoothingLevel,
  onTriggerManualCapture
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0c1328] rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-[#0a0f20]/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Contrôle Gestuel & Touche Virtuelle IA
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Sans Contact
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilotez MK à distance avec vos mains grâce à la vision par intelligence artificielle
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Main Toggle Switch */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Activer la reconnaissance des gestes</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                La caméra s'exécute de façon invisible en arrière-plan sans encombrer votre écran.
              </p>
            </div>

            <button
              type="button"
              onClick={onToggleEnabled}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Gestures Guide Grid */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Guide des Mouvements à Distance</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card 1: Pointeur Virtuel */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                  <MousePointer2 className="w-4 h-4" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Pointeur & Clic Virtuel
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Pointez votre <strong>index</strong> vers l'écran pour déplacer le curseur holographique.
                  Faites un <strong>pincement pouce + index</strong> pour cliquer sur n'importe quel bouton ou lien.
                </p>
              </div>

              {/* Card 2: Défilement à distance */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                  <MoveVertical className="w-4 h-4" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Défilement (Scrolling)
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Approchez le curseur virtuel du <strong>bord supérieur ou inférieur</strong> de l'écran,
                  ou déplacez verticalement votre main pour faire défiler le fil et les pages avec fluidité.
                </p>
              </div>

              {/* Card 3: Zoom et Dézoom */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                  <ZoomIn className="w-4 h-4" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Zoom & Dézoom
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Levez vos deux mains et <strong>écartez-les pour zoomer</strong> (ou <strong>rapprochez-les pour dézoomer</strong>).
                  À une main : ouvrez grand la main pour agrandir ou serrez le poing pour réduire.
                </p>
              </div>

              {/* Card 4: Capture par Opposition */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
                  <Camera className="w-4 h-4" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Capture par Mouvement d'Opposition
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong>À une main :</strong> Effectuez un mouvement d'opposition du pouce (pouce touchant l'auriculaire ou l'annulaire).
                  <br />
                  <strong>À deux mains :</strong> Formez le cadre photo d'opposition ou réunissez vos mains face à face pour capturer immédiatement l'écran !
                </p>
              </div>
            </div>
          </div>

          {/* Settings & Fine-tuning */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
              <Sliders className="w-3.5 h-3.5 text-blue-500" />
              <span>Paramètres & Retour Sensoriel</span>
            </div>

            <div className="space-y-2.5">
              {/* Sound Feedback */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <VolumeX className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Retour Audio Synthétique
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Déclic mécanique au clic et obturateur photo sonore
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onToggleSound}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    soundEnabled
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {soundEnabled ? 'Activé' : 'Muet'}
                </button>
              </div>

              {/* Dwell Click */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Clic Automatique par Maintien (Dwell)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Clique automatiquement après 1 seconde de survol stable sur un bouton
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onToggleDwellClick}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    dwellClickEnabled
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {dwellClickEnabled ? 'Actif' : 'Désactivé'}
                </button>
              </div>

              {/* Smoothing Sensitivity Slider */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Sensibilité & Lissage du Pointeur
                  </span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                    {Math.round(smoothingLevel * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.65"
                  step="0.05"
                  value={smoothingLevel}
                  onChange={(e) => onChangeSmoothingLevel(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Très stable / doux</span>
                  <span>Ultra réactif</span>
                </div>
              </div>

              {/* Optional Diagnostic Camera Thumbnail (Hidden by default to honor user preference) */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Miniature de diagnostic vidéo
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Discrète vignette d'angle pour vérifier le cadrage (masquée par défaut)
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onToggleDiagnosticPreview}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    showDiagnosticPreview
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {showDiagnosticPreview ? 'Affichée' : 'Masquée'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1328] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onTriggerManualCapture}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Tester une capture maintenant</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Compris, continuer
          </button>
        </div>
      </div>
    </div>
  );
};
