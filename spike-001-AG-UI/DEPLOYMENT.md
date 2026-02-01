# AG-UI Deployment Guide for Render

This guide will help you deploy the AG-UI application to Render.com.

## Prerequisites

1. GitHub repository with your code pushed
2. Render.com account (free tier works)
3. Groq API key

## Deployment Steps

### Option 1: Using render.yaml (Recommended)

1. **Push render.yaml to GitHub:**
   ```bash
   git add render.yaml
   git commit -m "docs: add Render deployment configuration"
   git push origin main
   ```

2. **Deploy on Render:**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository `Mayurdoiphode55/agui-spike-001`
   - Render will automatically detect `render.yaml` and create all services

3. **Set Environment Variables:**
   - In Render dashboard, go to each service
   - Click "Environment" tab
   - Add your `GROQ_API_KEY`

### Option 2: Manual Service Creation

#### 1. Deploy Backend (FastAPI)

**Create Web Service:**
- Name: `agui-backend`
- Runtime: `Python 3`
- Build Command: `pip install -r backend/requirements.txt`
- Start Command: `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`

**Environment Variables:**
```
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
AGUI_ADAPTER=langchain
PYTHON_VERSION=3.11.0
```

**Note the URL:** `https://agui-backend.onrender.com`

#### 2. Deploy Mastra Adapter (Node.js)

**Create Web Service:**
- Name: `agui-mastra`
- Runtime: `Node`
- Build Command: `cd adapters/mastra && npm install && npm run build`
- Start Command: `cd adapters/mastra && npm start`

**Environment Variables:**
```
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
PORT=8001
```

**Update adapters/mastra/package.json** (if needed):
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsx watch server.ts"
  }
}
```

**Note the URL:** `https://agui-mastra.onrender.com`

#### 3. Deploy Frontend (Static Site)

**Create Static Site:**
- Name: `agui-frontend`
- Build Command: `cd frontend && npm install && npm run build`
- Publish Directory: `frontend/dist`

**Environment Variables:**
```
VITE_BACKEND_URL=https://agui-backend.onrender.com
VITE_MASTRA_URL=https://agui-mastra.onrender.com
```

**Update frontend/.env.production:**
```bash
VITE_BACKEND_URL=https://agui-backend.onrender.com
VITE_MASTRA_URL=https://agui-mastra.onrender.com
```

## CORS Configuration

Make sure your backend allows frontend origin. Update `backend/server.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://agui-frontend.onrender.com",  # Your Render frontend URL
        "http://localhost:5173",  # Local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## WebSocket Configuration

Update WebSocket connection URLs in frontend to use `wss://` instead of `ws://`:

```javascript
// frontend/src/config.js or similar
const WS_URL = import.meta.env.PROD 
  ? 'wss://agui-backend.onrender.com/ws'
  : 'ws://localhost:8000/ws';
```

## Post-Deployment

1. **Test all three adapters:**
   - Visit: `https://agui-frontend.onrender.com`
   - Click "LangChain" → Send test message
   - Click "Mastra" → Send test message
   - Click "CrewAI" → Send test message

2. **Monitor Logs:**
   - Go to each service in Render dashboard
   - Click "Logs" tab
   - Check for errors

3. **Performance:**
   - Free tier: Services sleep after 15 min inactivity
   - First request after sleep: ~30s cold start
   - Consider upgrading to paid tier for production

## Troubleshooting

### Backend won't start
- Check Python version is 3.11+
- Verify all dependencies in requirements.txt
- Check Render logs for errors

### Frontend can't connect to backend
- Verify CORS settings in backend
- Check WebSocket URL uses `wss://`
- Ensure environment variables are set

### Mastra adapter fails
- Verify Node.js version is 18+
- Check TypeScript compilation succeeded
- Ensure GROQ_API_KEY is set

## Cost Estimate

**Free Tier:**
- Backend: 512 MB RAM, 0.1 CPU (sleeps after 15 min)
- Frontend: Static site (unlimited bandwidth)
- Mastra: 512 MB RAM, 0.1 CPU (sleeps after 15 min)
- **Total: $0/month**

**Paid Tier (Recommended for Production):**
- Backend: $7/month (always on)
- Mastra: $7/month (always on)
- Frontend: Free
- **Total: $14/month**

## Useful Commands

```bash
# Check deployment status
curl https://agui-backend.onrender.com/health

# Test WebSocket connection
wscat -c wss://agui-backend.onrender.com/ws

# View logs in real-time
# (Use Render dashboard Logs tab)
```

## Next Steps

1. Set up custom domain (optional)
2. Configure environment-specific secrets
3. Set up monitoring/alerting
4. Consider adding caching layer (Redis) for production

## Support

For issues:
- Render Docs: https://docs.render.com/
- AG-UI Repo: https://github.com/Mayurdoiphode55/agui-spike-001
- Contact: research@theoremlabs.io
