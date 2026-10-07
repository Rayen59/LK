import React from 'react';
import {
  Sparkles,
  MousePointer2,
  MoveVertical,
  ZoomIn,
  Camera,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { GestureDetectionState } from '../../lib/gestureEngine';

interface GestureHUDProps {
  state: GestureDetectionState;
  isHoveringClickable: boolean;
  hoveredElementText?: string;
  dwellProgress: number; // 0 to 1
  clickRipples: Array<{ id: number; x: number; y: number }>;
  currentZoom: number;
  onResetZoom: () => void;
  onOpenSettings: () => void;
  isCameraFlash: boolean;
  isModelReady: boolean;
  isCameraActive: boolean;
  isDockMinimized: boolean;
  onToggleDockMinimized: () => void;
  onTriggerManualCapture: () => void;
  diagnosticCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  showDiagnosticPreview: boolean;
  lastCaptureNotification?: string | null;
}

export const GestureHUD: React.FC<GestureHUDProps> = ({
  state,
  isHoveringClickable,
  hoveredElementText,
  dwellProgress,
  clickRipples,
  currentZoom,
  onResetZoom,
  onOpenSettings,
  isCameraFlash,
  isModelReady,
  isCameraActive,
  isDockMinimized,
  onToggleDockMinimized,
  onTriggerManualCapture,
  diagnosticCanvasRef,
  showDiagnosticPreview,
  lastCaptureNotification
}) => {
  return (
    <>
      {/* 1. Camera Shutter Flash Effect (Full screen white flash on opposition capture) */}
      {isCameraFlash && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[10000] pointer-events-none bg-white transition-opacity duration-300 ease-out animate-fadeIn gesture-hud-element"
          style={{ opacity: 0.98 }}
        />
      )}

      {/* 2. Instant Toast Notification on Real Screenshot Capture */}
      {lastCaptureNotification && (
        <div
          aria-hidden="true"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none px-5 py-2.5 rounded-2xl bg-emerald-600 text-white font-extrabold text-sm shadow-2xl backdrop-blur-md flex items-center space-x-2.5 animate-bounce gesture-hud-element"
        >
          <Camera className="w-5 h-5 text-white animate-pulse" />
          <span>{lastCaptureNotification}</span>
        </div>
      )}

      {/* 3. Air Slide / Air Scroll Indicators ("Glissement d'air") */}
      {state.isAirSlideActive && state.airSlideDirection && (
        <div
          aria-hidden="true"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9990] pointer-events-none px-4 py-2 rounded-full bg-indigo-600/95 text-white text-xs font-extrabold shadow-xl backdrop-blur-md flex items-center space-x-2 animate-fadeIn gesture-hud-element"
        >
          {state.airSlideDirection === 'up' && <ArrowUp className="w-4 h-4 animate-bounce" />}
          {state.airSlideDirection === 'down' && <ArrowDown className="w-4 h-4 animate-bounce" />}
          {state.airSlideDirection === 'left' && <ArrowLeft className="w-4 h-4 animate-bounce" />}
          {state.airSlideDirection === 'right' && <ArrowRight className="w-4 h-4 animate-bounce" />}
          <span>
            {state.airSlideDirection === 'up'
              ? "Glissement d'air : L'écran monte ↑"
              : state.airSlideDirection === 'down'
              ? "Glissement d'air : L'écran descend ↓"
              : state.airSlideDirection === 'left'
              ? "Glissement d'air : Vers la gauche ←"
              : "Glissement d'air : Vers la droite →"}
          </span>
        </div>
      )}

      {/* 4. Edge Scroll Indicators */}
      {state.isScrollingUp && !state.isAirSlideActive && (
        <div
          aria-hidden="true"
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[9990] pointer-events-none px-4 py-1.5 rounded-full bg-blue-600/90 text-white text-xs font-bold shadow-lg backdrop-blur-md flex items-center space-x-2 animate-bounce gesture-hud-element"
        >
          <MoveVertical className="w-3.5 h-3.5 rotate-180" />
          <span>Bord supérieur : Défilement vers le haut</span>
        </div>
      )}

      {state.isScrollingDown && !state.isAirSlideActive && (
        <div
          aria-hidden="true"
          className="fixed bottom-16 lg:bottom-4 left-1/2 -translate-x-1/2 z-[9990] pointer-events-none px-4 py-1.5 rounded-full bg-blue-600/90 text-white text-xs font-bold shadow-lg backdrop-blur-md flex items-center space-x-2 animate-bounce gesture-hud-element"
        >
          <MoveVertical className="w-3.5 h-3.5" />
          <span>Bord inférieur : Défilement vers le bas</span>
        </div>
      )}

      {/* 5. Opposition Framing Feedback (When opposition gesture is in progress) */}
      {state.isOppositionGesture && (
        <div
          aria-hidden="true"
          className="fixed inset-8 sm:inset-16 z-[9995] pointer-events-none flex flex-col items-center justify-between border-2 border-dashed border-rose-500 rounded-3xl bg-rose-500/10 backdrop-blur-[1px] animate-pulse transition-all duration-150 gesture-hud-element"
        >
          <div className="pt-4 flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-rose-600 text-white text-xs font-extrabold shadow-xl">
            <Camera className="w-4 h-4 animate-spin" />
            <span>
              📸 Geste d'opposition détecté : Capture en cours ({Math.round(state.oppositionProgress * 100)}%)
            </span>
          </div>

          {/* Corner brackets */}
          <div className="w-full flex justify-between px-6 pb-6 text-rose-500 font-mono text-3xl font-bold">
            <span>⌞</span>
            <span>⌟</span>
          </div>
        </div>
      )}

      {/* 6. Zoom Scale Pill Indicator (Visible when zoom != 1.0 or during zoom gesture) */}
      {(Math.abs(currentZoom - 1) > 0.02 || state.zoomAction) && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9980] px-3.5 py-1.5 rounded-full bg-slate-900/90 dark:bg-black/90 text-white text-xs font-bold shadow-xl backdrop-blur-md border border-slate-700/80 flex items-center space-x-3 pointer-events-auto gesture-hud-element">
          <div className="flex items-center space-x-1.5">
            <ZoomIn className="w-3.5 h-3.5 text-blue-400" />
            <span>Zoom : {Math.round(currentZoom * 100)}%</span>
          </div>
          {Math.abs(currentZoom - 1) > 0.02 && (
            <button
              type="button"
              onClick={onResetZoom}
              className="px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer"
              title="Réinitialiser à 100%"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>100%</span>
            </button>
          )}
        </div>
      )}

      {/* 7. Click Ripples */}
      {clickRipples.map((ripple) => (
        <div
          key={ripple.id}
          aria-hidden="true"
          className="fixed pointer-events-none z-[9998] rounded-full border-2 border-blue-400 bg-blue-400/30 -translate-x-1/2 -translate-y-1/2 animate-ping gesture-hud-element"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 44,
            height: 44
          }}
        />
      ))}

      {/* 8. Virtual Touch Pointer (Holographic Cursor - ZERO JITTER with translate3d) */}
      {state.hasHand && (
        <div
          id="gesture-pointer-hud"
          aria-hidden="true"
          className="fixed pointer-events-none z-[9999] top-0 left-0 select-none gesture-hud-element"
          style={{
            transform: `translate3d(${state.pointerX}px, ${state.pointerY}px, 0) translate(-50%, -50%)`,
            willChange: 'transform'
          }}
        >
          {/* Dwell Progress Ring */}
          {dwellProgress > 0 && (
            <svg
              className="absolute -top-4 -left-4 w-12 h-12 -rotate-90 pointer-events-none"
              viewBox="0 0 36 36"
            >
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="rgba(59, 130, 246, 0.3)"
                strokeWidth="2.5"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeDasharray="88"
                strokeDashoffset={88 - 88 * dwellProgress}
                strokeLinecap="round"
              />
            </svg>
          )}

          {/* Holographic Cursor Core & Halo */}
          <div className="relative flex items-center justify-center">
            {/* Outer halo */}
            <div
              className={`rounded-full transition-all duration-100 ${
                state.isPinching
                  ? 'w-6 h-6 bg-rose-500/70 scale-75'
                  : isHoveringClickable
                  ? 'w-10 h-10 border-2 border-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/50'
                  : 'w-7 h-7 border border-blue-400/80 bg-blue-500/10 shadow-md shadow-blue-500/25'
              }`}
            />

            {/* Inner laser dot */}
            <div
              className={`absolute rounded-full transition-all duration-100 ${
                state.isPinching
                  ? 'w-3 h-3 bg-rose-400 shadow-md shadow-rose-400'
                  : isHoveringClickable
                  ? 'w-3.5 h-3.5 bg-white border border-blue-600 shadow-sm'
                  : 'w-2 h-2 bg-blue-500'
              }`}
            />

            {/* Micro badge when hovering over an interactive button/link */}
            {isHoveringClickable && (
              <div className="absolute left-6 top-0 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-extrabold whitespace-nowrap shadow-lg backdrop-blur-md flex items-center space-x-1 animate-fadeIn">
                <MousePointer2 className="w-2.5 h-2.5" />
                <span>{hoveredElementText ? `Clic: ${hoveredElementText}` : 'Cliquer (Pincer)'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. Floating Touchless Control Dock */}
      <div className="fixed bottom-3 right-3 lg:bottom-4 lg:right-4 z-40 select-none gesture-hud-element">
        {isDockMinimized ? (
          /* Minimized pill */
          <button
            type="button"
            onClick={onToggleDockMinimized}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900/90 dark:bg-black/90 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md hover:bg-slate-800 transition cursor-pointer text-xs font-bold"
            title="Agrandir le dock de contrôle gestuel"
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                state.hasHand ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'
              }`}
            />
            <span className="text-[11px]">IA Vision</span>
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          </button>
        ) : (
          /* Expanded sleek HUD dock */
          <div className="w-64 sm:w-72 bg-slate-900/92 dark:bg-[#070d1e]/95 text-white rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-xl p-3 space-y-2.5 animate-fadeIn">
            {/* Dock Header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold block leading-none">
                    Contrôle Gestuel IA
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isModelReady
                      ? state.hasHand
                        ? 'Main active (Stable)'
                        : 'En attente de main...'
                      : 'Chargement IA...'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Paramètres & Guide"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onToggleDockMinimized}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Réduire"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Gesture Activity Status */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-slate-400 text-[11px]">Action :</span>
              <span className="font-extrabold text-blue-400 flex items-center space-x-1">
                {state.activeGestureName || 'Pointeur'}
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={onTriggerManualCapture}
                className="px-2 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                title="Déclencher une capture d'écran"
              >
                <Camera className="w-3 h-3 text-rose-400" />
                <span>Capturer</span>
              </button>

              <button
                type="button"
                onClick={onResetZoom}
                className="px-2 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                title="Réinitialiser le zoom"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>Zoom 100%</span>
              </button>
            </div>

            {/* Optional Diagnostic Camera Preview (Hidden by default!) */}
            {showDiagnosticPreview && (
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Diagnostic Cadrage</span>
                  <span className="text-[9px] text-emerald-400">FPS: 60</span>
                </div>
                <div className="relative rounded-lg overflow-hidden border border-slate-700/80 bg-black aspect-video flex items-center justify-center">
                  <canvas
                    ref={diagnosticCanvasRef as any}
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
