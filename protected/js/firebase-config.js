// ===== FIREBASE CONFIGURATION =====
// Firebase config is now loaded from the server to keep API keys secure

let firebaseConfig = null;

// ===== FIREBASE INITIALIZATION =====
let app;
let auth;
let googleProvider;
let db;

// Load Firebase configuration from server
async function loadFirebaseConfig() {
    try {
        const response = await fetch('/api/firebase-config');
        if (!response.ok) {
            throw new Error('Failed to load Firebase config');
        }
        firebaseConfig = await response.json();
        console.log('🔥 Firebase config loaded from server');
        return firebaseConfig;
    } catch (error) {
        console.error('❌ Failed to load Firebase config:', error);
        // Fallback to environment variables if available (for development)
        firebaseConfig = {
            apiKey: "PLACEHOLDER_API_KEY",
            authDomain: "placeholder.firebaseapp.com",
            projectId: "placeholder-project",
            storageBucket: "placeholder.firebasestorage.app",
            messagingSenderId: "123456789",
            appId: "1:123456789:web:placeholder"
        };
        return firebaseConfig;
    }
}

// Check if Firebase is available and initialize
async function initializeFirebase() {
    try {
        // Load config first
        if (!firebaseConfig) {
            await loadFirebaseConfig();
        }

        // Check if Firebase SDK is loaded
        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK not loaded yet');
            return false;
        }

        // Initialize Firebase
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        googleProvider = new firebase.auth.GoogleAuthProvider();

        console.log('🔥 Firebase initialized successfully!');

        // Initialize Firestore if available
        if (firebase.firestore) {
            db = firebase.firestore();
            db.settings({
                timestampsInSnapshots: true,
                merge: true
            });
            console.log('📦 Firestore initialized successfully!');
        } else {
            console.warn('Firestore SDK not available');
        }

        // Set up auth state observer
        setupAuthStateObserver();

        return true;
    } catch (error) {
        console.error('Firebase initialization error:', error);
        return false;
    }
}

// Get Firestore database instance
function getDb() {
    return db;
}

// ===== AUTH STATE OBSERVER =====
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('✅ User authenticated:', user.email);

        // Firestore must be initialized ONLY after auth
        if (typeof initializeFirestore === 'function') {
            initializeFirestore();
        }

        if (typeof syncUserProfile === 'function') {
            await syncUserProfile();
        }

        // Tell app.js auth is ready
        document.dispatchEvent(new CustomEvent('auth-ready'));
    } else {
        console.log('👤 User logged out');
    }
});


// ===== AUTHENTICATION FUNCTIONS =====

// Sign up with email and password
async function signUpWithEmail(email, password) {
    try {
        showLoading();
        const result = await auth.createUserWithEmailAndPassword(email, password);
        console.log('✅ Sign up successful:', result.user.email);
        hideAuthModal();
        showNotification('Account created successfully! 🎊');
        return { success: true, user: result.user };
    } catch (error) {
        console.error('Sign up error:', error);
        hideLoading();
        const errorMessage = getAuthErrorMessage(error.code);
        showNotification(errorMessage);
        return { success: false, error: errorMessage };
    }
}

// Sign in with email and password
async function signInWithEmail(email, password) {
    try {
        showLoading();
        const result = await auth.signInWithEmailAndPassword(email, password);
        console.log('✅ Sign in successful:', result.user.email);
        hideAuthModal();
        showNotification(`Welcome back, ${result.user.email}! 🎉`);
        return { success: true, user: result.user };
    } catch (error) {
        console.error('Sign in error:', error);
        hideLoading();
        const errorMessage = getAuthErrorMessage(error.code);
        showNotification(errorMessage);
        return { success: false, error: errorMessage };
    }
}

// Sign in with Google
async function signInWithGoogle() {
    try {
        showLoading();
        const result = await auth.signInWithPopup(googleProvider);
        console.log('✅ Google sign in successful:', result.user.email);
        hideAuthModal();
        showNotification(`Welcome, ${result.user.displayName || result.user.email}! 🎉`);
        return { success: true, user: result.user };
    } catch (error) {
        console.error('Google sign in error:', error);
        hideLoading();
        const errorMessage = getAuthErrorMessage(error.code);
        showNotification(errorMessage);
        return { success: false, error: errorMessage };
    }
}

// Sign out
async function signOut() {
    try {
        await auth.signOut();
        console.log('✅ Sign out successful');
        showNotification('Logged out successfully 👋');
        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        showNotification('Error signing out. Please try again.');
        return { success: false, error: error.message };
    }
}

// Send password reset email
async function resetPassword(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        showNotification('Password reset email sent! 📧');
        return { success: true };
    } catch (error) {
        console.error('Password reset error:', error);
        const errorMessage = getAuthErrorMessage(error.code);
        showNotification(errorMessage);
        return { success: false, error: errorMessage };
    }
}

// ===== ERROR MESSAGE HELPER =====
function getAuthErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered. Please login instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/user-disabled': 'This account has been disabled. Please contact support.',
        'auth/user-not-found': 'No account found with this email. Please sign up first.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
        'auth/cancelled-popup-request': 'Sign-in was cancelled.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.'
    };

    return errorMessages[errorCode] || 'An error occurred. Please try again.';
}

// ===== UTILITY FUNCTIONS =====

// Check if user is logged in
function isUserLoggedIn() {
    return auth && auth.currentUser !== null;
}

// Get current user
function getCurrentUser() {
    return auth ? auth.currentUser : null;
}

// Get user ID token for API calls
async function getUserIdToken() {
    if (auth && auth.currentUser) {
        return await auth.currentUser.getIdToken();
    }
    return null;
}

console.log('🗺️ ROADMAP.AI Firebase Module Loaded!');

