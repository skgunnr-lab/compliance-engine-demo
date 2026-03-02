<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Carnivore House - Public Demo Version

⚠️ **DEMONSTRATION VERSION**: This is a sanitized demo version for portfolio/resume purposes. All AI responses are **simulated** and **no backend or API keys are required**.

## About This Demo

This version showcases the UI/UX and workflow design of an AI-assisted compliance documentation system. It demonstrates:

- 💬 **Conversational Interface**: Chat-based form filling
- 📝 **Guided Workflows**: Step-by-step document completion
- 🎙️ **Voice Dictation**: Browser-based speech recognition
- 📊 **Live Preview**: Real-time form updates as you type
- 📋 **Document History**: Track completed records
- 📈 **Dashboard**: Summary analytics and visualizations

## What's Different from Production?

- ✅ **No Backend Required**: Runs entirely in the browser
- ✅ **No API Keys**: All responses are mocked
- ✅ **No Database**: Uses browser localStorage only
- ✅ **Simplified Logic**: Basic pattern matching instead of AI
- ✅ **Sanitized Content**: Removed proprietary regulatory references

## Quick Start

**Prerequisites:** Node.js (v18 or higher)

```bash
# Install dependencies
npm install

# Run the demo
npm run dev
```

The app will be available at `http://localhost:5173`

## Features in This Demo

### 1. Document Filler
- Fill out compliance forms through conversation or direct input
- Live form preview shows updates in real-time
- Voice dictation for hands-free data entry (Chrome/Edge)
- Two form types: Monitoring Log and Receiving Log

### 2. General Chat
- Simulated AI assistant for workflow questions
- Demonstrates conversational UI patterns

### 3. NR Responder
- Mock analysis of noncompliance records
- Shows structured response generation workflow

### 4. History
- View all completed documents
- Print-ready format for each record

### 5. Dashboard
- Summary statistics
- Simulated analytics and insights

## Technical Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Charts**: Recharts
- **Styling**: Tailwind-style inline classes

## Architecture Notes

All "AI" functionality is implemented as mock functions with:
- Simulated delays for realistic UX
- Basic pattern matching for demo interaction
- Pre-defined responses for common scenarios

No external services, databases, or APIs are called.

## Browser Compatibility

- **Voice dictation** requires Chrome, Edge, or other Chromium-based browsers
- All other features work in modern browsers (Firefox, Safari, etc.)

## Purpose

This demo version is designed to showcase:
- UI/UX design capabilities
- React/TypeScript development skills
- Complex state management
- Real-time form validation
- Accessible interface design
- Print-optimized document generation

---

**Note**: This is a demonstration project. For production use cases, a full backend with proper authentication, database, and AI integration would be required.
