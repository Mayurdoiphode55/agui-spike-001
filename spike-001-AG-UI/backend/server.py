"""
AG-UI Backend Server
FastAPI server with WebSocket support for AG-UI protocol
Includes UI Action support with text-based fallback
"""

import os
import sys
import json
import re
import asyncio
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Add adapters to path
sys.path.insert(0, str(Path(__file__).parent.parent / "adapters"))

load_dotenv()

app = FastAPI(title="AG-UI Research Spike Backend", version="1.0.0")

# Storage directory for form submissions
STORAGE_DIR = Path(__file__).parent / "data"
STORAGE_DIR.mkdir(exist_ok=True)
FORM_SUBMISSIONS_FILE = STORAGE_DIR / "form_submissions.json"


def save_form_submission(form_data: Dict, file_data: Optional[Dict] = None, message: str = "") -> Dict:
    """Save form submission to JSON file"""
    submission = {
        "id": f"sub-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}",
        "timestamp": datetime.utcnow().isoformat(),
        "form_data": form_data,
        "file_info": {
            "name": file_data.get("name"),
            "type": file_data.get("type"),
            "size": file_data.get("size")
        } if file_data else None,
        "message": message
    }
    
    # Load existing submissions
    submissions = []
    if FORM_SUBMISSIONS_FILE.exists():
        try:
            with open(FORM_SUBMISSIONS_FILE, "r") as f:
                submissions = json.load(f)
        except json.JSONDecodeError:
            submissions = []
    
    # Add new submission
    submissions.append(submission)
    
    # Save to file
    with open(FORM_SUBMISSIONS_FILE, "w") as f:
        json.dump(submissions, f, indent=2)
    
    print(f"💾 Form submission saved: {submission['id']}")
    return submission


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: str
    content: str
    form_data: Optional[Dict[str, Any]] = None
    file_data: Optional[Dict[str, Any]] = None


class RunRequest(BaseModel):
    messages: List[Message]
    thread_id: Optional[str] = None


def extract_form_data(content: str) -> tuple[str, Optional[Dict]]:
    """Extract form data from message content"""
    form_data = None
    clean_content = content
    
    form_match = re.search(r'\[FORM_DATA\](.*?)\[/FORM_DATA\]', content, re.DOTALL)
    if form_match:
        try:
            form_data = json.loads(form_match.group(1))
            clean_content = re.sub(r'\[FORM_DATA\].*?\[/FORM_DATA\]', '', clean_content, flags=re.DOTALL).strip()
        except json.JSONDecodeError:
            pass
    
    return clean_content, form_data


def extract_file_data(content: str) -> tuple[str, Optional[Dict]]:
    """Extract file data from message content"""
    file_data = None
    clean_content = content
    
    file_match = re.search(r'\[FILE_DATA\](.*?)\[/FILE_DATA\]', content, re.DOTALL)
    if file_match:
        try:
            file_data = json.loads(file_match.group(1))
            clean_content = re.sub(r'\[FILE_DATA\].*?\[/FILE_DATA\]', '', clean_content, flags=re.DOTALL).strip()
        except json.JSONDecodeError:
            pass
    
    return clean_content, file_data


def format_structured_data_for_ai(content: str, form_data: Optional[Dict], file_data: Optional[Dict]) -> str:
    """Format form and file data as readable context for AI"""
    enhanced_content = content
    
    if form_data:
        enhanced_content += "\n\n--- STRUCTURED FORM DATA ---\n"
        if form_data.get('textFields'):
            for key, value in form_data['textFields'].items():
                if value:
                    enhanced_content += f"- {key.replace('_', ' ').title()}: {value}\n"
        if form_data.get('dropdowns'):
            for key, value in form_data['dropdowns'].items():
                enhanced_content += f"- {key.replace('_', ' ').title()}: {value}\n"
        if form_data.get('checkboxes'):
            checked = [k for k, v in form_data['checkboxes'].items() if v]
            if checked:
                enhanced_content += f"- Options: {', '.join(checked)}\n"
    
    if file_data:
        enhanced_content += "\n\n--- ATTACHED FILE ---\n"
        enhanced_content += f"Filename: {file_data.get('name', 'unknown')}\n"
        enhanced_content += f"Type: {file_data.get('type', 'unknown')}\n"
        enhanced_content += f"Size: {file_data.get('size', 0)} bytes\n"
        if file_data.get('content'):
            content_preview = file_data['content'][:5000]  # Limit to 5000 chars for AI context
            enhanced_content += f"\nFile Content:\n```\n{content_preview}\n```\n"
    
    return enhanced_content


def parse_ui_actions_from_text(text: str) -> List[Dict]:
    """Parse UI actions from text - fallback when LLM doesn't use tools properly
    
    NOTE: This function is intentionally strict to avoid false positive triggers.
    It ignores text that appears to be examples, quotes, or documentation.
    """
    actions = []
    lower_text = text.lower()
    
    # Skip parsing if text contains example indicators (avoid false triggers from greeting text)
    example_indicators = ["try:", "(try:", "example:", "e.g.", "such as", "like '", 'like "', "can help you with"]
    if any(indicator in lower_text for indicator in example_indicators):
        return actions  # Don't parse example/help text
    
    # Color patterns - made more strict (must start with imperative)
    color_patterns = [
        r'^change.*background.*(?:to|color)\s*["\']?(\w+)["\']?',  # Must start with "change"
        r'change_background_color\s*\(\s*["\']?(\w+)["\']?\s*\)',
        r'^(?:set|make)\s+(?:the\s+)?background\s+(?:to\s+)?(\w+)',  # Must start with "set/make"
    ]
    
    for pattern in color_patterns:
        match = re.search(pattern, lower_text, re.IGNORECASE | re.MULTILINE)
        if match:
            color = match.group(1)
            if color in ['blue', 'red', 'green', 'yellow', 'purple', 'pink', 'orange', 'black', 'white', 'gray', 'cyan', 'magenta']:
                actions.append({
                    "action": "changeBackgroundColor",
                    "args": {"color": color}
                })
                break
    
    # Theme patterns - must not be in example context
    if 'light theme' in lower_text or 'light mode' in lower_text or "change_theme('light')" in lower_text or 'change_theme("light")' in lower_text:
        # Only trigger if it's an imperative (starts with action words)
        if any(lower_text.startswith(prefix) for prefix in ['use ', 'switch ', 'change ', 'set ']):
            actions.append({"action": "changeTheme", "args": {"theme": "light"}})
    elif 'dark theme' in lower_text or 'dark mode' in lower_text or "change_theme('dark')" in lower_text or 'change_theme("dark")' in lower_text:
        if any(lower_text.startswith(prefix) for prefix in ['use ', 'switch ', 'change ', 'set ']):
            actions.append({"action": "changeTheme", "args": {"theme": "dark"}})
    
    # Notification patterns
    notify_patterns = [
        r'show_notification\s*\(\s*["\'](.+?)["\']',
        r'notification.*saying\s+["\']?(.+?)["\']?\s*$',
    ]
    for pattern in notify_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            actions.append({
                "action": "showNotification",
                "args": {"message": match.group(1), "type": "success"}
            })
            break
    
    # Reset patterns - only if it's an imperative command
    if lower_text.startswith('reset') and 'ui' in lower_text:
        actions.append({"action": "resetUI", "args": {}})
    
    return actions


class EventEmitter:
    """AG-UI Event Emitter - translates events to SSE format"""
    
    def __init__(self):
        self.events = asyncio.Queue()
        self.accumulated_text = ""  # Track all text for UI action detection
    
    async def emit(self, event_type: str, data: dict):
        """Emit an AG-UI event"""
        event = {
            "type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            **data
        }
        await self.events.put(event)
    
    async def emit_text_chunk(self, content: str, message_id: str = "msg-1"):
        """Emit text message chunk (streaming)"""
        self.accumulated_text += content
        await self.emit("TEXT_MESSAGE_CONTENT", {
            "messageId": message_id,
            "delta": content
        })
    
    async def emit_run_started(self, run_id: str = "run-1", thread_id: str = "thread-1"):
        """Emit run started event"""
        self.accumulated_text = ""  # Reset accumulated text
        await self.emit("RUN_STARTED", {
            "runId": run_id,
            "threadId": thread_id
        })
    
    async def emit_run_finished(self, run_id: str = "run-1", thread_id: str = "thread-1"):
        """Emit run finished event"""
        # Check accumulated text for UI actions (fallback)
        ui_actions = parse_ui_actions_from_text(self.accumulated_text)
        for action in ui_actions:
            await self.emit_ui_action(action["action"], action["args"])
        
        await self.emit("RUN_FINISHED", {
            "runId": run_id,
            "threadId": thread_id
        })
    
    async def emit_run_error(self, error: str, run_id: str = "run-1"):
        """Emit run error event"""
        await self.emit("RUN_ERROR", {
            "runId": run_id,
            "message": error
        })
    
    async def emit_tool_call_start(self, tool_name: str, tool_call_id: str, args: dict = None):
        """Emit tool call start event"""
        await self.emit("TOOL_CALL_START", {
            "toolCallId": tool_call_id,
            "toolName": tool_name,
            "args": args
        })
        if args:
            await self.emit("TOOL_CALL_ARGS", {
                "toolCallId": tool_call_id,
                "delta": json.dumps(args)
            })
    
    async def emit_tool_call_end(self, tool_call_id: str, result: str):
        """Emit tool call end event"""
        await self.emit("TOOL_CALL_END", {
            "toolCallId": tool_call_id
        })
        await self.emit("TOOL_CALL_RESULT", {
            "toolCallId": tool_call_id,
            "result": result
        })
    
    async def emit_text_message_start(self, message_id: str = "msg-1", role: str = "assistant"):
        """Emit text message start"""
        await self.emit("TEXT_MESSAGE_START", {
            "messageId": message_id,
            "role": role
        })
    
    async def emit_text_message_end(self, message_id: str = "msg-1"):
        """Emit text message end"""
        await self.emit("TEXT_MESSAGE_END", {
            "messageId": message_id
        })
    
    async def emit_ui_action(self, action: str, args: dict):
        """Emit UI action event for frontend to execute"""
        print(f"🎨 Emitting UI Action: {action} with args: {args}")
        await self.emit("UI_ACTION", {
            "action": action,
            "args": args
        })
    
    async def emit_state_update(self, state: dict):
        """Emit state update for Shared State feature (bidirectional sync)"""
        print(f"📦 Emitting STATE_UPDATE: {state.get('title', 'Recipe')}")
        await self.emit("STATE_UPDATE", {
            "state": state
        })


def get_adapter(adapter_type: str, emitter: EventEmitter):
    """Factory function to get the appropriate adapter"""
    if adapter_type == "langchain":
        from langchain_adapter.adapter import LangChainAGUIAdapter
        return LangChainAGUIAdapter(emitter)
    elif adapter_type == "crewai":
        from crewai_adapter.adapter import CrewAIAGUIAdapter
        return CrewAIAGUIAdapter(emitter)
    elif adapter_type == "mastra":
        raise HTTPException(400, "Mastra adapter runs as separate TypeScript server")
    else:
        raise HTTPException(400, f"Unknown adapter: {adapter_type}")


async def generate_sse_events(emitter: EventEmitter):
    """Generate SSE events from the emitter queue"""
    while True:
        try:
            event = await asyncio.wait_for(emitter.events.get(), timeout=30.0)
            if event["type"] == "DONE":
                yield f"data: {json.dumps(event)}\n\n"
                break
            yield f"data: {json.dumps(event)}\n\n"
        except asyncio.TimeoutError:
            yield f": keepalive\n\n"


@app.post("/api/copilotkit")
async def copilotkit_endpoint(request: RunRequest):
    """
    Main AG-UI endpoint compatible with CopilotKit
    Returns Server-Sent Events stream
    """
    adapter_type = os.getenv("AGUI_ADAPTER", "langchain")
    emitter = EventEmitter()
    
    async def run_agent():
        try:
            adapter = get_adapter(adapter_type, emitter)
            
            # Get the last user message
            user_message = ""
            form_data = None
            file_data = None
            
            for msg in reversed(request.messages):
                if msg.role == "user":
                    user_message = msg.content
                    break
            
            if not user_message:
                await emitter.emit_run_error("No user message provided")
                await emitter.emit("DONE", {})
                return
            
            # Extract form and file data from message content
            user_message, form_data = extract_form_data(user_message)
            user_message, file_data = extract_file_data(user_message)
            
            # Log structured data if present
            if form_data:
                print(f"📋 Form data received: {json.dumps(form_data, indent=2)}")
                # Save form submission to storage
                save_form_submission(form_data, file_data, user_message)
            if file_data:
                print(f"📎 File data received: {file_data.get('name')} ({file_data.get('size')} bytes)")
            
            # Format structured data for AI context
            enhanced_message = format_structured_data_for_ai(user_message, form_data, file_data)
            
            # Check for UI actions in user input directly (immediate response)
            input_actions = parse_ui_actions_from_text(user_message)
            for action in input_actions:
                await emitter.emit_ui_action(action["action"], action["args"])
            
            # Run the adapter with enhanced message
            await adapter.process_message(enhanced_message, request.messages)
            
        except Exception as e:
            print(f"Error: {e}")
            await emitter.emit_run_error(str(e))
        finally:
            await emitter.emit("DONE", {})
    
    # Start agent processing in background
    asyncio.create_task(run_agent())
    
    return StreamingResponse(
        generate_sse_events(emitter),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "adapter": os.getenv("AGUI_ADAPTER", "langchain")}


@app.get("/api/submissions")
async def get_submissions():
    """Get all stored form submissions"""
    if not FORM_SUBMISSIONS_FILE.exists():
        return {"submissions": [], "count": 0}
    
    try:
        with open(FORM_SUBMISSIONS_FILE, "r") as f:
            submissions = json.load(f)
        return {"submissions": submissions, "count": len(submissions)}
    except json.JSONDecodeError:
        return {"submissions": [], "count": 0, "error": "Failed to parse submissions file"}


@app.delete("/api/submissions")
async def clear_submissions():
    """Clear all stored form submissions"""
    if FORM_SUBMISSIONS_FILE.exists():
        FORM_SUBMISSIONS_FILE.unlink()
    return {"message": "All submissions cleared", "success": True}


@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "name": "AG-UI Research Spike Backend",
        "version": "1.0.0",
        "endpoints": {
            "/api/copilotkit": "POST - Main AG-UI endpoint (SSE)",
            "/api/submissions": "GET - View stored form submissions",
            "/api/submissions (DELETE)": "DELETE - Clear all submissions",
            "/health": "GET - Health check"
        },
        "ui_actions": ["changeBackgroundColor", "changeTheme", "showNotification", "resetUI"]
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", 8005))
    uvicorn.run(app, host="0.0.0.0", port=port)
