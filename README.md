# AuthoGraph AI

A production-grade, multi-agent content engine designed to transform a single topic into a high-impact, research-backed, and visually rich blog post in minutes. AuthoGraph leverages **LangGraph** orchestration to perform deep web research, architect strategic outlines, and generate unique visual assets in parallel—featuring secure authentication, multi-platform publishing, and integrated payments.

---

## Core Capabilities
Writing a high-quality technical blog typically takes hours. AuthoGraph reduces this to **under 5 minutes** while maintaining:
*   **Agentic Orchestration:** Built on LangGraph for stateful, multi-agent collaboration between researchers, planners, and writers.
*   **Near-Zero Hallucination:** Strict grounding in real-time web data via **Tavily Search**.
*   **Multi-Platform Distribution:** Direct, live publishing to **Dev.to**, **Hashnode (v3 API)**, **LinkedIn**, and an optimized crawler-friendly flow for **Medium**.
*   **Viral LinkedIn Teasers:** AI-driven social teaser generation with a built-in editor for manual refinement before posting.
*   **Static HTML Rendering:** A dedicated backend renderer for Medium's importer to ensure perfect formatting and image resolution.
*   **Secure Authentication:** Native support for Google OAuth and Passwordless Email OTP verification.
*   **Integrated Payments:** Built-in **Razorpay** support with a credit-based system and automated transaction tracking.
*   **Admin Dashboard:** Platform-wide oversight including **Revenue Tracking**, user lifecycle management (deactivation), and a global content feed.
*   **Visual Engagement:** Context-aware generation of custom diagrams and images using Gemini's multi-modal capabilities.

---

## Architecture
The system utilizes a "Plan-Execute-Distribute" cycle powered by an asynchronous multi-agent graph.

```mermaid
graph TD
    Start((START)) --> Router{Research Needed?}
    Router -- Yes --> Research[Tavily Search Agent]
    Router -- No --> Orchestrator
    Research --> Orchestrator[Strategic Planner]
    
    subgraph Parallel Content Workers
    Orchestrator --> W1[Agent Worker 1]
    Orchestrator --> W2[Agent Worker 2]
    Orchestrator --> W3[Agent Worker N]
    end
    
    W1 & W2 & W3 --> Reducer[Content Merger]
    Reducer --> ImgDecide[Visual Strategist]
    
    subgraph Parallel Image Workers
    ImgDecide --> IW1[Agent 1]
    ImgDecide --> IW2[Agent 2]
    ImgDecide --> IW2[Agent N]
    end
    
    IW1 & IW2 --> Finalize[SQL Persistence & SEO]
    Finalize --> Hub[Publishing Hub]
    
    subgraph Distribution
    Hub --> Dev[Dev.to API]
    Hub --> HN[Hashnode GraphQL v3]
    Hub --> Med[Medium Crawler Renderer]
    Hub --> LI[LinkedIn UGC API + AI Teaser]
    end
```

---

## Tech Stack
*   **Backend:** FastAPI, LangGraph, SQLModel (PostgreSQL/Supabase), Gunicorn.
*   **Frontend:** React 18 (TypeScript), Tailwind CSS, Framer Motion, Lucide Icons.
*   **AI:** OpenAI (Text), Gemini (Vision), Tavily Search API.
*   **Payments:** Razorpay API with automated transaction logging.
*   **Deployment:** AWS EC2 c7i-flex.large (Gunicorn -w 4), Vercel (Frontend), Let's Encrypt SSL.

---

## Quick Start

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/tanishra/scribe-flow.git
cd Scribe-flow

# Setup Backend
pip install -r requirements.txt

# Setup Frontend
cd frontend-react
npm install
```

### 2. Configuration
Create a `.env` file in the root directory:
```env
# AI & Search
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_gemini_key
TAVILY_API_KEY=your_tavily_key

# Database
DATABASE_URL=postgresql://postgres:[pass]@db.xxxx.supabase.co:6543/postgres

# Authentication
VITE_GOOGLE_CLIENT_ID=your_google_id.apps.googleusercontent.com
SECRET_KEY=your_jwt_secret_key

# Email (SMTP)
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587

# Payments
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

### 3. Running Locally
**Terminal 1: Backend**
```bash
python -m uvicorn app.api:app --reload
```

**Terminal 2: Frontend**
```bash
cd frontend-react && npm run dev
```

---

## Contribution
Contributions are what make the open-source community an amazing place to learn, inspire, and create.
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request