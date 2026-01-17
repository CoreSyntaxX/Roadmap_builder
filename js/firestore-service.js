// ===== FIRESTORE SERVICE =====
/**
 * Centralized Firestore service for roadmap operations
 * Provides CRUD operations for roadmaps and user data
 */

let db;
let roadmapsUnsubscribe;

/**
 * Initialize Firestore database
 * @returns {boolean} Success status
 */
function initializeFirestore() {
    try {
        // Check if Firebase SDK is loaded
        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK not loaded yet');
            return false;
        }
        
        // Check if Firestore is available
        if (!firebase.firestore) {
            console.warn('Firestore SDK not loaded');
            return false;
        }
        
        // Initialize Firestore with settings
        db = firebase.firestore();
        
        // Configure Firestore settings for offline support
        db.settings({
            timestampsInSnapshots: true,
            merge: true
        });
        
        console.log('🔥 Firestore initialized successfully!');
        return true;
    } catch (error) {
        console.error('Firestore initialization error:', error);
        return false;
    }
}

/**
 * Get Firestore database instance
 * @returns {object} Firestore database
 */
function getDb() {
    return db;
}

/**
 * Create a new roadmap for the current user
 * @param {object} roadmapData - Roadmap data
 * @returns {Promise<object>} Created roadmap with ID
 */
window.createRoadmap = async function(roadmapData) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User must be logged in to create a roadmap');
        }
        
        const roadmap = {
            title: roadmapData.title || 'Untitled Roadmap',
            description: roadmapData.description || '',
            nodes: roadmapData.nodes || [],
            edges: roadmapData.edges || [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            isPublic: roadmapData.isPublic || false
        };
        
        const docRef = await db.collection('users')
            .doc(user.uid)
            .collection('roadmaps')
            .add(roadmap);
        
        console.log('✅ Roadmap created with ID:', docRef.id);
        
        return {
            id: docRef.id,
            ...roadmap
        };
    } catch (error) {
        console.error('Error creating roadmap:', error);
        throw error;
    }
}

/**
 * Get all roadmaps for the current user
 * @returns {Promise<array>} List of roadmaps
 */
window.getUserRoadmaps = async function() {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User must be logged in to view roadmaps');
        }
        
        const snapshot = await db.collection('users')
            .doc(user.uid)
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
        
        console.log(`📚 Loaded ${roadmaps.length} roadmaps`);
        return roadmaps;
    } catch (error) {
        console.error('Error fetching roadmaps:', error);
        throw error;
    }
}

/**
 * Get a single roadmap by ID
 * @param {string} roadmapId - Roadmap ID
 * @returns {Promise<object|null>} Roadmap data or null
 */
window.getRoadmap = async function(roadmapId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User must be logged in to view roadmap');
        }
        
        const doc = await db.collection('users')
            .doc(user.uid)
            .collection('roadmaps')
            .doc(roadmapId)
            .get();
        
        if (doc.exists) {
            return {
                id: doc.id,
                ...doc.data()
            };
        } else {
            console.warn('Roadmap not found:', roadmapId);
            return null;
        }
    } catch (error) {
        console.error('Error fetching roadmap:', error);
        throw error;
    }
}

/**
 * Update an existing roadmap
 * @param {string} roadmapId - Roadmap ID
 * @param {object} data - Updated data
 * @returns {Promise<void>}
 */
window.updateRoadmap = async function(roadmapId, data) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User must be logged in to update roadmap');
        }
        
        const updateData = {
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('users')
            .doc(user.uid)
            .collection('roadmaps')
            .doc(roadmapId)
            .update(updateData);
        
        console.log('✅ Roadmap updated:', roadmapId);
    } catch (error) {
        console.error('Error updating roadmap:', error);
        throw error;
    }
}

/**
 * Delete a roadmap
 * @param {string} roadmapId - Roadmap ID
 * @returns {Promise<void>}
 */
window.deleteRoadmap = async function(roadmapId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User must be logged in to delete roadmap');
        }
        
        await db.collection('users')
            .doc(user.uid)
            .collection('roadmaps')
            .doc(roadmapId)
            .delete();
        
        console.log('✅ Roadmap deleted:', roadmapId);
    } catch (error) {
        console.error('Error deleting roadmap:', error);
        throw error;
    }
}

/**
 * Subscribe to real-time updates of user's roadmaps
 * @param {function} callback - Callback function for updates
 * @returns {function} Unsubscribe function
 */
window.subscribeToRoadmaps = function(callback) {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.warn('User must be logged in to subscribe to roadmaps');
            return () => {};
        }
        
        const unsubscribe = db.collection('users')
            .doc(user.uid)
            .collection('roadmaps')
            .orderBy('updatedAt', 'desc')
            .onSnapshot(
                (snapshot) => {
                    const roadmaps = [];
                    snapshot.forEach(doc => {
                        roadmaps.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });
                    
                    console.log(`📡 Real-time update: ${roadmaps.length} roadmaps`);
                    callback(roadmaps);
                },
                (error) => {
                    console.error('Firestore snapshot error:', error);
                }
            );
        
        roadmapsUnsubscribe = unsubscribe;
        return unsubscribe;
    } catch (error) {
        console.error('Error subscribing to roadmaps:', error);
        return () => {};
    }
}

/**
 * Unsubscribe from roadmap updates
 */
window.unsubscribeFromRoadmaps = function() {
    if (roadmapsUnsubscribe) {
        roadmapsUnsubscribe();
        roadmapsUnsubscribe = null;
        console.log('🔕 Unsubscribed from roadmap updates');
    }
}

/**
 * Create or update user profile
 * @returns {Promise<void>}
 */
window.syncUserProfile = async function() {
    try {
        const user = auth.currentUser;
        if (!user) return;
        
        const userRef = db.collection('users').doc(user.uid);
        const doc = await userRef.get();
        
        const profileData = {
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (!doc.exists) {
            // Create new user profile
            profileData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await userRef.set(profileData);
            console.log('✅ User profile created');
        } else {
            // Update existing profile
            await userRef.update(profileData);
            console.log('✅ User profile updated');
        }
    } catch (error) {
        console.error('Error syncing user profile:', error);
    }
}

/**
 * Search roadmaps by title
 * @param {string} searchTerm - Search term
 * @returns {Promise<array>} Matching roadmaps
 */
window.searchRoadmaps = async function(searchTerm) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User must be logged in to search roadmaps');
        }
        
        const snapshot = await db.collection('users')
            .doc(user.uid)
            .collection('roadmaps')
            .where('title', '>=', searchTerm)
            .where('title', '<=', searchTerm + '\uf8ff')
            .get();
        
        const roadmaps = [];
        snapshot.forEach(doc => {
            roadmaps.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return roadmaps;
    } catch (error) {
        console.error('Error searching roadmaps:', error);
        throw error;
    }
}

/**
 * Duplicate a roadmap
 * @param {string} roadmapId - Roadmap ID to duplicate
 * @param {string} newTitle - Title for the duplicate (optional)
 * @returns {Promise<object>} New roadmap data
 */
window.duplicateRoadmap = async function(roadmapId, newTitle) {
    try {
        const original = await getRoadmap(roadmapId);
        if (!original) {
            throw new Error('Roadmap not found');
        }
        
        const duplicateData = {
            title: newTitle || `${original.title} (Copy)`,
            description: original.description,
            nodes: original.nodes,
            edges: original.edges,
            isPublic: false
        };
        
        return await createRoadmap(duplicateData);
    } catch (error) {
        console.error('Error duplicating roadmap:', error);
        throw error;
    }
}

console.log('🗺️ ROADMAP.AI Firestore Service Loaded!');

