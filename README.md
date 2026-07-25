# RAG Practice Model

A full-stack **Retrieval-Augmented Generation (RAG)** chatbot built using **React, Node.js, TypeScript, OpenAI, Pinecone, PostgreSQL, and WebSockets**.

The project allows users to upload documents, index them into a vector database, and chat with an AI assistant that answers questions using the uploaded knowledge base.

---

# ✨ Features

## User Features

- User Registration & Login
- JWT Authentication
- Real-time AI Chat
- Conversation History
- Markdown Response Rendering
- Source References
- WebSocket-based Communication

---

## Admin Features

- Admin Login
- Document Upload
- PDF/Text Ingestion
- Automatic Chunking
- Embedding Generation
- Pinecone Vector Storage
- Analytics Dashboard
- Feedback Management

---

## RAG Pipeline

The backend includes a complete Retrieval-Augmented Generation workflow:

- Document Upload
- Text Extraction
- Smart Chunking
- Embedding Generation
- Pinecone Vector Search
- Hybrid Search
- Prompt Building
- OpenAI Response Generation

---

# 🏗 Project Structure

```
RAG Practice Model
│
├── backend
│   ├── src
│   │   ├── modules
│   │   │   ├── auth
│   │   │   ├── admin
│   │   │   ├── analytics
│   │   │   ├── chat
│   │   │   ├── feedback
│   │   │   ├── ingestion
│   │   │   └── rag
│   │   ├── db
│   │   ├── config
│   │   └── websocket
│   │
│   └── package.json
│
├── frontend
│   ├── src
│   │   ├── components
│   │   ├── pages
│   │   ├── services
│   │   ├── router
│   │   └── store
│   │
│   └── package.json
│
└── README.md
```

---

# 🛠 Tech Stack

## Frontend

- React
- TypeScript
- Vite
- React Router
- Zustand
- Axios
- React Markdown

---

## Backend

- Node.js
- Express
- TypeScript
- WebSocket (ws)
- Drizzle ORM
- PostgreSQL
- JWT Authentication
- Multer
- Zod

---

## AI & RAG

- OpenAI
- Pinecone Vector Database
- Hybrid Search
- Semantic Search
- Prompt Engineering

---

# 🗄 Database

- PostgreSQL
- Drizzle ORM
- Drizzle Migrations

Main Tables:

- Users
- Sessions
- Conversations
- Messages
- Documents
- Analytics

---

# 📦 Installation

## Clone Repository

```bash
git clone <repository-url>

cd RAG-Practice-Model
```

---

# Backend Setup

```bash
cd backend

npm install
```

Create a `.env` file using `.env.example`.

Run database migrations:

```bash
npm run db:run
```

Start the backend:

```bash
npm run dev
```

---

# Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

---

# ⚙ Environment Variables

Example backend configuration:

```env
PORT=5000

DATABASE_URL=

JWT_SECRET=

OPENAI_API_KEY=

PINECONE_API_KEY=

PINECONE_INDEX=

PINECONE_NAMESPACE=
```

Configure the frontend `.env` according to your backend API URL.

---

# 🚀 Available Scripts

## Backend

```bash
npm run dev
```

Development server

```bash
npm run build
```

Build project

```bash
npm start
```

Run production build

```bash
npm run db:generate
```

Generate Drizzle migrations

```bash
npm run db:migrate
```

Apply migrations

```bash
npm run db:studio
```

Open Drizzle Studio

```bash
npm run db:run
```

Execute migration runner

---

## Frontend

```bash
npm run dev
```

Start Vite server

```bash
npm run build
```

Production build

```bash
npm run preview
```

Preview production build

```bash
npm run lint
```

Run ESLint

---

# 🔄 RAG Workflow

```
Upload Document
        │
        ▼
Extract Text
        │
        ▼
Chunk Document
        │
        ▼
Generate Embeddings
        │
        ▼
Store in Pinecone
        │
        ▼
User Query
        │
        ▼
Hybrid Search
        │
        ▼
Retrieve Relevant Chunks
        │
        ▼
Build Prompt
        │
        ▼
OpenAI
        │
        ▼
Response with Sources
```

---

# 📡 API Modules

- Authentication
- Admin
- Chat
- Document Ingestion
- RAG Search
- Feedback
- Analytics

---

# 🔐 Authentication

The application uses:

- JWT Authentication
- Password Hashing (bcrypt)
- Role-Based Access Control
- Protected Routes

---

# 📁 Supported Document Types

- PDF
- Plain Text

(The ingestion pipeline can be extended to support DOCX, Markdown, HTML, and additional formats.)

---

# 📈 Future Improvements

- Streaming AI Responses
- Multi-Document Collections
- Conversation Memory
- Citation Highlighting
- OCR Support
- Image Understanding
- Multi-LLM Support
- Redis Caching
- Docker Deployment
- Kubernetes Deployment

---

# 👨‍💻 Developed With

- React
- TypeScript
- Node.js
- Express
- PostgreSQL
- Drizzle ORM
- OpenAI API
- Pinecone
- WebSockets

---

# 📄 License

This project is intended for educational and learning purposes. Add an appropriate open-source license (such as MIT) if you plan to distribute or publish it publicly.