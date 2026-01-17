// ===== SECURE SERVER CONFIGURATION =====

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ===== GEMINI INIT =====
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function getGeminiModel(modelName = 'gemini-2.5-flash') {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured');
    }
    return genAI.getGenerativeModel({ model: modelName });
}

async function generateWithGemini(prompt) {
    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    return result.response.text();
}

// ===== JSON HELPERS =====
function repairJson(text) {
    try {
        return JSON.parse(text);
    } catch (_) {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON found');
        return JSON.parse(match[0]);
    }
}

function normalizeRoadmap(raw) {
    const nodes =
        Array.isArray(raw.nodes) ? raw.nodes :
        Array.isArray(raw.steps) ? raw.steps.map((s, i) => ({
            id: `step_${i + 1}`,
            title: typeof s === 'string' ? s : s.title || `Step ${i + 1}`,
            description: s.description || '',
            duration: s.duration || '',
            type: 'task',
            resources: s.resources || []
        })) : [];

    const edges = [];
    for (let i = 0; i < nodes.length - 1; i++) {
        edges.push({
            source: nodes[i].id,
            target: nodes[i + 1].id,
            label: 'Then'
        });
    }

    return {
        title: raw.title || 'AI Generated Roadmap',
        description: raw.description || '',
        nodes,
        edges,
        estimatedTotalDuration: raw.estimatedTotalDuration || '',
        difficulty: raw.difficulty || 'beginner',
        category: raw.category || 'general'
    };
}

// ===== APP INIT =====
const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// ===== STATIC FILES =====
app.use('/styles', express.static(path.join(__dirname, 'public', 'styles')));

app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (_, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/signup', (_, res) => res.sendFile(path.join(__dirname, 'public', 'signup.html')));

// ===== AUTH (SIMPLIFIED FOR HACKATHON) =====
function verifyIdToken(req, res, next) {
    // Check if this is an API request - use originalUrl for full path
    if (req.originalUrl.startsWith('/api/')) return next();
    
    // Check if user is authenticated in session
    if (!req.session.user || !req.session.user.authenticated) {
        // For API requests, return 401
        if (req.originalUrl.startsWith('/api/')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // For page requests, redirect to login
        return res.redirect('/login');
    }
    
    next();
}

// ===== API ROUTES =====
app.post('/api/login', async (req, res) => {
    const { idToken, email } = req.body;
    
    if (!idToken) {
        return res.status(400).json({ error: 'No token provided' });
    }
    
    try {
        // Verify the Firebase ID token
        // In production, use admin.auth().verifyIdToken(idToken)
        // For now, we'll accept the token and create session
        // This is simplified for the hackathon demo
        
        // Create session for authenticated user
        req.session.user = { 
            authenticated: true,
            email: email,
            token: idToken.substring(0, 20) + '...' // Store truncated token for debugging
        };
        
        console.log('✅ User logged in:', email);
        res.json({ success: true });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/auth-status', (req, res) => {
    res.json({ 
        authenticated: !!(req.session.user && req.session.user.authenticated),
        user: req.session.user ? {
            email: req.session.user.email
        } : null
    });
});

app.get('/api/firebase-config', (req, res) => {
    res.json({
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
    });
});

// ===== ROADMAP GENERATION (FIXED) =====
app.post('/api/generate-roadmap', async (req, res) => {
    const { goal, settings } = req.body;

    if (!goal) {
        return res.status(400).json({ error: 'Goal is required' });
    }

    try {
        const prompt = `
Create a roadmap for: "${goal}"

Return ONLY valid JSON in this format:
{
  "title": "...",
  "description": "...",
  "steps": [
    {
      "title": "...",
      "description": "...",
      "duration": "..."
    }
  ]
}
        `.trim();

        const aiText = await generateWithGemini(prompt);
        console.log('🤖 RAW AI OUTPUT:', aiText.slice(0, 300));

        const parsed = repairJson(aiText);
        const roadmap = normalizeRoadmap(parsed);

        if (roadmap.nodes.length === 0) {
            throw new Error('AI returned no usable steps');
        }

        res.json({ roadmap });

    } catch (err) {
        console.error('❌ Roadmap generation failed:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===== PROTECTED APP =====
app.get('/app', verifyIdToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'protected', 'app.html'));
});

app.use('/js', verifyIdToken, express.static(path.join(__dirname, 'protected', 'js')));

// ===== SERVER START =====
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    if (!process.env.GEMINI_API_KEY) {
        console.log('⚠️ GEMINI_API_KEY missing');
    } else {
        console.log('✅ Gemini API ready');
    }
});
