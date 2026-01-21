#!/bin/bash
# Install dependencies if needed
pip install -r requirements.txt

# Start the server
uvicorn app:app --reload --host 127.0.0.1 --port 8000
