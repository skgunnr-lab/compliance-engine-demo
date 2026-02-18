
import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, 
  MessageSquare, 
  History, 
  LayoutDashboard, 
  ShieldCheck, 
  Send,
  Loader2,
  Settings,
  Printer,
  FileCheck,
  BookOpen,
  FileWarning,
  Calculator,
  Gavel
} from 'lucide-react';
import { HACCPRecord, ChatMessage, NRExtraction, NRResponseDraft } from './types';
import { processComplianceChat, analyzeComplianceTrends, analyzeNR } from './services/geminiService';
import { RecordCard } from './components/RecordCard';
import { PrintableForm } from './components/PrintableForm';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'dashboard' | 'nr-tool'>('chat');
  const [records, setRecords] = useState<HACCPRecord[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentFormState, setCurrentFormState] = useState<Partial<HACCPRecord> | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);

  const [nrInput, setNrInput] = useState('');
  const [nrResult, setNrResult] = useState<{ extraction: NRExtraction, responseDraft: NRResponseDraft } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('haccp_records');
    if (saved) setRecords(JSON.parse(saved));
    
    setChatHistory([{
      role: 'assistant',
      content: 'Carnivore House Regulatory Terminal active. Operating under Reference Manual V1.0. All responses cited according to 9 CFR requirements. How can I assist the Establishment today?'
    }]);
  }, []);

  useEffect(() => {
    localStorage.setItem('haccp_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handlePrint = (id: string) => {
    setPrintingId(id);
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
        setPrintingId(null);
      }, 300);
    });
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isLoading) return;
    const userMsg = currentInput;
    setCurrentInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);
    try {
      const result = await processComplianceChat(userMsg, chatHistory.map(h => ({ role: h.role, content: h.content })), currentFormState);
      const assistantMsg: ChatMessage = { role: 'assistant', content: result.assistantMessage, data: result.updatedFormState };
      if (result.updatedFormState) setCurrentFormState(prev => ({ ...prev, ...result.updatedFormState }));
      if (result.isComplete && result.updatedFormState) {
        const newRecord: HACCPRecord = { ...result.updatedFormState, id: 'EST-' + Math.random().toString(36).substr(2, 6).toUpperCase(), timestamp: Date.now() } as HACCPRecord;
        setRecords(prev => [newRecord, ...prev]);
        setCurrentFormState(null);
        assistantMsg.content += `\n\n[OFFICIAL RECORD GENERATED: ${newRecord.id}]`;
        (assistantMsg as any).recordId = newRecord.id;
      }
      setChatHistory(prev => [...prev, assistantMsg]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'SYSTEM ERROR: Validation failed.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const runNRAnalysis = async () => {
    if (!nrInput.trim()) return;
    setIsLoading(true);
    try {
      const result = await analyzeNR(nrInput);
      setNrResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const runAnalysis = async () => {
    setIsLoading(true);
    const result = await analyzeComplianceTrends(records);
    setAnalysis(result);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans">
      <nav className="w-full md:w-20 bg-slate-950 flex md:flex-col items-center py-4 px-2 md:py-8 justify-around md:justify-start gap-6 no-print sticky top-0 md:h-screen z-50">
        <div className="hidden md:block mb-8">
          <ShieldCheck className="text-emerald-400 w-10 h-10" />
        </div>
        <button onClick={() => setActiveTab('chat')} className={`p-3 rounded-xl transition ${activeTab === 'chat' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><MessageSquare size={24} /></button>
        <button onClick={() => setActiveTab('nr-tool')} className={`p-3 rounded-xl transition ${activeTab === 'nr-tool' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><FileWarning size={24} /></button>
        <button onClick={() => setActiveTab('history')} className={`p-3 rounded-xl transition ${activeTab === 'history' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><History size={24} /></button>
        <button onClick={() => setActiveTab('dashboard')} className={`p-3 rounded-xl transition ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><LayoutDashboard size={24} /></button>
        <div className="md:mt-auto"><button className="p-3 text-slate-500 hover:text-white"><Settings size={24} /></button></div>
      </nav>

      <main className="flex-1 flex flex-col h-screen relative no-print overflow-hidden">
        <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm z-10">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tighter uppercase">
              <ClipboardCheck className="text-emerald-600" />
              Carnivore House Compliance Engine
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em]">HACCP Reference V1.0</span>
              <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-black">EST. MEAT-PRO-123</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 uppercase">
               <BookOpen size={14} className="text-slate-400" />
               Citations Enforced
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          <div className="max-w-4xl mx-auto h-full">
            
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm border ${
                        msg.role === 'user' ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-800 border-slate-200'
                      }`}>
                        <div className="flex items-start gap-3">
                          {msg.role === 'assistant' && <ShieldCheck className="text-emerald-600 shrink-0 mt-1" size={18} />}
                          <div className="w-full">
                            <div className="text-sm whitespace-pre-wrap leading-relaxed font-medium">
                              {msg.content.split(/(\[.*?\])/).map((part, idx) => 
                                part.startsWith('[') && part.endsWith(']') ? <span key={idx} className="bg-emerald-50 text-emerald-700 px-1 rounded font-bold text-[11px] border border-emerald-100 mx-0.5">{part}</span> : part
                              )}
                            </div>
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
                  <div ref={chatEndRef} />
                </div>
                <div className="p-4 border-t border-slate-200 bg-white"><div className="flex gap-2"><input type="text" value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Lot data or compliance inquiry..." className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition" /><button onClick={handleSendMessage} className="bg-slate-900 text-white rounded-xl px-5 py-3 hover:bg-black transition"><Send size={20} /></button></div></div>
              </div>
            )}

            {activeTab === 'nr-tool' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
                  <h2 className="text-lg font-black text-slate-900 uppercase mb-2 flex items-center gap-2">
                    <FileWarning className="text-red-600" />
                    NR Response Tool (9 CFR 417.3)
                  </h2>
                  <p className="text-slate-500 text-xs mb-4">Paste the official USDA Noncompliance Record description below to extract structured data and draft a management response.</p>
                  <textarea 
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

                      <div className="mt-12 flex justify-between pt-8 border-t border-slate-100">
                        <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                          Generated by Carnivore House Compliance Engine
                        </div>
                        <button className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase hover:underline">
                          <Printer size={16} /> Print Official Response
                        </button>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-slate-500 text-[10px] font-black uppercase mb-1 tracking-widest">Active Logs</p><p className="text-4xl font-black text-slate-900 tracking-tighter">{records.length}</p></div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-red-500 text-[10px] font-black uppercase mb-1 tracking-widest">CCB IB Deviations</p><p className="text-4xl font-black text-red-600 tracking-tighter">{records.filter(r => r.type === 'RAW_INTACT_MONITORING' && r.temperature > 45).length}</p></div>
                  <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800"><p className="text-emerald-400 text-[10px] font-black uppercase mb-1 tracking-widest">Audit Readiness</p><p className="text-4xl font-black text-white tracking-tighter">ACTIVE</p></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-xs font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-4 bg-emerald-600 rounded-full" />Thermal Control (9 CFR 417.2)</h3>
                  <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={[...records].filter(r => r.type === 'RAW_INTACT_MONITORING').reverse()}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="date" hide /><YAxis stroke="#94a3b8" fontSize={10} domain={[30, 50]} /><Tooltip /><Line type="monotone" dataKey="temperature" stroke="#059669" strokeWidth={4} dot={{ fill: '#059669', r: 5 }} /><Line type="step" dataKey={() => 45} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} name="Critical Limit" dot={false} /></LineChart></ResponsiveContainer></div>
                </div>
              </div>
            )}
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
