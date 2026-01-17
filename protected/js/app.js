// ===== ROADMAP APPLICATION =====
/**
 * Roadmap management functionality with Firestore integration
 */

// ===== APP STATE =====
const RoadmapApp = {
    currentRoadmap: null,
    roadmaps: [],
    isLoading: false,
    isGenerating: false
};

// ===== INITIALIZATION =====
async function initializeRoadmapApp() {
    console.log('🗺️ ROADMAP.AI App Initializing...');
    
    // Initialize Firebase first
    await initializeFirebase();
    
    // Set up event listeners immediately
    setupRoadmapEventListeners();
    
    // Wait for Firebase to be ready, then load roadmaps
    const checkFirebase = setInterval(() => {
        if (typeof auth !== 'undefined' && auth && auth.currentUser) {
            clearInterval(checkFirebase);
            loadUserRoadmaps();
        }
        // Also check for temporary auth state
        if (typeof firebase !== 'undefined' && firebase.auth) {
            clearInterval(checkFirebase);
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    console.log('📚 Loading user roadmaps...');
                    await loadUserRoadmaps();
                    if (typeof syncUserProfile === 'function') {
                        syncUserProfile();
                    }
                }
            });
        }
    }, 100);
    
    // Timeout after 10 seconds
    setTimeout(() => {
        clearInterval(checkFirebase);
    }, 10000);
}

// ===== EVENT LISTENERS =====
function setupRoadmapEventListeners() {
    console.log('Setting up event listeners...');
    
    // Create roadmap button
    const createBtn = document.getElementById('createRoadmapBtn');
    if (createBtn) {
        createBtn.onclick = function() {
            console.log('Create roadmap button clicked!');
            showCreateRoadmapModal();
        };
        console.log('✅ Create roadmap button listener attached');
    } else {
        console.warn('createRoadmapBtn not found');
    }
    
    // Close modal button
    const closeModalBtn = document.getElementById('closeRoadmapModal');
    if (closeModalBtn) {
        closeModalBtn.onclick = function() {
            hideCreateRoadmapModal();
        };
    }
    
    // Roadmap form submit
    const roadmapForm = document.getElementById('roadmapForm');
    if (roadmapForm) {
        roadmapForm.onsubmit = handleCreateRoadmap;
        console.log('✅ Roadmap form listener attached');
    }
    
    // Close modal on overlay click
    const modal = document.getElementById('roadmapModal');
    if (modal) {
        modal.onclick = function(e) {
            if (e.target === modal) {
                hideCreateRoadmapModal();
            }
        };
    }
    
    // Close modal on Escape key
    document.onkeydown = function(e) {
        if (e.key === 'Escape') {
            hideCreateRoadmapModal();
        }
    };
    
    console.log('✅ All event listeners attached');
}

// ===== ROADMAP CRUD OPERATIONS =====

/**
 * Load all roadmaps for the current user
 */
async function loadUserRoadmaps() {
    try {
        RoadmapApp.isLoading = true;
        showLoading();
        
        if (typeof getUserRoadmaps === 'function') {
            RoadmapApp.roadmaps = await getUserRoadmaps();
        } else {
            // Fallback: use Firestore directly
            RoadmapApp.roadmaps = await fetchRoadmapsFromFirestore();
        }
        
        renderRoadmapList();
        hideLoading();
        RoadmapApp.isLoading = false;
        
        console.log(`✅ Loaded ${RoadmapApp.roadmaps.length} roadmaps`);
    } catch (error) {
        console.error('Error loading roadmaps:', error);
        hideLoading();
        RoadmapApp.isLoading = false;
        showNotification('Failed to load roadmaps. Please refresh the page.');
    }
}

/**
 * Fetch roadmaps directly from Firestore (fallback)
 */
async function fetchRoadmapsFromFirestore() {
    if (!auth.currentUser || !db) return [];
    
    const snapshot = await db.collection('users')
        .doc(auth.currentUser.uid)
        .collection('roadmaps')
        .orderBy('updatedAt', 'desc')
        .get();
    
    const roadmaps = [];
    snapshot.forEach(doc => {
        roadmaps.push({
            id: doc.id,
            ...doc.data()
        });
    });
    
    return roadmaps;
}

/**
 * Create a new roadmap
 */
async function createNewRoadmap(title, description = '') {
    try {
        showLoading();
        
        const roadmapData = {
            title: title || 'Untitled Roadmap',
            description: description,
            nodes: [],
            edges: [],
            isPublic: false
        };
        
        let newRoadmap;
        if (typeof createRoadmap === 'function') {
            newRoadmap = await createRoadmap(roadmapData);
        } else {
            // Fallback: create directly in Firestore
            const docRef = await db.collection('users')
                .doc(auth.currentUser.uid)
                .collection('roadmaps')
                .add({
                    ...roadmapData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            newRoadmap = { id: docRef.id, ...roadmapData };
        }
        
        // Add to local state
        RoadmapApp.roadmaps.unshift(newRoadmap);
        renderRoadmapList();
        
        // Open the new roadmap
        openRoadmap(newRoadmap.id);
        
        hideLoading();
        showNotification('✅ Roadmap created successfully!');
        
        return newRoadmap;
    } catch (error) {
        console.error('Error creating roadmap:', error);
        hideLoading();
        showNotification('Failed to create roadmap. Please try again.');
        throw error;
    }
}

/**
 * Open and display a roadmap
 */
async function openRoadmap(roadmapId) {
    try {
        showLoading();
        
        let roadmap;
        if (typeof getRoadmap === 'function') {
            roadmap = await getRoadmap(roadmapId);
        } else {
            // Fallback: fetch directly
            const doc = await db.collection('users')
                .doc(auth.currentUser.uid)
                .collection('roadmaps')
                .doc(roadmapId)
                .get();
            
            if (doc.exists) {
                roadmap = { id: doc.id, ...doc.data() };
            }
        }
        
        if (roadmap) {
            RoadmapApp.currentRoadmap = roadmap;
            displayRoadmap(roadmap);
            showNotification(`📖 Opened: ${roadmap.title}`);
        } else {
            showNotification('Roadmap not found.');
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error opening roadmap:', error);
        hideLoading();
        showNotification('Failed to open roadmap.');
    }
}

/**
 * Display roadmap content
 */
function displayRoadmap(roadmap) {
    // Update the hero section with roadmap info
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.innerHTML = `
            <div class="roadmap-header">
                <h2 class="roadmap-title">${escapeHtml(roadmap.title)}</h2>
                <p class="roadmap-description">${escapeHtml(roadmap.description || 'No description')}</p>
                <div class="roadmap-meta">
                    <span class="meta-item">📅 Created: ${formatDate(roadmap.createdAt)}</span>
                    <span class="meta-item">🔄 Updated: ${formatDate(roadmap.updatedAt)}</span>
                </div>
            </div>
            <div class="roadmap-actions">
                <button class="btn btn-primary" onclick="editRoadmap('${roadmap.id}')">✏️ Edit</button>
                <button class="btn btn-secondary" onclick="duplicateRoadmapHandler('${roadmap.id}')">📋 Duplicate</button>
                <button class="btn btn-danger" onclick="deleteRoadmapHandler('${roadmap.id}')">🗑️ Delete</button>
            </div>
            <div class="roadmap-content" id="roadmapContent">
                ${renderRoadmapNodes(roadmap)}
            </div>
            <button class="btn btn-back" onclick="showRoadmapList()">← Back to All Roadmaps</button>
        `;
    }
}

/**
 * Render roadmap nodes
 */
function renderRoadmapNodes(roadmap) {
    if (!roadmap.nodes || roadmap.nodes.length === 0) {
        return `
            <div class="empty-roadmap">
                <div class="empty-icon">📝</div>
                <h3>This roadmap is empty</h3>
                <p>Start adding steps to achieve your goal!</p>
                <button class="btn btn-primary" onclick="addRoadmapStep('${roadmap.id}')">+ Add First Step</button>
            </div>
        `;
    }
    
    let html = '<div class="roadmap-nodes">';
    roadmap.nodes.forEach((node, index) => {
        html += `
            <div class="roadmap-node" data-id="${node.id}">
                <div class="node-number">${index + 1}</div>
                <div class="node-content">
                    <h4 class="node-title">${escapeHtml(node.title)}</h4>
                    <p class="node-description">${escapeHtml(node.description || '')}</p>
                    ${node.duration ? `<span class="node-duration">⏱️ ${escapeHtml(node.duration)}</span>` : ''}
                </div>
                ${index < roadmap.nodes.length - 1 ? '<div class="node-connector">↓</div>' : ''}
            </div>
        `;
    });
    html += '</div>';
    
    return html;
}

/**
 * Update roadmap content
 */
async function updateRoadmapContent(roadmapId, data) {
    try {
        if (typeof updateRoadmap === 'function') {
            await updateRoadmap(roadmapId, data);
        } else {
            // Fallback: update directly
            await db.collection('users')
                .doc(auth.currentUser.uid)
                .collection('roadmaps')
                .doc(roadmapId)
                .update({
                    ...data,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
        }
        
        // Update local state
        const index = RoadmapApp.roadmaps.findIndex(r => r.id === roadmapId);
        if (index !== -1) {
            RoadmapApp.roadmaps[index] = { ...RoadmapApp.roadmaps[index], ...data };
        }
        
        if (RoadmapApp.currentRoadmap && RoadmapApp.currentRoadmap.id === roadmapId) {
            RoadmapApp.currentRoadmap = { ...RoadmapApp.currentRoadmap, ...data };
        }
        
        console.log('✅ Roadmap updated');
    } catch (error) {
        console.error('Error updating roadmap:', error);
        throw error;
    }
}

/**
 * Delete a roadmap
 */
async function deleteRoadmapHandler(roadmapId) {
    if (!confirm('Are you sure you want to delete this roadmap? This action cannot be undone.')) {
        return;
    }
    
    try {
        showLoading();
        
        if (typeof deleteRoadmap === 'function') {
            await deleteRoadmap(roadmapId);
        } else {
            // Fallback: delete directly
            await db.collection('users')
                .doc(auth.currentUser.uid)
                .collection('roadmaps')
                .doc(roadmapId)
                .delete();
        }
        
        // Remove from local state
        RoadmapApp.roadmaps = RoadmapApp.roadmaps.filter(r => r.id !== roadmapId);
        
        if (RoadmapApp.currentRoadmap && RoadmapApp.currentRoadmap.id === roadmapId) {
            RoadmapApp.currentRoadmap = null;
        }
        
        renderRoadmapList();
        showRoadmapList();
        hideLoading();
        showNotification('✅ Roadmap deleted successfully');
        
    } catch (error) {
        console.error('Error deleting roadmap:', error);
        hideLoading();
        showNotification('Failed to delete roadmap. Please try again.');
    }
}

/**
 * Duplicate a roadmap
 */
async function duplicateRoadmapHandler(roadmapId) {
    try {
        showLoading();
        
        let newRoadmap;
        if (typeof duplicateRoadmap === 'function') {
            newRoadmap = await duplicateRoadmap(roadmapId);
        } else {
            // Fallback: duplicate directly
            const original = await getRoadmap(roadmapId);
            if (!original) throw new Error('Roadmap not found');
            
            const duplicateData = {
                title: `${original.title} (Copy)`,
                description: original.description,
                nodes: original.nodes,
                edges: original.edges,
                isPublic: false
            };
            
            const docRef = await db.collection('users')
                .doc(auth.currentUser.uid)
                .collection('roadmaps')
                .add({
                    ...duplicateData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            newRoadmap = { id: docRef.id, ...duplicateData };
        }
        
        // Add to local state
        RoadmapApp.roadmaps.unshift(newRoadmap);
        renderRoadmapList();
        
        hideLoading();
        showNotification('✅ Roadmap duplicated successfully!');
        
    } catch (error) {
        console.error('Error duplicating roadmap:', error);
        hideLoading();
        showNotification('Failed to duplicate roadmap. Please try again.');
    }
}

// ===== UI RENDERING =====

/**
 * Render the roadmap list sidebar/section
 */
function renderRoadmapList() {
    let listContainer = document.getElementById('roadmapList');
    
    if (!listContainer) {
        // Create the list container if it doesn't exist
        const featuresSection = document.getElementById('features');
        if (featuresSection) {
            listContainer = document.createElement('div');
            listContainer.id = 'roadmapList';
            listContainer.className = 'roadmap-list-section';
            featuresSection.parentNode.insertBefore(listContainer, featuresSection);
        }
    }
    
    if (!listContainer) return;
    
    if (RoadmapApp.roadmaps.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-roadmaps">
                <div class="empty-icon">📚</div>
                <h3>No roadmaps yet</h3>
                <p>Create your first roadmap to get started!</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="roadmaps-grid">';
    RoadmapApp.roadmaps.forEach(roadmap => {
        html += `
            <div class="roadmap-card" onclick="openRoadmap('${roadmap.id}')">
                <div class="roadmap-card-header">
                    <h4 class="roadmap-card-title">${escapeHtml(roadmap.title)}</h4>
                    <span class="roadmap-card-date">${formatDate(roadmap.updatedAt)}</span>
                </div>
                <p class="roadmap-card-description">${escapeHtml(roadmap.description || 'No description')}</p>
                <div class="roadmap-card-meta">
                    <span class="meta-count">📝 ${roadmap.nodes ? roadmap.nodes.length : 0} steps</span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    listContainer.innerHTML = html;
}

/**
 * Show the roadmap list view
 */
function showRoadmapList() {
    RoadmapApp.currentRoadmap = null;
    
    // Restore original hero content
    location.reload(); // Simple way to restore original view
}

/**
 * Show create roadmap modal
 */
function showCreateRoadmapModal() {
    const modal = document.getElementById('roadmapModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('roadmapTitleInput').focus();
    }
}

/**
 * Hide create roadmap modal
 */
function hideCreateRoadmapModal() {
    const modal = document.getElementById('roadmapModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('roadmapTitleInput').value = '';
        document.getElementById('roadmapDescriptionInput').value = '';
    }
}

/**
 * Handle create roadmap form submission
 */
async function handleCreateRoadmap(e) {
    e.preventDefault();
    
    const title = document.getElementById('roadmapTitleInput').value.trim();
    const description = document.getElementById('roadmapDescriptionInput').value.trim();
    
    if (!title) {
        showNotification('Please enter a title for your roadmap');
        return;
    }
    
    hideCreateRoadmapModal();
    await createNewRoadmap(title, description);
}

/**
 * Edit roadmap handler
 */
async function editRoadmap(roadmapId) {
    const roadmap = RoadmapApp.roadmaps.find(r => r.id === roadmapId);
    if (!roadmap) return;
    
    const newTitle = prompt('Enter new title:', roadmap.title);
    if (newTitle === null) return; // User cancelled
    
    const newDescription = prompt('Enter new description:', roadmap.description || '');
    if (newDescription === null) return; // User cancelled
    
    try {
        await updateRoadmapContent(roadmapId, {
            title: newTitle || roadmap.title,
            description: newDescription
        });
        
        // Refresh display
        if (RoadmapApp.currentRoadmap && RoadmapApp.currentRoadmap.id === roadmapId) {
            displayRoadmap({ ...RoadmapApp.currentRoadmap, title: newTitle, description: newDescription });
        }
        
        renderRoadmapList();
        showNotification('✅ Roadmap updated!');
    } catch (error) {
        showNotification('Failed to update roadmap');
    }
}

/**
 * Add step to roadmap
 */
function addRoadmapStep(roadmapId) {
    const title = prompt('Enter step title:');
    if (!title) return;
    
    const description = prompt('Enter step description (optional):');
    const duration = prompt('Enter duration (e.g., "1 week"):');
    
    const roadmap = RoadmapApp.roadmaps.find(r => r.id === roadmapId);
    if (!roadmap) return;
    
    const newStep = {
        id: 'step_' + Date.now(),
        title: title,
        description: description || '',
        duration: duration || ''
    };
    
    const nodes = [...(roadmap.nodes || []), newStep];
    updateRoadmapContent(roadmapId, { nodes });
    
    // Refresh display
    openRoadmap(roadmapId);
}

// ===== HELPER FUNCTIONS =====

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format timestamp to readable date
 */
function formatDate(timestamp) {
    if (!timestamp) return 'Unknown';
    
    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Show loading indicator
 */
function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        const loadingText = overlay.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
        overlay.classList.remove('hidden');
    }
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// ===== AI ROADMAP GENERATION =====

/**
 * Generate a new roadmap using AI
 * @param {string} goal - The user's goal
 * @returns {Promise<object>} Generated and saved roadmap
 */
async function generateAIRoadmap(goal) {
    if (!goal || !goal.trim()) {
        showNotification('Please enter a goal to generate a roadmap');
        return null;
    }

    if (RoadmapApp.isGenerating) {
        showNotification('Already generating a roadmap. Please wait...');
        return null;
    }

    try {
        RoadmapApp.isGenerating = true;
        
        // Show loading with AI generation message
        showLoading('🤖 AI is creating your personalized roadmap...');
        
        // Generate roadmap using Gemini AI
        if (typeof generateRoadmapWithAI === 'function') {
            const roadmap = await generateRoadmapWithAI(goal, {
                maxSteps: 10,
                includeDuration: true,
                includeResources: true
            });

            // Save to Firestore
            if (typeof createRoadmap === 'function') {
                const savedRoadmap = await createRoadmap({
                    title: roadmap.title,
                    description: roadmap.description,
                    nodes: roadmap.nodes,
                    edges: roadmap.edges,
                    isPublic: false
                });

                // Add to local state
                RoadmapApp.roadmaps.unshift(savedRoadmap);
                renderRoadmapList();

                // Open the new roadmap
                await openRoadmap(savedRoadmap.id);

                hideLoading();
                RoadmapApp.isGenerating = false;
                
                showNotification('🎉 Your AI-generated roadmap is ready!');
                return savedRoadmap;
            } else {
                throw new Error('Firestore service not available');
            }
        } else {
            throw new Error('Gemini service not available');
        }
    } catch (error) {
        console.error('Error generating AI roadmap:', error);
        hideLoading();
        RoadmapApp.isGenerating = false;
        showNotification(`Failed to generate roadmap: ${error.message}`);
        return null;
    }
}

/**
 * Show AI roadmap generation modal
 */
function showGenerateRoadmapModal() {
    const modal = document.getElementById('roadmapModal');
    if (modal) {
        // Update modal for AI generation
        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = '✨ Create AI Roadmap';
        }
        
        const form = document.getElementById('roadmapForm');
        if (form) {
            const titleInput = document.getElementById('roadmapTitleInput');
            const descInput = document.getElementById('roadmapDescriptionInput');
            const saveBtn = document.getElementById('saveRoadmapBtn');
            
            if (titleInput) {
                titleInput.placeholder = 'Describe your goal (e.g., "I want to learn Python programming")';
                titleInput.value = '';
            }
            
            if (descInput) {
                descInput.style.display = 'none';
                descInput.placeholder = '';
            }
            
            if (saveBtn) {
                saveBtn.innerHTML = '🚀 Generate with AI';
                saveBtn.onclick = async (e) => {
                    e.preventDefault();
                    const goal = document.getElementById('roadmapTitleInput').value.trim();
                    if (goal) {
                        hideCreateRoadmapModal();
                        await generateAIRoadmap(goal);
                    } else {
                        showNotification('Please describe your goal');
                    }
                };
            }
        }
        
        modal.classList.remove('hidden');
        document.getElementById('roadmapTitleInput').focus();
    }
}

/**
 * Reset roadmap modal to default state
 */
function resetRoadmapModal() {
    const modal = document.getElementById('roadmapModal');
    if (modal) {
        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = 'Create New Roadmap';
        }
        
        const form = document.getElementById('roadmapForm');
        if (form) {
            const titleInput = document.getElementById('roadmapTitleInput');
            const descInput = document.getElementById('roadmapDescriptionInput');
            const saveBtn = document.getElementById('saveRoadmapBtn');
            
            if (titleInput) {
                titleInput.placeholder = 'e.g., Learn Python in 3 months';
                titleInput.value = '';
            }
            
            if (descInput) {
                descInput.style.display = 'block';
                descInput.placeholder = 'Describe your goal...';
                descInput.value = '';
            }
            
            if (saveBtn) {
                saveBtn.innerHTML = 'Create Roadmap';
                saveBtn.onclick = handleCreateRoadmap;
            }
        }
    }
}

// ===== EVENT LISTENERS =====

/**
 * Set up event listeners when DOM is ready
 */
function setupRoadmapEventListeners() {
    // Create roadmap button
    const createBtn = document.getElementById('createRoadmapBtn');
    if (createBtn) {
        createBtn.addEventListener('click', showCreateRoadmapModal);
    }
    
    // Close modal button
    const closeModalBtn = document.getElementById('closeRoadmapModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            hideCreateRoadmapModal();
            resetRoadmapModal();
        });
    }
    
    // Save roadmap button
    const saveBtn = document.getElementById('saveRoadmapBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleCreateRoadmap);
    }
    
    // Close modal on overlay click
    const modal = document.getElementById('roadmapModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideCreateRoadmapModal();
                resetRoadmapModal();
            }
        });
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideCreateRoadmapModal();
            resetRoadmapModal();
        }
    });
}

// ===== INITIALIZATION =====

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupRoadmapEventListeners();
    initializeRoadmapApp();
});

// Auto-initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupRoadmapEventListeners();
        initializeRoadmapApp();
    });
} else {
    // DOM already loaded
    setupRoadmapEventListeners();
    initializeRoadmapApp();
}

console.log('🗺️ ROADMAP.AI App Loaded with Firestore & Gemini AI!');
