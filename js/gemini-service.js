// ===== GEMINI AI SERVICE =====
// Client-side Gemini API integration for roadmap generation
// Uses server-side proxy for API calls with proper authentication

/**
 * Generate a structured roadmap using Gemini AI
 * @param {string} goal - The user's goal/objective
 * @param {object} options - Additional options (timeframe, complexity, etc.)
 * @returns {Promise<object>} Structured roadmap with nodes and edges
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
            body: JSON.stringify({
                goal: goal,
                settings: settings
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate roadmap');
        }

        const data = await response.json();
        
        if (!data.roadmap) {
            throw new Error('Invalid response from AI');
        }

        hideLoading();
        showNotification('✅ Roadmap generated successfully!');
        
        return data.roadmap;
    } catch (error) {
        console.error('Error generating roadmap:', error);
        hideLoading();
        showNotification(`Failed to generate roadmap: ${error.message}`);
        throw error;
    }
}

/**
 * Generate roadmap from chat conversation
 * @param {string} chatGoal - The goal extracted from chat
 * @returns {Promise<object>} Generated roadmap
 */
async function generateRoadmapFromChat(chatGoal) {
    try {
        showLoading();
        
        const roadmap = await generateRoadmapWithAI(chatGoal, {
            maxSteps: 15,
            includeDuration: true,
            includeResources: true
        });

        // Add to user's roadmaps in Firestore
        if (typeof createRoadmap === 'function') {
            const savedRoadmap = await createRoadmap({
                title: roadmap.title,
                description: roadmap.description,
                nodes: roadmap.nodes,
                edges: roadmap.edges,
                isPublic: false
            });
            
            showNotification('🎉 Roadmap saved to your collection!');
            return savedRoadmap;
        } else {
            throw new Error('Firestore service not available');
        }
    } catch (error) {
        console.error('Error saving roadmap:', error);
        hideLoading();
        throw error;
    }
}

/**
 * Refine an existing roadmap based on user feedback
 * @param {string} roadmapId - ID of the roadmap to refine
 * @param {string} feedback - User's feedback or additional requirements
 * @returns {Promise<object>} Updated roadmap
 */
async function refineRoadmap(roadmapId, feedback) {
    try {
        showLoading();
        
        // Get current roadmap
        let currentRoadmap;
        if (typeof getRoadmap === 'function') {
            currentRoadmap = await getRoadmap(roadmapId);
        } else {
            throw new Error('Cannot fetch roadmap');
        }

        if (!currentRoadmap) {
            throw new Error('Roadmap not found');
        }

        // Generate refined roadmap
        const response = await fetch('/api/refine-roadmap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                originalRoadmap: currentRoadmap,
                feedback: feedback
            })
        });

        if (!response.ok) {
            throw new Error('Failed to refine roadmap');
        }

        const data = await response.json();
        
        if (!data.roadmap) {
            throw new Error('Invalid refined roadmap response');
        }

        // Update in Firestore
        if (typeof updateRoadmap === 'function') {
            await updateRoadmap(roadmapId, {
                title: data.roadmap.title,
                description: data.roadmap.description,
                nodes: data.roadmap.nodes,
                edges: data.roadmap.edges
            });
        }

        hideLoading();
        showNotification('✅ Roadmap refined successfully!');
        
        return data.roadmap;
    } catch (error) {
        console.error('Error refining roadmap:', error);
        hideLoading();
        showNotification(`Failed to refine roadmap: ${error.message}`);
        throw error;
    }
}

/**
 * Get AI suggestions for roadmap improvements
 * @param {string} roadmapId - ID of the roadmap
 * @returns {Promise<array>} Array of suggestions
 */
async function getRoadmapSuggestions(roadmapId) {
    try {
        let roadmap;
        if (typeof getRoadmap === 'function') {
            roadmap = await getRoadmap(roadmapId);
        } else {
            throw new Error('Cannot fetch roadmap');
        }

        if (!roadmap) {
            throw new Error('Roadmap not found');
        }

        const response = await fetch('/api/suggest-roadmap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                roadmap: roadmap
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get suggestions');
        }

        const data = await response.json();
        return data.suggestions || [];
    } catch (error) {
        console.error('Error getting suggestions:', error);
        return [];
    }
}

console.log('🤖 ROADMAP.AI Gemini Service Loaded!');

