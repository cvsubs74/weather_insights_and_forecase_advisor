#!/usr/bin/env python3
"""
Simple FastAPI wrapper to expose the weather agent to the React frontend
Bypasses the ADK api_server Pydantic schema issues by calling the agent directly
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.adk.runners import Runner
import uvicorn

# Import your agent
from agent import root_agent

app = FastAPI(title="Weather Insights API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    user_id: str = "user_001"

class QueryResponse(BaseModel):
    response: str
    session_id: str

@app.post("/query", response_model=QueryResponse)
async def query_agent(request: QueryRequest):
    """Query the weather agent"""
    runner = Runner(root_agent)
    
    # Run the agent
    result = await runner.run_async(
        user_id=request.user_id,
        query=request.query
    )
    
    # Extract text from response
    response_text = ""
    for event in result.events:
        if hasattr(event, 'content') and event.content:
            for part in event.content.parts:
                if hasattr(part, 'text') and part.text:
                    response_text += part.text
    
    return QueryResponse(
        response=response_text,
        session_id=result.session_id
    )

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    print("🌤️  Starting Weather Insights API Wrapper")
    print("📍 API: http://localhost:8000")
    print("📍 React UI should connect to: http://localhost:8000")
    print("")
    uvicorn.run(app, host="0.0.0.0", port=8000)
