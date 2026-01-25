#!/bin/bash

# Setup script for SkillBuilder - Handles API key configuration and starts the system

echo ""
echo "========================================"
echo "   SkillBuilder Setup"
echo "========================================"
echo ""

# Check if backend/.env exists
if [ ! -f "backend/.env" ]; then
    echo "Error: backend/.env not found!"
    echo "Please ensure you're running this from the project root directory."
    exit 1
fi

# Check if API key is already set
if grep -q "GROQ_API_KEY=" backend/.env; then
    API_KEY=$(grep "GROQ_API_KEY=" backend/.env | cut -d'=' -f2)
    if [ ! -z "$API_KEY" ]; then
        echo "✓ API key already configured"
        echo ""
        goto_start_system=true
    fi
fi

if [ "$goto_start_system" != "true" ]; then
    echo "No API key found. Let's set it up!"
    echo ""
    echo "✓ Get your Groq API key from: https://console.groq.com/keys"
    echo ""

    while true; do
        read -p "Paste your Groq API key here: " USER_KEY
        
        if [ -z "$USER_KEY" ]; then
            echo "Error: API key cannot be empty!"
            continue
        fi

        echo ""
        echo "Testing API key..."

        # Create a Python test script
        cat > backend/test_key.py << 'EOF'
import os
import sys
api_key = sys.argv[1]
os.environ['GROQ_API_KEY'] = api_key
try:
    from groq import Groq
    client = Groq(api_key=api_key)
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": "Say 'Setup complete'"}],
        max_tokens=10
    )
    print("SUCCESS")
except Exception as e:
    print("FAILED")
    print(str(e))
EOF

        TEST_RESULT=$(cd backend && python test_key.py "$USER_KEY" 2>&1 | head -n 1)
        
        if [ "$TEST_RESULT" == "SUCCESS" ]; then
            echo "✓ API key is valid!"
            
            # Update the .env file with the new key
            echo "Saving API key to backend/.env..."
            echo "GROQ_API_KEY=$USER_KEY" > backend/.env
            
            # Clean up
            rm backend/test_key.py
            
            echo "✓ API key saved successfully!"
            echo ""
            break
        else
            echo "✗ API key test failed. Please check your key and try again."
            rm backend/test_key.py
            echo ""
        fi
    done
fi

echo ""
echo "========================================"
echo "   Starting SkillBuilder System"
echo "========================================"
echo ""

# Check if Node modules are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Check if Python dependencies are installed
echo "Installing backend dependencies..."
cd backend
pip install -r requirements.txt -q
cd ..

echo ""
echo "✓ All dependencies installed!"
echo ""
echo "Starting backend and frontend..."
echo ""
echo "IMPORTANT: Two terminal windows will open:"
echo "   1. Backend (Python/FastAPI) - Port 8000"
echo "   2. Frontend (Next.js) - Port 3000"
echo ""
echo "The frontend will open automatically at http://localhost:3000"
echo ""

# Start backend in the background
cd backend
python -m uvicorn app:app --reload &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
cd frontend
npm run dev
cd ..

# Kill backend when frontend exits
kill $BACKEND_PID 2>/dev/null

echo ""
echo "Setup complete!"
echo ""
