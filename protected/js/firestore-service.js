// ===== FIRESTORE SERVICE =====
/**
 * Centralized Firestore service for roadmap operations
 * Provides CRUD operations for roadmaps and user data
 */

/* global firebase, auth */

let db = null;
let roadmapsUnsubscribe = null;

/**
 * Initialize Firestore database
 * Call this AFTER Firebase Auth initializes
 */
window.initializeFirestore = function () {
    try {
        if (typeof firebase === 'undefined') {
            console.warn('⚠️ Firebase SDK not loaded');
            return false;
        }

        if (!firebase.firestore) {
            console.warn('⚠️ Firestore SDK not loaded');
            return false;
        }

        db = firebase.firestore();

        console.log('🔥 Firestore initialized successfully!');
        return true;
    } catch (error) {
        console.error('❌ Firestore initialization error:', error);
        return false;
    }
};

/**
 * Get Firestore instance
 */
window.getDb = function () {
    return db;
};

/**
 * Create a new roadmap
 */
window.createRoadmap = async function (roadmapData) {
    if (!db) throw new Error('Firestore not initialized');

    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    const roadmap = {
        title: roadmapData.title || 'Untitled Roadmap',
        description: roadmapData.description || '',
        nodes: Array.isArray(roadmapData.nodes) ? roadmapData.nodes : [],
        edges: Array.isArray(roadmapData.edges) ? roadmapData.edges : [],
        isPublic: roadmapData.isPublic || false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db
        .collection('users')
        .doc(user.uid)
        .collection('roadmaps')
        .add(roadmap);

    console.log('✅ Roadmap created:', docRef.id);

    return { id: docRef.id, ...roadmap };
};

/**
 * Get all user roadmaps
 */
window.getUserRoadmaps = async function () {
    if (!db) throw new Error('Firestore not initialized');

    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    const snapshot = await db
        .collection('users')
        .doc(user.uid)
        .collection('roadmaps')
        .orderBy('updatedAt', 'desc')
        .get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

/**
 * Get a single roadmap
 */
window.getRoadmap = async function (roadmapId) {
    if (!db) throw new Error('Firestore not initialized');

    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    const docSnap = await db
        .collection('users')
        .doc(user.uid)
        .collection('roadmaps')
        .doc(roadmapId)
        .get();

    return docSnap.exists ? { id: docSnap.id, ...docSnap.data() } : null;
};

/**
 * Update roadmap
 */
window.updateRoadmap = async function (roadmapId, data) {
    if (!db) throw new Error('Firestore not initialized');

    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    await db
        .collection('users')
        .doc(user.uid)
        .collection('roadmaps')
        .doc(roadmapId)
        .update({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

    console.log('✅ Roadmap updated:', roadmapId);
};

/**
 * Delete roadmap
 */
window.deleteRoadmap = async function (roadmapId) {
    if (!db) throw new Error('Firestore not initialized');

    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    await db
        .collection('users')
        .doc(user.uid)
        .collection('roadmaps')
        .doc(roadmapId)
        .delete();

    console.log('🗑️ Roadmap deleted:', roadmapId);
};

/**
 * Real-time subscription
 */
window.subscribeToRoadmaps = function (callback) {
    if (!db || !auth.currentUser) return () => {};

    roadmapsUnsubscribe = db
        .collection('users')
        .doc(auth.currentUser.uid)
        .collection('roadmaps')
        .orderBy('updatedAt', 'desc')
        .onSnapshot(snapshot => {
            const roadmaps = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(roadmaps);
        });

    return roadmapsUnsubscribe;
};

/**
 * Unsubscribe
 */
window.unsubscribeFromRoadmaps = function () {
    if (roadmapsUnsubscribe) {
        roadmapsUnsubscribe();
        roadmapsUnsubscribe = null;
    }
};

/**
 * Sync user profile
 */
window.syncUserProfile = async function () {
    if (!db || !auth.currentUser) return;

    const user = auth.currentUser;
    const ref = db.collection('users').doc(user.uid);

    const data = {
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const snap = await ref.get();
    if (!snap.exists) {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await ref.set(data);
    } else {
        await ref.update(data);
    }
};

console.log('🗺️ ROADMAP.AI Firestore Service Loaded!');
