
import { HACCPRecord } from "../types";

export const processComplianceChat = async (
  message: string, 
  history: { role: 'user' | 'assistant', content: string }[],
  currentFormState: Partial<HACCPRecord> | null
) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, currentFormState })
  });
  const data = await response.json();

  try {
    return data;
  } catch (e) {
    return { assistantMessage: "Parsing error.", isComplete: false };
  }
};

export const analyzeNR = async (nrText: string) => {
  const response = await fetch('/api/nr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nrText })
  });
  return await response.json();
};

export const analyzeComplianceTrends = async (records: HACCPRecord[]) => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records })
  });
  return await response.json();
};
