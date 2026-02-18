import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { APP_MODELS, SYSTEM_INSTRUCTION } from '../constants';
import { HACCPRecord } from '../types';

dotenv.config({ path: ['.env.local', '.env'] });

const app = express();
const PORT = Number(process.env.PORT || 5001);
const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

if (!apiKey) {
  throw new Error('Missing GEMINI_API_KEY in server environment.');
}

const genAI = new GoogleGenerativeAI(apiKey);

const CHAT_HISTORY_WINDOW = 8;
const MAX_TEXT_LENGTH = 12000;

const hasOnlyKeys = (value: unknown, allowedKeys: string[]) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value as Record<string, unknown>);
  return keys.every((key) => allowedKeys.includes(key));
};

const sanitizeText = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.slice(0, MAX_TEXT_LENGTH);
};

const CHAT_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    assistantMessage: { type: SchemaType.STRING },
    updatedFormState: { type: SchemaType.OBJECT },
    missingFields: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    isComplete: { type: SchemaType.BOOLEAN }
  },
  required: ['assistantMessage', 'isComplete']
};

const NR_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    extraction: {
      type: SchemaType.OBJECT,
      properties: {
        regulationCited: { type: SchemaType.STRING },
        ccpInvolved: { type: SchemaType.STRING },
        criticalLimit: { type: SchemaType.STRING },
        actualValues: { type: SchemaType.STRING },
        deviationAmount: { type: SchemaType.STRING },
        failureType: { type: SchemaType.STRING },
        numericCalculation: { type: SchemaType.STRING }
      },
      required: ['regulationCited', 'ccpInvolved', 'numericCalculation']
    },
    responseDraft: {
      type: SchemaType.OBJECT,
      properties: {
        immediateCorrectiveAction: { type: SchemaType.STRING },
        productDisposition: { type: SchemaType.STRING },
        rootCauseAnalysis: { type: SchemaType.STRING },
        preventiveMeasures: { type: SchemaType.STRING },
        verificationOfEffectiveness: { type: SchemaType.STRING },
        citations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
      },
      required: ['immediateCorrectiveAction', 'rootCauseAnalysis', 'citations']
    }
  },
  required: ['extraction', 'responseDraft']
};

const TREND_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    riskLevel: { type: SchemaType.STRING },
    summary: { type: SchemaType.STRING },
    concerns: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    actions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
  }
};

app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    if (!hasOnlyKeys(req.body, ['message', 'history', 'currentFormState'])) {
      res.status(400).json({ error: 'Invalid request payload.' });
      return;
    }

    const message = sanitizeText((req.body as any).message);
    const historyInput = Array.isArray((req.body as any).history) ? (req.body as any).history : [];
    const currentFormState = ((req.body as any).currentFormState ?? null) as Partial<HACCPRecord> | null;

    const history = historyInput
      .filter((entry: any) => entry && typeof entry === 'object')
      .map((entry: any) => ({
        role: entry.role === 'user' ? 'user' as const : 'assistant' as const,
        content: sanitizeText(entry.content)
      }));

    const trimmedHistory = Array.isArray(history) ? history.slice(-CHAT_HISTORY_WINDOW) : [];
    const model = genAI.getGenerativeModel({ model: APP_MODELS.CHAT, systemInstruction: SYSTEM_INSTRUCTION });

    const response = await model.generateContent({
      contents: [
        ...trimmedHistory.map((h) => ({ role: h.role === 'user' ? 'user' as const : 'model' as const, parts: [{ text: h.content }] })),
        { role: 'user', parts: [{ text: `Current User Input: ${message}\n\nCurrent Form State: ${JSON.stringify(currentFormState)}` }] }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: CHAT_RESPONSE_SCHEMA as any
      }
    });

    try {
      res.json(JSON.parse(response.response.text()));
    } catch {
      res.json({ assistantMessage: 'Parsing error.', isComplete: false });
    }
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Server error' });
  }
});

app.post('/api/nr', async (req, res) => {
  try {
    if (!hasOnlyKeys(req.body, ['nrText'])) {
      res.status(400).json({ error: 'Invalid request payload.' });
      return;
    }

    const nrText = sanitizeText((req.body as any).nrText);
    const model = genAI.getGenerativeModel({
      model: APP_MODELS.NR_TOOL,
      systemInstruction: `${SYSTEM_INSTRUCTION}\nSpecifically for this task: Perform a detailed technical extraction and draft an Establishment Management Response following 9 CFR 417.3.`
    });

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `EXTRACT AND ANALYZE THIS NR: ${nrText}` }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: NR_RESPONSE_SCHEMA as any
      }
    });

    res.json(JSON.parse(response.response.text()));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Server error' });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    if (!hasOnlyKeys(req.body, ['records'])) {
      res.status(400).json({ error: 'Invalid request payload.' });
      return;
    }

    const records = Array.isArray((req.body as any).records) ? ((req.body as any).records as HACCPRecord[]) : [];
    const model = genAI.getGenerativeModel({
      model: APP_MODELS.ANALYSIS,
      systemInstruction: 'You are a Senior USDA QA Manager.'
    });

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Analyze: ${JSON.stringify(records)}` }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: TREND_RESPONSE_SCHEMA as any
      }
    });

    res.json(JSON.parse(response.response.text()));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Gemini proxy server running on http://localhost:${PORT}`);
});
