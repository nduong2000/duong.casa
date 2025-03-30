#!/usr/bin/env python3
import cgi
import json
import os
import subprocess

# Path to your resume chunks file
CHUNKS_FILE = "/root/resume-rag/data/resume_chunks.json"
MODEL = "gemma3:1b"

# Function to process the query
def process_query(query):
    if not os.path.exists(CHUNKS_FILE):
        return {"error": "Resume data not found. Please process your resume first."}
    
    if not query:
        return {"error": "No query provided"}
    
    # Load resume chunks
    with open(CHUNKS_FILE, 'r') as f:
        chunks_data = json.load(f)
    
    # Combine all chunks into context
    context = "\n\n".join([chunk["text"] for chunk in chunks_data])
    
    # Prepare the prompt
    prompt = f"""
You are an AI assistant tasked with answering questions about a person based on their resume.
Use ONLY the provided context from the resume to answer the question.
If the information is not in the provided context, say you don't have that information.
When extracting specific information like skills, be comprehensive and well-organized in your response.

Context from resume:
{context}

Question: {query}

Answer:
"""
    
    # Call Ollama API using curl
    cmd = [
        'curl', '-s', 'http://localhost:11434/api/generate',
        '-d', json.dumps({
            "model": MODEL,
            "prompt": prompt,
            "stream": False
        })
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        response_data = json.loads(result.stdout)
        
        if 'error' in response_data:
            return {"error": response_data['error']}
        
        return {"answer": response_data.get('response', 'No response received')}
    
    except Exception as e:
        return {"error": f"Error querying Ollama: {str(e)}"}

# Main CGI handler
def main():
    print("Content-Type: application/json")
    print()  # Empty line to indicate end of headers
    
    form = cgi.FieldStorage()
    query = form.getvalue("query", "")
    
    result = process_query(query)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
