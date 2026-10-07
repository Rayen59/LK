// High-performance intelligent gesture detection and vision algorithms
export interface Point3D {
  x: number;
  y: number;
  z?: number;
}

export interface GestureDetectionState {
  // Virtual Pointer
  hasHand: boolean;
  handCount: number;
  pointerX: number; // in pixels (screen space)
  pointerY: number; // in pixels (screen space)
  rawPointerX: number;
  rawPointerY: number;
  velocity: number; // current speed in px/s

  // Actions
  isPinching: boolean;
  pinchStrength: number; // 0 to 1
  isClickTriggered: boolean;

  // Air Slide / Air Scroll
  isAirSlideActive: boolean;
  airSlideDirection: 'up' | 'down' | 'left' | 'right' | null;
  airScrollDeltaY: number;
  airScrollDeltaX: number;

  // Edge Scrolling
  isScrollingUp: boolean;
  isScrollingDown: boolean;
  scrollSpeed: number;

  // Zooming
  zoomAction: 'in' | 'out' | null;
  zoomFactorDelta: number;

  // Opposition Gesture (Screen Capture)
  isOppositionGesture: boolean;
  oppositionProgress: number; // 0 to 1 hold progress
  isCaptureTriggered: boolean;
  oppositionType: 'thumb_pinky' | 'thumb_ring' | 'thumb_middle' | 'thumb_index_circle' | 'two_hands' | 'none';

  // Diagnostics & Status
  activeGestureName: string;
  handState: 'pointing' | 'pinch' | 'air_slide' | 'open_palm' | 'fist' | 'opposition' | 'none';
}

// Distance helper in 2D
export function distance2D(p1: Point3D, p2: Point3D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Check if a finger is extended relative to palm/wrist (landmark 0)
export function isFingerExtended(
  landmarks: Point3D[],
  tipIdx: number,
  pipIdx: number
): boolean {
  const wrist = landmarks[0];
  const tip = landmarks[tipIdx];
  const pip = landmarks[pipIdx];
  return distance2D(tip, wrist) > distance2D(pip, wrist) * 1.08;
}

// Full-range screen coordinate mapper
// Maps the user's comfortable natural hand movement range to 100% of the screen
// Ensures top, bottom, left, right, and all lateral corners are reached effortlessly
export function mapCameraToScreen(
  cameraX: number,
  cameraY: number,
  screenWidth: number,
  screenHeight: number
): { x: number; y: number } {
  // Mirrored X for natural selfie webcam mapping
  const mirroredX = 1 - cameraX;

  // Active interaction bounds with 10% outer cushion
  const minX = 0.10;
  const maxX = 0.90;
  const minY = 0.10;
  const maxY = 0.90;

  const normX = Math.min(1, Math.max(0, (mirroredX - minX) / (maxX - minX)));
  const normY = Math.min(1, Math.max(0, (cameraY - minY) / (maxY - minY)));

  return {
    x: normX * screenWidth,
    y: normY * screenHeight
  };
}

// Advanced Deadband + Velocity Adaptive Pointer Tracker
// Completely eliminates cursor jitter/trembling when stationary
// Provides instantaneous 1:1 response when moving briskly
export class StablePointerTracker {
  private smoothX: number = typeof window !== 'undefined' ? window.innerWidth / 2 : 500;
  private smoothY: number = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;
  private lastTime: number = 0;
  private velocity: number = 0;

  // Noise deadband: movements smaller than this (in pixels) are ignored to cancel camera sensor noise
  private deadband: number = 5.0;

  public update(
    targetX: number,
    targetY: number,
    now: number,
    userSmoothingLevel: number = 0.45
  ): { x: number; y: number; velocity: number } {
    const dt = Math.max(0.008, this.lastTime > 0 ? (now - this.lastTime) / 1000 : 0.016);
    this.lastTime = now;

    const dx = targetX - this.smoothX;
    const dy = targetY - this.smoothY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.velocity = dist / dt;

    // 1. Deadband threshold: if movement is micro-jitter, lock the cursor still!
    if (dist < this.deadband) {
      return {
        x: Math.round(this.smoothX),
        y: Math.round(this.smoothY),
        velocity: 0
      };
    }

    // 2. Velocity-adaptive response curve:
    // Fast movements (> 450 px/s): alpha up to 0.90 (lightning-fast, zero lag)
    // Medium movements (120-450 px/s): alpha around 0.60 (smooth navigation)
    // Slow precision pointing: alpha around 0.30 (rock solid, steady)
    let alpha = userSmoothingLevel;
    if (this.velocity > 550) {
      alpha = 0.92;
    } else if (this.velocity > 220) {
      alpha = 0.72;
    } else if (this.velocity > 80) {
      alpha = 0.48;
    } else {
      alpha = 0.28;
    }

    // Smoothly blend past the deadband
    const effectiveDist = dist - this.deadband;
    const ratio = effectiveDist / dist;
    const effectiveDx = dx * ratio;
    const effectiveDy = dy * ratio;

    this.smoothX += effectiveDx * alpha;
    this.smoothY += effectiveDy * alpha;

    return {
      x: Math.round(this.smoothX),
      y: Math.round(this.smoothY),
      velocity: this.velocity
    };
  }

  public reset(x: number, y: number) {
    this.smoothX = x;
    this.smoothY = y;
    this.lastTime = 0;
    this.velocity = 0;
  }
}

// Air Slide & Swipe Gesture Tracker
// Detects vertical and horizontal finger glides in the air to scroll the screen with fluidity
export class AirSlideTracker {
  private prevY: number | null = null;
  private prevX: number | null = null;
  private lastTime: number = 0;

  public update(
    currentX: number,
    currentY: number,
    now: number,
    isTwoFingersOrSlide: boolean
  ): {
    isActive: boolean;
    direction: 'up' | 'down' | 'left' | 'right' | null;
    deltaY: number;
    deltaX: number;
  } {
    if (this.prevY === null || this.prevX === null || now - this.lastTime > 250) {
      this.prevX = currentX;
      this.prevY = currentY;
      this.lastTime = now;
      return { isActive: false, direction: null, deltaY: 0, deltaX: 0 };
    }

    const dt = Math.max(0.008, (now - this.lastTime) / 1000);
    const dy = currentY - this.prevY;
    const dx = currentX - this.prevX;

    this.prevX = currentX;
    this.prevY = currentY;
    this.lastTime = now;

    const speedY = Math.abs(dy) / dt;
    const speedX = Math.abs(dx) / dt;

    // Air slide is active if moving with purpose vertically/horizontally
    // Or if two fingers are extended in scroll mode
    const isVerticalSlide = Math.abs(dy) > 7 && (speedY > 160 || isTwoFingersOrSlide);
    const isHorizontalSlide = Math.abs(dx) > 12 && speedX > 220;

    if (isVerticalSlide) {
      // Finger sliding downwards in screen coords -> page scrolls downwards
      // Finger sliding upwards -> page scrolls upwards ("dans le haut l'écran monte")
      const direction = dy < 0 ? 'up' : 'down';
      return {
        isActive: true,
        direction,
        deltaY: dy * 1.5,
        deltaX: 0
      };
    }

    if (isHorizontalSlide) {
      const direction = dx < 0 ? 'left' : 'right';
      return {
        isActive: true,
        direction,
        deltaY: 0,
        deltaX: dx * 1.5
      };
    }

    return { isActive: false, direction: null, deltaY: 0, deltaX: 0 };
  }

  public reset() {
    this.prevX = null;
    this.prevY = null;
    this.lastTime = 0;
  }
}

// Analyze a single hand and extract comprehensive gesture states
export function analyzeSingleHand(landmarks: Point3D[]) {
  if (!landmarks || landmarks.length < 21) {
    return null;
  }

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  const middleMcp = landmarks[9];

  // Palm reference scale (wrist to middle MCP base)
  const palmScale = Math.max(0.04, distance2D(wrist, middleMcp));

  // Finger extension statuses
  const indexExt = isFingerExtended(landmarks, 8, 6);
  const middleExt = isFingerExtended(landmarks, 12, 10);
  const ringExt = isFingerExtended(landmarks, 16, 14);
  const pinkyExt = isFingerExtended(landmarks, 20, 18);

  // Normalized distances from thumb tip to all other fingertips
  const thumbIndexDist = distance2D(thumbTip, indexTip) / palmScale;
  const thumbMiddleDist = distance2D(thumbTip, middleTip) / palmScale;
  const thumbRingDist = distance2D(thumbTip, ringTip) / palmScale;
  const thumbPinkyDist = distance2D(thumbTip, pinkyTip) / palmScale;

  // Hand span (thumb to pinky)
  const handSpread = distance2D(thumbTip, pinkyTip) / palmScale;

  // 1. PINCH CLICK: Thumb and Index tips touching while other fingers relaxed
  const isPinch = thumbIndexDist < 0.30;

  // 2. 📸 VRAIE OPPOSITION DE LA MAIN (Opposition anatomique du pouce)
  // L'opposition est le geste où le pouce touche la pulpe de l'auriculaire,
  // de l'annulaire ou du majeur, ou la boucle d'opposition pouce-index (geste OK)
  const isThumbPinkyOpposition = thumbPinkyDist < 0.36;
  const isThumbRingOpposition = thumbRingDist < 0.36;
  const isThumbMiddleOpposition = thumbMiddleDist < 0.30;
  const isThumbIndexCircleOpposition = thumbIndexDist < 0.28 && (middleExt || ringExt || pinkyExt);

  const isOpposition =
    isThumbPinkyOpposition ||
    isThumbRingOpposition ||
    isThumbMiddleOpposition ||
    isThumbIndexCircleOpposition;

  let oppositionType: 'thumb_pinky' | 'thumb_ring' | 'thumb_middle' | 'thumb_index_circle' | 'two_hands' | 'none' = 'none';
  if (isThumbPinkyOpposition) oppositionType = 'thumb_pinky';
  else if (isThumbRingOpposition) oppositionType = 'thumb_ring';
  else if (isThumbMiddleOpposition) oppositionType = 'thumb_middle';
  else if (isThumbIndexCircleOpposition) oppositionType = 'thumb_index_circle';

  // 3. SCROLL / AIR SLIDE GESTURE MODE:
  // Two fingers extended (Index + Middle extended, Ring + Pinky curled)
  const isTwoFingerScrollMode = indexExt && middleExt && !ringExt && !pinkyExt;

  // 4. FIST: All 4 fingers curled
  const isFist = !indexExt && !middleExt && !ringExt && !pinkyExt;

  // 5. OPEN PALM: All extended and spread out
  const isOpenPalm = indexExt && middleExt && ringExt && pinkyExt && handSpread > 1.35;

  // 6. CLEAR POINTING: Index extended, ring and pinky curled
  const isPointing = indexExt && !ringExt && !pinkyExt;

  return {
    palmScale,
    wrist,
    thumbTip,
    indexTip,
    middleTip,
    ringTip,
    pinkyTip,
    indexExt,
    middleExt,
    ringExt,
    pinkyExt,
    thumbIndexDist,
    thumbMiddleDist,
    thumbRingDist,
    thumbPinkyDist,
    isPinch,
    isOpposition,
    oppositionType,
    isTwoFingerScrollMode,
    isFist,
    isOpenPalm,
    isPointing,
    handSpread
  };
}

// Opposition check between two hands (Photographer frame opposition or opposing palms)
export function checkTwoHandsOpposition(
  hand1: Point3D[],
  hand2: Point3D[]
): boolean {
  if (!hand1 || !hand2 || hand1.length < 21 || hand2.length < 21) return false;

  const h1Analysis = analyzeSingleHand(hand1);
  const h2Analysis = analyzeSingleHand(hand2);

  if (!h1Analysis || !h2Analysis) return false;

  const h1Index = hand1[8];
  const h2Index = hand2[8];
  const h1Thumb = hand1[4];
  const h2Thumb = hand2[4];

  const indexDistance = distance2D(h1Index, h2Index);
  const thumbDistance = distance2D(h1Thumb, h2Thumb);

  // Framing opposition gesture: both index fingers and thumbs form a box
  const isFraming =
    h1Analysis.indexExt &&
    h2Analysis.indexExt &&
    indexDistance > 0.08 &&
    indexDistance < 0.55 &&
    thumbDistance > 0.08 &&
    thumbDistance < 0.55;

  // Hands facing palm-to-palm in direct opposition (< 0.20 distance)
  const palmDistance = distance2D(hand1[0], hand2[0]);
  const isPalmsFacingOpposed = palmDistance < 0.20;

  return isFraming || isPalmsFacingOpposed;
}
