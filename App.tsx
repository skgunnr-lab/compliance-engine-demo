import React, { useState, useEffect, useRef } from 'react';
import {
  ClipboardCheck,
  MessageSquare,
  History,
  LayoutDashboard,
  ShieldCheck,
  Send,
  Mic,
  Loader2,
  Printer,
  BookOpen,
  FileWarning,
  Calculator,
  Gavel,
  Home,
  Sparkles,
  ArrowRight,
  Beef
} from 'lucide-react';
import { HACCPRecord, ChatMessage, NRExtraction, NRResponseDraft } from './types';
import { processComplianceChat, analyzeComplianceTrends, analyzeNR } from './services/geminiService';
import { RecordCard } from './components/RecordCard';
import { presetQuestions, getCategoryLabel, getCategoryColor, type PresetQA } from './presetQA';
import { PrintableForm } from './components/PrintableForm';

type Tab = 'home' | 'general-chat' | 'document-filler' | 'nr-responder' | 'history' | 'dashboard';
type FormSelection = 'RAW_INTACT_MONITORING' | 'RECEIVING_LOG';
type FormFieldDef = { key: string; label: string };
type FormState = Partial<HACCPRecord>;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [records, setRecords] = useState<HACCPRecord[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [fillerHistory, setFillerHistory] = useState<ChatMessage[]>([]);
  const [fillerInput, setFillerInput] = useState('');
  const [selectedForm, setSelectedForm] = useState<FormSelection>('RAW_INTACT_MONITORING');
  const [workflowStage, setWorkflowStage] = useState<'collecting' | 'review'>('collecting');
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentFormState, setCurrentFormState] = useState<Partial<HACCPRecord> | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [nrInput, setNrInput] = useState('');
  const [nrResult, setNrResult] = useState<{ extraction: NRExtraction, responseDraft: NRResponseDraft } | null>(null);
  const [nrCount, setNrCount] = useState(0);
  const [weeklySummary, setWeeklySummary] = useState('');
  const [weeklyRiskLevel, setWeeklyRiskLevel] = useState('N/A');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const getCurrentDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getFormFields = (formType: FormSelection, formState: Partial<HACCPRecord>): FormFieldDef[] => {
    if (formType === 'RECEIVING_LOG') {
      return [
        { key: 'date', label: 'Date' },
        { key: 'time', label: 'Time' },
        { key: 'companyName', label: 'Company / Source' },
        { key: 'productDescription', label: 'Product Description' },
        { key: 'lotNumber', label: 'Lot Number' },
        { key: 'amount', label: 'Amount' },
        { key: 'condition', label: 'Condition' },
        { key: 'documentationAvailable', label: 'Documents Available (LOG/COA/SDS)' },
        { key: 'storedProperly', label: 'Stored Properly' },
        { key: 'initials', label: 'Initials' }
      ];
    }

    const fields: FormFieldDef[] = [
      { key: 'date', label: 'Date' },
      { key: 'lotNumber', label: 'Lot Number' },
      { key: 'product', label: 'Product' },
      { key: 'monitoringTime', label: 'Monitoring Time' },
      { key: 'temperature', label: 'Temperature (F)' },
      { key: 'initials', label: 'Initials' },
      { key: 'verificationDO', label: 'Direct Observation Done' },
      { key: 'verificationRR', label: 'Records Review Done' },
      { key: 'verifierInitials', label: 'Verifier Initials' },
      { key: 'lotNumbersIncluded', label: 'Lot Numbers Included' },
      { key: 'preShipmentReview', label: 'Pre-Shipment Review Done' },
      { key: 'lotHeld', label: 'Lot Held' },
      { key: 'antimicrobialApplied', label: 'Antimicrobial Applied' }
    ];

    if (typeof (formState as any).temperature === 'number' && Number((formState as any).temperature) > 45) {
      fields.push({ key: 'comments', label: 'Root Cause' });
      fields.push({ key: 'correctiveAction', label: 'Action Taken' });
      fields.push({ key: 'dispositionOfProduct', label: 'Product Disposition' });
    }

    return fields;
  };

  const isFieldComplete = (state: Partial<HACCPRecord>, key: string) => {
    const value = (state as any)[key];
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  };

  const getMissingRequiredFields = (formType: FormSelection, formState: Partial<HACCPRecord>) => {
    return getFormFields(formType, formState)
      .filter(field => !isFieldComplete(formState, field.key))
      .map(field => field.key);
  };

  const formatValue = (value: unknown) => {
    if (value === undefined || value === null || value === '') return '';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  };

  const getFieldInputKind = (key: string): 'text' | 'number' | 'boolean' | 'array' => {
    if (['temperature'].includes(key)) return 'number';
    if (['storedProperly', 'verificationDO', 'verificationRR', 'preShipmentReview', 'lotHeld', 'antimicrobialApplied'].includes(key)) return 'boolean';
    if (['documentationAvailable'].includes(key)) return 'array';
    return 'text';
  };

  const applyFormUpdates = (updates: FormState) => {
    const state = { ...(currentFormState || {}), type: selectedForm } as FormState;
    const nextState = { ...state, ...updates, type: selectedForm } as any;

    if (typeof nextState.temperature === 'number' && !Number.isNaN(nextState.temperature)) {
      nextState.deviationOccurred = Number(nextState.temperature) > 45;
    } else if (nextState.temperature === '' || nextState.temperature === undefined || nextState.temperature === null) {
      nextState.deviationOccurred = undefined;
    }

    const missing = getMissingRequiredFields(selectedForm, nextState);
    const fields = getFormFields(selectedForm, nextState);

    setCurrentFormState(nextState);
    setMissingFields(missing);
    if (missing.length === 0) {
      setWorkflowStage('review');
      setCurrentFieldIndex(fields.length);
    } else {
      setWorkflowStage('collecting');
      const nextIndex = fields.findIndex(field => !isFieldComplete(nextState, field.key));
      if (nextIndex >= 0) setCurrentFieldIndex(nextIndex);
    }

    return { nextState, missing, fields };
  };

  const getGuidedQuestion = (key: string, label: string) => {
    const map: Record<string, string> = {
      date: 'What is today’s date?',
      time: 'What time was this received?',
      monitoringTime: 'What time was the check done?',
      lotNumber: 'What is the lot number?',
      temperature: 'What was the product temperature?',
      initials: 'Enter your initials.',
      storedProperly: 'Was it stored properly? (Y/N)',
      verificationDO: 'Was direct observation done? (Y/N)',
      verificationRR: 'Was records review done? (Y/N)',
      preShipmentReview: 'Was pre-shipment review done? (Y/N)',
      lotHeld: 'Is the lot on hold? (Y/N)',
      antimicrobialApplied: 'Was antimicrobial applied? (Y/N)',
      correctiveAction: 'What action was taken right away?',
      dispositionOfProduct: 'What happened to the product?',
      comments: 'What was the root cause?'
    };
    return map[key] || `Enter ${label.toLowerCase()}.`;
  };

  const handleLiveFieldChange = (key: string, rawValue: string) => {
    const state = { ...(currentFormState || {}), type: selectedForm } as FormState;
    const nextState = { ...state } as any;
    const kind = getFieldInputKind(key);

    if (kind === 'number') {
      nextState[key] = rawValue === '' ? undefined : Number(rawValue);
    } else if (kind === 'boolean') {
      if (rawValue === '') {
        nextState[key] = undefined;
      } else {
        nextState[key] = rawValue === 'true';
      }
    } else if (kind === 'array') {
      nextState[key] = rawValue
        .split(',')
        .map(v => v.trim().toUpperCase())
        .filter(Boolean);
    } else {
      nextState[key] = rawValue;
    }

    applyFormUpdates(nextState);
  };

  const startFormWorkflow = (formType: FormSelection) => {
    const initialState: Partial<HACCPRecord> = formType === 'RECEIVING_LOG'
      ? { type: formType, date: getCurrentDate(), time: getCurrentTime() }
      : { type: formType, date: getCurrentDate(), monitoringTime: getCurrentTime() };
    const fields = getFormFields(formType, initialState);
    const firstMissingIndex = fields.findIndex(field => !isFieldComplete(initialState, field.key));
    const startIndex = firstMissingIndex >= 0 ? firstMissingIndex : 0;
    const firstQuestion = fields[startIndex] ? getGuidedQuestion(fields[startIndex].key, fields[startIndex].label) : 'All required fields are complete.';

    setCurrentFormState(initialState);
    setWorkflowStage('collecting');
    setCurrentFieldIndex(startIndex);
    setMissingFields(fields.map(field => field.key));
    setFillerHistory([
      { role: 'assistant', content: `Starting ${formType === 'RAW_INTACT_MONITORING' ? 'HACCP Monitoring Log (Raw Intact Form)' : 'Receiving Log'}.` },
      { role: 'assistant', content: firstQuestion }
    ]);
  };

  useEffect(() => {
    const savedRecords = localStorage.getItem('haccp_records');
    if (savedRecords) setRecords(JSON.parse(savedRecords));

    const savedNrCount = localStorage.getItem('nr_response_count');
    if (savedNrCount) setNrCount(Number(savedNrCount) || 0);

    setChatHistory([{
      role: 'assistant',
      content: 'Welcome to the Compliance Assistant demo! 👋\n\nI\'m here to help answer questions about this workflow system. Click any question from the guide on the right to see detailed answers, or type your own question!\n\n💡 Tip: In the full version, this would be powered by AI to answer any compliance-related question in real-time.'
    }]);

    startFormWorkflow('RAW_INTACT_MONITORING');
  }, []);

  useEffect(() => {
    localStorage.setItem('haccp_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('nr_response_count', String(nrCount));
  }, [nrCount]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, fillerHistory]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setVoiceSupported(false);
      return;
    }
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(Boolean(SpeechRecognitionCtor));
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'dashboard') return;

    const runDashboardAnalysis = async () => {
      try {
        const result = await analyzeComplianceTrends(records);
        setWeeklySummary(result?.summary || 'No weekly narrative available yet.');
      } catch {
        setWeeklySummary('Unable to generate weekly summary at this time.');
      }
    };

    runDashboardAnalysis();
  }, [activeTab, records]);

  useEffect(() => {
    const deviationCount = records.filter(r => r.type === 'RAW_INTACT_MONITORING' && (r as any).temperature > 45).length;
    if (deviationCount === 0) {
      setWeeklyRiskLevel('Low');
    } else if (deviationCount <= 3) {
      setWeeklyRiskLevel('Moderate');
    } else {
      setWeeklyRiskLevel('High');
    }
  }, [records]);

  const handlePrint = (id: string) => {
    setPrintingId(id);
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
        setPrintingId(null);
      }, 300);
    });
  };

  const handlePresetQuestion = (qa: PresetQA) => {
    setChatHistory(prev => [
      ...prev,
      { role: 'user', content: qa.question },
      { role: 'assistant', content: qa.answer }
    ]);
  };

  const handleGeneralChatMessage = async () => {
    if (!currentInput.trim() || isLoading) return;

    const userMsg = currentInput;
    setCurrentInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Try to find a matching preset question
    const matchedQA = presetQuestions.find(qa =>
      qa.question.toLowerCase().includes(userMsg.toLowerCase()) ||
      userMsg.toLowerCase().includes(qa.question.toLowerCase().split(' ').slice(0, 3).join(' '))
    );

    if (matchedQA) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: matchedQA.answer }]);
    } else {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: 'I\'m a demo assistant with preset responses. Try clicking one of the example questions on the right, or explore the other tabs to see the workflow system in action!\n\n💡 In the full version, I would use AI to answer any question about compliance, regulations, and documentation procedures.'
      }]);
    }

    setIsLoading(false);
  };

  const submitDocumentFillerMessage = async (userMsg: string) => {
    if (!userMsg.trim() || isLoading) return;
    setFillerHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setVoiceError('');

    const regulatoryQuestionPattern = /(cfr|regulation|regulatory|requirement|what is|explain|policy|usda\s+rule|law)/i;
    if (regulatoryQuestionPattern.test(userMsg)) {
      setFillerHistory(prev => [...prev, {
        role: 'assistant',
        content: 'Please switch to the General Chatbot tab for regulatory questions.'
      }]);
      return;
    }

    setIsLoading(true);
    try {
      const state = { ...(currentFormState || {}), type: selectedForm } as FormState;
      const fields = getFormFields(selectedForm, state);
      const currentField = fields[currentFieldIndex];
      const expectingSingleField = workflowStage === 'collecting' && Boolean(currentField);

      let updateResult: { nextState: any; missing: string[]; fields: FormFieldDef[] };

      if (expectingSingleField && currentField) {
        const kind = getFieldInputKind(currentField.key);
        let directValue: any = userMsg.trim();
        if (kind === 'number') {
          const parsed = Number(userMsg.trim());
          directValue = Number.isNaN(parsed) ? userMsg.trim() : parsed;
        } else if (kind === 'boolean') {
          const normalized = userMsg.trim().toLowerCase();
          if (['yes', 'y', 'true'].includes(normalized)) directValue = true;
          if (['no', 'n', 'false'].includes(normalized)) directValue = false;
        } else if (kind === 'array') {
          directValue = userMsg
            .split(',')
            .map(v => v.trim().toUpperCase())
            .filter(Boolean);
        }
        updateResult = applyFormUpdates({ [currentField.key]: directValue } as FormState);
      } else {
        const extractionPrompt = [
          'DOCUMENT FILLER MODE',
          `Selected Form: ${selectedForm}`,
          'Extract and update any form fields found in the user message.',
          'Use simple, direct wording.',
          'Do not answer regulatory questions.',
          'Do not add citations unless temperature is over allowed limit.',
          `User Input: ${userMsg}`
        ].join('\n');

        const result = await processComplianceChat(
          extractionPrompt,
          fillerHistory.map(h => ({ role: h.role, content: h.content })),
          state
        );
        updateResult = applyFormUpdates((result.updatedFormState || {}) as FormState);
      }

      if (updateResult.missing.length === 0) {
        setFillerHistory(prev => [...prev, {
          role: 'assistant',
          content: 'Record is complete.\nGenerate printable document?\nEscalate?\nSave record?'
        }]);
      } else {
        const nextField = updateResult.fields.find(field => !isFieldComplete(updateResult.nextState, field.key));
        if (nextField) {
          setFillerHistory(prev => [...prev, { role: 'assistant', content: getGuidedQuestion(nextField.key, nextField.label) }]);
        }
      }
    } catch {
      setFillerHistory(prev => [...prev, { role: 'assistant', content: 'We could not complete that step. Please review the details and try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentFillerMessage = async () => {
    const userMsg = fillerInput;
    setFillerInput('');
    await submitDocumentFillerMessage(userMsg);
  };

  const startVoiceDictation = () => {
    if (!voiceSupported || isListening) return;
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript?.trim() || '';
      if (!transcript) return;
      setFillerInput(transcript);
      await submitDocumentFillerMessage(transcript);
      setFillerInput('');
    };

    recognition.onerror = () => {
      setVoiceError('Voice input failed. Please try again.');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setVoiceError('');
    setIsListening(true);
    recognition.start();
  };

  const saveCurrentFormRecord = (printAfterSave: boolean) => {
    if (!currentFormState) return;
    const newRecord: HACCPRecord = {
      ...currentFormState,
      type: selectedForm,
      id: 'EST-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      timestamp: Date.now()
    } as HACCPRecord;

    setRecords(prev => [newRecord, ...prev]);
    if (printAfterSave) handlePrint(newRecord.id);
    setCurrentFormState(null);
    setMissingFields([]);
    setCurrentFieldIndex(0);
    setWorkflowStage('collecting');
    setFillerHistory(prev => [...prev, {
      role: 'assistant',
      content: `Saved.\n\n[OFFICIAL RECORD GENERATED: ${newRecord.id}]`,
      data: newRecord,
      recordId: newRecord.id
    } as any]);
  };

  const runNRAnalysis = async () => {
    if (!nrInput.trim()) return;
    setIsLoading(true);
    try {
      const result = await analyzeNR(nrInput);
      setNrResult(result);
      setNrCount(prev => prev + 1);
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const totalDeviations = records.filter(record => record.type === 'RAW_INTACT_MONITORING' && (record as any).temperature > 45).length;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans">
      <nav className="fixed bottom-0 left-0 right-0 md:sticky md:top-0 md:bottom-auto md:left-auto md:right-auto w-full md:w-20 bg-slate-950 flex md:flex-col items-center py-2 px-4 md:py-8 justify-around md:justify-start md:gap-6 no-print md:h-screen z-50">
        <div className="hidden md:block mb-8">
          <Beef className="text-emerald-400 w-10 h-10" />
        </div>
        <button onClick={() => setActiveTab('home')} className={`p-3 rounded-xl transition ${activeTab === 'home' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`} title="Home"><Home size={24} /></button>
        <button onClick={() => setActiveTab('general-chat')} className={`p-3 rounded-xl transition ${activeTab === 'general-chat' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><MessageSquare size={24} /></button>
        <button onClick={() => setActiveTab('document-filler')} className={`p-3 rounded-xl transition ${activeTab === 'document-filler' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><ClipboardCheck size={24} /></button>
        <button onClick={() => setActiveTab('nr-responder')} className={`p-3 rounded-xl transition ${activeTab === 'nr-responder' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><FileWarning size={24} /></button>
        <button onClick={() => setActiveTab('history')} className={`p-3 rounded-xl transition ${activeTab === 'history' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><History size={24} /></button>
        <button onClick={() => setActiveTab('dashboard')} className={`p-3 rounded-xl transition ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><LayoutDashboard size={24} /></button>
      </nav>

      <main className="flex-1 flex flex-col h-screen relative no-print overflow-hidden">
        <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm z-10">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tighter uppercase">
              <ClipboardCheck className="text-emerald-600" />
              Carnivore House Compliance Engine
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em]">USDA HACCP Framework</span>
              <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-black">EST. #DEMO-001</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 uppercase">
              <BookOpen size={14} className="text-slate-400" />
              USDA CFR Reference Active
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 pb-16 md:pb-0">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 text-center no-print">
            <p className="text-sm font-bold">
              ⚠️ DEMONSTRATION MODE: This is a simulated AI-assisted compliance workflow prototype for demonstration purposes only
            </p>
            <p className="text-xs opacity-90 mt-1">
              All AI responses are mock implementations. No backend services or API keys required.
            </p>
          </div>
          <div className="p-4">
          <div className="max-w-4xl mx-auto h-full">
            {activeTab === 'home' && (
              <div className="space-y-8 animate-in fade-in duration-700 pb-12">
                {/* Hero Section */}
                <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-8 md:p-12 rounded-3xl shadow-2xl border border-emerald-900 relative overflow-hidden">
                  <div className="absolute top-0 right-0 opacity-5">
                    <ShieldCheck size={300} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-emerald-500/20 p-3 rounded-xl border border-emerald-500/40">
                        <Sparkles className="text-emerald-400" size={32} />
                      </div>
                      <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter">
                        Compliance Engine
                      </h1>
                    </div>
                    <p className="text-emerald-100 text-lg md:text-xl font-medium leading-relaxed max-w-3xl mb-6">
                      An AI-powered regulatory compliance assistant built for <strong>Carnivore House</strong>, a USDA-regulated meat processing facility.
                      This is the public demo version of a full production system — the internal version features live AI responses grounded in the full 9 CFR Parts 301–417, FSIS Directives 5000.1 and 5000.6, Firebase cloud storage, and real-time multi-user sync.
                      This demo showcases the core workflow: conversational HACCP form filling, continuous voice dictation, noncompliance record analysis, and a compliance trend dashboard.
                      <span className="block mt-2 text-emerald-300 text-base font-semibold">⚠️ All AI responses in this demo are simulated.</span>
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <div className="bg-blue-600/80 px-4 py-2 rounded-lg border border-blue-500">
                        <p className="text-white text-sm font-black uppercase">⚠️ Demo Mode - Mock Responses</p>
                      </div>
                      <div className="bg-emerald-900/50 px-4 py-2 rounded-lg border border-emerald-700/50">
                        <p className="text-emerald-300 text-sm font-black uppercase">HACCP Reference V1.1</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation Cards */}
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-2">
                    <Home size={28} className="text-emerald-600" />
                    Navigate to a Feature
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* General Chat */}
                    <button
                      onClick={() => setActiveTab('general-chat')}
                      className="group bg-white p-6 rounded-2xl shadow-lg border-2 border-slate-200 hover:border-emerald-600 hover:shadow-xl transition-all duration-300 text-left"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="bg-emerald-100 p-3 rounded-xl group-hover:bg-emerald-600 transition-colors">
                          <MessageSquare className="text-emerald-600 group-hover:text-white transition-colors" size={28} />
                        </div>
                        <ArrowRight className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" size={24} />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 uppercase mb-2">General Chatbot</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Ask compliance questions and get answers from preset Q&A guide.
                        Includes workflow tips, feature explanations, and documentation guidance.
                      </p>
                    </button>

                    {/* Document Filler */}
                    <button
                      onClick={() => setActiveTab('document-filler')}
                      className="group bg-white p-6 rounded-2xl shadow-lg border-2 border-slate-200 hover:border-emerald-600 hover:shadow-xl transition-all duration-300 text-left"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-600 transition-colors">
                          <ClipboardCheck className="text-blue-600 group-hover:text-white transition-colors" size={28} />
                        </div>
                        <ArrowRight className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" size={24} />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 uppercase mb-2">Document Filler</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Fill out HACCP monitoring logs and receiving logs conversationally using chat or voice input.
                        Simulated AI-guided workflow for demonstration.
                      </p>
                    </button>

                    {/* NR Responder */}
                    <button
                      onClick={() => setActiveTab('nr-responder')}
                      className="group bg-white p-6 rounded-2xl shadow-lg border-2 border-slate-200 hover:border-red-600 hover:shadow-xl transition-all duration-300 text-left"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="bg-red-100 p-3 rounded-xl group-hover:bg-red-600 transition-colors">
                          <FileWarning className="text-red-600 group-hover:text-white transition-colors" size={28} />
                        </div>
                        <ArrowRight className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" size={24} />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 uppercase mb-2">NR Responder</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Analyze USDA noncompliance records and generate structured establishment management responses.
                        Mock structured extraction for demonstration purposes.
                      </p>
                    </button>

                    {/* Document Archive */}
                    <button
                      onClick={() => setActiveTab('history')}
                      className="group bg-white p-6 rounded-2xl shadow-lg border-2 border-slate-200 hover:border-purple-600 hover:shadow-xl transition-all duration-300 text-left"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-600 transition-colors">
                          <History className="text-purple-600 group-hover:text-white transition-colors" size={28} />
                        </div>
                        <ArrowRight className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" size={24} />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 uppercase mb-2">Document Archive</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Access all completed forms organized by type. View and print records.
                        Data stored in browser localStorage.
                      </p>
                    </button>

                    {/* Dashboard */}
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="group bg-white p-6 rounded-2xl shadow-lg border-2 border-slate-200 hover:border-indigo-600 hover:shadow-xl transition-all duration-300 text-left md:col-span-2"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="bg-indigo-100 p-3 rounded-xl group-hover:bg-indigo-600 transition-colors">
                          <LayoutDashboard className="text-indigo-600 group-hover:text-white transition-colors" size={28} />
                        </div>
                        <ArrowRight className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" size={24} />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 uppercase mb-2">Analytics Dashboard</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        View compliance metrics including total forms completed, deviations, and noncompliance records.
                        Mock analytics with simulated risk indicators.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">System Overview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-black text-emerald-600">{records.length}</p>
                      <p className="text-xs text-slate-500 font-bold uppercase mt-1">Forms Completed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-black text-red-600">{totalDeviations}</p>
                      <p className="text-xs text-slate-500 font-bold uppercase mt-1">Deviations</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-black text-indigo-600">{nrCount}</p>
                      <p className="text-xs text-slate-500 font-bold uppercase mt-1">NR Responses</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'general-chat' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
                {/* Chat Interface */}
                <div className="lg:col-span-2 flex flex-col h-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm border ${msg.role === 'user' ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-800 border-slate-200'}`}>
                          <div className="flex items-start gap-3">
                            {msg.role === 'assistant' && <MessageSquare className="text-blue-600 shrink-0 mt-1" size={18} />}
                            <div className="w-full">
                              <div className="text-sm whitespace-pre-wrap leading-relaxed font-medium">{msg.content}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && <div className="bg-blue-50 rounded-2xl p-4 flex items-center gap-3 w-fit border border-blue-100"><Loader2 className="w-4 h-4 animate-spin text-blue-600" /><span className="text-xs text-blue-800 font-black uppercase tracking-widest">Thinking...</span></div>}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="p-4 border-t border-slate-200 bg-white">
                    <div className="flex gap-2">
                      <input id="general-chat-input" name="generalChatInput" type="text" value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleGeneralChatMessage()} placeholder="Ask a question or click an example →" className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
                      <button onClick={handleGeneralChatMessage} className="bg-slate-900 text-white rounded-xl px-5 py-3 hover:bg-black transition"><Send size={20} /></button>
                    </div>
                  </div>
                </div>

                {/* Question Guide Sidebar */}
                <div className="flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
                    <h3 className="text-sm font-black text-slate-900 uppercase">Example Questions</h3>
                    <p className="text-xs text-slate-600 mt-1">Click any question to see the answer</p>
                  </div>

                  {/* Demo Notice */}
                  <div className="p-3 bg-amber-50 border-b border-amber-200">
                    <div className="flex items-start gap-2">
                      <div className="text-amber-600 shrink-0 mt-0.5">ℹ️</div>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        <strong>Demo Mode:</strong> This assistant uses preset Q&A responses. The full production version features AI-powered chat that can answer any compliance question in real-time with regulatory citations.
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {presetQuestions.map((qa) => (
                      <button
                        key={qa.id}
                        onClick={() => handlePresetQuestion(qa)}
                        className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition group"
                      >
                        <div className="flex items-start gap-2">
                          <MessageSquare size={14} className="text-slate-400 group-hover:text-blue-600 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 line-clamp-2">{qa.question}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1.5 inline-block font-bold ${getCategoryColor(qa.category)}`}>
                              {getCategoryLabel(qa.category)}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'document-filler' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                <div className="flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 uppercase">Document Filler</h2>
                      <p className="text-xs text-slate-500">Fill this form in chat. You can send multiple fields at once.</p>
                    </div>
                    <div className="w-full md:w-72">
                      <label className="text-[10px] font-black uppercase text-slate-500">Form Selection</label>
                      <select
                        value={selectedForm}
                        onChange={(e) => {
                          const nextForm = e.target.value as FormSelection;
                          setSelectedForm(nextForm);
                          startFormWorkflow(nextForm);
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
                      >
                        <option value="RAW_INTACT_MONITORING">HACCP Monitoring Log (Raw Intact Form)</option>
                        <option value="RECEIVING_LOG">Receiving Log</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {fillerHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm border ${msg.role === 'user' ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-800 border-slate-200'}`}>
                          <div className="flex items-start gap-3">
                            {msg.role === 'assistant' && <ClipboardCheck className="text-emerald-600 shrink-0 mt-1" size={18} />}
                            <div className="w-full">
                              <div className="text-sm whitespace-pre-wrap leading-relaxed font-medium">{msg.content}</div>
                              {(msg as any).recordId && (
                                <div className="mt-4 flex gap-2">
                                  <button onClick={() => handlePrint((msg as any).recordId)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition">
                                    <Printer size={14} /> PRINT LOG
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {isLoading && <div className="bg-emerald-50 rounded-2xl p-4 flex items-center gap-3 w-fit border border-emerald-100"><Loader2 className="w-4 h-4 animate-spin text-emerald-600" /><span className="text-xs text-emerald-800 font-black uppercase tracking-widest">Processing...</span></div>}

                    {workflowStage === 'review' && currentFormState && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                        <p className="text-sm font-bold text-emerald-900">Review ready. Choose next step:</p>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => saveCurrentFormRecord(true)} className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-800 transition">Generate printable document</button>
                          <button onClick={() => saveCurrentFormRecord(false)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black transition">Save record</button>
                        </div>
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>

                  <div className="p-4 border-t border-slate-200 bg-white">
                    <div className="flex gap-2">
                      <input id="document-filler-input" name="documentFillerInput" type="text" value={fillerInput} onChange={(e) => setFillerInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleDocumentFillerMessage()} placeholder="Enter field values for this form..." className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition" />
                      {voiceSupported && (
                        <button
                          onClick={startVoiceDictation}
                          disabled={isListening}
                          className={`rounded-xl px-4 py-3 transition ${isListening ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}
                          title={isListening ? 'Listening...' : 'Start voice dictation'}
                        >
                          <Mic size={18} />
                        </button>
                      )}
                      <button onClick={handleDocumentFillerMessage} className="bg-slate-900 text-white rounded-xl px-5 py-3 hover:bg-black transition"><Send size={20} /></button>
                    </div>
                    {voiceError && <p className="text-xs text-red-600 mt-2">{voiceError}</p>}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 overflow-y-auto">
                  <h3 className="text-sm font-black uppercase text-slate-900 mb-4">Live Form Preview</h3>
                  <div className="space-y-2">
                    {getFormFields(selectedForm, currentFormState || { type: selectedForm }).map((field) => {
                      const rawValue = (currentFormState as any)?.[field.key];
                      const value = formatValue(rawValue);
                      const inputKind = getFieldInputKind(field.key);
                      const isDeviation = field.key === 'temperature' && typeof (currentFormState as any)?.temperature === 'number' && Number((currentFormState as any).temperature) > 45;
                      const complete = isFieldComplete(currentFormState || {}, field.key);
                      return (
                        <div key={field.key} className="border border-slate-200 rounded-lg p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold uppercase text-slate-500">{field.label}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${isDeviation ? 'bg-red-100 text-red-700' : complete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {isDeviation ? 'Deviation' : complete ? 'Complete' : 'Missing'}
                            </span>
                          </div>
                          <div className="mt-1">
                            {inputKind === 'boolean' ? (
                              <select
                                value={rawValue === undefined ? '' : String(Boolean(rawValue))}
                                onChange={(e) => handleLiveFieldChange(field.key, e.target.value)}
                                className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                              >
                                <option value="">Select...</option>
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                              </select>
                            ) : (
                              <input
                                type={field.key === 'date' ? 'date' : field.key === 'time' || field.key === 'monitoringTime' ? 'time' : inputKind === 'number' ? 'number' : 'text'}
                                value={inputKind === 'array' ? value : (rawValue ?? '')}
                                onChange={(e) => handleLiveFieldChange(field.key, e.target.value)}
                                className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                                placeholder={inputKind === 'array' ? 'Comma-separated values' : ''}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'nr-responder' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
                  <h2 className="text-lg font-black text-slate-900 uppercase mb-2 flex items-center gap-2">
                    <FileWarning className="text-red-600" />
                    Noncompliance Record Responder
                  </h2>
                  <p className="text-slate-500 text-xs mb-4">Paste the USDA Noncompliance Record description below to generate a structured response draft with citations.</p>
                  <textarea
                    id="nr-description-input"
                    name="nrDescriptionInput"
                    value={nrInput}
                    onChange={(e) => setNrInput(e.target.value)}
                    className="w-full h-40 rounded-xl border border-slate-200 p-4 text-sm font-mono focus:ring-2 focus:ring-red-500 focus:outline-none bg-slate-50"
                    placeholder="On February 12, 2026..."
                  />
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={runNRAnalysis}
                      disabled={isLoading || !nrInput}
                      className="bg-red-600 text-white font-black py-3 px-8 rounded-xl hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Gavel size={20} />}
                      ANALYZE & DRAFT RESPONSE
                    </button>
                  </div>
                </div>

                {nrResult && (
                  <div className="space-y-6 animate-in slide-in-from-top-4 duration-700">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-white p-5 rounded-2xl shadow border border-slate-200">
                        <h3 className="text-xs font-black uppercase text-slate-500 mb-4 flex items-center gap-2">
                          <Calculator size={14} /> Structured Extraction
                        </h3>
                        <div className="space-y-3">
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Regulation Cited</p><p className="text-sm font-bold text-slate-800">{nrResult.extraction.regulationCited}</p></div>
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">CCP Involved</p><p className="text-sm font-bold text-slate-800">{nrResult.extraction.ccpInvolved}</p></div>
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Numeric Calculation</p><p className="text-xs font-mono bg-slate-100 p-2 rounded mt-1 border border-slate-200">{nrResult.extraction.numericCalculation}</p></div>
                          <div className="pt-2 flex gap-2">
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded uppercase">Deviation: {nrResult.extraction.deviationAmount}</span>
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded uppercase">Type: {nrResult.extraction.failureType}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-emerald-950 text-white p-5 rounded-2xl shadow border border-emerald-900">
                        <h3 className="text-xs font-black uppercase text-emerald-400 mb-4 flex items-center gap-2">
                          <BookOpen size={14} /> Regulatory Citations
                        </h3>
                        <ul className="space-y-2">
                          {nrResult.responseDraft.citations.map((c, i) => (
                            <li key={i} className="text-xs bg-emerald-900/50 p-2 rounded border border-emerald-800 text-emerald-50">{c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 relative">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck size={80} /></div>
                      <h2 className="text-xl font-black text-slate-900 uppercase mb-6 border-b border-slate-200 pb-4">Establishment Management Response</h2>
                      <div className="space-y-6 font-serif text-[13px] leading-relaxed text-slate-800">
                        <section>
                          <h4 className="font-bold uppercase text-slate-900 mb-1 border-l-4 border-emerald-600 pl-3">Immediate Corrective Action</h4>
                          <p>{nrResult.responseDraft.immediateCorrectiveAction}</p>
                        </section>
                        <section>
                          <h4 className="font-bold uppercase text-slate-900 mb-1 border-l-4 border-emerald-600 pl-3">Product Disposition</h4>
                          <p>{nrResult.responseDraft.productDisposition}</p>
                        </section>
                        <section>
                          <h4 className="font-bold uppercase text-slate-900 mb-1 border-l-4 border-emerald-600 pl-3">Root Cause Analysis</h4>
                          <p>{nrResult.responseDraft.rootCauseAnalysis}</p>
                        </section>
                        <section>
                          <h4 className="font-bold uppercase text-slate-900 mb-1 border-l-4 border-emerald-600 pl-3">Preventive Measures</h4>
                          <p>{nrResult.responseDraft.preventiveMeasures}</p>
                        </section>
                        <section>
                          <h4 className="font-bold uppercase text-slate-900 mb-1 border-l-4 border-emerald-600 pl-3">Verification of Effectiveness</h4>
                          <p>{nrResult.responseDraft.verificationOfEffectiveness}</p>
                        </section>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Document Archive</h2>
                {records.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200"><History className="mx-auto w-12 h-12 text-slate-300 mb-4" /><p className="text-slate-400 font-bold uppercase tracking-tighter">Archive is Empty</p></div>
                ) : (
                  records.map(record => <RecordCard key={record.id} record={record} onPrint={handlePrint} />)
                )}
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="space-y-6 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-slate-500 text-[10px] font-black uppercase mb-1 tracking-widest">Total Forms Completed</p><p className="text-4xl font-black text-slate-900 tracking-tighter">{records.length}</p></div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-red-500 text-[10px] font-black uppercase mb-1 tracking-widest">Total Deviations</p><p className="text-4xl font-black text-red-600 tracking-tighter">{totalDeviations}</p></div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-indigo-500 text-[10px] font-black uppercase mb-1 tracking-widest">Total Noncompliance Records</p><p className="text-4xl font-black text-indigo-700 tracking-tighter">{nrCount}</p></div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-xs font-black text-slate-900 mb-3 uppercase tracking-widest">Weekly Summary Narrative</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{weeklySummary || 'No weekly narrative available yet.'}</p>
                </div>

                <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
                  <p className="text-emerald-400 text-[10px] font-black uppercase mb-1 tracking-widest">Risk Indicator</p>
                  <p className="text-4xl font-black text-white tracking-tighter">{weeklyRiskLevel}</p>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </main>

      {printingId && (
        <div className="fixed inset-0 bg-white z-[100] overflow-y-auto print-only">
          {records.filter(r => r.id === printingId).map(record => <PrintableForm key={record.id} record={record} />)}
        </div>
      )}
    </div>
  );
};

export default App;
