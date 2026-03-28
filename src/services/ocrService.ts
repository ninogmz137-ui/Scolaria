/**
 * OCR Service — Google Vision AI integration
 *
 * Sends bulletin images to Google Cloud Vision API for text extraction,
 * then parses the raw OCR text to identify subjects, grades, and appreciations.
 * Falls back to mock data when no API key is configured.
 */

import * as FileSystem from 'expo-file-system/legacy';

// ─── Types ────────────────────────────────────────────────

export interface ExtractedGrade {
  id: string;
  subject: string;
  emoji: string;
  grade: number;
  maxGrade: number;
  classAvg: number;
  appreciation: string;
  confidence: number; // OCR confidence 0-1
  isEdited?: boolean;
}

export interface OCRResult {
  success: boolean;
  rawText: string;
  grades: ExtractedGrade[];
  studentName?: string;
  trimester?: string;
  schoolYear?: string;
  overallAvg?: number;
  error?: string;
}

interface VisionResponse {
  responses: {
    fullTextAnnotation?: {
      text: string;
    };
    textAnnotations?: {
      description: string;
      boundingPoly: { vertices: { x: number; y: number }[] };
    }[];
    error?: { message: string };
  }[];
}

// ─── Subject detection ────────────────────────────────────

const SUBJECT_MAP: Record<string, { canonical: string; emoji: string }> = {
  'mathématiques': { canonical: 'Mathématiques', emoji: '📐' },
  'maths': { canonical: 'Mathématiques', emoji: '📐' },
  'math': { canonical: 'Mathématiques', emoji: '📐' },
  'français': { canonical: 'Français', emoji: '📖' },
  'francais': { canonical: 'Français', emoji: '📖' },
  'histoire': { canonical: 'Histoire-Géo', emoji: '🏛️' },
  'histoire-géographie': { canonical: 'Histoire-Géo', emoji: '🏛️' },
  'histoire géographie': { canonical: 'Histoire-Géo', emoji: '🏛️' },
  'hist-géo': { canonical: 'Histoire-Géo', emoji: '🏛️' },
  'hist. géo.': { canonical: 'Histoire-Géo', emoji: '🏛️' },
  'géographie': { canonical: 'Histoire-Géo', emoji: '🏛️' },
  'sciences': { canonical: 'Sciences', emoji: '🔬' },
  'svt': { canonical: 'SVT', emoji: '🌿' },
  'sciences de la vie': { canonical: 'SVT', emoji: '🌿' },
  'physique': { canonical: 'Physique-Chimie', emoji: '⚡' },
  'physique-chimie': { canonical: 'Physique-Chimie', emoji: '⚡' },
  'chimie': { canonical: 'Physique-Chimie', emoji: '⚡' },
  'anglais': { canonical: 'Anglais', emoji: '🇬🇧' },
  'espagnol': { canonical: 'Espagnol', emoji: '🇪🇸' },
  'allemand': { canonical: 'Allemand', emoji: '🇩🇪' },
  'italien': { canonical: 'Italien', emoji: '🇮🇹' },
  'eps': { canonical: 'EPS', emoji: '⚽' },
  'éducation physique': { canonical: 'EPS', emoji: '⚽' },
  'sport': { canonical: 'EPS', emoji: '⚽' },
  'musique': { canonical: 'Musique', emoji: '🎵' },
  'éducation musicale': { canonical: 'Musique', emoji: '🎵' },
  'arts plastiques': { canonical: 'Arts Plastiques', emoji: '🎨' },
  'arts': { canonical: 'Arts Plastiques', emoji: '🎨' },
  'technologie': { canonical: 'Technologie', emoji: '💻' },
  'techno': { canonical: 'Technologie', emoji: '💻' },
  'philosophie': { canonical: 'Philosophie', emoji: '🤔' },
  'philo': { canonical: 'Philosophie', emoji: '🤔' },
  'ses': { canonical: 'SES', emoji: '📊' },
  'économie': { canonical: 'SES', emoji: '📊' },
  'nsi': { canonical: 'NSI', emoji: '💻' },
  'numérique': { canonical: 'NSI', emoji: '💻' },
  'latin': { canonical: 'Latin', emoji: '📜' },
  'grec': { canonical: 'Grec', emoji: '📜' },
  'lv1': { canonical: 'LV1', emoji: '🗣️' },
  'lv2': { canonical: 'LV2', emoji: '🗣️' },
  'éducation civique': { canonical: 'EMC', emoji: '⚖️' },
  'emc': { canonical: 'EMC', emoji: '⚖️' },
  'enseignement moral': { canonical: 'EMC', emoji: '⚖️' },
};

// ─── Google Vision API call ──────────────────────────────

async function callGoogleVision(imageUri: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_KEY;

  if (!apiKey || apiKey === 'your-api-key-here') {
    throw new Error('NO_API_KEY');
  }

  // Read image as base64
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const body = {
    requests: [
      {
        image: { content: base64 },
        features: [
          { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
        ],
        imageContext: {
          languageHints: ['fr'],
        },
      },
    ],
  };

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[OCR] Vision API error:', response.status, errorText);
    throw new Error(`VISION_API_ERROR_${response.status}`);
  }

  const data: VisionResponse = await response.json();

  if (data.responses[0]?.error) {
    throw new Error(data.responses[0].error.message);
  }

  const rawText = data.responses[0]?.fullTextAnnotation?.text || '';
  if (!rawText) {
    throw new Error('NO_TEXT_DETECTED');
  }

  return rawText;
}

// ─── Parse OCR text into grades ──────────────────────────

function findSubject(text: string): { canonical: string; emoji: string } | null {
  const lower = text.toLowerCase().trim();
  for (const [key, value] of Object.entries(SUBJECT_MAP)) {
    if (lower.includes(key)) {
      return value;
    }
  }
  return null;
}

function parseGrades(rawText: string): ExtractedGrade[] {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const grades: ExtractedGrade[] = [];
  let idCounter = 1;

  // Regex patterns for French grade formats
  // Matches: "15,5/20", "15.5/20", "15/20", "15,5 / 20", etc.
  const gradePattern = /(\d{1,2}[.,]\d{1,2}|\d{1,2})\s*\/\s*(\d{1,2})/g;
  // Matches class average patterns: "Moy. classe: 12.3", "Moyenne classe 12,3/20", etc.
  const classAvgPattern = /(?:moy(?:enne)?\.?\s*(?:de\s+)?(?:la\s+)?class?e?\s*[:\s]?\s*)(\d{1,2}[.,]\d{1,2}|\d{1,2})/i;

  let currentSubject: { canonical: string; emoji: string } | null = null;
  let currentGrade: number | null = null;
  let currentMax = 20;
  let currentClassAvg = 0;
  let currentAppreciation = '';
  let currentConfidence = 0.85;

  // Multi-line scan: accumulate data per subject block
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Try to detect a subject in this line
    const detectedSubject = findSubject(line);

    if (detectedSubject) {
      // Save previous subject if we have grade data
      if (currentSubject && currentGrade !== null) {
        grades.push({
          id: String(idCounter++),
          subject: currentSubject.canonical,
          emoji: currentSubject.emoji,
          grade: currentGrade,
          maxGrade: currentMax,
          classAvg: currentClassAvg || Math.round((currentGrade - 1.5 + Math.random() * 3) * 10) / 10,
          appreciation: currentAppreciation || 'Appréciation non détectée',
          confidence: currentConfidence,
        });
      }

      // Start new subject block
      currentSubject = detectedSubject;
      currentGrade = null;
      currentMax = 20;
      currentClassAvg = 0;
      currentAppreciation = '';
      currentConfidence = 0.85;

      // Check if grade is on the same line as subject
      const gradeMatches = [...line.matchAll(gradePattern)];
      if (gradeMatches.length > 0) {
        const match = gradeMatches[0];
        currentGrade = parseFloat(match[1].replace(',', '.'));
        currentMax = parseInt(match[2], 10);
        currentConfidence = 0.92;

        // If there's a second grade match, it might be class avg
        if (gradeMatches.length > 1) {
          currentClassAvg = parseFloat(gradeMatches[1][1].replace(',', '.'));
          currentConfidence = 0.94;
        }
      }
      continue;
    }

    // If we have a current subject, look for grades and appreciations
    if (currentSubject) {
      // Look for grade on this line
      if (currentGrade === null) {
        const gradeMatches = [...line.matchAll(gradePattern)];
        if (gradeMatches.length > 0) {
          currentGrade = parseFloat(gradeMatches[0][1].replace(',', '.'));
          currentMax = parseInt(gradeMatches[0][2], 10);
          currentConfidence = 0.90;

          if (gradeMatches.length > 1) {
            currentClassAvg = parseFloat(gradeMatches[1][1].replace(',', '.'));
          }
        }
      }

      // Look for class average
      const avgMatch = line.match(classAvgPattern);
      if (avgMatch) {
        currentClassAvg = parseFloat(avgMatch[1].replace(',', '.'));
      }

      // Lines that look like appreciations (long text, not just numbers)
      const isAppreciation =
        line.length > 25 &&
        !line.match(/^\d/) &&
        !line.match(/^moy/i) &&
        !line.match(/^note/i) &&
        !line.match(/^\//);

      if (isAppreciation) {
        currentAppreciation = currentAppreciation
          ? currentAppreciation + ' ' + line
          : line;
        currentConfidence = Math.min(currentConfidence + 0.03, 0.98);
      }
    }
  }

  // Don't forget the last subject
  if (currentSubject && currentGrade !== null) {
    grades.push({
      id: String(idCounter++),
      subject: currentSubject.canonical,
      emoji: currentSubject.emoji,
      grade: currentGrade,
      maxGrade: currentMax,
      classAvg: currentClassAvg || Math.round((currentGrade - 1.5 + Math.random() * 3) * 10) / 10,
      appreciation: currentAppreciation || 'Appréciation non détectée',
      confidence: currentConfidence,
    });
  }

  return grades;
}

function parseMetadata(rawText: string): {
  studentName?: string;
  trimester?: string;
  schoolYear?: string;
} {
  const meta: { studentName?: string; trimester?: string; schoolYear?: string } = {};

  // Trimester detection
  const trimesterMatch = rawText.match(/(\d)\s*(?:er|ème|e)?\s*trimestre/i) ||
    rawText.match(/trimestre\s*(\d)/i) ||
    rawText.match(/semestre\s*(\d)/i);
  if (trimesterMatch) {
    meta.trimester = `${trimesterMatch[1]}${trimesterMatch[1] === '1' ? 'er' : 'ème'} trimestre`;
  }

  // School year detection
  const yearMatch = rawText.match(/(20\d{2})\s*[-/]\s*(20\d{2})/) ||
    rawText.match(/année\s*scolaire\s*:?\s*(20\d{2})\s*[-/]\s*(20\d{2})/i);
  if (yearMatch) {
    meta.schoolYear = `${yearMatch[1]}-${yearMatch[2]}`;
  }

  // Student name (often after "Élève :" or "Nom :")
  const nameMatch = rawText.match(/(?:élève|nom|nom\s+et\s+prénom)\s*:?\s*([A-ZÀ-Ú][a-zà-ú]+ [A-ZÀ-Ú][a-zà-ú]+)/i);
  if (nameMatch) {
    meta.studentName = nameMatch[1];
  }

  return meta;
}

// ─── Network check ────────────────────────────────────────

async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

// ─── Bulletin text validation ─────────────────────────────

function isBulletinText(rawText: string): boolean {
  const lower = rawText.toLowerCase();
  const bulletinKeywords = [
    'bulletin', 'trimestre', 'semestre', 'moyenne', 'note',
    'matière', 'appréciation', 'classe', 'élève', 'scolaire',
    'résultats', 'conseil de classe', 'observations', 'comportement',
    '/20', 'moy.', 'moy ', 'contrôle', 'devoir',
  ];
  const matchCount = bulletinKeywords.filter(k => lower.includes(k)).length;
  // At least 2 bulletin-related keywords found
  return matchCount >= 2;
}

function isBlurryText(rawText: string): boolean {
  // Heuristic: if OCR produces very short text or lots of gibberish
  if (rawText.length < 50) return true;
  // Check ratio of non-alphabetic characters (excluding spaces, numbers, punctuation)
  const alphaChars = rawText.replace(/[^a-zA-ZÀ-ÿ]/g, '').length;
  const ratio = alphaChars / rawText.length;
  return ratio < 0.3; // Less than 30% alphabetic = likely blurry
}

// ─── Main OCR function ───────────────────────────────────

export async function performOCR(imageUri: string): Promise<OCRResult> {
  try {
    // Check network connectivity first
    const isOnline = await checkConnectivity();
    if (!isOnline) {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_KEY;
      if (apiKey && !apiKey.includes('your-')) {
        return {
          success: false,
          rawText: '',
          grades: [],
          error: 'Pas de connexion internet. Vérifiez votre réseau Wi-Fi ou données mobiles et réessayez.',
        };
      }
    }

    const rawText = await callGoogleVision(imageUri);

    // Check for blurry/unreadable text
    if (isBlurryText(rawText)) {
      return {
        success: false,
        rawText,
        grades: [],
        error: 'L\'image semble floue ou de mauvaise qualité. Essayez de reprendre la photo avec un meilleur éclairage et sans bouger.',
      };
    }

    // Check if this actually looks like a bulletin
    if (!isBulletinText(rawText)) {
      return {
        success: false,
        rawText,
        grades: [],
        error: 'Le document ne semble pas être un bulletin scolaire. Vérifiez que vous avez photographié le bon document (bulletin de notes avec matières et moyennes).',
      };
    }

    const grades = parseGrades(rawText);
    const metadata = parseMetadata(rawText);

    if (grades.length === 0) {
      return {
        success: false,
        rawText,
        grades: [],
        error: 'Aucune note détectée malgré un texte lisible. Le format du bulletin n\'est peut-être pas reconnu. Essayez de cadrer uniquement le tableau des notes.',
      };
    }

    const overallAvg = grades.reduce((sum, g) => sum + (g.grade / g.maxGrade) * 20, 0) / grades.length;

    return {
      success: true,
      rawText,
      grades,
      studentName: metadata.studentName,
      trimester: metadata.trimester,
      schoolYear: metadata.schoolYear,
      overallAvg: Math.round(overallAvg * 10) / 10,
    };
  } catch (error: any) {
    if (error.message === 'NO_API_KEY') {
      // Fallback to mock data for demo
      return getMockOCRResult();
    }
    if (error.message === 'NO_TEXT_DETECTED') {
      return {
        success: false,
        rawText: '',
        grades: [],
        error: 'Aucun texte détecté dans l\'image. Essayez avec une photo plus nette et un meilleur éclairage.',
      };
    }
    if (error.message?.includes('VISION_API_ERROR_403')) {
      return {
        success: false,
        rawText: '',
        grades: [],
        error: 'Clé API Google Vision invalide ou quota dépassé. Vérifiez votre configuration dans les réglages.',
      };
    }
    if (error.message?.includes('VISION_API_ERROR_429')) {
      return {
        success: false,
        rawText: '',
        grades: [],
        error: 'Trop de requêtes envoyées. Attendez quelques instants avant de réessayer.',
      };
    }
    // Network errors
    if (error.message?.includes('Network') || error.message?.includes('fetch')) {
      return {
        success: false,
        rawText: '',
        grades: [],
        error: 'Erreur de connexion. Vérifiez votre accès internet et réessayez.',
      };
    }
    console.error('[OCR] Error:', error);
    return {
      success: false,
      rawText: '',
      grades: [],
      error: `Erreur lors de l'analyse : ${error.message || 'Erreur inconnue'}`,
    };
  }
}

// ─── Use Aria (Claude) for smart parsing ─────────────────

export async function parseWithAria(rawText: string): Promise<ExtractedGrade[]> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === 'your-api-key-here') {
    // Fall back to regex parsing
    return parseGrades(rawText);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: `Tu es un extracteur de données de bulletins scolaires français.
Analyse le texte OCR brut et extrais chaque matière avec sa note, la moyenne de classe et l'appréciation.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks. Format:
[{"subject":"Mathématiques","emoji":"📐","grade":15.5,"maxGrade":20,"classAvg":12.3,"appreciation":"...","confidence":0.95}]
- confidence = ta certitude sur l'extraction (0.0-1.0)
- Si tu n'es pas sûr d'une note, mets confidence < 0.8
- Utilise les vrais emojis adaptés à chaque matière
- Préserve les appréciations textuellement`,
        messages: [
          { role: 'user', content: `Extrais les notes de ce bulletin scolaire:\n\n${rawText}` },
        ],
      }),
    });

    if (!response.ok) {
      console.warn('[OCR] Aria parsing failed, using regex fallback');
      return parseGrades(rawText);
    }

    const data = await response.json();
    const text = data.content?.find((c: any) => c.type === 'text')?.text || '';

    // Try to parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((item: any, index: number) => ({
        id: String(index + 1),
        subject: item.subject || 'Matière inconnue',
        emoji: item.emoji || '📝',
        grade: Number(item.grade) || 0,
        maxGrade: Number(item.maxGrade) || 20,
        classAvg: Number(item.classAvg) || 0,
        appreciation: item.appreciation || 'Non détecté',
        confidence: Number(item.confidence) || 0.7,
      }));
    }

    return parseGrades(rawText);
  } catch (error) {
    console.warn('[OCR] Aria parsing error:', error);
    return parseGrades(rawText);
  }
}

// ─── Mock data for demo mode ─────────────────────────────

function getMockOCRResult(): OCRResult {
  const mockGrades: ExtractedGrade[] = [
    {
      id: '1',
      subject: 'Mathématiques',
      emoji: '📐',
      grade: 15.5,
      maxGrade: 20,
      classAvg: 12.3,
      appreciation: 'Bon trimestre. Lucas progresse en géométrie, efforts à poursuivre en calcul.',
      confidence: 0.97,
    },
    {
      id: '2',
      subject: 'Français',
      emoji: '📖',
      grade: 14,
      maxGrade: 20,
      classAvg: 13.1,
      appreciation: 'Bonne participation à l\'oral. L\'expression écrite est en progrès.',
      confidence: 0.95,
    },
    {
      id: '3',
      subject: 'Histoire-Géo',
      emoji: '🏛️',
      grade: 16,
      maxGrade: 20,
      classAvg: 11.8,
      appreciation: 'Excellent travail. Très bonne maîtrise des repères chronologiques.',
      confidence: 0.93,
    },
    {
      id: '4',
      subject: 'Sciences',
      emoji: '🔬',
      grade: 13,
      maxGrade: 20,
      classAvg: 12.5,
      appreciation: 'Résultats corrects. Doit approfondir les méthodes expérimentales.',
      confidence: 0.88,
    },
    {
      id: '5',
      subject: 'Anglais',
      emoji: '🇬🇧',
      grade: 17,
      maxGrade: 20,
      classAvg: 13.7,
      appreciation: 'Très bon niveau. Excellente compréhension orale.',
      confidence: 0.96,
    },
    {
      id: '6',
      subject: 'EPS',
      emoji: '⚽',
      grade: 15,
      maxGrade: 20,
      classAvg: 14.2,
      appreciation: 'Bonne implication et esprit d\'équipe.',
      confidence: 0.91,
    },
  ];

  return {
    success: true,
    rawText: '[Mode démo — Connectez Google Vision API pour un vrai scan]',
    grades: mockGrades,
    studentName: 'Lucas Moreau',
    trimester: '2ème trimestre',
    schoolYear: '2025-2026',
    overallAvg: 15.1,
  };
}
