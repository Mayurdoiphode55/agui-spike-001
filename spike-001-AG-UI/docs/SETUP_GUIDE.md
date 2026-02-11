# AG-UI Setup Guide

## Prerequisites

### 1. Python 3.10+
```bash
# Check version
python --version
```

### 2. Node.js 18+
```bash
# Check version
node --version
```

### 3. Groq API Key (Free)
1. Go to: https://console.groq.com/keys
2. Create a free account
3. Generate an API key
4. Copy it to your `.env` file

## Installation

### Option 1: Automatic Setup (Windows)
```bash
cd spike-001-AG-UI
setup.bat
```

### Option 2: Manual Setup

#### Backend
```bash
cd spike-001-AG-UI/backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt
```

#### Frontend
```bash
cd spike-001-AG-UI/frontend
npm install
```

#### Mastra Adapter (Optional)
```bash
cd spike-001-AG-UI/adapters/mastra
npm install
```

## Running the Application

### 1. Start Backend (Terminal 1)
```bash
cd spike-001-AG-UI/backend
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```
Server runs at: http://localhost:8000

### 2. Start Frontend (Terminal 2)
```bash
cd spike-001-AG-UI/frontend
npm run dev
```
Frontend runs at: http://localhost:5173

### 3. (Optional) Start Mastra Backend (Terminal 3)
```bash
cd spike-001-AG-UI/adapters/mastra
npx ts-node server.ts
```
Mastra server runs at: http://localhost:8001

## Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:

```env
# LLM Configuration (Groq API)
# Get your key from: https://console.groq.com/keys
GROQ_API_KEY=gsk_YOUR_API_KEY_HERE
GROQ_MODEL=llama-3.1-8b-instant

# Server Ports
BACKEND_PORT=8000
FRONTEND_PORT=5173
MASTRA_PORT=8001

# Active Adapter: langchain, crewai, or mastra
AGUI_ADAPTER=langchain
```

## Switching Adapters

Use the UI dropdown to switch between:
- **LangChain** - Default, uses LangGraph
- **Mastra** - TypeScript adapter (requires separate server)
- **CrewAI** - Multi-agent framework

## Troubleshooting

### Groq API Error
- Verify your `GROQ_API_KEY` is set correctly in `.env`
- Check if your API key is valid at https://console.groq.com
- Ensure you haven't exceeded the free tier rate limits

### Backend Connection Error
1. Verify backend is running on port 8000
2. Check CORS settings in server.py
3. Verify Groq API key is set in `.env`

### Frontend Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Running Benchmarks

```bash
cd spike-001-AG-UI/benchmarks
python benchmark.py
```

Results saved to: `logs/performance.json`
