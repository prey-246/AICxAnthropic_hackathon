import os
from dotenv import load_dotenv
import anthropic

# Load the API key from your .env file
load_dotenv()

# Initialize the Claude client
client = anthropic.Anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY")
)

def test_navigator_prompt():
    # System prompt for Ethical Alignment & Persona
    system_prompt = """You are a helpful, empathetic advisor for first-generation college students in India. 
    Explain complex terms simply. Do not give binding financial advice."""
    
    # The user's question
    user_message = "What does a 'floating interest rate' mean on an education loan? My parents don't know."

    print("Sending request to Claude...")
    
    try:
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=500,
            temperature=0.5, 
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_message}
            ]
        )
        print("\n--- Claude's Response ---")
        print(response.content[0].text)
        
    except Exception as e:
        print("\n--- Error Occurred ---")
        print(e)

if __name__ == "__main__":
    test_navigator_prompt()