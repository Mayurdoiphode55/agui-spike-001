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
            await asyncio.sleep(0.05)  # Small delay for visual effect
    
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
    
    async def process_message(self, user_input: str, history: List = None) -> str:
        """Simplified processing using direct Groq API"""
        import httpx
        
        run_id = f"run-{uuid.uuid4().hex[:8]}"
        thread_id = f"thread-{uuid.uuid4().hex[:8]}"
        message_id = f"msg-{uuid.uuid4().hex[:8]}"
        
        await self.emitter.emit_run_started(run_id, thread_id)
        
        try:
            # Show researcher agent working
            await self.emitter.emit_tool_call_start(
                "Research Agent",
                "tool-research",
                {"query": user_input}
            )
            
            await self.emitter.emit_text_message_start(message_id, "assistant")
            
            # Stream response from Groq
            full_response = ""
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.groq_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.groq_model,
                        "messages": [
                            {"role": "system", "content": "You are a helpful AI assistant."},
                            {"role": "user", "content": user_input}
                        ],
                        "stream": True
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
