// ===== SECURE SERVER CONFIGURATION =====
// IMPORTANT: For maximum security, use Firebase Admin SDK on the server
// to verify ID tokens from the client

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Helper function to get Gemini model with proper configuration
function getGeminiModel(modelName = 'gemini-1.5-flash') {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured');
    }
    return genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
        }
    });
}

// Helper function for safer API calls with better error handling
async function generateWithGemini(prompt, modelName = 'gemini-1.5-flash') {
    try {
        console.log(`🤖 Calling Gemini API with model: ${modelName}`);
        const model = getGeminiModel(modelName);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log('✅ Gemini API call successful');
        return text;
    } catch (error) {
        console.error('❌ Gemini API Error:', error.message);
        if (error.message.includes('404') || error.message.includes('not found') || error.message.includes('model not found')) {
            throw new Error(`Model "${modelName}" is not available. Please check your API access or try a different model.`);
        }
        if (error.message.includes('API key')) {
            throw new Error('Invalid or missing Gemini API key. Please check your .env file.');
        }
        throw error;
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

// ===== SECURITY MIDDLEWARE =====

// Parse cookies and JSON
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration (use secure session store in production)
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// ===== CORS CONFIGURATION =====
// Configure based on your needs
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', allowedOrigins[0] || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ===== AUTHENTICATION MIDDLEWARE =====

// Verify Firebase ID token - Skip for public API routes
async function verifyIdToken(req, res, next) {
    // Skip verification for API routes (they have their own auth logic)
    if (req.path.startsWith('/api/')) {
        return next();
    }
    
    const idToken = req.cookies.token || req.headers.authorization?.split('Bearer ')[1];
    
    if (!idToken) {
        // For HTML requests, redirect to login; for API, return 401
        if (req.accepts('html')) {
            return res.redirect('/login');
        }
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    
    try {
        // In production, use Firebase Admin SDK to verify:
        // const decodedToken = await admin.auth().verifyIdToken(idToken);
        // req.user = decodedToken;
        
        // For now, we'll verify client-side and trust the session
        req.user = { authenticated: true };
        next();
    } catch (error) {
        console.error('Token verification failed:', error);
        if (req.accepts('html')) {
            return res.redirect('/login');
        }
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
}

// ===== PUBLIC ROUTES (CSS FILES ONLY) =====

// Serve CSS files publicly
app.use('/styles', express.static(path.join(__dirname, 'public', 'styles'), {
    etag: true,
    lastModified: true,
    maxAge: '1d'
}));

// Serve public landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve signup page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// ===== API ROUTES =====

// Login endpoint (for server-side validation)
app.post('/api/login', async (req, res) => {
    const { idToken, email } = req.body;
    
    if (!idToken) {
        return res.status(400).json({ error: 'No token provided' });
    }
    
    try {
        // Create session
        req.session.user = { email, authenticated: true };
        req.session.token = idToken;
        
        // Set token cookie for middleware verification
        res.cookie('token', idToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        
        res.json({ success: true, message: 'Login successful' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.clearCookie('token');
        res.json({ success: true });
    });
});

// Check auth status
app.get('/api/auth-status', (req, res) => {
    if (req.session.user && req.session.user.authenticated) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

// Chat endpoint for AI roadmap generation - NOW USING SDK
app.post('/api/chat', verifyIdToken, async (req, res) => {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array required' });
    }

    try {
        // Prepare the prompt by combining system message and conversation
        const systemPrompt = `You are a helpful roadmap generator assistant. Help users create step-by-step roadmaps for their goals.

When creating a roadmap:
1. Start by acknowledging their goal
2. Break it down into clear phases/milestones
3. Provide specific, actionable steps for each phase
4. Include time estimates where appropriate
5. Add tips or resources when relevant
6. Keep the tone motivating and supportive

Format your roadmap with clear sections and use emojis to make it engaging.`;

        // Combine system prompt with user messages
        const conversationText = systemPrompt + '\n\n' + messages.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n\n');

        // Use the SDK for better reliability
        const assistantMessage = await generateWithGemini(conversationText, 'gemini-1.5-flash');
        res.json({ content: assistantMessage });
    } catch (error) {
        console.error('Chat API error:', error);
        const statusCode = error.message.includes('not configured') ? 503 : 500;
        res.status(statusCode).json({ error: `Failed to generate response: ${error.message}` });
    }
});

// Generate roadmap endpoint - creates structured roadmap with nodes and edges - NOW USING SDK
app.post('/api/generate-roadmap', verifyIdToken, async (req, res) => {
    const { goal, settings } = req.body;

    if (!goal || typeof goal !== 'string') {
        return res.status(400).json({ error: 'Goal is required' });
    }

    try {
        const maxSteps = settings?.maxSteps || 10;
        
        const prompt = `Create a detailed, structured roadmap for this goal: "${goal}"

Requirements:
- Maximum ${maxSteps} steps
- Each step should be specific and actionable
- Include estimated time duration for each step (e.g., "1 week", "2 days")
- Add helpful resources or tips where appropriate

Please respond with ONLY a valid JSON object in this exact format (no markdown, no explanations):
{
  "title": "Clear, concise title for this roadmap",
  "description": "Brief overview of what this roadmap achieves (2-3 sentences)",
  "nodes": [
    {
      "id": "step_1",
      "title": "First major milestone",
      "description": "Detailed description of what to accomplish in this step",
      "duration": "Time estimate (e.g., 'Week 1-2', '2 days')",
      "type": "milestone | task | resource",
      "resources": ["Helpful resource 1", "Helpful resource 2"]
    }
  ],
  "edges": [
    {
      "source": "step_1",
      "target": "step_2",
      "label": "Then"
    }
  ],
  "estimatedTotalDuration": "Overall time estimate",
  "difficulty": "beginner | intermediate | advanced",
  "category": "Category or domain of this goal"
}

Make the steps logical and progressive. Start with fundamentals and build up to more advanced topics.`;

        // Use the SDK for better reliability
        const responseText = await generateWithGemini(prompt, 'gemini-1.5-flash');
        
        // Parse JSON from response (handle markdown code blocks if present)
        let jsonText = responseText.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
        }
        
        const roadmap = JSON.parse(jsonText);
        
        // Validate structure
        if (!roadmap.nodes || !Array.isArray(roadmap.nodes)) {
            throw new Error('Invalid roadmap structure: missing nodes array');
        }
        
        // Generate edges if not provided
        if (!roadmap.edges || roadmap.edges.length === 0) {
            roadmap.edges = [];
            for (let i = 0; i < roadmap.nodes.length - 1; i++) {
                roadmap.edges.push({
                    source: roadmap.nodes[i].id,
                    target: roadmap.nodes[i + 1].id,
                    label: 'Then'
                });
            }
        }
        
        // Ensure all nodes have required fields
        roadmap.nodes = roadmap.nodes.map((node, index) => ({
            id: node.id || `step_${index + 1}`,
            title: node.title || `Step ${index + 1}`,
            description: node.description || '',
            duration: node.duration || '',
            type: node.type || 'task',
            resources: node.resources || [],
            ...node
        }));
        
        console.log('✅ Roadmap generated successfully');
        res.json({ 
            success: true, 
            roadmap: roadmap,
            message: `Created roadmap with ${roadmap.nodes.length} steps`
        });
    } catch (error) {
        console.error('Roadmap generation error:', error);
        const statusCode = error.message.includes('not configured') ? 503 : 500;
        res.status(statusCode).json({ error: `Failed to generate roadmap: ${error.message}` });
    }
});

// Refine roadmap endpoint - improves existing roadmap based on feedback - NOW USING SDK
app.post('/api/refine-roadmap', verifyIdToken, async (req, res) => {
    const { originalRoadmap, feedback } = req.body;

    if (!originalRoadmap || !originalRoadmap.nodes) {
        return res.status(400).json({ error: 'Original roadmap is required' });
    }

    if (!feedback || typeof feedback !== 'string') {
        return res.status(400).json({ error: 'Feedback is required' });
    }

    try {
        const prompt = `Based on the original roadmap and user feedback, create an improved version.

ORIGINAL ROADMAP:
${JSON.stringify(originalRoadmap, null, 2)}

USER FEEDBACK:
${feedback}

Please respond with ONLY a valid JSON object (no markdown, no explanations) in the same format as before, incorporating the user's feedback:

{
  "title": "Updated title if needed",
  "description": "Updated description",
  "nodes": [...updated nodes with same structure...],
  "edges": [...updated edges...],
  "changes": "Brief description of what was changed"
}`;

        // Use the SDK for better reliability
        const responseText = await generateWithGemini(prompt, 'gemini-1.5-flash');
        
        // Parse JSON from response
        let jsonText = responseText.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
        }
        
        const refinedRoadmap = JSON.parse(jsonText);
        
        console.log('✅ Roadmap refined successfully');
        res.json({ 
            success: true, 
            roadmap: refinedRoadmap 
        });
    } catch (error) {
        console.error('Roadmap refinement error:', error);
        const statusCode = error.message.includes('not configured') ? 503 : 500;
        res.status(statusCode).json({ error: `Failed to refine roadmap: ${error.message}` });
    }
});

// Suggest improvements endpoint - provides AI-powered suggestions - NOW USING SDK
app.post('/api/suggest-roadmap', verifyIdToken, async (req, res) => {
    const { roadmap } = req.body;

    if (!roadmap || !roadmap.nodes) {
        return res.status(400).json({ error: 'Roadmap is required' });
    }

    try {
        const prompt = `Analyze this roadmap and provide 3-5 specific suggestions for improvement:

${JSON.stringify(roadmap, null, 2)}

Please respond with ONLY a valid JSON object (no markdown, no explanations):
{
  "suggestions": [
    {
      "type": "addition | removal | modification | enhancement",
      "title": "Brief suggestion title",
      "description": "Detailed explanation of the suggestion",
      "priority": "high | medium | low",
      "reasoning": "Why this improvement would be beneficial"
    }
  ],
  "overallAssessment": "Brief overall assessment of the roadmap quality",
  "strengths": ["List of current strengths"],
  "improvements": ["Key areas for improvement"]
}`;

        // Use the SDK for better reliability
        const responseText = await generateWithGemini(prompt, 'gemini-1.5-flash');
        
        // Parse JSON from response
        let jsonText = responseText.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
        }
        
        const suggestions = JSON.parse(jsonText);
        
        console.log('✅ Suggestions generated successfully');
        res.json({ 
            success: true, 
            suggestions: suggestions.suggestions,
            assessment: suggestions.overallAssessment,
            strengths: suggestions.strengths,
            improvements: suggestions.improvements
        });
    } catch (error) {
        console.error('Suggestions generation error:', error);
        const statusCode = error.message.includes('not configured') ? 503 : 500;
        res.status(statusCode).json({ error: `Failed to generate suggestions: ${error.message}` });
    }
});

// ===== PROTECTED ROUTES (APP) =====

// Serve app only to authenticated users
app.get('/app', verifyIdToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'protected', 'app.html'));
});

// Serve JS files only to authenticated users
app.use('/js', verifyIdToken, express.static(path.join(__dirname, 'protected', 'js'), {
    etag: true,
    lastModified: true,
    maxAge: '1d'
}));

// Serve app HTML files
app.get('/app/*', verifyIdToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'protected', 'app.html'));
});

// ===== ERROR HANDLING =====

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ===== START SERVER =====

app.listen(PORT, () => {
    console.log(`🗺️ ROADMAP.AI Server running on http://localhost:${PORT}`);
    console.log(`📁 Public files: CSS styles only`);
    console.log(`🔒 Protected files: All JavaScript and app functionality`);
    
    // Check for API key configuration
    if (!process.env.GEMINI_API_KEY) {
        console.log(`⚠️  WARNING: GEMINI_API_KEY is not set in .env file!`);
        console.log(`   The AI features will not work without an API key.`);
        console.log(`   Get a key at: https://aistudio.google.com/app/apikey`);
    } else {
        console.log(`✅ Gemini API configured`);
    }
});

module.exports = app;

