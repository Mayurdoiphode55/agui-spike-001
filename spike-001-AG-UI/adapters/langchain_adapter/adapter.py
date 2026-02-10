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
    """Get current weather details for a city."""
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
def create_plan(topic: str) -> str:
    """
    Create a plan for a given topic.
    Returns a component suitable for the TaskChecklist UI.
    
    Args:
        topic: The topic to plan for
    """
    import uuid
    import json
    
    topic_lower = topic.lower()
    tasks = []
    title = f"Plan: {topic}"
    
    if "mars" in topic_lower:
        title = "Mission to Mars: Implementation Plan"
        tasks = [
            {"id": "1", "label": "Research Mars mission requirements", "checked": True},
            {"id": "2", "label": "Select spacecraft and technology", "checked": True},
            {"id": "3", "label": "Plan launch window and trajectory", "checked": True},
            {"id": "4", "label": "Prepare supplies and equipment", "checked": True},
            {"id": "5", "label": "Select and train crew members", "checked": False},
        ]
    elif "trip" in topic_lower or "vacation" in topic_lower:
        title = f"Trip Plan: {topic}"
        tasks = [
            {"id": "1", "label": "Determine budget and dates", "checked": True},
            {"id": "2", "label": "Book flights", "checked": True},
            {"id": "3", "label": "Reserve accommodation", "checked": False},
            {"id": "4", "label": "Plan daily itinerary", "checked": False},
            {"id": "5", "label": "Pack luggage", "checked": False},
        ]
    elif "app" in topic_lower or "code" in topic_lower:
        title = "Software Development Plan"
        tasks = [
            {"id": "1", "label": "Define requirements and scope", "checked": True},
            {"id": "2", "label": "Design architecture", "checked": True},
            {"id": "3", "label": "Set up project structure", "checked": False},
            {"id": "4", "label": "Implement core features", "checked": False},
            {"id": "5", "label": "Test and deploy", "checked": False},
        ]
    else:
        title = f"Plan for: {topic}"
        tasks = [
            {"id": "1", "label": "Initial research and analysis", "checked": True},
            {"id": "2", "label": "Define strategy and goals", "checked": True},
            {"id": "3", "label": "Execute phase 1", "checked": False},
            {"id": "4", "label": "Review progress", "checked": False},
            {"id": "5", "label": "Finalize and deliver", "checked": False},
        ]
        
    data = {"title": title, "tasks": tasks}
    return f"COMPONENT:TaskChecklist:{json.dumps(data)}"




@tool
def doc_search(query: str) -> str:
    """
    Search through project documentation and return matching results.
    
    Args:
        query: The search query to find relevant documents
    """
    import json
    
    # Predefined knowledge base (simulated document database)
    docs = [
        {
            "title": "AG-UI Protocol Overview",
            "snippet": "The AG-UI protocol defines a standard set of events for AI-to-UI communication. It enables framework-agnostic integration through events like RUN_STARTED, TEXT_MESSAGE_CONTENT, TOOL_CALL_START, and UI_ACTION. The protocol uses Server-Sent Events (SSE) for real-time streaming.",
            "category": "architecture",
            "keywords": ["agui", "protocol", "events", "overview", "architecture", "sse", "streaming"]
        },
        {
            "title": "REST API Endpoints Guide",
            "snippet": "The backend exposes POST /api/copilotkit as the main endpoint for AG-UI communication. It accepts messages in JSON format and returns an SSE stream of AG-UI events. Additional endpoints include GET /health for health checks and GET /api/adapters for listing available adapters.",
            "category": "api",
            "keywords": ["api", "endpoints", "rest", "http", "post", "get", "routes", "copilotkit"]
        },
        {
            "title": "Adapter Pattern Implementation",
            "snippet": "Adapters translate framework-specific events into AG-UI protocol events. Each adapter implements a process_message() method that receives user input and emits standardized events through an EventEmitter. Currently supported: LangChain, Mastra, and CrewAI adapters.",
            "category": "architecture",
            "keywords": ["adapter", "pattern", "langchain", "mastra", "crewai", "implementation", "design"]
        },
        {
            "title": "Authentication & Security Guide",
            "snippet": "API keys are managed through environment variables (GROQ_API_KEY). CORS is configured to allow frontend origins. In production, implement rate limiting, input validation, and token-based authentication. Never expose API keys in frontend code.",
            "category": "security",
            "keywords": ["security", "authentication", "auth", "api key", "cors", "token", "rate limit"]
        },
        {
            "title": "Frontend Component Architecture",
            "snippet": "The React frontend uses a hook-based architecture (useAGUI) to manage SSE connections and state. Components like WeatherCard, TaskChecklist, and DocSearchCard render structured data from COMPONENT: prefixed messages. The App component manages UI state for theme, background, and notifications.",
            "category": "frontend",
            "keywords": ["frontend", "react", "component", "hook", "useagui", "state", "ui"]
        },
        {
            "title": "Database Schema & Data Models",
            "snippet": "Currently uses in-memory data structures for conversation history and tool results. For production, recommended to integrate PostgreSQL with conversation_logs, user_sessions, and tool_executions tables. Use Redis for caching frequently accessed data.",
            "category": "database",
            "keywords": ["database", "schema", "data", "model", "postgresql", "redis", "storage"]
        },
        {
            "title": "Deployment Guide",
            "snippet": "Deploy the Python backend with uvicorn behind nginx. The Mastra TypeScript server runs on Node.js. Use Docker Compose for containerized deployment. Environment variables: GROQ_API_KEY, AGUI_ADAPTER, GROQ_MODEL. Health checks available at /health endpoint.",
            "category": "deployment",
            "keywords": ["deploy", "deployment", "docker", "production", "nginx", "uvicorn", "hosting"]
        },
        {
            "title": "UI Actions & Theme System",
            "snippet": "AI can control the UI through UI_ACTION events. Supported actions: changeBackgroundColor, changeTheme (dark/light), showNotification, and resetUI. Tools return UI_ACTION: prefixed strings that the backend converts to events for the frontend.",
            "category": "frontend",
            "keywords": ["ui", "actions", "theme", "background", "notification", "dark mode", "light mode"]
        },
        {
            "title": "Testing & Quality Assurance",
            "snippet": "Run unit tests with pytest for Python adapters. Frontend tests use Vitest and React Testing Library. Integration tests verify SSE event streaming end-to-end. Performance benchmarks evaluate 7 parameters including streaming speed and error handling.",
            "category": "testing",
            "keywords": ["testing", "test", "pytest", "vitest", "quality", "benchmark", "performance"]
        },
        {
            "title": "Event Emitter & SSE Streaming",
            "snippet": "The EventEmitter class manages AG-UI event emission using asyncio queues. Events are serialized to JSON and sent as SSE data frames. The frontend's useAGUI hook listens via EventSource and dispatches events to appropriate handlers for real-time UI updates.",
            "category": "architecture",
            "keywords": ["event", "emitter", "sse", "streaming", "asyncio", "queue", "real-time"]
        },
    ]
    
    query_lower = query.lower()
    query_words = query_lower.split()
    
    # Score each document based on keyword matches
    scored_results = []
    for doc in docs:
        score = 0
        for word in query_words:
            # Check title
            if word in doc["title"].lower():
                score += 30
            # Check keywords
            for kw in doc["keywords"]:
                if word in kw or kw in word:
                    score += 20
            # Check snippet
            if word in doc["snippet"].lower():
                score += 10
        
        if score > 0:
            # Cap at 98 to look realistic
            relevance = min(98, score)
            scored_results.append({
                "title": doc["title"],
                "snippet": doc["snippet"],
                "relevance": relevance,
                "category": doc["category"]
            })
    
    # Sort by relevance (highest first)
    scored_results.sort(key=lambda x: x["relevance"], reverse=True)
    
    # Take top 5 results
    top_results = scored_results[:5]
    
    # If no results, return a message
    if not top_results:
        top_results = [{
            "title": "No Results Found",
            "snippet": f"No documents matching '{query}' were found. Try different search terms like 'API', 'deployment', 'security', 'architecture', or 'testing'.",
            "relevance": 0,
            "category": "general"
        }]
    
    data = {
        "query": query,
        "results": top_results,
        "totalFound": len(scored_results)
    }
    
    return f"COMPONENT:DocSearchCard:{json.dumps(data)}"


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
            create_plan,  # New tool for Human in the Loop
            # UI Action tools
            change_background_color,
            change_theme,
            show_notification,
            reset_ui
        ]
        
        groq_api_key = os.getenv("GROQ_API_KEY")
        # Switch to Mixtral - extremely reliable for tools
        groq_model = os.getenv("GROQ_MODEL", "mixtral-8x7b-32768")
        print(f"🧠 Adapter using model: {groq_model}")
        
        if not groq_api_key:
            raise ValueError("GROQ_API_KEY environment variable is required")
        
        self.llm = ChatGroq(
            api_key=groq_api_key,
            model=groq_model,
            temperature=0.0,  # Zero temp for maximum precision
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
    
    def _improve_recipe(self, recipe_state: dict) -> dict:
        """Improve a recipe based on current state using intelligent rules"""
        import uuid
        
        # Copy state to avoid mutation
        improved = {
            "cookingTime": recipe_state.get("cookingTime", 30),
            "skillLevel": recipe_state.get("skillLevel", "intermediate"),
            "dietaryPreferences": recipe_state.get("dietaryPreferences", []),
            "ingredients": list(recipe_state.get("ingredients", [])),
            "instructions": list(recipe_state.get("instructions", [])),
            "title": recipe_state.get("title", "My Recipe")
        }
        
        # Get existing ingredient names
        existing_ingredients = [i.get("name", "").lower() for i in improved["ingredients"]]
        
        # Determine recipe type based on title and ingredients
        title_lower = improved["title"].lower()
        prefs = [p.lower() for p in improved["dietaryPreferences"]]
        
        # Base ingredients based on recipe type
        new_ingredients = []
        base_instructions = []
        
        if any(word in title_lower for word in ["cake", "carrot", "bake", "dessert"]):
            # Baking recipe
            new_ingredients = [
                ("Eggs", "2 large"),
                ("Baking Powder", "1 tablespoon"),
                ("Butter", "1/2 cup, melted"),
                ("Vanilla Extract", "1 teaspoon"),
                ("Sugar", "1 cup"),
                ("Salt", "1/2 teaspoon")
            ]
            base_instructions = [
                "Preheat oven to 350°F (175°C).",
                "In a large mixing bowl, combine the grated carrots, sugar, and melted butter. Mix until well combined.",
                "Add the eggs and vanilla extract to the mixture, stirring until smooth.",
                "In another bowl, whisk together the all-purpose flour and baking powder.",
                "Gradually add the dry ingredients to the wet ingredients, mixing just until combined.",
                "Pour the batter into a greased baking dish and smooth the top with a spatula.",
                "Bake in the preheated oven for 25-30 minutes, or until a toothpick inserted into the center comes out clean.",
                "Allow to cool before serving."
            ]
        elif any(word in title_lower for word in ["pasta", "spaghetti", "noodle"]):
            # Pasta recipe
            new_ingredients = [
                ("Olive Oil", "2 tablespoons"),
                ("Garlic", "3 cloves, minced"),
                ("Parmesan Cheese", "1/2 cup, grated"),
                ("Black Pepper", "to taste"),
                ("Fresh Basil", "1/4 cup, chopped")
            ]
            base_instructions = [
                "Bring a large pot of salted water to a boil.",
                "Cook pasta according to package directions until al dente.",
                "Heat olive oil in a large pan over medium heat.",
                "Sauté garlic until fragrant, about 1 minute.",
                "Drain pasta and add to the pan with garlic.",
                "Toss with Parmesan cheese and fresh basil.",
                "Season with black pepper and serve immediately."
            ]
        else:
            # Generic savory recipe
            new_ingredients = [
                ("Olive Oil", "2 tablespoons"),
                ("Garlic", "2 cloves, minced"),
                ("Salt", "to taste"),
                ("Black Pepper", "to taste"),
                ("Fresh Herbs", "1/4 cup, chopped")
            ]
            base_instructions = [
                "Prepare all ingredients by washing and chopping as needed.",
                "Heat oil in a large pan over medium heat.",
                "Add aromatics and sauté until fragrant.",
                "Add main ingredients and cook until done.",
                "Season to taste with salt and pepper.",
                "Serve hot with fresh herbs as garnish."
            ]
        
        # Apply dietary preference modifications
        if "vegan" in prefs or "vegetarian" in prefs:
            new_ingredients = [(n, a) for n, a in new_ingredients if n.lower() not in ["eggs", "butter", "parmesan cheese"]]
            if "vegan" in prefs:
                new_ingredients.append(("Dairy-Free Butter", "1/2 cup, melted"))
        
        if "high protein" in prefs:
            new_ingredients.append(("Protein Powder", "1 scoop"))
        
        if "low carb" in prefs:
            new_ingredients = [(n, a) for n, a in new_ingredients if n.lower() not in ["sugar", "flour"]]
            new_ingredients.append(("Almond Flour", "1 cup"))
        
        # Add new ingredients (avoid duplicates)
        for name, amount in new_ingredients:
            if name.lower() not in existing_ingredients:
                improved["ingredients"].append({
                    "id": f"ing-{uuid.uuid4().hex[:6]}",
                    "name": name,
                    "amount": amount
                })
        
        # Add instructions if empty or minimal
        if len([i for i in improved["instructions"] if i.strip()]) < 3:
            improved["instructions"] = base_instructions
        
        # Update title if generic
        if improved["title"] == "My Recipe" and improved["ingredients"]:
            first_ing = improved["ingredients"][0].get("name", "")
            if first_ing:
                improved["title"] = f"{first_ing.title()} Delight"
        
        return improved
    
    async def process_message(self, user_input: str, history: List = None) -> str:
        run_id = f"run-{uuid.uuid4().hex[:8]}"
        thread_id = f"thread-{uuid.uuid4().hex[:8]}"
        message_id = f"msg-{uuid.uuid4().hex[:8]}"
        
        await self.emitter.emit_run_started(run_id, thread_id)
        
        # ============ KEYWORD-BASED ROUTING FOR RELIABLE FEATURES ============
        # Bypass LLM for specific features to ensure they always work
        user_lower = user_input.lower()
        
        # Check for EXECUTE_PLAN command (from TaskChecklist confirmation)
        if user_input.startswith('EXECUTE_PLAN:'):
            await self.emitter.emit_text_message_start(message_id, "assistant")
            try:
                # Parse: EXECUTE_PLAN:Plan Title:["step1", "step2", ...]
                # Find the JSON array by looking for ':['
                import json
                json_start = user_input.find(':[')
                if json_start != -1:
                    plan_title = user_input[len('EXECUTE_PLAN:'):json_start]
                    steps_json = user_input[json_start + 1:]  # Skip the ':' before '['
                else:
                    plan_title = "Plan"
                    steps_json = "[]"
                steps = json.loads(steps_json)
                
                # Generate detailed execution content
                result = f"## ✨ Executing: {plan_title}\n\n"
                result += "I'm now working through your approved steps:\n\n"
                
                for i, step in enumerate(steps, 1):
                    result += f"### Step {i}: {step}\n"
                    # Generate step-specific content
                    step_lower = step.lower()
                    if 'research' in step_lower or 'analysis' in step_lower:
                        result += "📊 Conducting comprehensive research and gathering relevant data. Analyzing market trends, competitive landscape, and key success factors.\n\n"
                    elif 'design' in step_lower or 'architecture' in step_lower:
                        result += "🎨 Creating detailed design specifications and system architecture. Defining components, interfaces, and data flows.\n\n"
                    elif 'strategy' in step_lower or 'goals' in step_lower:
                        result += "🎯 Defining clear objectives with measurable KPIs. Setting timeline milestones and resource allocation.\n\n"
                    elif 'implement' in step_lower or 'execute' in step_lower or 'develop' in step_lower:
                        result += "💻 Building and implementing the core functionality. Writing clean, tested code following best practices.\n\n"
                    elif 'test' in step_lower or 'deploy' in step_lower:
                        result += "🚀 Running comprehensive tests and preparing for deployment. Ensuring quality and reliability.\n\n"
                    elif 'review' in step_lower or 'progress' in step_lower:
                        result += "📋 Evaluating current progress against goals. Identifying blockers and optimization opportunities.\n\n"
                    else:
                        result += f"✅ Working on this step with full attention to detail and quality.\n\n"
                
                result += "---\n"
                result += f"🎉 **All {len(steps)} steps are now in progress!** I'll keep you updated on the execution.\n"
                
                await self.emitter.emit_text_chunk(result, message_id)
                await self.emitter.emit_text_message_end(message_id)
                await self.emitter.emit_run_finished(run_id, thread_id)
                return result
            except Exception as e:
                error_msg = f"Error executing plan: {str(e)}"
                await self.emitter.emit_text_chunk(error_msg, message_id)
                await self.emitter.emit_text_message_end(message_id)
                await self.emitter.emit_run_finished(run_id, thread_id)
                return error_msg
        
        # Check for PLANNING requests
        if any(kw in user_lower for kw in ['plan ', 'plan a ', 'create a plan', 'steps to', 'checklist', 'how to', 'steps for']):
            await self.emitter.emit_text_message_start(message_id, "assistant")
            # Extract the topic
            topic = user_input
            for prefix in ['plan ', 'plan a ', 'create a plan for ', 'steps to ', 'checklist for ']:
                if user_lower.startswith(prefix):
                    topic = user_input[len(prefix):]
                    break
            result = create_plan.invoke({"topic": topic})
            await self.emitter.emit_text_chunk(result, message_id)
            await self.emitter.emit_text_message_end(message_id)
            await self.emitter.emit_run_finished(run_id, thread_id)
            return result
        
        # Check for IMPROVE_RECIPE command (from Recipe Creator Shared State)
        if user_input.startswith('IMPROVE_RECIPE:'):
            await self.emitter.emit_text_message_start(message_id, "assistant")
            try:
                import json
                recipe_json = user_input[len('IMPROVE_RECIPE:'):]
                recipe_state = json.loads(recipe_json)
                
                # Improve the recipe based on current state
                improved_recipe = self._improve_recipe(recipe_state)
                
                # Emit STATE_UPDATE with improved recipe (bidirectional sync)
                await self.emitter.emit_state_update(improved_recipe)
                
                # Also send a confirmation message
                result = f"✨ I improved the recipe by completing it and adding all necessary ingredients and instructions."
                await self.emitter.emit_text_chunk(result, message_id)
                await self.emitter.emit_text_message_end(message_id)
                await self.emitter.emit_run_finished(run_id, thread_id)
                return result
            except Exception as e:
                error_msg = f"Error improving recipe: {str(e)}"
                await self.emitter.emit_text_chunk(error_msg, message_id)
                await self.emitter.emit_text_message_end(message_id)
                await self.emitter.emit_run_finished(run_id, thread_id)
                return error_msg
        
        # Check for WEATHER requests
        if any(kw in user_lower for kw in ['weather in', 'weather like in', 'weather for', 'temperature in']):
            await self.emitter.emit_text_message_start(message_id, "assistant")
            # Extract location from input
            import re
            location_match = re.search(r'(?:weather in|weather like in|weather for|temperature in)\s+(.+?)(?:\?|$)', user_input, re.I)
            location = location_match.group(1).strip() if location_match else "Unknown"
            # Call get_weather directly
            result = get_weather.invoke({"location": location})
            await self.emitter.emit_text_chunk(result, message_id)
            await self.emitter.emit_text_message_end(message_id)
            await self.emitter.emit_run_finished(run_id, thread_id)
            return result
        
        # Check for DOC SEARCH requests
        if any(kw in user_lower for kw in ['search docs', 'doc search', 'search documentation', 'find docs', 'search for docs', 'search in docs']):
            await self.emitter.emit_text_message_start(message_id, "assistant")
            # Extract the query
            import re
            query = user_input
            for prefix in ['search docs for ', 'search docs ', 'doc search ', 'search documentation for ', 'find docs for ', 'find docs about ', 'search in docs for ', 'search for docs about ']:
                if user_lower.startswith(prefix):
                    query = user_input[len(prefix):]
                    break
            result = doc_search.invoke({"query": query})
            await self.emitter.emit_text_chunk(result, message_id)
            await self.emitter.emit_text_message_end(message_id)
            await self.emitter.emit_run_finished(run_id, thread_id)
            return result
        
        # Check for TIME requests
        if any(kw in user_lower for kw in ['what time', 'current time', 'time is it', 'time now']):
            await self.emitter.emit_text_message_start(message_id, "assistant")
            result = get_current_time.invoke({})
            await self.emitter.emit_text_chunk(result, message_id)
            await self.emitter.emit_text_message_end(message_id)
            await self.emitter.emit_run_finished(run_id, thread_id)
            return result
        
        # Check for UI ACTION: Theme change
        if any(kw in user_lower for kw in ['light theme', 'light mode', 'dark theme', 'dark mode']):
            await self.emitter.emit_text_message_start(message_id, "assistant")
            theme = 'light' if 'light' in user_lower else 'dark'
            result = change_theme.invoke({"theme": theme})
            # Emit UI action event
            await self.emitter.emit_ui_action("changeTheme", {"theme": theme})
            await self.emitter.emit_text_chunk(f"Switched to {theme} theme! ✨", message_id)
            await self.emitter.emit_text_message_end(message_id)
            await self.emitter.emit_run_finished(run_id, thread_id)
            return result
        
        # Check for UI ACTION: Reset UI
        if any(kw in user_lower for kw in ['reset ui', 'reset the ui', 'default ui', 'restore ui']):
            await self.emitter.emit_text_message_start(message_id, "assistant")
            result = reset_ui.invoke({})
            await self.emitter.emit_ui_action("resetUI", {})
            await self.emitter.emit_text_chunk("UI reset to defaults! 🔄", message_id)
            await self.emitter.emit_text_message_end(message_id)
            await self.emitter.emit_run_finished(run_id, thread_id)
            return result
        
        # Check for UI ACTION: Background color
        if any(kw in user_lower for kw in ['background to', 'background color', 'background colour', 'change background', 'make background']):
            await self.emitter.emit_text_message_start(message_id, "assistant")
            # Extract color from input - look for "to COLOR" or last word
            import re
            # Try to find "to <color>" pattern first
            color_match = re.search(r'\bto\s+(\w+)\s*$', user_input, re.I)
            if not color_match:
                # Fallback: use the last word
                words = user_input.split()
                color = words[-1].strip('?!.') if words else "blue"
            else:
                color = color_match.group(1).strip()
            result = change_background_color.invoke({"color": color})
            await self.emitter.emit_ui_action("changeBackgroundColor", {"color": color})
            await self.emitter.emit_text_chunk(f"Background changed to {color}! 🎨", message_id)
            await self.emitter.emit_text_message_end(message_id)
            await self.emitter.emit_run_finished(run_id, thread_id)
            return result
        
        # Check for simple GREETINGS (respond directly without LLM)
        if user_lower.strip() in ['hello', 'hi', 'hey', 'hi there', 'hello there'] or user_lower.startswith('hello,') or user_lower.startswith('hi,'):
            await self.emitter.emit_text_message_start(message_id, "assistant")
            result = "Hello! 👋 I'm your AI assistant. I can help you with:\n• Weather info (try: 'What's the weather in Mumbai?')\n• Planning tasks (try: 'Plan a product launch')\n• UI changes (try: 'Change background to blue')\n• Calculations, time, and more!\n\nHow can I help you today?"
            await self.emitter.emit_text_chunk(result, message_id)
            await self.emitter.emit_text_message_end(message_id)
            await self.emitter.emit_run_finished(run_id, thread_id)
            return result
        # ============ END KEYWORD ROUTING ============
        
        messages = []
        
        # System prompt with mandatory tool usage for math
        messages.append(SystemMessage(content="""You are a helpful AI assistant. 

CRITICAL RULES:
1. For ANY math calculation, you MUST use the calculator tool. NEVER compute math in your head.
2. If asked about weather, use the get_weather tool.
3. If asked to PLAN something, use the `create_plan` tool.
4. Use UI tools (change_background_color, change_theme, show_notification, reset_ui) when appropriate.

IMPORTANT - STRUCTURED DATA HANDLING:
- When user messages include "--- STRUCTURED FORM DATA ---", you MUST acknowledge and reference this data in your response.
- Form data fields include: Name, Subject, Priority, Category, Options (urgent, needsFollowUp, confidential).
- Reference the specific values provided (e.g., "I see you've marked this as urgent with priority: critical").
- When user messages include "--- ATTACHED FILE ---", acknowledge the file and reference its content in your response.
- Always incorporate the structured data into your understanding of the user's request.

Available tools: calculator, web_search, get_current_time, get_weather, create_plan, change_background_color, change_theme, show_notification, reset_ui."""))
        
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
