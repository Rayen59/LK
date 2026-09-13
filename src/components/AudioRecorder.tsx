import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Play, Pause, Volume2, AlertCircle, Upload, CheckCircle2 } from 'lucide-react';
import { Attachment } from '../types';
import { fileToDataUrl } from '../lib/api';

interface AudioRecorderProps {
  onAudioReady: (attachment: Attachment) => void;
  onCancel: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioReady, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const shouldDiscardRef = useRef<boolean>(false);

  // Determine best supported audio MIME type across all platforms (Safari/iOS/Chrome/Firefox)
  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const startRecording = async () => {
    setMicError(null);
    shouldDiscardRef.current = false;
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("L'enregistrement vocal via microphone n'est pas supporté par ce navigateur. Vous pouvez importer un fichier audio.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0 && !shouldDiscardRef.current) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Stop all audio tracks immediately
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // If the user cancelled or clicked delete on the recording, discard completely!
        if (shouldDiscardRef.current) {
          audioChunksRef.current = [];
          setIsProcessing(false);
          return;
        }

        setIsProcessing(true);
        const actualMime = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
        
        const extension = actualMime.includes('mp4') || actualMime.includes('aac') 
          ? 'm4a' 
          : actualMime.includes('ogg') 
            ? 'ogg' 
            : 'webm';

        const reader = new FileReader();
        reader.onloadend = () => {
          if (shouldDiscardRef.current) {
            setIsProcessing(false);
            return;
          }

          const base64Data = reader.result as string;
          setIsProcessing(false);

          // AUTO-ATTACH IMMEDIATELY so the user NEVER loses their vocal!
          const nowStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '-');
          onAudioReady({
            id: 'aud_' + Date.now(),
            name: `Note_Vocale_FMS_${nowStr}.${extension}`,
            type: 'audio',
            url: base64Data,
            duration: recordingSeconds || 3,
            size: audioBlob.size,
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start(200); // chunk every 200ms
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setMicError(
        err.message || 
        "Impossible d'accéder au microphone. Veuillez autoriser le micro dans votre navigateur ou importer directement un fichier audio ci-dessous."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      clearInterval(timerIntervalRef.current);
      setIsRecording(false);
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('Error stopping recorder:', err);
      }
    }
  };

  const discardRecording = () => {
    shouldDiscardRef.current = true;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
    setIsProcessing(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('Error stopping recorder on discard:', err);
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    audioChunksRef.current = [];
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onCancel();
  };

  // Handle direct audio file upload from disk or phone
  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setMicError("Le fichier audio ne doit pas dépasser 25 Mo.");
      return;
    }

    try {
      setIsProcessing(true);
      const dataUrl = await fileToDataUrl(file);
      setIsProcessing(false);

      onAudioReady({
        id: 'aud_' + Date.now(),
        name: file.name,
        type: 'audio',
        url: dataUrl,
        size: file.size,
      });
      e.target.value = '';
    } catch {
      setIsProcessing(false);
      setMicError("Échec de la lecture du fichier audio.");
    }
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <div className="p-4 bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 rounded-2xl space-y-3 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center space-x-1.5">
          <Volume2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>Partage Vocal Médical FMS</span>
        </span>
        <button
          type="button"
          onClick={discardRecording}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-medium transition cursor-pointer"
          title="Fermer sans enregistrer"
        >
          Annuler
        </button>
      </div>

      {micError && (
        <div className="flex items-start space-x-2 text-xs text-rose-700 dark:text-rose-300 bg-rose-100/90 dark:bg-rose-950/60 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{micError}</p>
            <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
              💡 Vous pouvez utiliser le bouton « Importer un vocal » ci-dessous pour joindre un enregistrement sans micro.
            </p>
          </div>
        </div>
      )}

      {/* Recording in progress */}
      {isRecording && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-teal-300 dark:border-teal-700 shadow-sm">
          <div className="flex items-center space-x-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600"></span>
            </span>
            <span className="text-sm font-mono font-black text-slate-900 dark:text-white">
              {formatTime(recordingSeconds)}
            </span>
            <div className="flex items-center space-x-1">
              <span className="inline-block w-1 h-3 bg-teal-500 rounded-full animate-bounce" />
              <span className="inline-block w-1 h-4 bg-teal-600 rounded-full animate-bounce [animation-delay:0.1s]" />
              <span className="inline-block w-1 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium hidden sm:inline">
              Enregistrement en cours...
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={discardRecording}
              className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[40px]"
              title="Supprimer et abandonner cet enregistrement vocal"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer le vocal</span>
            </button>

            <button
              type="button"
              onClick={stopRecording}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer min-h-[40px]"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Terminer & Joindre</span>
            </button>
          </div>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="flex items-center justify-center space-x-2 py-3 bg-white dark:bg-slate-900 rounded-xl border border-teal-200 dark:border-teal-800 text-xs text-teal-700 dark:text-teal-300 font-semibold">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-teal-600 border-t-transparent" />
          <span>Finalisation et encodage du vocal...</span>
        </div>
      )}

      {/* Idle state - Choose microphone or import audio */}
      {!isRecording && !isProcessing && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-dashed border-teal-300 dark:border-teal-800 text-center space-y-3">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Enregistrez votre voix en direct ou importez une note vocale depuis votre téléphone ou ordinateur :
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
            {/* Direct Microphone Button */}
            <button
              type="button"
              onClick={startRecording}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Démarrer l'enregistrement micro</span>
            </button>

            {/* Direct Audio File Import Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-300 dark:border-slate-700"
            >
              <Upload className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Importer un fichier vocal (.mp3, .m4a, .wav)</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.webm"
              onChange={handleAudioFileUpload}
              className="hidden"
            />
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Dès que vous cliquez sur « Terminer », le vocal est directement attaché à votre publication.
          </p>
        </div>
      )}
    </div>
  );
};
