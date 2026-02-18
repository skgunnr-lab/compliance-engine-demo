
import React from 'react';
import { HACCPRecord } from '../types';

interface Props {
  record: HACCPRecord;
}

const labelMap: Record<string, string> = {
  date: 'Date',
  time: 'Time of Entry',
  companyName: 'Company / Source Name',
  productDescription: 'Product / Item Description',
  lotNumber: 'Lot Number',
  invoiceNumber: 'Invoice #',
  amount: 'Quantity / Weight',
  temperature: 'Product Temperature (°F)',
  condition: 'Product Condition',
  documentationAvailable: 'Docs (LOG/COA/SDS)',
  storedProperly: 'Stored Properly?',
  carNumber: 'CAR # (If applicable)',
  initials: 'Employee Initials',
  product: 'Product Name',
  monitoringTime: 'Monitoring Time',
  verificationDO: 'Direct Observation Performed',
  verificationRR: 'Records Review Performed',
  verifierInitials: 'Verifier Initials',
  lotNumbersIncluded: 'Associated Lot Numbers',
  preShipmentReview: 'Pre-Shipment Review Done',
  lotHeld: 'Lot on Hold?',
  comments: 'Additional Comments',
  antimicrobialApplied: 'Antimicrobial Applied?',
  deviationOccurred: 'Critical Deviation?',
  correctiveAction: 'Corrective Action Taken',
  dispositionOfProduct: 'Product Disposition',
  supervisorReviewInitials: 'Supervisor Initials'
};

export const PrintableForm: React.FC<Props> = ({ record }) => {
  const isReceiving = record.type === 'RECEIVING_LOG';
  const rec = record as any;

  return (
    <div className="print-only w-full max-w-[8.5in] mx-auto p-4 bg-white text-black text-[11pt] leading-tight">
      {/* Official Header */}
      <div className="border-2 border-black p-2 mb-4">
        <div className="flex justify-between items-center border-b border-black pb-2 mb-2">
          <div className="text-left">
            <h1 className="text-xl font-black uppercase tracking-tighter">USDA HACCP RECORD</h1>
            <p className="text-[9pt] font-bold">ESTABLISHMENT: MEAT-PRO-123-A</p>
          </div>
          <div className="text-right">
            <p className="text-[9pt] font-bold">FORM ID: {record.id}</p>
            <p className="text-[8pt]">REVISION: 2024.11</p>
          </div>
        </div>
        <h2 className="text-center text-lg font-bold underline py-1">
          {isReceiving ? 'RECEIVING LOG: RAW MATERIALS & INGREDIENTS' : 'RAW INTACT MONITORING LOG (CCP IB)'}
        </h2>
      </div>

      {/* Main Data Grid */}
      <div className="border-t border-l border-black">
        {Object.entries(record).map(([key, value]) => {
          if (['id', 'timestamp', 'type'].includes(key)) return null;
          const label = labelMap[key] || key;
          
          let displayValue = String(value || 'N/A');
          if (typeof value === 'boolean') displayValue = value ? 'YES [X]' : 'NO [X]';
          if (Array.isArray(value)) displayValue = value.length > 0 ? value.join(', ') : 'NONE';

          return (
            <div key={key} className="flex border-r border-b border-black">
              <div className="w-1/3 bg-gray-100 p-2 border-r border-black font-bold uppercase text-[8pt]">
                {label}
              </div>
              <div className="w-2/3 p-2 font-medium">
                {displayValue}
              </div>
            </div>
          );
        })}
      </div>

      {/* Critical Deviation Section (Always shown for Raw Intact Monitoring) */}
      {!isReceiving && (
        <div className="mt-4 border-2 border-black">
          <div className="bg-black text-white p-1 text-center font-bold text-[9pt]">
            CRITICAL LIMIT MONITORING (MAX 45°F)
          </div>
          <div className="p-3">
            <div className="flex gap-4 mb-4">
              <div className="flex-1 border border-black p-2">
                <p className="text-[8pt] font-bold uppercase mb-1">Critical Limit Met?</p>
                <p className="text-lg font-bold">{rec.temperature <= 45 ? 'YES ✓' : 'NO - DEVIATION'}</p>
              </div>
              <div className="flex-1 border border-black p-2">
                <p className="text-[8pt] font-bold uppercase mb-1">Pre-Shipment Review</p>
                <div className="h-4 w-4 border border-black inline-block mr-2 align-middle"></div>
                <span className="text-sm">Pass</span>
                <div className="h-4 w-4 border border-black inline-block mx-2 align-middle"></div>
                <span className="text-sm">Fail</span>
              </div>
            </div>
            
            {rec.temperature > 45 && (
              <div className="bg-gray-50 border border-dashed border-black p-2">
                <h3 className="text-red-600 font-black text-sm mb-1 uppercase">★ Regulatory Deviation Flow</h3>
                <p className="text-[9pt] mb-2 font-serif italic border-b border-gray-200 pb-1">
                  Corrective Action and Disposition are REQUIRED for audit defensibility.
                </p>
                <div className="grid grid-cols-2 gap-2 text-[9pt]">
                  <div><span className="font-bold">Corrective Action:</span> {rec.correctiveAction || '________________'}</div>
                  <div><span className="font-bold">Disposition:</span> {rec.dispositionOfProduct || '________________'}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Signatures */}
      <div className="mt-8 grid grid-cols-2 gap-12">
        <div className="border-t border-black pt-1">
          <p className="text-[8pt] uppercase font-bold">Monitor Signature / Initials</p>
          <p className="mt-2 text-sm">{record.initials} ________________________</p>
          <p className="text-[7pt] text-gray-500 mt-1">Date: {record.date}</p>
        </div>
        <div className="border-t border-black pt-1">
          <p className="text-[8pt] uppercase font-bold">Verification Review / QA Signature</p>
          <p className="mt-2 text-sm">{rec.verifierInitials || '________________________'}</p>
          <p className="text-[7pt] text-gray-500 mt-1">Review Date: _________________</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-[7pt] text-gray-400 uppercase tracking-widest">
        Confidential Document - For USDA Compliance Inspection Only
      </div>
    </div>
  );
};
