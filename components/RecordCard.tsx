
import React from 'react';
import { HACCPRecord, ReceivingLogEntry, RawIntactMonitoringEntry } from '../types';
import { AlertTriangle, CheckCircle, FileText, Printer } from 'lucide-react';

interface Props {
  record: HACCPRecord;
  onPrint: (id: string) => void;
}

export const RecordCard: React.FC<Props> = ({ record, onPrint }) => {
  const isReceiving = record.type === 'RECEIVING_LOG';
  const r = record as any;
  
  const hasViolation = !isReceiving && r.temperature > 45;

  return (
    <div className={`p-4 border rounded-lg shadow-sm mb-3 bg-white ${hasViolation ? 'border-red-500' : 'border-slate-200'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {hasViolation ? (
            <AlertTriangle className="text-red-600 w-5 h-5" />
          ) : (
            <CheckCircle className="text-green-600 w-5 h-5" />
          )}
          <h3 className="font-bold text-slate-800">
            {isReceiving ? 'Receiving Log' : 'Raw Intact Monitoring'}
          </h3>
        </div>
        <button 
          onClick={() => onPrint(record.id)}
          className="p-1 hover:bg-slate-100 rounded text-slate-500"
        >
          <Printer size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
        <p><span className="font-medium">Date:</span> {record.date}</p>
        <p><span className="font-medium">Lot:</span> {record.lotNumber}</p>
        <p><span className="font-medium">Item:</span> {isReceiving ? r.productDescription : r.product}</p>
        <p><span className="font-medium">Initials:</span> {record.initials}</p>
        {r.temperature !== undefined && (
          <p className={hasViolation ? 'text-red-600 font-bold' : ''}>
            <span className="font-medium text-slate-600">Temp:</span> {r.temperature}°F
          </p>
        )}
      </div>

      {hasViolation && r.correctiveAction && (
        <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-800">
          <p className="font-bold">Corrective Action Taken:</p>
          <p>{r.correctiveAction}</p>
        </div>
      )}
    </div>
  );
};
