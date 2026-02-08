# CrewAI → AG-UI Adapter

## Overview
This adapter bridges CrewAI multi-agent crews with the AG-UI protocol.

## Features
- ✅ Multi-agent crew (Researcher + Writer)
- ✅ Simulated streaming output (CrewAI is synchronous)
- ✅ Tool/Agent invocation events
- ✅ Error handling

## Agents
1. **Research Analyst** - Gathers information and key insights
2. **Content Writer** - Creates clear, engaging responses

## Usage
```python
from crewai_adapter import CrewAIAGUIAdapter

# Create adapter with emitter
adapter = CrewAIAGUIAdapter(emitter)

# Process a message  
response = await adapter.process_message("Research AI trends")
```

## Limitations
- CrewAI doesn't support native streaming
- Output is chunked/simulated for streaming effect
- Multi-turn context is limited

## AG-UI Events Emitted
| CrewAI Phase | AG-UI Event |
|--------------|-------------|
| Crew setup | STEP_STARTED |
| Agent working | TOOL_CALL_START |
| Agent complete | TOOL_CALL_END |
| Final output | TEXT_MESSAGE_CONTENT (chunked) |
