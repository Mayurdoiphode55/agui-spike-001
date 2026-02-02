"""
LangChain → AG-UI Adapter
Bridges LangChain/LangGraph agents with AG-UI protocol events
Uses Groq API for LLM
Includes UI Action tools for frontend control
"""

import os
import uuid
import asyncio
from typing import Any, Dict, List, Optional
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from typing_extensions import TypedDict, Annotated


class AgentState(TypedDict):
    """State for the LangGraph agent"""
    messages: Annotated[list, add_messages]


# Define tools
@tool
def calculator(expression: str) -> str:
    """
    Evaluate a mathematical expression.
    Examples: "2 + 2", "10 * 5", "100 / 4"
    """
    try:
        allowed_chars = set("0123456789+-*/.() ")
        if not all(c in allowed_chars for c in expression):
            return "Error: Invalid characters in expression"
        result = eval(expression)
        return f"Result: {result}"
    except Exception as e:
        return f"Error: {str(e)}"


@tool
def web_search(query: str) -> str:
    """
    Search the web for information (simulated).
    Returns mock search results for demonstration.
    """
    mock_results = {
        "python": "Python is a high-level programming language known for its simplicity and readability.",
        "ai": "Artificial Intelligence (AI) is the simulation of human intelligence by machines.",
        "langchain": "LangChain is a framework for developing applications powered by language models.",
        "default": f"Search results for '{query}': Found 3 relevant articles about this topic."
    }
    
    query_lower = query.lower()
    for key, value in mock_results.items():
        if key in query_lower:
            return value
    return mock_results["default"]


@tool
def get_current_time() -> str:
    """Get the current date and time"""
    from datetime import datetime
    return f"Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"


# UI Action Tools - These control the frontend!
@tool
def change_background_color(color: str) -> str:
    """
    Change the background color of the application UI.
    Use this when the user asks to change the background color.
    
    Args:
        color: CSS color value like 'blue', 'red', '#ff5500', 'rgb(100,200,50)', etc.
    
    Examples:
        - "Change background to blue" -> change_background_color("blue")
        - "Make it red" -> change_background_color("red")
        - "Set background to #3498db" -> change_background_color("#3498db")
    """
    return f"UI_ACTION:changeBackgroundColor:{color}"


@tool
def change_theme(theme: str) -> str:
    """
    Change the application theme between dark and light mode.
    Use this when the user asks to switch themes.
    
    Args:
        theme: Either 'dark' or 'light'
    
    Examples:
        - "Switch to light mode" -> change_theme("light")
        - "Use dark theme" -> change_theme("dark")
    """
    if theme.lower() not in ['dark', 'light']:
        theme = 'dark'
    return f"UI_ACTION:changeTheme:{theme.lower()}"


@tool
def get_weather(location: str) -> str:
    """
    Get current weather for a location.
    Returns rich data suitable for rendering a weather card.
    
    Args:
        location: City name or location, e.g. "New York", "Mumbai", "London"
    """
    # Mock data with realistic variations based on location content
    loc_lower = location.lower()
    
    # Default values (Nice sunny day)
    temp = 22
    condition = "Sunny"
    humidity = 45
    wind = 12
    feels_like = 24
    
    if "mumbai" in loc_lower:
        temp = 32
        condition = "Humid"
        humidity = 85
        wind = 8
        feels_like = 38
        is_day = False # It's night in the demo maybe?
    elif "london" in loc_lower:
        temp = 15
        condition = "Cloudy"
        humidity = 60
        wind = 18
        feels_like = 14
        is_day = True
    elif "new york" in loc_lower:
        temp = 18
        condition = "Partly Cloudy"
        humidity = 55
        wind = 22
        feels_like = 17
        is_day = True
    elif "snow" in loc_lower or "antarctica" in loc_lower:
        temp = -5
        condition = "Snowy"
        humidity = 80
        wind = 30
        feels_like = -12
        is_day = True
    elif "rain" in loc_lower:
        temp = 20
        condition = "Rainy"
        humidity = 90
        wind = 15
        feels_like = 19
        is_day = False
    else:
        is_day = True

    import json
    data = {
        "location": location.title(),
        "temperature": temp,
        "condition": condition,
        "humidity": humidity,
        "windSpeed": wind,
        "feelsLike": feels_like,
        "isDay": is_day
    }
    
    # Return special COMPONENT prefix for frontend to detect
    return f"COMPONENT:WeatherCard:{json.dumps(data)}"



@tool
def show_notification(message: str, notification_type: str = "info") -> str:
    """
    Show a notification message to the user in the UI.
    Use this to display important messages or confirmations.
    
    Args:
        message: The notification message to display
        notification_type: One of 'info', 'success', 'warning', 'error'
    
    Examples:
        - "Show a success message" -> show_notification("Done!", "success")
        - "Alert the user" -> show_notification("Important update", "warning")
    """
    valid_types = ['info', 'success', 'warning', 'error']
    if notification_type.lower() not in valid_types:
        notification_type = 'info'
    return f"UI_ACTION:showNotification:{message}:{notification_type.lower()}"


@tool
def reset_ui() -> str:
    """
    Reset the UI to its default state.
    Use this when the user asks to reset or restore the original appearance.
    """
    return "UI_ACTION:resetUI"


class LangChainAGUIAdapter:
    """
    Adapter that bridges LangChain/LangGraph with AG-UI protocol.
    Translates LangGraph events to AG-UI events.
    Uses Groq API for LLM.
    Includes UI Action tools for frontend control.
    """
    
    def __init__(self, emitter):
        self.emitter = emitter
        self.tools = [
            calculator, 
            web_search, 
            get_current_time,
            get_weather,  # New tool for backend rendering
            # UI Action tools
            change_background_color,
            change_theme,
            show_notification,
            reset_ui
        ]
        
        groq_api_key = os.getenv("GROQ_API_KEY")
        groq_model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        
        if not groq_api_key:
            raise ValueError("GROQ_API_KEY environment variable is required")
        
        self.llm = ChatGroq(
            api_key=groq_api_key,
            model=groq_model,
            temperature=0.3,  # Lower temp = faster, more deterministic
            streaming=True,
            max_tokens=500  # Limit response length for faster completion
        )
        
        self.llm_with_tools = self.llm.bind_tools(self.tools)
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph agent graph"""
        graph_builder = StateGraph(AgentState)
        
        graph_builder.add_node("agent", self._agent_node)
        graph_builder.add_node("tools", ToolNode(tools=self.tools))
        
        graph_builder.add_edge(START, "agent")
        graph_builder.add_conditional_edges(
            "agent",
            self._should_continue,
            {"continue": "tools", "end": END}
        )
        graph_builder.add_edge("tools", "agent")
        
        return graph_builder.compile()
    
    async def _agent_node(self, state: AgentState) -> Dict[str, Any]:
        """Agent node that calls the LLM"""
        messages = state["messages"]
        response = await self.llm_with_tools.ainvoke(messages)
        return {"messages": [response]}
    
    def _should_continue(self, state: AgentState) -> str:
        """Determine if we should continue to tools or end"""
        messages = state["messages"]
        last_message = messages[-1]
        
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "continue"
        return "end"
    
    def _parse_ui_action(self, tool_output: str) -> Optional[Dict]:
        """Parse UI action from tool output"""
        if not tool_output.startswith("UI_ACTION:"):
            return None
        
        parts = tool_output[10:].split(":", 2)
        action_name = parts[0]
        
        if action_name == "changeBackgroundColor":
            return {"action": "changeBackgroundColor", "args": {"color": parts[1]}}
        elif action_name == "changeTheme":
            return {"action": "changeTheme", "args": {"theme": parts[1]}}
        elif action_name == "showNotification":
            return {
                "action": "showNotification", 
                "args": {"message": parts[1], "type": parts[2] if len(parts) > 2 else "info"}
            }
        elif action_name == "resetUI":
            return {"action": "resetUI", "args": {}}
        
        return None
    
    async def process_message(self, user_input: str, history: List = None) -> str:
        run_id = f"run-{uuid.uuid4().hex[:8]}"
        thread_id = f"thread-{uuid.uuid4().hex[:8]}"
        message_id = f"msg-{uuid.uuid4().hex[:8]}"
        
        await self.emitter.emit_run_started(run_id, thread_id)
        
        messages = []
        
        # System prompt with mandatory tool usage for math
        messages.append(SystemMessage(content="""You are a helpful AI assistant. 

CRITICAL RULES:
1. For ANY math calculation, you MUST use the calculator tool. NEVER compute math in your head - always use the tool.
2. Remember all user details (name, workplace) and recall them when asked.
3. Use UI tools (change_background_color, change_theme, show_notification, reset_ui) when asked.

Available tools: calculator, web_search, get_current_time, change_background_color, change_theme, show_notification, reset_ui."""))
        
        if history:
            for msg in history[:-1]:
                if msg.role == "user":
                    messages.append(HumanMessage(content=msg.content))
                elif msg.role == "assistant":
                    messages.append(AIMessage(content=msg.content))
        
        messages.append(HumanMessage(content=user_input))
        
        state = {"messages": messages}
        
        await self.emitter.emit_text_message_start(message_id, "assistant")
        
        full_response = ""
        
        try:
            async for event in self.graph.astream_events(state, version="v2"):
                event_type = event.get("event")
                
                if event_type == "on_chat_model_stream":
                    chunk = event.get("data", {}).get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        content = chunk.content
                        full_response += content
                        await self.emitter.emit_text_chunk(content, message_id)
                
                elif event_type == "on_tool_start":
                    tool_name = event.get("name", "unknown")
                    tool_input = event.get("data", {}).get("input", {})
                    tool_call_id = f"tool-{uuid.uuid4().hex[:8]}"
                    
                    await self.emitter.emit_tool_call_start(tool_name, tool_call_id, tool_input)
                
                elif event_type == "on_tool_end":
                    tool_output = event.get("data", {}).get("output", "")
                    tool_call_id = f"tool-{uuid.uuid4().hex[:8]}"
                    
                    # Check if this is a UI action
                    ui_action = self._parse_ui_action(str(tool_output))
                    if ui_action:
                        await self.emitter.emit_ui_action(ui_action["action"], ui_action["args"])
                    
                    await self.emitter.emit_tool_call_end(tool_call_id, str(tool_output))
            
            await self.emitter.emit_text_message_end(message_id)
            await self.emitter.emit_run_finished(run_id, thread_id)
            
            return full_response
            
        except Exception as e:
            await self.emitter.emit_run_error(str(e), run_id)
            raise
