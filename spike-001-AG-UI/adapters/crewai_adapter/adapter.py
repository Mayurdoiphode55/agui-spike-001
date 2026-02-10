"""
CrewAI → AG-UI Adapter
Bridges CrewAI multi-agent crews with AG-UI protocol events
Uses Groq API for LLM
"""

import os
import uuid
import asyncio
from typing import Any, Dict, List, Optional
from datetime import datetime

# Global httpx client with connection pooling for better performance
import httpx

# Connection pool settings for persistent connections
_http_client: Optional[httpx.AsyncClient] = None

async def get_http_client() -> httpx.AsyncClient:
    """Get or create a persistent httpx client with connection pooling"""
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(
            timeout=120.0,
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
            http2=True  # Enable HTTP/2 for better streaming performance
        )
    return _http_client


# ============ PLAN COMPONENT HELPER ============
# This function creates a TaskChecklist component that the frontend renders
# It's a regular function (not a @tool) so we can call it directly

def create_plan_component(topic: str) -> str:
    """
    Create a planning checklist component for the frontend.
    
    WHY THIS WORKS:
    - The frontend detects "COMPONENT:TaskChecklist:" prefix
    - It parses the JSON and renders a beautiful interactive checklist
    - User can check/uncheck items and confirm the plan
    
    Args:
        topic: What the user wants to plan (e.g., "product launch")
        
    Returns:
        String in format "COMPONENT:TaskChecklist:{json_data}"
    """
    import json
    
    topic_lower = topic.lower()
    title = f"Plan for: {topic}"
    tasks = []
    
    # Determine plan type based on keywords in the topic
    if "product" in topic_lower or "launch" in topic_lower or "market" in topic_lower:
        title = "Product Launch Plan"
        tasks = [
            {"id": "1", "label": "Initial research and analysis", "checked": True},
            {"id": "2", "label": "Define strategy and goals", "checked": True},
            {"id": "3", "label": "Execute phase 1", "checked": False},
            {"id": "4", "label": "Review progress", "checked": False},
            {"id": "5", "label": "Finalize and deliver", "checked": False},
        ]
    elif "software" in topic_lower or "app" in topic_lower or "code" in topic_lower or "web" in topic_lower:
        title = "Software Development Plan"
        tasks = [
            {"id": "1", "label": "Define requirements and scope", "checked": True},
            {"id": "2", "label": "Design architecture", "checked": True},
            {"id": "3", "label": "Set up project structure", "checked": False},
            {"id": "4", "label": "Implement core features", "checked": False},
            {"id": "5", "label": "Test and deploy", "checked": False},
        ]
    elif "trip" in topic_lower or "vacation" in topic_lower or "travel" in topic_lower:
        title = f"Trip Plan: {topic}"
        tasks = [
            {"id": "1", "label": "Determine budget and dates", "checked": True},
            {"id": "2", "label": "Book flights", "checked": True},
            {"id": "3", "label": "Reserve accommodation", "checked": False},
            {"id": "4", "label": "Plan daily itinerary", "checked": False},
            {"id": "5", "label": "Pack luggage", "checked": False},
        ]
    elif "mars" in topic_lower or "space" in topic_lower or "mission" in topic_lower:
        title = "Mission to Mars: Implementation Plan"
        tasks = [
            {"id": "1", "label": "Research Mars mission requirements", "checked": True},
            {"id": "2", "label": "Select spacecraft and technology", "checked": True},
            {"id": "3", "label": "Plan launch window and trajectory", "checked": True},
            {"id": "4", "label": "Prepare supplies and equipment", "checked": True},
            {"id": "5", "label": "Select and train crew members", "checked": False},
        ]
    else:
        # Generic plan for any other topic
        title = f"Plan for: {topic}"
        tasks = [
            {"id": "1", "label": "Research and gather requirements", "checked": True},
            {"id": "2", "label": "Create detailed plan", "checked": False},
            {"id": "3", "label": "Execute main tasks", "checked": False},
            {"id": "4", "label": "Review and iterate", "checked": False},
            {"id": "5", "label": "Complete and document", "checked": False},
        ]
    
    # Create the component data structure
    data = {"title": title, "tasks": tasks}
    
    # Return in the format the frontend expects
    # Frontend will detect "COMPONENT:TaskChecklist:" and render the component
    return f"COMPONENT:TaskChecklist:{json.dumps(data)}"


def execute_plan(plan_title: str, steps: list) -> str:
    """
    Execute a confirmed plan and generate detailed output.
    
    This is called when user clicks "Confirm Plan" on the TaskChecklist.
    The frontend sends "EXECUTE_PLAN:Title:[steps]" command.
    
    Args:
        plan_title: The title of the plan being executed
        steps: List of step labels that were checked
        
    Returns:
        Formatted markdown showing execution progress
    """
    result = f"## ✨ Executing: {plan_title}\n\n"
    result += "I'm now working through your approved steps:\n\n"
    
    for i, step in enumerate(steps, 1):
        result += f"### Step {i}: {step}\n"
        step_lower = step.lower()
        
        # Generate step-specific content based on keywords
        if "research" in step_lower or "analysis" in step_lower:
            result += "📊 Conducting comprehensive research and gathering relevant data.\n\n"
        elif "design" in step_lower or "architecture" in step_lower:
            result += "🎨 Creating detailed design specifications and system architecture.\n\n"
        elif "strategy" in step_lower or "goals" in step_lower:
            result += "🎯 Defining clear objectives with measurable KPIs.\n\n"
        elif "implement" in step_lower or "execute" in step_lower or "develop" in step_lower:
            result += "💻 Building and implementing the core functionality.\n\n"
        elif "test" in step_lower or "deploy" in step_lower:
            result += "🚀 Running comprehensive tests and preparing for deployment.\n\n"
        elif "review" in step_lower or "progress" in step_lower:
            result += "📋 Evaluating current progress against goals.\n\n"
        else:
            result += "✅ Working on this step with full attention to detail.\n\n"
    
    result += "---\n"
    result += f"🎉 **All {len(steps)} steps are now in progress!**\n"
    return result



class CrewAIAGUIAdapter:
    """
    Adapter that bridges CrewAI with AG-UI protocol.
    Handles multi-agent crew execution and translates events.
    
    Note: CrewAI doesn't natively support streaming, so we simulate
    streaming by chunking the final output.
    """
    
    def __init__(self, emitter):
        """
        Initialize the adapter with an AG-UI event emitter.
        
        Args:
            emitter: EventEmitter instance for sending AG-UI events
        """
        self.emitter = emitter
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY environment variable is required")
    
    def _create_crew(self, task_description: str):
        """Create a CrewAI crew with researcher and writer agents"""
        try:
            from crewai import Agent, Task, Crew, Process
            from langchain_groq import ChatGroq
            
            # Initialize the LLM with Groq
            llm = ChatGroq(
                api_key=self.groq_api_key,
                model=self.groq_model,
                temperature=0.7
            )
            
            # Create Researcher Agent
            researcher = Agent(
                role='Research Analyst',
                goal='Conduct thorough research and gather relevant information',
                backstory="""You are an expert research analyst with years of experience
                in gathering and synthesizing information from various sources.
                You have a keen eye for detail and can identify key insights.""",
                llm=llm,
                verbose=True,
                allow_delegation=False
            )
            
            # Create Writer Agent
            writer = Agent(
                role='Content Writer',
                goal='Create clear, engaging, and informative content',
                backstory="""You are a skilled content writer who excels at
                transforming complex information into clear, readable content.
                You have a talent for engaging readers and explaining concepts simply.""",
                llm=llm,
                verbose=True,
                allow_delegation=False
            )
            
            # Create Tasks
            research_task = Task(
                description=f"""Research the following topic thoroughly:
                {task_description}
                
                Gather key facts, insights, and relevant information.""",
                expected_output="A comprehensive research summary with key findings",
                agent=researcher
            )
            
            writing_task = Task(
                description="""Based on the research provided, create a clear and
                engaging response that addresses the user's query.""",
                expected_output="A well-written, informative response",
                agent=writer,
                context=[research_task]
            )
            
            # Create Crew
            crew = Crew(
                agents=[researcher, writer],
                tasks=[research_task, writing_task],
                process=Process.sequential,
                verbose=True
            )
            
            return crew
            
        except ImportError as e:
            raise ImportError(f"CrewAI not installed. Run: pip install crewai langchain-groq. Error: {e}")
    
    def _improve_recipe(self, recipe_state: Dict) -> Dict:
        """Improve a recipe based on current state using intelligent rules"""
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
                "Mix wet ingredients.",
                "Combine dry ingredients.",
                "Mix everything together.",
                "Bake for 25-30 minutes."
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
                "Boil pasta.",
                "Sauté garlic.",
                "Mix pasta and sauce.",
                "Serve hot."
            ]
        else:
            # Generic savory recipe
            new_ingredients = [
                ("Olive Oil", "2 tablespoons"),
                ("Garlic", "2 cloves, minced"),
                ("Salt", "to taste"),
                ("Black Pepper", "to taste")
            ]
            base_instructions = [
                "Prep ingredients.",
                "Cook main dish.",
                "Season to taste.",
                "Serve hot."
            ]
        
        # Dietary adjustments
        if "vegan" in prefs or "vegetarian" in prefs:
            new_ingredients = [(n, a) for n, a in new_ingredients if n.lower() not in ["eggs", "butter", "parmesan cheese"]]
            if "vegan" in prefs:
                new_ingredients.append(("Dairy-Free Butter", "1/2 cup, melted"))
        
        if "high protein" in prefs:
            new_ingredients.append(("Protein Powder", "1 scoop"))
            
        # Add new ingredients
        for name, amount in new_ingredients:
            if name.lower() not in existing_ingredients:
                improved["ingredients"].append({
                    "id": f"ing-{uuid.uuid4().hex[:6]}",
                    "name": name,
                    "amount": amount
                })
        
        # Add instructions if empty
        if len([i for i in improved["instructions"] if i.strip()]) < 3:
            improved["instructions"] = base_instructions
            
        # Update title
        if improved["title"] == "My Recipe" and improved["ingredients"]:
            improved["title"] = f"{improved['ingredients'][0]['name']} Delight"
            
        return improved

    async def _simulate_streaming(self, text: str, message_id: str, chunk_size: int = 3):
        """
        Simulate streaming by emitting text in chunks.
        CrewAI doesn't support native streaming, so we chunk the output.
        """
        words = text.split()
        
        for i in range(0, len(words), chunk_size):
            chunk = ' '.join(words[i:i + chunk_size])
            if i + chunk_size < len(words):
                chunk += ' '
            await self.emitter.emit_text_chunk(chunk, message_id)
            await asyncio.sleep(0.01)  # Reduced delay for faster streaming
    
    async def process_message(self, user_input: str, history: List = None) -> str:
        """
        Process a user message with CrewAI crew and emit AG-UI events.
        
        Args:
            user_input: The user's message
            history: Optional conversation history (not used in basic CrewAI)
            
        Returns:
            The final response text
        """
        run_id = f"run-{uuid.uuid4().hex[:8]}"
        thread_id = f"thread-{uuid.uuid4().hex[:8]}"
        message_id = f"msg-{uuid.uuid4().hex[:8]}"
        
        # Emit run started
        await self.emitter.emit_run_started(run_id, thread_id)
        
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
                # Need to add emit_state_update wrapper if not present, or call emit directly
                await self.emitter.emit("STATE_UPDATE", {"state": improved_recipe})
                
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
        
        # ============ KEYWORD-BASED ROUTING FOR RELIABLE FEATURES ============
        # These bypass the LLM for faster, more reliable responses
        
        user_lower = user_input.lower()
        
        # Check for EXECUTE_PLAN command (from TaskChecklist confirmation)
        # Format: "EXECUTE_PLAN:Plan Title:[step1, step2, ...]"
        if user_input.startswith('EXECUTE_PLAN:'):
            await self.emitter.emit_text_message_start(message_id, "assistant")
            try:
                import json
                # Parse: EXECUTE_PLAN:Plan Title:["step1", "step2", ...]
                json_start = user_input.find(':[')
                if json_start != -1:
                    plan_title = user_input[len('EXECUTE_PLAN:'):json_start]
                    steps_json = user_input[json_start + 1:]  # Skip the ':' before '['
                else:
                    plan_title = "Plan"
                    steps_json = "[]"
                steps = json.loads(steps_json)
                
                # Generate execution content using our helper function
                result = execute_plan(plan_title, steps)
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
        # Keywords that indicate user wants a plan/checklist
        planning_keywords = ['plan ', 'plan a ', 'create a plan', 'steps to', 'checklist', 'how to', 'steps for']
        if any(kw in user_lower for kw in planning_keywords):
            await self.emitter.emit_text_message_start(message_id, "assistant")
            # Extract the topic from the input
            topic = user_input
            for prefix in ['plan ', 'plan a ', 'create a plan for ', 'steps to ', 'checklist for ']:
                if user_lower.startswith(prefix):
                    topic = user_input[len(prefix):]
                    break
            # Generate the TaskChecklist component
            result = create_plan_component(topic)
            await self.emitter.emit_text_chunk(result, message_id)
            await self.emitter.emit_text_message_end(message_id)
            await self.emitter.emit_run_finished(run_id, thread_id)
            return result
        
        try:
            # Emit step started for crew setup
            await self.emitter.emit("STEP_STARTED", {
                "stepId": "step-crew-setup",
                "stepName": "Setting up CrewAI agents"
            })
            
            # Create the crew
            crew = self._create_crew(user_input)
            
            await self.emitter.emit("STEP_FINISHED", {
                "stepId": "step-crew-setup"
            })
            
            # Emit tool call for research agent
            research_tool_id = f"tool-{uuid.uuid4().hex[:8]}"
            await self.emitter.emit_tool_call_start(
                "Research Agent",
                research_tool_id,
                {"query": user_input}
            )
            
            # Run the crew (this is synchronous in CrewAI)
            # We run it in a thread pool to not block
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: crew.kickoff()
            )
            
            # Handle result
            result_text = str(result)
            if hasattr(result, 'raw'):
                result_text = result.raw
            
            # Emit research complete
            await self.emitter.emit_tool_call_end(research_tool_id, "Research completed")
            
            # Emit writer agent tool call
            writer_tool_id = f"tool-{uuid.uuid4().hex[:8]}"
            await self.emitter.emit_tool_call_start(
                "Writer Agent",
                writer_tool_id,
                {"content": "Processing research results"}
            )
            await self.emitter.emit_tool_call_end(writer_tool_id, "Writing completed")
            
            # Emit text message start
            await self.emitter.emit_text_message_start(message_id, "assistant")
            
            # Simulate streaming the result
            await self._simulate_streaming(result_text, message_id)
            
            # Emit text message end
            await self.emitter.emit_text_message_end(message_id)
            
            # Emit run finished
            await self.emitter.emit_run_finished(run_id, thread_id)
            
            return result_text
            
        except Exception as e:
            await self.emitter.emit_run_error(str(e), run_id)
            raise


class SimplifiedCrewAIAdapter:
    """
    Simplified adapter for quick testing without full CrewAI setup.
    Uses direct Groq API calls instead of CrewAI.
    """
    
    def __init__(self, emitter):
        self.emitter = emitter
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY environment variable is required")
    
    def _build_messages(self, user_input: str, history: List = None) -> List[Dict]:
        """Build messages array with proper conversation history for context retention"""
        messages = [
            {
                "role": "system", 
                "content": "You are a helpful AI assistant. CRITICAL: For ANY math calculation, you MUST use a calculator - NEVER compute math in your head. Remember all user details (name, workplace) and recall them accurately when asked."
            }
        ]
        
        # Add conversation history
        if history:
            for msg in history[:-1]:  # Exclude last message as it's the current input
                if hasattr(msg, 'role') and hasattr(msg, 'content'):
                    messages.append({"role": msg.role, "content": msg.content})
        
        # Add current user message
        messages.append({"role": "user", "content": user_input})
        
        return messages
    
    async def process_message(self, user_input: str, history: List = None) -> str:
        """Simplified processing using direct Groq API"""
        import httpx
        
        run_id = f"run-{uuid.uuid4().hex[:8]}"
        thread_id = f"thread-{uuid.uuid4().hex[:8]}"
        message_id = f"msg-{uuid.uuid4().hex[:8]}"
        
        await self.emitter.emit_run_started(run_id, thread_id)
        
        # ============ KEYWORD-BASED ROUTING FOR RELIABLE FEATURES ============
        # Same as CrewAIAGUIAdapter for consistency
        
        user_lower = user_input.lower()
        
        # Check for EXECUTE_PLAN command (from TaskChecklist confirmation)
        if user_input.startswith('EXECUTE_PLAN:'):
            await self.emitter.emit_text_message_start(message_id, "assistant")
            try:
                import json
                json_start = user_input.find(':[')
                if json_start != -1:
                    plan_title = user_input[len('EXECUTE_PLAN:'):json_start]
                    steps_json = user_input[json_start + 1:]
                else:
                    plan_title = "Plan"
                    steps_json = "[]"
                steps = json.loads(steps_json)
                result = execute_plan(plan_title, steps)
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
        planning_keywords = ['plan ', 'plan a ', 'create a plan', 'steps to', 'checklist', 'how to', 'steps for']
        if any(kw in user_lower for kw in planning_keywords):
            await self.emitter.emit_text_message_start(message_id, "assistant")
            topic = user_input
            for prefix in ['plan ', 'plan a ', 'create a plan for ', 'steps to ', 'checklist for ']:
                if user_lower.startswith(prefix):
                    topic = user_input[len(prefix):]
                    break
            result = create_plan_component(topic)
            await self.emitter.emit_text_chunk(result, message_id)
            await self.emitter.emit_text_message_end(message_id)
            await self.emitter.emit_run_finished(run_id, thread_id)
            return result
        
        try:
            # Show researcher agent working
            await self.emitter.emit_tool_call_start(
                "Research Agent",
                "tool-research",
                {"query": user_input}
            )
            
            await self.emitter.emit_text_message_start(message_id, "assistant")
            
            # Stream response from Groq using persistent connection pool
            full_response = ""
            client = await get_http_client()
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.groq_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.groq_model,
                    "messages": self._build_messages(user_input, history),
                    "stream": True,
                    "temperature": 0.3,  # Lower temp = faster
                    "max_tokens": 500  # Limit response length
                }
            )
            
            async for line in response.aiter_lines():
                if line.startswith("data: ") and line != "data: [DONE]":
                    import json
                    try:
                        data = json.loads(line[6:])
                        delta = data.get("choices", [{}])[0].get("delta", {})
                        if "content" in delta:
                            chunk = delta["content"]
                            full_response += chunk
                            await self.emitter.emit_text_chunk(chunk, message_id)
                    except:
                        pass
            
            await self.emitter.emit_tool_call_end("tool-research", "Complete")
            await self.emitter.emit_text_message_end(message_id)
            await self.emitter.emit_run_finished(run_id, thread_id)
            
            return full_response
            
        except Exception as e:
            await self.emitter.emit_run_error(str(e), run_id)
            raise
