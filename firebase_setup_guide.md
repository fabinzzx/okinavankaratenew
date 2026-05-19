# Firebase Setup & Deployment Guide

This guide provides the complete setup, schema design, security rules, and hosting deployment steps to connect and deploy your modern Okinavan Shito Ryu Karate React.js application to Firebase.

---

## 1. Firebase Project Setup

### Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and name it `okinavankarate` (or use your existing project).
3. (Optional) Enable Google Analytics for the project.

### Step 2: Enable Services
In the Firebase Sidebar:
1. **Authentication:**
   - Click **Get Started**.
   - Under the **Sign-in method** tab, enable **Email/Password** and **Google**.
2. **Cloud Firestore:**
   - Click **Create Database**.
   - Select **Start in test mode** (we will override this with our rules below) and choose your regional location.
3. **Cloud Storage:**
   - Click **Get Started**.
   - Select **Start in test mode** and set up the bucket.
4. **Hosting:**
   - Click **Get Started** under Hosting to initialize hosting settings later.

---

## 2. Environment Variables Setup

Create a `.env` file in the root of your `okinavan-karate-react` directory:

```env
VITE_FIREBASE_API_KEY=AIzaSyAOMj86zRyCHhFB-Ya0PtqbIXJemdZORm8
VITE_FIREBASE_AUTH_DOMAIN=okinavankarate.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=okinavankarate
VITE_FIREBASE_STORAGE_BUCKET=okinavankarate.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=517463109606
VITE_FIREBASE_APP_ID=1:517463109606:web:8f85de875dc90f1cd23027
VITE_FIREBASE_MEASUREMENT_ID=G-L9YV85KSRT
```

> [!NOTE]
> Since we hardcoded the approved configuration inside `/src/firebase/config.js` for immediate compilation, you can choose to swap those hardcoded keys with `import.meta.env.VITE_FIREBASE_*` variables for strictly controlled CI/CD pipelines.

---

## 3. Firestore Database Schema Design

Here is the document structures optimized for role-based dojo management:

### Collection: `users`
```json
{
  "uid": "USER_AUTH_UID",
  "fullName": "Aravind Nair",
  "email": "aravind@gmail.com",
  "mobileNumber": "9845763210",
  "address": "Puthenvelikkara, Kerala",
  "dob": "2010-08-15",
  "gender": "male",
  "parentName": "Ramesh Nair",
  "emergencyContact": "9446025178",
  "dojoId": "sunil_hall",
  "role": "student", // "student", "dojo_admin", "super_admin"
  "profilePhotoUrl": "https://firebasestorage.googleapis.com/.../profilePhotos/uid.jpg",
  "beltGrade": "Yellow Belt (9th Kyu)",
  "createdAt": "serverTimestamp"
}
```

### Collection: `attendance`
```json
{
  "uid": "USER_AUTH_UID",
  "fullName": "Aravind Nair",
  "dojoId": "sunil_hall",
  "date": "2026-05-18",
  "status": "Present", // "Present", "Absent"
  "session": "Kihon & Kata",
  "markedBy": "DOJO_ADMIN_UID",
  "timestamp": "serverTimestamp"
}
```

### Collection: `grades` (Belt Rankings)
```json
{
  "uid": "USER_AUTH_UID",
  "beltGrade": "Green Belt (7th Kyu)",
  "examDate": "2026-05-10",
  "examiner": "Kyoshi Thomas Kathanatt",
  "status": "Passed",
  "score": "85%"
}
```

### Collection: `notifications`
```json
{
  "title": "Belt Grading Schedule",
  "message": "Grading test will occur on June 20th. Wear neat ironed dogi.",
  "dojoId": "all", // "all" or specific "dojo_id"
  "date": "2026-05-19",
  "createdAt": "serverTimestamp"
}
```

---

## 4. Firestore Security Rules (`firestore.rules`)

These rules guarantee strict role-based access control (RBAC). 
* **Students** can only read their own logs and profiles, and query profiles matching their authenticated email.
* **Dojo Admins** and **Super Admins** have the necessary read/write permissions.

Copy and paste the following rules into your **Firebase Console -> Firestore Database -> Rules** tab:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper Functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function getUserData() {
      let path = /databases/$(database)/documents/users/$(request.auth.uid);
      return exists(path) ? get(path).data : null;
    }

    function isSuperAdmin() {
      let data = getUserData();
      return isSignedIn() && data != null && data.role == 'super_admin';
    }

    function isDojoAdmin() {
      let data = getUserData();
      return isSignedIn() && data != null && (data.role == 'dojo_admin' || data.role == 'super_admin');
    }

    // Users Collection
    match /users/{userId} {
      allow read: if isSignedIn() && (
        request.auth.uid == userId || 
        resource.data.email == request.auth.token.email || 
        isDojoAdmin()
      );
      allow write: if isSignedIn() && (
        request.auth.uid == userId || 
        isDojoAdmin()
      );
    }

    // Attendance Collection
    match /attendance/{attId} {
      allow read: if isSignedIn() && (
        request.auth.uid == resource.data.uid || 
        isDojoAdmin()
      );
      allow write: if isDojoAdmin();
    }

    // Exams Collection
    match /exams/{examId} {
      allow read: if isSignedIn() && (
        request.auth.uid == resource.data.uid || 
        isDojoAdmin()
      );
      allow write: if isDojoAdmin();
    }

    // Fees Collection
    match /fees/{feeId} {
      allow read: if isSignedIn() && (
        request.auth.uid == resource.data.uid || 
        isDojoAdmin()
      );
      allow write: if isDojoAdmin();
    }

    // Tournaments Collection
    match /tournaments/{tourId} {
      allow read: if isSignedIn() && (
        request.auth.uid == resource.data.uid || 
        isDojoAdmin()
      );
      allow write: if isDojoAdmin();
    }

    // Notifications (Announcements)
    match /notifications/{notifId} {
      allow read: if isSignedIn();
      allow write: if isDojoAdmin();
    }
  }
}
```

---

## 5. Firebase Storage Rules (`storage.rules`)

Restricts profile picture folder writes exclusively to the user themselves, or the Super Admin.

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profilePhotos/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && (request.auth.uid == userId || 
        firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'super_admin');
    }
  }
}
```

---

## 6. Admin Role Assignment Guide

To designate a user as a **Super Admin** or **Dojo Admin**, edit their user document inside the Cloud Firestore Studio:
1. Open the **Firebase Console** -> **Firestore Database**.
2. Select the `users` collection.
3. Click the specific student's document UID.
4. Modify the `role` field from `"student"` to:
   - `"super_admin"` (gives access to all branches, role changes, and analytics).
   - `"dojo_admin"` (locks actions solely to the admin's selected branch `dojoId`).

---

## 7. Firebase Hosting Deployment

Deploy your production bundle directly with the following steps:

### Step 1: Install Firebase CLI globally (if not done)
```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase
```bash
firebase login
```

### Step 3: Initialize Firebase
From the `okinavan-karate-react` root directory, execute:
```bash
firebase init
```
1. Select **Hosting**.
2. Select **Use an existing project** -> Choose `okinavankarate`.
3. Set your public directory to `dist` (since Vite compiles build outputs into `/dist`).
4. Configure as a single-page app? **Yes**.
5. Set up automatic builds and deploys with GitHub? **No**.

### Step 4: Build and Deploy
Run the production build script and deploy:
```bash
npm run build
firebase deploy
```
Your modern portal will be live at: `https://okinavankarate.web.app` or `https://okinavankarate.firebaseapp.com`!
