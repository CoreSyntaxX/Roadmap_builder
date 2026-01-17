// ===== GEMINI AI SERVICE (PROTECTED) =====
// Client-side Gemini API integration for roadmap generation
// Uses server-side proxy for API calls with proper authentication

/**
 * Generate a structured roadmap using Gemini AI
 * @param {string} goal - The user's goal/objective
 * @param {object} options - Additional options
 * @returns {Promise<object>} Structured roadmap
 */
async function generateRoadmapWithAI(goal, options = {}) {
    const defaultOptions = {
        model: 'gemini-2.5-flash',
        maxSteps: 10,
        includeDuration: true,
        includeResources: true
    };

    const settings = { ...defaultOptions, ...options };

    try {
        showLoading();

        const response = await fetch('/api/generate-roadmap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ goal, settings })
        });

        // ---- Handle non-200 responses safely ----
        if (!response.ok) {
            let message = 'Failed to generate roadmap';
            try {
                const err = await response.json();
                message = err.error || message;
            } catch (_) {}
            throw new Error(message);
        }

        const data = await response.json();
        console.log('✅ AI SERVER RESPONSE:', data);

        // ---- Validate roadmap structure ----
        if (!data || typeof data !== 'object' || !data.roadmap) {
            throw new Error('Invalid response structure from server');
        }

        hideLoading();
        showNotification('✅ Roadmap generated successfully!');
        return data.roadmap;

    } catch (error) {
        console.error('❌ Error generating roadmap:', error);
        hideLoading();
        showNotification(`❌ ${error.message}`);
        throw error;
    }
}

/**
 * Generate roadmap from chat conversation
 * @param {string} chatGoal
 * @returns {Promise<object>}
 */
async function generateRoadmapFromChat(chatGoal) {
    try {
        showLoading();

        const roadmap = await generateRoadmapWithAI(chatGoal, {
            maxSteps: 15
        });

        // ---- Save to Firestore if available ----
        if (typeof createRoadmap === 'function') {
            const savedRoadmap = await createRoadmap({
                title: roadmap.title || 'AI Generated Roadmap',
                description: roadmap.description || '',
                nodes: roadmap.nodes || [],
                edges: roadmap.edges || [],
                isPublic: false,
                createdAt: new Date()
            });

            showNotification('🎉 Roadmap saved to your collection!');
            return savedRoadmap;
        }

        return roadmap;

    } catch (error) {
        console.error('❌ Error saving roadmap:', error);
        hideLoading();
        throw error;
    }
}

/* ------------------------------------------------------------------
   🚫 TEMPORARILY DISABLED (Hackathon Safety)
   These features depend on additional backend endpoints.
   Re-enable after demo.
------------------------------------------------------------------- */

// async function refineRoadmap(roadmapId, feedback) {}
// async function getRoadmapSuggestions(roadmapId) {}

console.log('🤖 ROADMAP.AI Gemini Service Loaded (Stable Mode)');
