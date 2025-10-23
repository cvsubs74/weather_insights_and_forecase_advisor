import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
)
logger = logging.getLogger(__name__)

# Callback functions for agent lifecycle logging
def log_agent_entry(callback_context, llm_request):
    """Logs when an agent is about to be executed."""
    logger.info("="*80)
    logger.info(f"🔄 AGENT ENTRY / TRANSFER: {callback_context.agent_name}")
    logger.info("="*80)

def log_agent_exit(callback_context, llm_response):
    """Logs when an agent has finished execution."""
    logger.info("="*80)
    logger.info(f"✅ AGENT EXIT: {callback_context.agent_name}")
    # Optionally log the type of response (e.g., function call)
    if llm_response.content and llm_response.content.parts:
        for part in llm_response.content.parts:
            if part.function_call:
                logger.info(f"   ↪️ Suggested Action: Call tool '{part.function_call.name}'")
    logger.info("="*80)
