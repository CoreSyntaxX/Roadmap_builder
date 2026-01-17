// ===== AUTHENTICATION =====
async function handleAuth() {
    const email = elements.authEmail.value.trim();
    const password = elements.authPassword.value.trim();

    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }

    if (!email.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    // Use Firebase authentication
    if (AppState.currentView === 'login') {
        await signInWithEmail(email, password);
    } else {
        await signUpWithEmail(email, password);
    }
}

// Handle Google Sign-In
async function handleGoogleSignIn() {
    await signInWithGoogle();
}

// Handle Logout
async function handleLogout() {
    await signOut();
}

console.log('🗺️ ROADMAP.AI Authentication Module Loaded!');

