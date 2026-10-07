// High-performance intelligent gesture detection and vision algorithms
export interface Point3D {
  x: number;
  y: number;
  z?: number;
}

export interface HandLandmarks {
  landmarks: Point3D[];
  handedness?: string;
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

  // Scrolling
  isScrollingUp: boolean;
  isScrollingDown: boolean;
  scrollSpeed: number; // px per frame
  verticalSwipeDelta: number;

  // Zooming
  zoomAction: 'in' | 'out' | null;
  zoomFactorDelta: number;

  // Opposition Gesture (Screen Capture)
  isOppositionGesture: boolean;
  oppositionProgress: number; // 0 to 1 hold progress
  isCaptureTriggered: boolean;
  oppositionType: 'thumb_pinky' | 'thumb_ring' | 'thumb_middle' | 'two_hands' | 'none';

  // Diagnostics
  activeGestureName: string;
  handState: 'pointing' | 'pinch' | 'open_palm' | 'fist' | 'opposition' | 'none';
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
  return distance2D(tip, wrist) > distance2D(pip, wrist) * 1.1;
}

// Intelligent coordinate mapping: maps user camera workspace comfortably to full screen
// Avoids stretching the user's arm to reach screen edges regardless of user position
export function mapCameraToScreen(
  cameraX: number,
  cameraY: number,
  screenWidth: number,
  screenHeight: number
): { x: number; y: number } {
  // Mirrored X for natural selfie tracking
  const mirroredX = 1 - cameraX;

  // Active interaction zone: 12% margin around webcam view expands to 100% of screen
  const minX = 0.12;
  const maxX = 0.88;
  const minY = 0.12;
  const maxY = 0.88;

  const normX = Math.min(1, Math.max(0, (mirroredX - minX) / (maxX - minX)));
  const normY = Math.min(1, Math.max(0, (cameraY - minY) / (maxY - minY)));

  return {
    x: normX * screenWidth,
    y: normY * screenHeight
  };
}

// Adaptive 1-Euro style velocity smoothing filter
// When moving fast: alpha increases -> instant 1:1 responsive tracking
// When moving slow/stopped: alpha decreases -> rock solid, zero hand jitter
export function computeAdaptiveAlpha(
  currentX: number,
  currentY: number,
  prevX: number,
  prevY: number,
  dtSeconds: number,
  baseSmoothing: number
): { alpha: number; velocity: number } {
  const dx = currentX - prevX;
  const dy = currentY - prevY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const velocity = dtSeconds > 0 ? dist / dtSeconds : 0;

  // Velocity threshold in px/sec
  if (velocity > 600) {
    // Ultra-fast flick / movement: virtually instantaneous
    return { alpha: Math.min(0.92, baseSmoothing + 0.55), velocity };
  } else if (velocity > 250) {
    // Brisk navigation
    return { alpha: Math.min(0.85, baseSmoothing + 0.4), velocity };
  } else if (velocity > 80) {
    // Moderate motion
    return { alpha: Math.min(0.7, baseSmoothing + 0.25), velocity };
  } else {
    // Slow precision pointing / hovering
    return { alpha: Math.max(0.28, baseSmoothing * 0.9), velocity };
  }
}

// Analyze a single hand and extract gesture primitives
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

  // Pinch check: thumb and index tips are in direct contact
  const isPinch = thumbIndexDist < 0.32;

  // 📸 Opposition gesture of the hand:
  // Anatomical opposition: thumb opposing pinky, ring, or middle finger
  // Or thumb-index opposition circle while other fingers are open
  const isThumbPinkyOpposition = thumbPinkyDist < 0.38;
  const isThumbRingOpposition = thumbRingDist < 0.38;
  const isThumbMiddleOpposition = thumbMiddleDist < 0.32;
  const isThumbIndexOpposition = thumbIndexDist < 0.28 && (middleExt || ringExt || pinkyExt);

  const isOpposition =
    isThumbPinkyOpposition ||
    isThumbRingOpposition ||
    isThumbMiddleOpposition ||
    isThumbIndexOpposition;

  let oppositionType: 'thumb_pinky' | 'thumb_ring' | 'thumb_middle' | 'two_hands' | 'none' = 'none';
  if (isThumbPinkyOpposition) oppositionType = 'thumb_pinky';
  else if (isThumbRingOpposition) oppositionType = 'thumb_ring';
  else if (isThumbMiddleOpposition) oppositionType = 'thumb_middle';

  // Fist check: all 4 main fingers curled
  const isFist = !indexExt && !middleExt && !ringExt && !pinkyExt;

  // Open palm: all extended and spread out
  const isOpenPalm = indexExt && middleExt && ringExt && pinkyExt && handSpread > 1.35;

  // Pointing: index extended, ring and pinky curled
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

  // Both index fingers and thumbs extended forming L-shapes
  const h1L = h1Analysis.indexExt;
  const h2L = h2Analysis.indexExt;

  // Distance between hands: in proximity (facing each other in opposition)
  const h1Index = hand1[8];
  const h2Index = hand2[8];
  const h1Thumb = hand1[4];
  const h2Thumb = hand2[4];

  const indexDistance = distance2D(h1Index, h2Index);
  const thumbDistance = distance2D(h1Thumb, h2Thumb);

  // Framing gesture: hands are spaced between 0.10 and 0.55 apart, forming an opposing rectangular frame
  const isFraming =
    h1L &&
    h2L &&
    indexDistance > 0.10 &&
    indexDistance < 0.55 &&
    thumbDistance > 0.10 &&
    thumbDistance < 0.55;

  // Hands facing palm-to-palm in direct opposition
  const palmDistance = distance2D(hand1[0], hand2[0]);
  const isPalmsFacingOpposed = palmDistance < 0.22;

  return isFraming || isPalmsFacingOpposed;
}
