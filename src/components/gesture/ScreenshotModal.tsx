import React, { useState } from 'react';
import {
  Camera,
  Download,
  Share2,
  Copy,
  Check,
  X,
  Sparkles,
  Maximize2
} from 'lucide-react';

interface ScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  onShareToFeed?: (imageDataUrl: string) => void;
}

export const ScreenshotModal: React.FC<ScreenshotModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onShareToFeed
}) => {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `MK_Capture_Opposition_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = async () => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  const handleShare = () => {
    if (onShareToFeed) {
      onShareToFeed(imageUrl);
      setShared(true);
      setTimeout(() => {
        setShared(false);
        onClose();
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0c1328] rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-[#0a0f20]/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Capture d'écran par Opposition
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                  Geste IA Réussi
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instantané capturé à distance sans aucun contact physique
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

        {/* Image Preview Container */}
        <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-auto bg-slate-100/70 dark:bg-[#050814] flex items-center justify-center">
          <div className="relative rounded-xl overflow-hidden shadow-lg border border-slate-200/80 dark:border-slate-800 max-h-full">
            <img
              src={imageUrl}
              alt="Capture d'écran MK"
              className="max-h-[55vh] w-auto object-contain rounded-xl"
            />
            <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-mono flex items-center space-x-1.5">
              <Maximize2 className="w-3 h-3 text-blue-400" />
              <span>Plein écran</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1328] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Format PNG Haute Définition</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger</span>
            </button>

            {onShareToFeed && (
              <button
                type="button"
                onClick={handleShare}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                {shared ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Préparé pour publication !</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Publier sur MK</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
