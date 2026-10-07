import React, { useEffect, useRef, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import {
  GestureDetectionState,
  analyzeSingleHand,
  checkTwoHandsOpposition,
  mapCameraToScreen,
  computeAdaptiveAlpha,
  distance2D,
  Point3D
} from '../../lib/gestureEngine';
import { playGestureSound } from '../../lib/gestureAudio';
import { GestureHUD } from './GestureHUD';
import { ScreenshotModal } from './ScreenshotModal';
import { GestureSettingsModal } from './GestureSettingsModal';

interface TouchlessControllerProps {
  onShareScreenshotToFeed?: (dataUrl: string) => void;
  onZoomChange?: (zoom: number) => void;
  externalTriggerModal?: boolean;
  onCloseExternalModal?: () => void;
}

export const TouchlessController: React.FC<TouchlessControllerProps> = ({
  onShareScreenshotToFeed,
  onZoomChange,
  externalTriggerModal = false,
  onCloseExternalModal
}) => {
  // Global settings state
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mk_gesture_enabled');
      return saved !== 'false'; // default enabled
    }
    return true;
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mk_gesture_sound');
      return saved !== 'false';
    }
    return true;
  });

  const [dwellClickEnabled, setDwellClickEnabled] = useState<boolean>(false);
  const [smoothingLevel, setSmoothingLevel] = useState<number>(0.45); // Snappy default
  const [showDiagnosticPreview, setShowDiagnosticPreview] = useState<boolean>(false);
  const [isDockMinimized, setIsDockMinimized] = useState<boolean>(false);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [isCameraFlash, setIsCameraFlash] = useState(false);

  // Vision model and stream state
  const [isModelReady, setIsModelReady] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Real-time HUD State
  const [gestureState, setGestureState] = useState<GestureDetectionState>({
    hasHand: false,
    handCount: 0,
    pointerX: -100,
    pointerY: -100,
    rawPointerX: -100,
    rawPointerY: -100,
    velocity: 0,
    isPinching: false,
    pinchStrength: 0,
    isClickTriggered: false,
    isScrollingUp: false,
    isScrollingDown: false,
    scrollSpeed: 0,
    verticalSwipeDelta: 0,
    zoomAction: null,
    zoomFactorDelta: 0,
    isOppositionGesture: false,
    oppositionProgress: 0,
    isCaptureTriggered: false,
    oppositionType: 'none',
    activeGestureName: 'Initialisation...',
    handState: 'none'
  });

  const [isHoveringClickable, setIsHoveringClickable] = useState(false);
  const [hoveredElementText, setHoveredElementText] = useState<string>('');
  const [dwellProgress, setDwellProgress] = useState(0);
  const [clickRipples, setClickRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [currentZoom, setCurrentZoom] = useState(1);

  // Internal Refs for fast 60fps loop
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const diagnosticCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fast coordinate smoothing & velocity state
  const smoothPosRef = useRef<{ x: number; y: number }>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400
  });
  const prevTargetPosRef = useRef<{ x: number; y: number; time: number }>({
    x: 0,
    y: 0,
    time: performance.now()
  });

  // Action debounces & cooldowns
  const lastClickTimeRef = useRef<number>(0);
  const dwellStartRef = useRef<{ time: number; x: number; y: number; element: Element | null } | null>(null);
  const oppositionHoldStartRef = useRef<number | null>(null);
  const lastCaptureTimeRef = useRef<number>(0);
  const twoHandsLastDistRef = useRef<number | null>(null);
  const lastZoomGestureTimeRef = useRef<number>(0);

  // Synchronize external modal trigger if opened from Header
  useEffect(() => {
    if (externalTriggerModal) {
      setIsSettingsOpen(true);
      if (onCloseExternalModal) onCloseExternalModal();
    }
  }, [externalTriggerModal, onCloseExternalModal]);

  // Persist preference changes
  const toggleEnabled = () => {
    setIsEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('mk_gesture_enabled', String(next));
      return next;
    });
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('mk_gesture_sound', String(next));
      return next;
    });
  };

  // Safe sound trigger
  const triggerSound = useCallback(
    (type: 'click' | 'zoom' | 'scroll' | 'shutter' | 'hover' | 'ready') => {
      if (soundEnabled) {
        playGestureSound(type);
      }
    },
    [soundEnabled]
  );

  // Initialize MediaPipe Vision Task with robust multi-tiered fallback
  useEffect(() => {
    let isCancelled = false;

    async function initVisionTask() {
      setInitError(null);
      try {
        // Tier 1: Try local server wasm files first (fastest, zero network latency)
        let wasmResolver: any = null;
        try {
          wasmResolver = await FilesetResolver.forVisionTasks('/wasm');
        } catch {
          // Tier 2: Exact matching CDN version for 1.1.0
          wasmResolver = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm'
          );
        }

        if (isCancelled) return;

        // Load HandLandmarker model (local or CDN fallback)
        let landmarker: HandLandmarker;
        try {
          landmarker = await HandLandmarker.createFromOptions(wasmResolver, {
            baseOptions: {
              modelAssetPath: '/models/hand_landmarker.task',
              delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.35,
            minHandPresenceConfidence: 0.35,
            minTrackingConfidence: 0.35
          });
        } catch {
          landmarker = await HandLandmarker.createFromOptions(wasmResolver, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.35,
            minHandPresenceConfidence: 0.35,
            minTrackingConfidence: 0.35
          });
        }

        if (isCancelled) return;

        landmarkerRef.current = landmarker;
        setIsModelReady(true);
        triggerSound('ready');
      } catch (err: any) {
        console.error('Vision initialization error:', err);
        setInitError(err?.message || 'Erreur chargement IA vision');
      }
    }

    initVisionTask();

    return () => {
      isCancelled = true;
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch {}
        landmarkerRef.current = null;
      }
    };
  }, [triggerSound]);

  // Start/Stop Background Webcam Stream
  useEffect(() => {
    if (!isEnabled || !isModelReady) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsCameraActive(false);
      return;
    }

    let activeStream: MediaStream | null = null;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
          },
          audio: false
        });

        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
            setIsCameraActive(true);
          };
        }
      } catch (err: any) {
        console.warn('Webcam stream unavailable:', err);
        setIsCameraActive(false);
        setInitError('Accès caméra requis pour le contrôle gestuel');
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      setIsCameraActive(false);
    };
  }, [isEnabled, isModelReady]);

  // Trigger Screenshot Capture (via Opposition gesture or manual button)
  const captureScreenshot = useCallback(async () => {
    const now = Date.now();
    // 2.5 seconds cooldown between automatic captures
    if (now - lastCaptureTimeRef.current < 2500) return;
    lastCaptureTimeRef.current = now;

    // 1. Shutter sound and flash
    triggerSound('shutter');
    setIsCameraFlash(true);
    setTimeout(() => setIsCameraFlash(false), 260);

    // 2. Hide pointer and overlays momentarily
    await new Promise((r) => setTimeout(r, 60));

    try {
      const rootElement = document.getElementById('root') || document.body;
      const canvas = await html2canvas(rootElement, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: null
      });

      const dataUrl = canvas.toDataURL('image/png');
      setCapturedImageUrl(dataUrl);
      setIsScreenshotModalOpen(true);
    } catch (err) {
      console.error('Screenshot capture error:', err);
    }
  }, [triggerSound]);

  // Reset Zoom function
  const handleResetZoom = useCallback(() => {
    setCurrentZoom(1);
    if (onZoomChange) onZoomChange(1);
    triggerSound('zoom');
  }, [onZoomChange, triggerSound]);

  // Apply zoom changes safely
  const adjustZoom = useCallback(
    (delta: number) => {
      const now = Date.now();
      if (now - lastZoomGestureTimeRef.current < 160) return;
      lastZoomGestureTimeRef.current = now;

      setCurrentZoom((prev) => {
        const next = Math.min(1.6, Math.max(0.75, Math.round((prev + delta) * 100) / 100));
        if (onZoomChange) onZoomChange(next);
        triggerSound('zoom');
        return next;
      });
    },
    [onZoomChange, triggerSound]
  );

  // Perform synthetic click on underlying DOM element
  const performVirtualClick = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      if (now - lastClickTimeRef.current < 350) return; // Debounce rapid clicks
      lastClickTimeRef.current = now;

      // Spawn visual ripple
      const rippleId = now;
      setClickRipples((prev) => [...prev, { id: rippleId, x, y }]);
      setTimeout(() => {
        setClickRipples((prev) => prev.filter((r) => r.id !== rippleId));
      }, 600);

      triggerSound('click');

      // Find element at coordinates
      const target = document.elementFromPoint(x, y);
      if (!target) return;

      const clickable =
        target.closest('button, a, input, textarea, select, [role="button"], [tabindex]') || target;

      // Dispatch mouse events
      const mouseEvents = ['mousedown', 'mouseup', 'click'];
      for (const evtName of mouseEvents) {
        const evt = new MouseEvent(evtName, {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y
        });
        clickable.dispatchEvent(evt);
      }

      if (clickable instanceof HTMLElement) {
        clickable.click();
        clickable.focus();
      }
    },
    [triggerSound]
  );

  // Main 60fps Detection and Interaction Loop
  useEffect(() => {
    if (!isEnabled || !isCameraActive || !landmarkerRef.current || !videoRef.current) {
      return;
    }

    let isRunning = true;
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    const processFrame = () => {
      if (!isRunning) return;

      if (video.readyState >= 2 && !video.paused) {
        try {
          const nowPerf = performance.now();
          const results = landmarker.detectForVideo(video, nowPerf);

          if (results.landmarks && results.landmarks.length > 0) {
            const hand1 = results.landmarks[0] as Point3D[];
            const hand2 = results.landmarks.length > 1 ? (results.landmarks[1] as Point3D[]) : null;

            const h1Info = analyzeSingleHand(hand1);

            if (h1Info) {
              const screenW = window.innerWidth;
              const screenH = window.innerHeight;

              // 1. INTELLIGENT RAPID POINTER POSITION
              // Uses mapCameraToScreen to comfortably cover 100% of the screen
              // regardless of whether user is near, far, or slightly off-center
              const targetCoords = mapCameraToScreen(
                h1Info.indexTip.x,
                h1Info.indexTip.y,
                screenW,
                screenH
              );

              // 2. VELOCITY-ADAPTIVE SMOOTHING (1-Euro style filter)
              // Instantaneous response when moving briskly, stabilized when still
              const dtSec = Math.max(0.005, (nowPerf - prevTargetPosRef.current.time) / 1000);
              const { alpha, velocity } = computeAdaptiveAlpha(
                targetCoords.x,
                targetCoords.y,
                prevTargetPosRef.current.x,
                prevTargetPosRef.current.y,
                dtSec,
                smoothingLevel
              );

              prevTargetPosRef.current = {
                x: targetCoords.x,
                y: targetCoords.y,
                time: nowPerf
              };

              smoothPosRef.current.x += (targetCoords.x - smoothPosRef.current.x) * alpha;
              smoothPosRef.current.y += (targetCoords.y - smoothPosRef.current.y) * alpha;

              let posX = Math.round(smoothPosRef.current.x);
              let posY = Math.round(smoothPosRef.current.y);

              // 3. INTELLIGENT MAGNETIC SNAP TO BUTTONS
              // Subtle magnetic pull towards centers of clickable controls
              const rawElementUnder = document.elementFromPoint(posX, posY);
              const clickableEl = rawElementUnder?.closest(
                'button, a, input, textarea, select, [role="button"], [tabindex]'
              );
              const isClickable = Boolean(clickableEl);
              setIsHoveringClickable(isClickable);

              if (isClickable && clickableEl) {
                const rect = clickableEl.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const distToCenter = Math.hypot(posX - centerX, posY - centerY);

                // Subtle magnetic pull if within 30px
                if (distToCenter < 30) {
                  posX += Math.round((centerX - posX) * 0.35);
                  posY += Math.round((centerY - posY) * 0.35);
                }

                const label =
                  clickableEl.getAttribute('aria-label') ||
                  clickableEl.getAttribute('title') ||
                  clickableEl.textContent?.trim().slice(0, 18) ||
                  '';
                setHoveredElementText(label);
              } else {
                setHoveredElementText('');
              }

              // 4. PINCH CLICK GESTURE
              let isClickTriggered = false;
              if (h1Info.isPinch) {
                performVirtualClick(posX, posY);
                isClickTriggered = true;
              }

              // 5. DWELL CLICK PROGRESS
              let currentDwellRatio = 0;
              if (dwellClickEnabled && isClickable) {
                const now = Date.now();
                if (
                  dwellStartRef.current &&
                  dwellStartRef.current.element === clickableEl &&
                  Math.hypot(posX - dwellStartRef.current.x, posY - dwellStartRef.current.y) < 28
                ) {
                  const elapsed = now - dwellStartRef.current.time;
                  currentDwellRatio = Math.min(1, elapsed / 1000);
                  if (currentDwellRatio >= 1) {
                    performVirtualClick(posX, posY);
                    dwellStartRef.current = null;
                    currentDwellRatio = 0;
                  }
                } else {
                  dwellStartRef.current = { time: now, x: posX, y: posY, element: clickableEl };
                }
              } else {
                dwellStartRef.current = null;
              }
              setDwellProgress(currentDwellRatio);

              // 6. FAST REMOTE SCROLLING
              let isScrollUp = false;
              let isScrollDown = false;

              // Top & bottom edge scrolling zones (adaptive speed)
              if (posY < screenH * 0.16) {
                isScrollUp = true;
                const speed = Math.min(26, Math.max(5, Math.round(((screenH * 0.16 - posY) / (screenH * 0.16)) * 24)));
                const scrollTarget = document.querySelector('main') || window;
                scrollTarget.scrollBy({ top: -speed, behavior: 'auto' });
              } else if (posY > screenH * 0.84) {
                isScrollDown = true;
                const speed = Math.min(26, Math.max(5, Math.round(((posY - screenH * 0.84) / (screenH * 0.16)) * 24)));
                const scrollTarget = document.querySelector('main') || window;
                scrollTarget.scrollBy({ top: speed, behavior: 'auto' });
              }

              // 7. REMOTE ZOOMING (Two Hands OR Single Hand)
              let zoomAction: 'in' | 'out' | null = null;
              if (hand2) {
                // Two hands distance mode
                const distTwoHands = distance2D(hand1[0], hand2[0]);
                if (twoHandsLastDistRef.current !== null) {
                  const deltaDist = distTwoHands - twoHandsLastDistRef.current;
                  if (deltaDist > 0.035) {
                    adjustZoom(0.05);
                    zoomAction = 'in';
                  } else if (deltaDist < -0.035) {
                    adjustZoom(-0.05);
                    zoomAction = 'out';
                  }
                }
                twoHandsLastDistRef.current = distTwoHands;
              } else {
                twoHandsLastDistRef.current = null;
                // Single hand mode: Fist = zoom out, Full open palm = zoom in
                if (h1Info.isFist) {
                  adjustZoom(-0.03);
                  zoomAction = 'out';
                } else if (h1Info.isOpenPalm && !isScrollUp && !isScrollDown) {
                  adjustZoom(0.03);
                  zoomAction = 'in';
                }
              }

              // 8. 📸 INSTANT OPPOSITION GESTURE SCREENSHOT
              // Triggered when user performs an opposition gesture with hand(s):
              // - Single hand: Thumb in opposition to pinky, ring, middle, or thumb-index circle
              // - Two hands: Opposing photographer framing or palms facing
              let isOpposition = false;
              if (hand2) {
                isOpposition = checkTwoHandsOpposition(hand1, hand2) || h1Info.isOpposition;
              } else {
                isOpposition = h1Info.isOpposition;
              }

              const nowTime = Date.now();
              let oppProgress = 0;

              // Fast snappy opposition detection (160ms stability threshold)
              if (isOpposition) {
                if (oppositionHoldStartRef.current === null) {
                  oppositionHoldStartRef.current = nowTime;
                }
                const holdDuration = nowTime - oppositionHoldStartRef.current;
                oppProgress = Math.min(1, holdDuration / 160);

                if (oppProgress >= 1) {
                  oppositionHoldStartRef.current = null;
                  captureScreenshot();
                }
              } else {
                oppositionHoldStartRef.current = null;
              }

              // Compute gesture display label
              let activeGesture = 'Pointeur Véloce';
              if (isOpposition) activeGesture = '📸 Opposition Capture !';
              else if (h1Info.isPinch) activeGesture = '🤏 Clic Pincement';
              else if (zoomAction) activeGesture = zoomAction === 'in' ? '🔍 Zoom +' : '🔍 Dézoom -';
              else if (isScrollUp) activeGesture = '📜 Défilement Haut';
              else if (isScrollDown) activeGesture = '📜 Défilement Bas';
              else if (isClickable) activeGesture = '👆 Survol Cliquable';

              setGestureState({
                hasHand: true,
                handCount: results.landmarks.length,
                pointerX: posX,
                pointerY: posY,
                rawPointerX: targetCoords.x,
                rawPointerY: targetCoords.y,
                velocity,
                isPinching: h1Info.isPinch,
                pinchStrength: Math.max(0, 1 - h1Info.thumbIndexDist),
                isClickTriggered,
                isScrollingUp: isScrollUp,
                isScrollingDown: isScrollDown,
                scrollSpeed: isScrollUp || isScrollDown ? 16 : 0,
                verticalSwipeDelta: 0,
                zoomAction,
                zoomFactorDelta: 0,
                isOppositionGesture: isOpposition,
                oppositionProgress: oppProgress,
                isCaptureTriggered: false,
                oppositionType: h1Info.oppositionType,
                activeGestureName: activeGesture,
                handState: isOpposition
                  ? 'opposition'
                  : h1Info.isPinch
                  ? 'pinch'
                  : h1Info.isFist
                  ? 'fist'
                  : h1Info.isOpenPalm
                  ? 'open_palm'
                  : 'pointing'
              });

              // Optional diagnostic rendering on canvas if user toggled it in settings
              if (showDiagnosticPreview && diagnosticCanvasRef.current) {
                const cvs = diagnosticCanvasRef.current;
                const ctx = cvs.getContext('2d');
                if (ctx) {
                  cvs.width = video.videoWidth || 320;
                  cvs.height = video.videoHeight || 240;
                  ctx.drawImage(video, 0, 0, cvs.width, cvs.height);

                  // Draw landmarks
                  for (const pt of hand1) {
                    ctx.beginPath();
                    ctx.arc(pt.x * cvs.width, pt.y * cvs.height, 3, 0, 2 * Math.PI);
                    ctx.fillStyle = '#3b82f6';
                    ctx.fill();
                  }
                  if (hand2) {
                    for (const pt of hand2) {
                      ctx.beginPath();
                      ctx.arc(pt.x * cvs.width, pt.y * cvs.height, 3, 0, 2 * Math.PI);
                      ctx.fillStyle = '#ef4444';
                      ctx.fill();
                    }
                  }
                }
              }
            }
          } else {
            // No hands visible
            setGestureState((prev) => ({
              ...prev,
              hasHand: false,
              handCount: 0,
              activeGestureName: 'Recherche de main...',
              isScrollingUp: false,
              isScrollingDown: false,
              isOppositionGesture: false,
              oppositionProgress: 0
            }));
            oppositionHoldStartRef.current = null;
            twoHandsLastDistRef.current = null;
            dwellStartRef.current = null;
            setDwellProgress(0);
          }
        } catch {
          // Catch and continue next frame
        }
      }

      animFrameIdRef.current = requestAnimationFrame(processFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(processFrame);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [
    isEnabled,
    isCameraActive,
    smoothingLevel,
    dwellClickEnabled,
    performVirtualClick,
    adjustZoom,
    captureScreenshot,
    showDiagnosticPreview
  ]);

  return (
    <>
      {/* 
        HIDDEN BACKGROUND VIDEO ELEMENT:
        Per requirement: "naffiche pas de camera au mileu de site ou dans le site car c est ennuyeux".
        Zero video element displayed on page; processed silently in background.
      */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        aria-hidden="true"
        className="hidden"
        style={{ display: 'none' }}
      />

      {/* Touchless HUD Overlays & Dock */}
      {isEnabled && (
        <GestureHUD
          state={gestureState}
          isHoveringClickable={isHoveringClickable}
          hoveredElementText={hoveredElementText}
          dwellProgress={dwellProgress}
          clickRipples={clickRipples}
          currentZoom={currentZoom}
          onResetZoom={handleResetZoom}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isCameraFlash={isCameraFlash}
          isModelReady={isModelReady}
          isCameraActive={isCameraActive}
          isDockMinimized={isDockMinimized}
          onToggleDockMinimized={() => setIsDockMinimized((p) => !p)}
          onTriggerManualCapture={captureScreenshot}
          diagnosticCanvasRef={diagnosticCanvasRef}
          showDiagnosticPreview={showDiagnosticPreview}
        />
      )}

      {/* Settings & Guide Modal */}
      <GestureSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isEnabled={isEnabled}
        onToggleEnabled={toggleEnabled}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        showDiagnosticPreview={showDiagnosticPreview}
        onToggleDiagnosticPreview={() => setShowDiagnosticPreview((p) => !p)}
        dwellClickEnabled={dwellClickEnabled}
        onToggleDwellClick={() => setDwellClickEnabled((p) => !p)}
        smoothingLevel={smoothingLevel}
        onChangeSmoothingLevel={setSmoothingLevel}
        onTriggerManualCapture={() => {
          setIsSettingsOpen(false);
          setTimeout(captureScreenshot, 200);
        }}
      />

      {/* Screenshot Capture Modal */}
      <ScreenshotModal
        isOpen={isScreenshotModalOpen}
        onClose={() => setIsScreenshotModalOpen(false)}
        imageUrl={capturedImageUrl}
        onShareToFeed={onShareScreenshotToFeed}
      />
    </>
  );
};
