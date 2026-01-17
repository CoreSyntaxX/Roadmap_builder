# Firestore Integration Plan for ROADMAP.AI

## Overview
Add Firestore database integration to store roadmaps and user data with full CRUD operations.

## Current State Analysis
✅ Firebase Authentication is already configured and working  
✅ Node.js server with Express handles authentication middleware  
✅ Project structure: public (landing/login/signup) and protected (app) sections  

## What Needs to Be Added

### 1. Client-Side Firestore SDK Integration
- Add Firestore SDK to login/signup pages and protected app
- Initialize Firestore alongside existing Firebase Auth
- Create service layer for roadmap operations

### 2. Data Model Design
```
Users Collection (/users/{userId})
  - email: string
  - createdAt: timestamp
  - updatedAt: timestamp

Roadmaps Collection (/users/{userId}/roadmaps/{roadmapId})
  - title: string
  - description: string
  - nodes: array (roadmap structure)
  - edges: array (connections)
  - createdAt: timestamp
  - updatedAt: timestamp
  - isPublic: boolean
```

### 3. Required Operations
- Create new roadmap
- Read user's roadmaps (list)
- Read single roadmap
- Update roadmap
- Delete roadmap
- Subscribe to real-time updates

## Files to Modify/Create

### Modified Files:
1. `public/login.html` - Add Firestore SDK
2. `public/signup.html` - Add Firestore SDK
3. `js/firebase-config.js` - Add Firestore initialization + service functions
4. `js/app.js` - Add roadmap CRUD UI integration
5. `protected/js/firebase-config.js` - Same updates
6. `protected/js/app.js` - Add roadmap functions
7. `protected/app.html` - Add Firestore SDK script

### New Files:
1. `js/firestore-service.js` - Centralized Firestore operations
2. `protected/js/firestore-service.js` - Same for protected area

## Implementation Steps

### Step 1: Update Firebase Config (firestoreInit)
- Add Firestore initialization to firebase-config.js
- Export firestore, usersRef, roadmapsRef references

### Step 2: Create Firestore Service Module
- initializeFirestore()
- createRoadmap(roadmapData)
- getUserRoadmaps() - with real-time listener
- getRoadmap(roadmapId)
- updateRoadmap(roadmapId, data)
- deleteRoadmap(roadmapId)
- subscribeToRoadmaps(callback)

### Step 3: Update HTML Files
- Add Firestore SDK script tags
- Import firestore-service.js after firebase-config.js

### Step 4: Update App UI
- Add roadmap list sidebar
- Add "Create New Roadmap" button
- Add roadmap editor/viewer
- Connect UI to Firestore service

### Step 5: Server-Side (Optional Enhancement)
- Add Firestore Admin SDK for server-side operations
- API endpoints for roadmap sync
- Secure endpoints using Firebase Admin

## Security Rules (Firebase Console)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /roadmaps/{roadmapId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## Estimated Effort
- Setup & Config: 30 minutes
- Service Layer: 1 hour
- UI Integration: 2 hours
- Testing: 1 hour
- **Total: ~4.5 hours**

## Success Criteria
✅ Firestore SDK loads without errors  
✅ User can create a new roadmap  
✅ Roadmap list updates in real-time  
✅ Roadmaps persist after page refresh  
✅ User can edit and delete roadmaps  
✅ Offline support (optional enhancement)

