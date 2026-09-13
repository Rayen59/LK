import { GoogleGenAI } from "@google/genai";

// Gemini AI client initialization for AI content moderation
let geminiAI: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!geminiAI && process.env.GEMINI_API_KEY) {
    geminiAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiAI;
}

// Robust fallback heuristics for immediate intolerance / hate speech suppression
const INTOLERANT_PATTERNS = [
  /\b(sale\s+(arabe|juif|noir|blanc|chinois|gitan|rom))\b/i,
  /\b(n[eèé]gre|bougnoule|youpin|feuj|bicot|chintoc|p[eé]d[eé]|tapette|gouine)\b/i,
  /\b(salope|pute|connard|fdp|b[aâ]tard|nique\s+ta\s+m[eèé]re|fils\s+de\s+pute)\b/i,
  /\b(suicide[- ]toi|va\s+crever|va\s+mourir|terroriste|sous[- ]homme)\b/i,
  /\b(exterminer|gaz[eé]r|mort\s+aux\s+(arabes|juifs|noirs|blancs|musulmans|chr[eé]tiens))\b/i
];

// Server-side AI Content Moderation: if intolerant/harmful, immediately block/reject
export async function checkContentToleranceWithAI(text: string): Promise<{ isTolerant: boolean; reason?: string }> {
  if (!text || text.trim().length === 0) {
    return { isTolerant: true };
  }

  // 1. Fast heuristic safeguard
  for (const pattern of INTOLERANT_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isTolerant: false,
        reason: "Propos intolérants, haineux ou injurieux détectés par le système de sécurité."
      };
    }
  }

  // 2. Gemini AI evaluation if API key is present
  const ai = getGemini();
  if (!ai) {
    return { isTolerant: true };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Tu es un modérateur IA pour un réseau social jeune et dynamique (MK).
Analyse le texte suivant pour détecter tout contenu intolérant, incitation à la haine, racisme, homophobie, harcèlement, menaces ou insultes dégradantes.
Texte : """${text}"""
Réponds STRICTEMENT par un JSON valide :
{"isTolerant": boolean, "reason": string}`,
      config: {
        responseMimeType: "application/json",
      },
    });

    const outputText = response.text?.trim();
    if (outputText) {
      const parsed = JSON.parse(outputText);
      if (parsed.isTolerant === false) {
        return {
          isTolerant: false,
          reason: parsed.reason || "Ce contenu a été jugé intolérant ou non conforme aux règles de respect de la communauté MK."
        };
      }
    }
    return { isTolerant: true };
  } catch (err) {
    console.warn("AI moderation check error (graceful fallback):", err);
    return { isTolerant: true };
  }
}
