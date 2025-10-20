#!/usr/bin/env python3
"""
Start ADK web server with CORS support for React frontend
"""
import subprocess
import sys
from pathlib import Path

# Add CORS middleware by monkey-patching before starting ADK
def add_cors_middleware():
    from starlette.middleware.cors import CORSMiddleware
    from google.adk.cli.fast_api import create_app
    
    original_create_app = create_app
    
    def create_app_with_cors(*args, **kwargs):
        app = original_create_app(*args, **kwargs)
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        return app
    
    # Replace the create_app function
    import google.adk.cli.fast_api
    google.adk.cli.fast_api.create_app = create_app_with_cors

if __name__ == "__main__":
    print("🌤️  Starting Weather Insights Agent with CORS enabled...")
    print("📍 Agent: http://localhost:8000")
    print("📍 React UI: http://localhost:3000")
    print("")
    
    # Apply CORS patch
    add_cors_middleware()
    
    # Start ADK web
    from google.adk.cli.main import main
    sys.argv = ["adk", "web"]
    main()
