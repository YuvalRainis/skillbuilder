# SkillBuilder – AI-Powered Negotiation Tutor

## Overview

**SkillBuilder** is an AI-powered learning platform that teaches **negotiation skills** through interactive practice, intelligent feedback, and metacognitive reflection.

Students engage in:
- **Real-time negotiations** with an AI counterparty
- **Strategic analysis** of negotiation transcripts  
- **Skill practice** with specific techniques (mirroring, validation, etc.)
- **Personalized coaching** with adaptive difficulty

The AI provides immediate feedback, grades responses on a 1–5 scale, and adapts future tasks based on performance.

### Learning Outcomes
Students learn to:
- Identify negotiation tactics and manipulation techniques
- Translate aggressive positions into underlying needs
- Develop strategic plans (BATNA, value creation, etc.)
- Apply specific negotiation techniques in real time
- Reflect on their decisions and improve

---

## Quick Start (3 Simple Steps)

### **Step 1: Get the Code**
```bash
git clone <repository-url>
cd skillbuilder
```

### **Step 2: Start the Backend**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app:app --reload
```
Backend runs at **http://localhost:8000**

### **Step 3: Start the Frontend** (in a new terminal)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at **http://localhost:3000**

**Open http://localhost:3000 in your browser and start practicing!**

---

## Requirements

| Software | Version | Install |
|----------|---------|---------|
| **Python** | 3.9+ | [python.org](https://www.python.org/downloads/) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

**Note:** The `.env` file with the GROQ API key is already included – no setup needed!

---

## How to Use SkillBuilder

### **1. Home Dashboard**
- View your progress (tasks completed, average grade, current day)
- See the current task and its learning objectives
- Choose to start or switch tasks
- Watch the AI coach provide quick summaries

### **2. Practice a Task**

**Simulation Tasks** – Real-time chat:
- Chat with an AI negotiator
- Receive coach tips after each exchange
- Experiment with different strategies
- Get immediate feedback on your approach

**Other Task Types** – Guided learning:
- **Analysis**: Read a transcript, identify negotiation tactics
- **Interpretation**: Understand hidden needs behind aggressive statements
- **Planning**: Create strategic plans (BATNA, value creation, etc.)
- **Technique**: Practice applying specific skills (mirroring, validation, etc.)

### **3. Reflection & Grading**
- Rate difficulty (1–5): Was this task hard or easy?
- Rate confidence (1–5): How sure are you in your answer?
- Write reflection: What surprised you? What did you learn?
- See your grade (1–5) and detailed AI feedback
- Auto-advance to next task

### **4. Task Selection**
- Click "Choose Another" to switch to a similar-difficulty task
- All progress is automatically saved

---

## Task Types & Examples

### **1. Simulation – Real-time Negotiation**
- Practice conversations with AI negotiators
- Get coaching tips to guide your strategy
- *Examples:* "High-Stakes Salary Negotiation", "Light Negotiation Simulation"

### **2. Analysis – Identify Tactics**
- Read transcripts and spot negotiation techniques
- AI explains correct/incorrect answers
- *Examples:* "Case Study Analysis – Identify Excuses", "Identifying Manipulation Tactics"

### **3. Interpretation – Find Hidden Needs**
- Read aggressive statements and identify the underlying interests
- Understand human psychology in negotiation
- *Examples:* "Translating Positions into Interests"

### **4. Planning – Strategic Thinking**
- Create negotiation plans (BATNA, log-rolling, etc.)
- AI provides feedback on plan quality and weaknesses
- *Examples:* "Building Your BATNA", "Value Creation – Log-Rolling"

### **5. Technique – Apply Skills**
- Practice specific techniques (mirroring, validation, active listening)
- AI validates correct application
- *Examples:* "Mirroring and Validation"

---

## 13 Progressive Tasks (3 Difficulty Levels)

### **Level 1: Foundations**
1. Case Study Analysis – Identify Excuses
2. Translating Positions into Interests
3. Light Negotiation Simulation

### **Level 2: Applied Practice**
4. Identifying Manipulation Tactics
5. Building Your BATNA
6. Mirroring and Validation
7. Medium-Stakes Conversation: Chronic Lateness

### **Level 3: Mastery**
8. Managing Objections and Emotions
9. Value Creation – Log-Rolling
10. High-Stakes Salary Negotiation
11–13. 3 additional classic negotiation scenarios

---

## Project Architecture

```
skillbuilder/
│
├── backend/                          Python + FastAPI
│   ├── app.py                       # Main server & all API endpoints
│   ├── models.py                    # SQLAlchemy database models
│   ├── database.py                  # SQLite setup
│   ├── orchestrator.py              # Routes messages to AI agents
│   ├── tasks.py                     # Task definitions & metadata
│   ├── requirements.txt             # Python dependencies
│   ├── .env                         # API keys (included)
│   ├── skillbuilder.db              # Auto-generated database
│   │
│   └── llm/                         AI Agents
│       ├── client.py                # GROQ LLM API interface
│       ├── manager_agent.py         # Negotiation counterparty
│       ├── coach_agent.py           # Personalized coaching
│       ├── evaluation_agent.py      # Grades responses
│       ├── performance_analyzer.py  # Tracks progress & adjusts difficulty
│       ├── prompt_generator.py      # Generates task content
│       └── task_analyzer.py         # Task metadata analysis
│
├── frontend/                         Next.js + React + TypeScript
│   ├── app/
│   │   ├── page.tsx                 # Home dashboard
│   │   ├── layout.tsx               # Global layout (animated background)
│   │   ├── globals.css              # Styles
│   │   ├── practice/
│   │   │   └── page.tsx             # Chat interface with coach sidebar
│   │   ├── feedback/
│   │   │   └── page.tsx             # Reflection form
│   │   └── components/
│   │       ├── AnalysisTask.tsx          # Analysis UI
│   │       ├── InterpretationTask.tsx    # Interpretation UI
│   │       ├── PlanningTask.tsx          # Planning UI
│   │       ├── TechniqueTask.tsx         # Technique UI
│   │       ├── Avatar.tsx                # User name input
│   │       ├── ProgressCard.tsx          # Progress display
│   │       ├── CuteStar.tsx              # Animated background
│   │       ├── CuteFlower.tsx            # Animated background
│   │       └── Confetti.tsx              # Celebration animation
│   ├── lib/
│   │   └── api.ts                   # API client & TypeScript types
│   ├── package.json                 # Node.js dependencies
│   ├── next.config.ts               # Next.js settings
│   └── tsconfig.json                # TypeScript settings
│
├── .gitignore                        # Git ignore rules
└── README.md                         # This file
```

---

## API Endpoints (Reference)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| **POST** | `/session` | Create new practice session |
| **GET** | `/timeline/{session_id}` | Get all tasks for student |
| **POST** | `/message` | Send message, get AI responses |
| **GET** | `/messages/{session_id}/{task_title}` | Get conversation history |
| **GET** | `/task-content/{session_id}` | Get task content (question, scenario, etc.) |
| **POST** | `/evaluate-analysis` | Grade analysis task |
| **POST** | `/evaluate-interpretation` | Grade interpretation task |
| **POST** | `/evaluate-plan` | Grade planning task |
| **POST** | `/evaluate-technique` | Grade technique practice |
| **POST** | `/complete-task/{session_id}/{task_id}` | Mark task done, go to next |
| **POST** | `/start-task/{session_id}/{task_id}` | Mark task as started |

---

## How AI Coaching Works

### **Manager Agent** (The Negotiator)
- Role-plays a realistic negotiation counterparty
- Responds to student strategies with business constraints
- Maintains consistent character and persona
- Escalates or de-escalates based on student approach

### **Coach Agent** (The Teacher)
- Analyzes student responses in real-time
- Provides strategic tips based on negotiation theory
- Explains concepts (BATNA, interests vs. positions, etc.)
- Encourages reflection on decisions

### **Evaluation Agent** (The Grader)
- Evaluates answers to analysis/interpretation/planning/technique tasks
- Provides specific feedback on strengths and gaps
- Assigns 1–5 grades with detailed rationale
- Explains why answers are correct or incorrect

### **Performance Analyzer** (The Adaptive System)
- Tracks student performance across all tasks
- Automatically adjusts difficulty for next task
- Personalizes coach feedback based on skill level
- Provides agents with student progress context

---

## Troubleshooting

### "Failed to fetch" Error
**Problem**: Frontend can't reach backend
**Solution**:
1. Open terminal in `backend/` folder
2. Run: `python -m uvicorn app:app --reload`
3. Wait for "Application startup complete"
4. Refresh frontend (Ctrl+R or Cmd+R)

### "Port 8000 already in use"
**Solution**: Use a different port:
```bash
python -m uvicorn app:app --reload --port 8001
```
Then edit `frontend/lib/api.ts` and change `API_BASE` to `http://localhost:8001`

### "ModuleNotFoundError" in Python
**Solution**: Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

### Database corrupted
**Solution**: Delete and rebuild:
```bash
cd backend
rm skillbuilder.db
# Restart backend – database auto-creates
```

### "npm: command not found"
**Solution**: Install Node.js from [nodejs.org](https://nodejs.org/)

### "python: command not found" (Mac/Linux)
**Solution**: Install Python from [python.org](https://www.python.org/downloads/)
Or use: `python3 -m venv venv && source venv/bin/activate`

---

## Database

- **Type**: SQLite (zero-setup, single file)
- **Location**: `backend/skillbuilder.db`
- **Auto-generation**: Created automatically on first backend startup
- **Persistence**: All responses, grades, and reflections are saved
- **Cleanup**: Delete `.db` file to reset and start fresh

---

## Environment Setup

The `.env` file contains:
```
GROQ_API_KEY=<free-groq-api-key>
```

**It's already included!** The app is ready to run.

If you want to use a different API key:
1. Get a free key at [console.groq.com](https://console.groq.com)
2. Edit `backend/.env`
3. Replace the key
4. Restart backend

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **AI/LLM** | GROQ API | Fast, free LLM inference |
| **Backend** | FastAPI | REST API server |
| **Database** | SQLAlchemy + SQLite | Persistent data storage |
| **Frontend** | Next.js 16 + React 18 | Modern web UI |
| **Language** | TypeScript | Type-safe frontend code |
| **Styling** | CSS3 + Tailwind | Responsive design |

---

## For Teachers

### Student Progress
- All responses are saved in the SQLite database
- Review student work by examining `skillbuilder.db` or API logs

### Customization
- Edit `backend/tasks.py` to add new scenarios
- Modify `backend/llm/` agents to change coaching style
- Update `frontend/app/components/` for UI changes

### Deployment Notes
- **This is a local development setup** – no cloud hosting needed
- For production, consider: gunicorn for backend, Vercel for frontend
- All inference happens via GROQ API (cloud-based, not local)

### Offline Usage
- Once started, app runs completely offline except for LLM calls
- LLM calls go to GROQ (requires internet)

---

## Pedagogical Approach

SkillBuilder is built on evidence-based learning principles:

1. **Deliberate Practice**: Students practice specific negotiation skills with feedback
2. **Metacognition**: Reflection prompts help students think about their thinking
3. **Adaptive Difficulty**: Tasks get harder based on student performance
4. **Immediate Feedback**: AI provides instant grading and coaching
5. **Multiple Task Types**: Variety keeps learning engaging and comprehensive

---

## Contributing & Customization

**Add New Tasks:**
- Edit `backend/tasks.py`
- Add new negotiation scenario with title, description, difficulty, type

**Modify AI Behavior:**
- Edit `backend/llm/manager_agent.py` for negotiator personality
- Edit `backend/llm/coach_agent.py` for coaching style
- Edit prompts in `backend/llm/prompt_generator.py`

**Customize UI:**
- Modify components in `frontend/app/components/`
- Update styles in `frontend/app/globals.css`
- Change colors, fonts, layout in `frontend/app/layout.tsx`

---

## Notes

- Sessions are stored in browser `localStorage` (survives page refresh)
- All conversation history is saved to database
- Coach tips are private (not shown in chat with manager)
- Teachers can review raw database to see all student activity
- No user authentication (local use only)

---

## Getting Help

1. **Check troubleshooting section above**
2. **Review code comments** in `backend/app.py` and `frontend/app/page.tsx`
3. **Check terminal logs** for error messages
4. **Review API response** using browser developer tools (F12)

---

**SkillBuilder is ready to use. Start learning negotiation today!**
