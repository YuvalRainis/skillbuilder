# SkillBuilder – AI-Powered Negotiation Tutor

## Overview

**SkillBuilder** is an AI-powered learning platform that teaches **negotiation skills** through interactive practice, intelligent feedback, and metacognitive reflection.

Learners engage in:
- **Real-time negotiations** with an AI counterparty
- **Strategic analysis** of negotiation transcripts  
- **Skill practice** with specific techniques (mirroring, validation, etc.)
- **Personalized coaching** with adaptive difficulty

The AI provides immediate feedback, grades responses on a 1–5 scale, and adapts future tasks based on performance.

### Learning Outcomes
Learners learn to:
- Identify negotiation tactics and manipulation techniques
- Translate aggressive positions into underlying needs
- Develop strategic plans (BATNA, value creation, etc.)
- Apply specific negotiation techniques in real time
- Reflect on their decisions and improve

---

## Quick Start (2 Simple Steps)

### **Step 1: Get the Code**
```bash
git clone https://github.com/YuvalRainis/skillbuilder.git
cd skillbuilder
```

### **Step 2: Run the Setup Script**

**On Windows:**
```bash
setup.bat
```

**On Mac/Linux:**
```bash
bash setup.sh
```

The setup script will:
- ✓ Prompt you to enter your Groq API key (provided separately in the written report)
- ✓ Validate the API key works
- ✓ Install all dependencies automatically
- ✓ Start both backend (port 8000) and frontend (port 3000)
- ✓ Open the application in your browser

That's it! The system will be running and ready to use.
Frontend runs at **http://localhost:3000**

**Open http://localhost:3000 in your browser and start practicing!**

---

## Requirements

| Software | Version | Install |
|----------|---------|---------|
| **Python** | 3.9+ | [python.org](https://www.python.org/downloads/) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

Note: The `package-lock.json` file ensures that `npm install` will work consistently across different npm versions. You can use any npm version that comes with Node.js 18+, and the dependencies will install correctly.

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
- Rate difficulty: Was this task hard or easy?
- Rate confidence: How sure are you in your answer?
- Write reflection: What surprised you? What did you learn?
- See your grade (1–5) and detailed AI feedback
- Auto-advance to next task

### **4. Task Selection**
- Click "Choose Another" to switch to a similar-difficulty task
- All progress is automatically saved

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

## Pedagogical Approach

SkillBuilder is built on evidence-based learning principles:

1. **Deliberate Practice**: Students practice specific negotiation skills with feedback
2. **Metacognition**: Reflection prompts help students think about their thinking
3. **Adaptive Difficulty**: Tasks get harder based on student performance
4. **Immediate Feedback**: AI provides instant grading and coaching
5. **Multiple Task Types**: Variety keeps learning engaging and comprehensive

---

## Notes

- Sessions are stored in browser `localStorage` (survives page refresh)
- All conversation history is saved to database
- Coach tips are private (not shown in chat with manager)
- Teachers can review raw database to see all student activity

---

**SkillBuilder is ready to use. Start learning negotiation today!**
