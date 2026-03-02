export interface PresetQA {
  id: string;
  question: string;
  answer: string;
  category: 'workflow' | 'features' | 'documentation' | 'temperature';
}

export const presetQuestions: PresetQA[] = [
  {
    id: '1',
    category: 'workflow',
    question: 'How do I fill out a form?',
    answer: 'Great question! You can fill out forms in two ways:\n\n1. **Document Filler Tab**: Use conversational input or voice dictation to fill fields naturally. Just say things like "Temperature is 42 degrees" or "Lot number ABC123".\n\n2. **Live Preview**: Directly edit fields in the live form preview on the right side.\n\nThe form updates in real-time as you enter information!'
  },
  {
    id: '2',
    category: 'features',
    question: 'What is voice dictation?',
    answer: 'Voice dictation allows you to fill out forms hands-free using speech recognition!\n\n**How to use it:**\n1. Click the microphone icon in the Document Filler\n2. Speak your response clearly\n3. The system extracts field values automatically\n\n**Note**: Voice input requires Chrome, Edge, or another Chromium-based browser.\n\nExample: "Temperature 43, initials JD, lot number ABC123"'
  },
  {
    id: '3',
    category: 'temperature',
    question: 'What happens if temperature exceeds the limit?',
    answer: 'When product temperature exceeds 45°F, additional corrective action fields automatically appear:\n\n• **Root Cause**: Document why the deviation occurred\n• **Action Taken**: Describe immediate corrective steps\n• **Product Disposition**: Explain what happened to the product\n\nThese fields ensure full compliance documentation for any temperature deviations.'
  },
  {
    id: '4',
    category: 'documentation',
    question: 'Where can I view saved records?',
    answer: 'All saved records are available in the **History** tab (clock icon in the sidebar).\n\nFrom there you can:\n• View all completed forms\n• See record details (date, lot, temperature, etc.)\n• Print individual records\n• Track deviations and corrective actions\n\nRecords persist in your browser storage, so they\'ll be there when you return!'
  },
  {
    id: '5',
    category: 'features',
    question: 'What does the dashboard show?',
    answer: 'The **Dashboard** tab provides compliance analytics and insights:\n\n📊 **Key Metrics:**\n• Total forms completed\n• Temperature deviations detected\n• Noncompliance records processed\n• Weekly risk assessment\n\n📈 **Analytics:**\n• Summary narrative of recent activity\n• Risk level indicator (Low/Moderate/High)\n• Trend analysis over time\n\nIt gives you a quick overview of your compliance status at a glance!'
  },
  {
    id: '6',
    category: 'workflow',
    question: 'Can I edit a form after saving?',
    answer: 'In this demo version, forms become read-only after saving to preserve data integrity.\n\nHowever, you can:\n• View the complete record in History\n• Print the saved form\n• Create a new corrected form if needed\n\nThis mirrors real-world compliance workflows where original records must remain unchanged for audit trails.'
  },
  {
    id: '7',
    category: 'features',
    question: 'What is the NR Responder?',
    answer: 'The **NR Responder** (Noncompliance Record Responder) helps analyze and respond to compliance issues.\n\n**How it works:**\n1. Paste a noncompliance scenario description\n2. The system analyzes and extracts key information\n3. Generates a structured response draft\n\n**Output includes:**\n• Regulation citations\n• Critical limit analysis\n• Corrective action recommendations\n• Product disposition guidance\n\nNote: In this demo, responses are simulated examples.'
  },
  {
    id: '8',
    category: 'workflow',
    question: 'How do I switch between form types?',
    answer: 'You can easily switch between different form types in the **Document Filler** tab.\n\n**Available Forms:**\n• **Raw Intact Monitoring Log**: For temperature monitoring of raw products\n• **Receiving Log**: For documenting incoming materials and ingredients\n\n**To switch:**\nUse the dropdown menu at the top of the Document Filler. The form preview updates immediately to show the appropriate fields for that form type.'
  },
  {
    id: '9',
    category: 'features',
    question: 'Does this demo save my data?',
    answer: 'Yes! This demo uses **browser localStorage** to persist your data.\n\n✅ **Your records are saved** between sessions\n✅ **Data stays private** (only on your device)\n⚠️ **Important**: Clearing browser cache will delete all records\n\nThe full production version would use cloud storage (like Firebase) for:\n• Multi-device sync\n• Automatic backups\n• Real-time collaboration\n• Permanent storage'
  },
  {
    id: '10',
    category: 'documentation',
    question: 'Can I print the forms?',
    answer: 'Absolutely! Each saved record can be printed as a professional HACCP document.\n\n**To print:**\n1. Go to the History tab\n2. Find the record you want to print\n3. Click the printer icon\n4. Use your browser\'s print dialog (Ctrl/Cmd + P)\n\n**Print format includes:**\n• Official header with establishment info\n• All form fields in a structured layout\n• Temperature limit verification section\n• Signature lines for review\n• Professional formatting for compliance documentation'
  }
];

export const getCategoryLabel = (category: PresetQA['category']): string => {
  switch (category) {
    case 'workflow': return 'Workflow';
    case 'features': return 'Features';
    case 'documentation': return 'Documentation';
    case 'temperature': return 'Temperature Monitoring';
    default: return 'General';
  }
};

export const getCategoryColor = (category: PresetQA['category']): string => {
  switch (category) {
    case 'workflow': return 'bg-blue-100 text-blue-700';
    case 'features': return 'bg-purple-100 text-purple-700';
    case 'documentation': return 'bg-green-100 text-green-700';
    case 'temperature': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};
