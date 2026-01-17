# 🚀 ROADMAP.AI - AI-Powered Roadmap Generator

An intelligent web application that helps users create personalized, step-by-step roadmaps for their goals using Google Gemini AI, stored securely in Firebase Firestore.

![Roadmap.AI Banner](https://via.placeholder.com/1200x400/1a1a2e/ffffff?text=ROADMAP.AI+-+Build+Your+Path+to+Success)

## ✨ Features

### 🤖 AI-Powered Roadmap Generation
- **Smart Goal Analysis**: AI understands your goals and creates structured roadmaps
- **Personalized Steps**: Each step includes duration, resources, and actionable tasks
- **Progress Tracking**: Visual representation with nodes and edges
- **Iterative Refinement**: Get AI suggestions to improve your roadmap

### 💾 Firestore Integration
- **Secure Storage**: All roadmaps stored in user-specific Firestore collections
- **Real-time Sync**: Instant updates across devices
- **Full CRUD Operations**: Create, read, update, and delete roadmaps
- **Offline Support**: Firestore SDK handles offline scenarios

### 💬 Chat Integration
- **Conversational Interface**: Discuss goals with AI assistant
- **One-Click Saving**: Save chat conversations as structured roadmaps
- **Context Awareness**: AI remembers your conversation history

### 🔐 Security
- **Firebase Authentication**: Secure user login/signup
- **Protected Routes**: Only authenticated users access roadmaps
- **Server-side API**: Gemini API keys never exposed to client

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Firebase account
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   cd /home/spoider/projects/r2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your-gemini-api-key-here
   PORT=3000
   ```

4. **Get your Gemini API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key
   - Copy it to your `.env` file

5. **Start the server**
   ```bash
   npm start
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📖 User Guide

### Creating Your First Roadmap

#### Method 1: Direct AI Generation
1. Click **"CREATE YOUR ROADMAP"** button
2. Describe your goal (e.g., "I want to learn Python programming in 6 months")
3. Click **"🚀 Generate with AI"**
4. AI creates a structured roadmap and saves it to your collection

#### Method 2: Chat Conversation
1. Click the 🤖 **AI Assistant** button to open chat
2. Discuss your goal with the AI
3. After getting a response, click **"💾 Save as Roadmap"**
4. AI generates a structured roadmap from your conversation

#### Method 3: Manual Creation
1. Click **"CREATE YOUR ROADMAP"** button
2. Enter a title and description
3. Click **"Create Roadmap"** (without AI generation)
4. Add steps manually to your roadmap

### Managing Roadmaps

#### View Roadmaps
- All your roadmaps appear in the "Popular Roadmaps" section
- Click any roadmap to view details
- Roadmaps are sorted by last updated date

#### Edit Roadmaps
- Click **"✏️ Edit"** on a roadmap to modify title/description
- Add new steps with **"+ Add First Step"**
- Each step can have title, description, and duration

#### Delete Roadmaps
- Click **"🗑️ Delete"** on a roadmap
- Confirm deletion (action cannot be undone)

#### Duplicate Roadmaps
- Click **"📋 Duplicate"** to create a copy
- Useful for creating variations of existing roadmaps

### AI-Powered Features

#### Get Suggestions
- Open any roadmap
- AI analyzes your roadmap and provides improvement suggestions
- Suggestions include additions, modifications, and enhancements

#### Refine Roadmap
- Provide feedback to AI
- AI refines the roadmap based on your input
- Maintains logical progression of steps

## 🏗️ Architecture

```
ROADMAP.AI/
├── 📁 public/                 # Public assets
│   ├── index.html            # Landing page
│   ├── login.html            # Login page
│   └── signup.html           # Signup page
│
├── 📁 protected/             # Protected routes (auth required)
│   ├── app.html             # Main app interface
│   └── js/
│       ├── app.js           # App logic & roadmap management
│       ├── chat.js          # Chat functionality
│       ├── firestore-service.js  # Firestore operations
│       └── gemini-service.js     # AI service integration
│
├── 📁 js/                    # Shared JavaScript
│   ├── app.js
│   ├── authentication.js    # Firebase Auth
│   ├── chat.js
│   ├── firebase-config.js   # Firebase config
│   ├── firestore-service.js
│   ├── gemini-service.js    # Client-side AI service
│   └── utils.js
│
├── 📁 styles/               # CSS stylesheets
│   ├── main.css
│   ├── auth.css
│   ├── chat.css
│   └── animations.css
│
├── 📄 server.js             # Express server
├── 📄 package.json
├── 📄 .env.example          # Environment template
└── 📄 README.md
```

## 🔌 API Endpoints

### POST /api/generate-roadmap
Generate a structured roadmap from a goal.

**Request:**
```json
{
  "goal": "Learn guitar in 6 months",
  "settings": {
    "maxSteps": 10,
    "includeDuration": true,
    "includeResources": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "roadmap": {
    "title": "Guitar Mastery in 6 Months",
    "description": "A comprehensive guide to learning guitar...",
    "nodes": [...],
    "edges": [...]
  },
  "message": "Created roadmap with 8 steps"
}
```

### POST /api/refine-roadmap
Improve an existing roadmap with AI feedback.

**Request:**
```json
{
  "originalRoadmap": {...},
  "feedback": "Add more practice exercises"
}
```

### POST /api/suggest-roadmap
Get AI-powered improvement suggestions.

**Request:**
```json
{
  "roadmap": {...}
}
```

**Response:**
```json
{
  "success": true,
  "suggestions": [...],
  "assessment": "Good structure with room for improvement...",
  "strengths": ["Clear milestones", "Good time estimates"],
  "improvements": ["Add more practice resources"]
}
```

## 🛠️ Technology Stack

- **Frontend**
  - HTML5, CSS3, JavaScript (ES6+)
  - Firebase SDK (Auth + Firestore)
  - Responsive design

- **Backend**
  - Node.js + Express
  - Server-side API endpoints
  - Secure session management

- **AI/ML**
  - Google Gemini 1.5 Flash
  - Structured JSON output
  - Context-aware generation

- **Database**
  - Firebase Firestore
  - Real-time listeners
  - Offline support

## 🔒 Security Features

- Firebase Authentication (Email + Google)
- Protected API routes with token verification
- Server-side API key handling
- CORS configuration
- Secure cookies
- XSS protection with HTML escaping

## 📱 Responsive Design

- Mobile-first approach
- Touch-friendly interactions
- Optimized for all screen sizes
- Smooth animations and transitions

## 🚧 Future Enhancements

- [ ] Interactive roadmap visualization (graph view)
- [ ] Export to PDF/Markdown
- [ ] Share roadmaps publicly
- [ ] Template library
- [ ] Progress tracking
- [ ] Mobile app (React Native)
- [ ] Team collaboration features
- [ ] Analytics dashboard

## 🐛 Troubleshooting

### Gemini API Key Not Working
1. Check `.env` file has correct key
2. Ensure no spaces or quotes around key
3. Verify key has access to Gemini API

### Roadmaps Not Saving
1. Check browser console for errors
2. Verify Firebase configuration
3. Ensure user is logged in
4. Check Firestore security rules

### Chat Not Working
1. Check network tab for failed requests
2. Verify `/api/chat` endpoint is accessible
3. Check server logs for errors

## 📄 License

MIT License - feel free to use this project for learning and development.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For questions or issues:
1. Check the troubleshooting section
2. Review server logs
3. Open an issue on GitHub

---

**Built with ❤️ using Google Gemini AI & Firebase**

![Built with Gemini](https://img.shields.io/badge/Built%20with-Gemini-1DB954?style=for-the-badge&logo=google)
![Built with Firebase](https://img.shields.io/badge/Built%20with-Firebase-FFCA28?style=for-the-badge&logo=firebase)

