
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION, APP_MODELS } from "../constants";
import { HACCPRecord, NRExtraction, NRResponseDraft } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const processComplianceChat = async (
  message: string, 
  history: { role: 'user' | 'assistant', content: string }[],
  currentFormState: Partial<HACCPRecord> | null
) => {
  const response = await ai.models.generateContent({
    model: APP_MODELS.CHAT,
    contents: [
      ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] })),
      { parts: [{ text: `Current User Input: ${message}\n\nCurrent Form State: ${JSON.stringify(currentFormState)}` }] }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          assistantMessage: { type: Type.STRING },
          updatedFormState: { type: Type.OBJECT },
          missingFields: { type: Type.ARRAY, items: { type: Type.STRING } },
          isComplete: { type: Type.BOOLEAN }
        },
        required: ["assistantMessage", "isComplete"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    return { assistantMessage: "Parsing error.", isComplete: false };
  }
};

export const analyzeNR = async (nrText: string) => {
  const response = await ai.models.generateContent({
    model: APP_MODELS.NR_TOOL,
    contents: `EXTRACT AND ANALYZE THIS NR: ${nrText}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION + "\nSpecifically for this task: Perform a detailed technical extraction and draft an Establishment Management Response following 9 CFR 417.3.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          extraction: {
            type: Type.OBJECT,
            properties: {
              regulationCited: { type: Type.STRING },
              ccpInvolved: { type: Type.STRING },
              criticalLimit: { type: Type.STRING },
              actualValues: { type: Type.STRING },
              deviationAmount: { type: Type.STRING },
              failureType: { type: Type.STRING },
              numericCalculation: { type: Type.STRING }
            },
            required: ["regulationCited", "ccpInvolved", "numericCalculation"]
          },
          responseDraft: {
            type: Type.OBJECT,
            properties: {
              immediateCorrectiveAction: { type: Type.STRING },
              productDisposition: { type: Type.STRING },
              rootCauseAnalysis: { type: Type.STRING },
              preventiveMeasures: { type: Type.STRING },
              verificationOfEffectiveness: { type: Type.STRING },
              citations: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["immediateCorrectiveAction", "rootCauseAnalysis", "citations"]
          }
        },
        required: ["extraction", "responseDraft"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const analyzeComplianceTrends = async (records: HACCPRecord[]) => {
  const response = await ai.models.generateContent({
    model: APP_MODELS.ANALYSIS,
    contents: `Analyze: ${JSON.stringify(records)}`,
    config: {
      systemInstruction: "You are a Senior USDA QA Manager.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskLevel: { type: Type.STRING },
          summary: { type: Type.STRING },
          concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
          actions: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });
  return JSON.parse(response.text);
};
