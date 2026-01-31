# LangChain → AG-UI Adapter

## Overview
This adapter bridges LangChain/LangGraph agents with the AG-UI protocol, enabling seamless streaming of agent events to the frontend.

## Features
- ✅ Streaming token output (real-time)
- ✅ Tool invocation events
- ✅ Multi-turn conversation support
- ✅ Error handling with AG-UI events

## Tools Available
1. **calculator** - Evaluate mathematical expressions
2. **web_search** - Search the web (simulated)
3. **get_current_time** - Get current date/time

## Usage
```python
from langchain_adapter import LangChainAGUIAdapter

# Create adapter with emitter
adapter = LangChainAGUIAdapter(emitter)

# Process a message
response = await adapter.process_message("What is 2 + 2?")
```

## AG-UI Events Emitted
| LangGraph Event | AG-UI Event |
|-----------------|-------------|
| on_chat_model_stream | TEXT_MESSAGE_CONTENT |
| on_tool_start | TOOL_CALL_START |
| on_tool_end | TOOL_CALL_END, TOOL_CALL_RESULT |
| graph_start | RUN_STARTED |
| graph_end | RUN_FINISHED |
| error | RUN_ERROR |

## Dependencies
- LangChain 0.3.x
- LangGraph 0.2.x
- langchain-ollama (for Ollama integration)
