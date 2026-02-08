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

### 3. Ollama (Local LLM)
1. Download from: https://ollama.com/download
2. Install and start the service
3. Pull the required model:
```bash
ollama pull llama3.1:8b
```

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

### 1. Start Ollama
```bash
ollama serve
```

### 2. Start Backend (Terminal 1)
```bash
cd spike-001-AG-UI/backend
python server.py
```
Server runs at: http://localhost:8000

### 3. Start Frontend (Terminal 2)
```bash
cd spike-001-AG-UI/frontend
npm run dev
```
Frontend runs at: http://localhost:5173

### 4. (Optional) Start Mastra Backend (Terminal 3)
```bash
cd spike-001-AG-UI/adapters/mastra
npm run dev
```
Mastra server runs at: http://localhost:8001

## Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:

```env
# LLM Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# Server Ports
BACKEND_PORT=8000
FRONTEND_PORT=5173

# Adapter Selection
AGUI_ADAPTER=langchain  # Options: langchain, crewai
```

## Switching Adapters

Use the UI dropdown to switch between:
- **LangChain** - Default, uses LangGraph
- **Mastra** - TypeScript adapter (requires separate server)
- **CrewAI** - Multi-agent framework

## Troubleshooting

### Ollama Not Responding
```bash
# Check if running
curl http://localhost:11434/api/tags

# Restart if needed
ollama serve
```

### Backend Connection Error
1. Verify backend is running on port 8000
2. Check CORS settings in server.py
3. Verify Ollama is accessible

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
