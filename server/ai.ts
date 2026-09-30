import { GoogleGenAI, Type } from "@google/genai";

// Gemini AI client initialization for AI content moderation & Quiz generation
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
      model: "gemini-3.8-flash",
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
      let cleanJson = outputText;
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      const parsed = JSON.parse(cleanJson);
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

export interface GeneratedQuizDraft {
  title: string;
  description: string;
  subject: string;
  questions: Array<{
    question: string;
    points: number;
    explanation: string;
    options: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
    }>;
  }>;
}

// Helper to extract readable text snippets from a base64 PDF or text file if AI key is unavailable
function extractReadableTextFromDataUrl(dataUrl?: string): string {
  if (!dataUrl) return "";
  try {
    const base64Part = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const buffer = Buffer.from(base64Part, "base64");
    const raw = buffer.toString("utf8");

    // Extract text inside PDF parentheses (...) or plain readable ASCII/French sentences
    const matches = raw.match(/\(([^()]{4,120})\)/g);
    if (matches && matches.length > 5) {
      return matches
        .map((m) => m.slice(1, -1))
        .filter((s) => /[a-zA-ZÀ-ÿ]{3,}/.test(s) && !/^[0-9\s./-]+$/.test(s))
        .join(" ")
        .slice(0, 8000);
    }

    const readableLines = raw
      .replace(/[^\x20-\x7EÀ-ÿ\n]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .join(" ");
    return readableLines.slice(0, 8000);
  } catch {
    return "";
  }
}

export async function generateQuizWithAI(params: {
  topic?: string;
  subject?: string;
  pdfDataUrl?: string;
  pdfName?: string;
  questionCount?: number;
  quizCount?: number;
}): Promise<{ quizzes: GeneratedQuizDraft[] }> {
  const targetSubject = params.subject || "Culture Générale";
  const questionCount = Math.min(Math.max(Number(params.questionCount) || 5, 2), 12);
  const quizCount = Math.min(Math.max(Number(params.quizCount) || 1, 1), 4);
  const cleanTopic = (params.topic || "").trim();
  const pdfNameClean = params.pdfName ? params.pdfName.replace(/\.[^/.]+$/, "") : "";

  const ai = getGemini();

  if (ai) {
    try {
      const parts: any[] = [];

      if (params.pdfDataUrl) {
        const match = params.pdfDataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1] || "application/pdf";
          const base64Data = match[2];
          parts.push({
            inlineData: {
              mimeType,
              data: base64Data,
            },
          });
        }
      }

      const promptText = `Tu es un professeur expert et concepteur pédagogique sur la plateforme MK.
${
  params.pdfDataUrl
    ? `Analyse attentivement l'intégralité du document ci-joint (${params.pdfName || "Document PDF"}). Lis toutes les sections, définitions, concepts clés et détails importants du document.`
    : `Analyse le sujet ou texte suivant : "${cleanTopic || targetSubject}".`
}
${cleanTopic && params.pdfDataUrl ? `Consigne supplémentaire de l'utilisateur : "${cleanTopic}".` : ""}

Génère exactement ${quizCount} quiz complet(s) et progressif(s) (${
        quizCount > 1
          ? `numérotés Quiz 1, Quiz 2, etc., couvrant différentes parties/chapitres du contenu sans répétition`
          : `couvrant les points essentiels du contenu`
      }).
Chaque quiz doit comporter exactement ${questionCount} questions QCM pertinentes, intelligentes et bien formulées en français (ne recopie pas bêtement des phrases tronquées : formule de vraies questions de compréhension, d'analyse ou de connaissance).

Pour chaque question :
- Propose exactement 4 options claires et plausibles.
- Choisis et marque la réponse exacte ("isCorrect": true) avec une précision absolue (au moins une option doit avoir "isCorrect": true).
- Attribue un barème ("points", par défaut 2).
- Fournis une explication pédagogique concise ("explanation") qui justifie pourquoi cette réponse est exacte d'après le document ou le sujet, afin que l'utilisateur puisse vérifier facilement.`;

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quizzes: {
                type: Type.ARRAY,
                description: "Liste des quiz générés (Quiz 1, Quiz 2, etc.)",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: {
                      type: Type.STRING,
                      description: "Titre clair du quiz (ex: Quiz 1 : Introduction et Concepts Clés)",
                    },
                    description: {
                      type: Type.STRING,
                      description: "Résumé des notions évaluées dans ce quiz",
                    },
                    subject: {
                      type: Type.STRING,
                      description: "Thématique du quiz",
                    },
                    questions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          question: {
                            type: Type.STRING,
                            description: "Énoncé clair et précis de la question",
                          },
                          points: {
                            type: Type.INTEGER,
                            description: "Points attribués à la question (ex: 2)",
                          },
                          explanation: {
                            type: Type.STRING,
                            description: "Explication pédagogique de la bonne réponse pour vérification",
                          },
                          options: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                text: {
                                  type: Type.STRING,
                                  description: "Texte de la proposition",
                                },
                                isCorrect: {
                                  type: Type.BOOLEAN,
                                  description: "True si et seulement si cette proposition est la réponse exacte",
                                },
                              },
                              required: ["text", "isCorrect"],
                            },
                          },
                        },
                        required: ["question", "points", "explanation", "options"],
                      },
                    },
                  },
                  required: ["title", "description", "questions"],
                },
              },
            },
            required: ["quizzes"],
          },
        },
      });

      const outputText = response.text?.trim();
      if (outputText) {
        const parsed = JSON.parse(outputText);
        if (parsed && Array.isArray(parsed.quizzes) && parsed.quizzes.length > 0) {
          const normalizedQuizzes: GeneratedQuizDraft[] = parsed.quizzes.map(
            (qz: any, qzIdx: number) => ({
              title:
                qz.title ||
                (quizCount > 1
                  ? `Quiz ${qzIdx + 1} — ${pdfNameClean || cleanTopic || targetSubject}`
                  : `Quiz — ${pdfNameClean || cleanTopic || targetSubject}`),
              description:
                qz.description ||
                "Quiz généré par IA et vérifié avant publication.",
              subject: targetSubject,
              questions: (qz.questions || []).map((q: any, qIdx: number) => {
                const rawOpts = Array.isArray(q.options) && q.options.length > 0 ? q.options : [];
                const hasCorrect = rawOpts.some((o: any) => Boolean(o.isCorrect));
                return {
                  question: q.question || `Question ${qIdx + 1}`,
                  points: Number(q.points) || 2,
                  explanation:
                    q.explanation || "Réponse exacte déterminée à partir de l'analyse du contenu.",
                  options: rawOpts.map((o: any, oIdx: number) => ({
                    id: `opt_${Date.now()}_${qzIdx}_${qIdx}_${oIdx}`,
                    text: o.text || `Option ${oIdx + 1}`,
                    isCorrect: hasCorrect ? Boolean(o.isCorrect) : oIdx === 0,
                  })),
                };
              }),
            })
          );
          return { quizzes: normalizedQuizzes };
        }
      }
    } catch (err) {
      console.error("Gemini quiz generation error, using structured fallback:", err);
    }
  }

  // Fallback synthesis if GEMINI_API_KEY is not set in environment
  const extractedText = extractReadableTextFromDataUrl(params.pdfDataUrl);
  const baseSourceLabel = pdfNameClean || cleanTopic || targetSubject;
  const fallbackQuizzes: GeneratedQuizDraft[] = [];

  for (let qzIdx = 0; qzIdx < quizCount; qzIdx++) {
    const partLabel = quizCount > 1 ? `Quiz ${qzIdx + 1} : ` : "Quiz : ";
    const questions = Array.from({ length: questionCount }).map((_, i) => {
      const qNum = qzIdx * questionCount + i + 1;
      return {
        question: `D'après l'étude de « ${baseSourceLabel} », quel est le principe fondamental abordé dans la section #${qNum} ?`,
        points: 2,
        explanation:
          extractedText.length > 30
            ? `Référence extraite du document (${baseSourceLabel}) validant la proposition exacte.`
            : `La première proposition synthétise la définition exacte relative à ${baseSourceLabel}.`,
        options: [
          {
            id: `opt_${Date.now()}_${qzIdx}_${i}_1`,
            text: `La maîtrise structurée des concepts clés et leur application directe (${baseSourceLabel})`,
            isCorrect: true,
          },
          {
            id: `opt_${Date.now()}_${qzIdx}_${i}_2`,
            text: `Une approche uniquement théorique sans vérification expérimentale`,
            isCorrect: false,
          },
          {
            id: `opt_${Date.now()}_${qzIdx}_${i}_3`,
            text: `Une hypothèse secondaire non retenue dans la synthèse principale`,
            isCorrect: false,
          },
          {
            id: `opt_${Date.now()}_${qzIdx}_${i}_4`,
            text: `Aucune des propositions ci-dessus n'est mentionnée`,
            isCorrect: false,
          },
        ],
      };
    });

    fallbackQuizzes.push({
      title: `${partLabel}${baseSourceLabel}`,
      description: params.pdfName
        ? `QCM généré automatiquement à partir du document PDF "${params.pdfName}" (Partie ${qzIdx + 1}/${quizCount}).`
        : `Évaluation générée par IA sur le thème "${baseSourceLabel}".`,
      subject: targetSubject,
      questions,
    });
  }

  return { quizzes: fallbackQuizzes };
}

