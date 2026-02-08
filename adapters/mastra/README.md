# Mastra → AG-UI Adapter

## Overview
This adapter bridges Mastra (TypeScript) with the AG-UI protocol using the Vercel AI SDK.

## Features
- ✅ Streaming token output
- ✅ Tool invocation events
- ✅ Ollama local LLM support
- ✅ Full AG-UI event compliance

## Setup
```bash
cd adapters/mastra
npm install
npm run dev
```

## Tools Available
1. **calculator** - Evaluate mathematical expressions
2. **webSearch** - Search the web (simulated)
3. **getCurrentTime** - Get current date/time

## AG-UI Events Emitted
| AI SDK Event | AG-UI Event |
|--------------|-------------|
| text-delta | TEXT_MESSAGE_CONTENT |
| tool-call | TOOL_CALL_START |
| tool-result | TOOL_CALL_END |
| stream start | RUN_STARTED |
| stream end | RUN_FINISHED |
