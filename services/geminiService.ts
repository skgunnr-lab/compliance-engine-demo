
import { HACCPRecord } from "../types";

// Mock delay to simulate API call
const mockDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const processComplianceChat = async (
  message: string,
  history: { role: 'user' | 'assistant', content: string }[],
  currentFormState: Partial<HACCPRecord> | null
) => {
  await mockDelay(500 + Math.random() * 500);

  // Simple pattern matching for common queries
  const lowerMessage = message.toLowerCase();

  // If in document filler mode and form state exists, try to extract field values
  if (currentFormState) {
    const updates: any = {};

    // Try to extract temperature
    const tempMatch = message.match(/(\d+)\s*(?:degrees?|°|f)?/i);
    if (tempMatch && !currentFormState.temperature) {
      updates.temperature = Number(tempMatch[1]);
    }

    // Try to extract initials
    const initialsMatch = message.match(/\b([A-Z]{2,4})\b/);
    if (initialsMatch && !currentFormState.initials) {
      updates.initials = initialsMatch[1];
    }

    // Try to extract lot number
    const lotMatch = message.match(/lot\s*#?\s*(\w+)/i);
    if (lotMatch && !currentFormState.lotNumber) {
      updates.lotNumber = lotMatch[1];
    }

    // Check for yes/no responses - only for receiving log
    if (/\b(yes|y|true)\b/i.test(message)) {
      if (currentFormState.type === 'RECEIVING_LOG' && !(currentFormState as any).storedProperly && lowerMessage.includes('stored')) {
        updates.storedProperly = true;
      }
    }
    if (/\b(no|n|false)\b/i.test(message)) {
      if (currentFormState.type === 'RECEIVING_LOG' && !(currentFormState as any).storedProperly && lowerMessage.includes('stored')) {
        updates.storedProperly = false;
      }
    }

    if (Object.keys(updates).length > 0) {
      return {
        assistantMessage: "Field updated. What's next?",
        updatedFormState: { ...currentFormState, ...updates },
        missingFields: [],
        isComplete: false
      };
    }
  }

  // General chat responses
  if (lowerMessage.includes('temperature') || lowerMessage.includes('temp')) {
    return {
      assistantMessage: "Temperature monitoring is a key control point in this workflow. Please ensure temperatures are recorded accurately.",
      isComplete: false
    };
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
    return {
      assistantMessage: "This is a demonstration interface for a compliance documentation workflow. You can fill out forms through conversation, view your document history, and see a summary dashboard.",
      isComplete: false
    };
  }

  return {
    assistantMessage: "I understand. Please continue with your documentation workflow.",
    isComplete: false
  };
};

export const analyzeNR = async (nrText: string) => {
  await mockDelay(1000 + Math.random() * 1000);

  return {
    extraction: {
      regulationCited: "[Demo: Regulation Reference]",
      ccpInvolved: "CCP 1B - Product Temperature Control",
      criticalLimit: "≤ 45°F",
      actualValues: "Extracted from input text",
      deviationAmount: "Simulated calculation",
      failureType: "MONITORING" as const,
      numericCalculation: "Demo: Actual Value - Limit = Deviation Amount"
    },
    responseDraft: {
      immediateCorrectiveAction: "This is a simulated response. In the full version, this would analyze the noncompliance record and generate an appropriate corrective action based on regulatory requirements.",
      productDisposition: "Simulated disposition details would appear here, describing what actions were taken with affected product.",
      rootCauseAnalysis: "This demo shows how the system would identify and document root causes using a structured analysis approach.",
      preventiveMeasures: "Preventive measures would be generated based on the root cause analysis to prevent recurrence.",
      verificationOfEffectiveness: "Verification procedures would be outlined here to ensure corrective actions are effective.",
      citations: [
        "[Demo Citation 1]",
        "[Demo Citation 2]",
        "[Demo Citation 3]"
      ]
    }
  };
};

export const analyzeComplianceTrends = async (records: HACCPRecord[]) => {
  await mockDelay(800 + Math.random() * 400);

  const recordCount = records.length;
  const deviations = records.filter(r =>
    r.type === 'RAW_INTACT_MONITORING' && (r as any).temperature > 45
  ).length;

  let summary = `Demo mode: Analyzed ${recordCount} record${recordCount !== 1 ? 's' : ''}.`;

  if (recordCount === 0) {
    summary = "No records available for analysis yet. Start documenting activities to see insights here.";
  } else if (deviations === 0) {
    summary += " All temperature readings were within acceptable limits. Continue following standard operating procedures.";
  } else {
    summary += ` Detected ${deviations} temperature deviation${deviations !== 1 ? 's' : ''}. Review corrective actions and consider process improvements.`;
  }

  return {
    riskLevel: deviations === 0 ? "Low" : deviations <= 3 ? "Moderate" : "High",
    summary,
    concerns: recordCount > 0 ? [
      "This is demonstration data only",
      "Actual analysis would provide detailed insights"
    ] : [],
    actions: []
  };
};
