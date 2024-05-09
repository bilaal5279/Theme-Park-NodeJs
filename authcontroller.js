import firebaseAdmin from 'firebase-admin';
import { auth } from './firebaseconfig.js';  // Assuming this exports configured Firebase Auth

// Create User function using Firebase client-side auth
async function createUser(req, res, next) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(req.body.email, req.body.password);
        const idToken = await userCredential.user.getIdToken();  // Get ID token from client authentication

        // Use Firebase Admin to create a session cookie
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await firebaseAdmin.auth().createSessionCookie(idToken, { expiresIn });
        
        const options = { maxAge: expiresIn, httpOnly: true,};
        res.cookie("session", sessionCookie, options);
        next(); // Move to the next middleware function in the chain
    } catch (error) {
        console.error("Failed to create user:", error);
        res.status(409).render("register", { comment: error.code });
    }
}

// Sign In function using Firebase client-side auth
async function signIn(req, res, next) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(req.body.email, req.body.password);
        const idToken = await userCredential.user.getIdToken();  // Get ID token from client authentication

        // Use Firebase Admin to create a session cookie
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await firebaseAdmin.auth().createSessionCookie(idToken, { expiresIn });
        
        const options = { maxAge: expiresIn, httpOnly: true}; 
        res.cookie("session", sessionCookie, options);
        
        res.redirect('/tickets/order'); // Redirect users to the order tickets page after login
    } catch (error) {
        console.error("Failed to sign in user:", error);
        res.status(401).render("login", { comment: error.code });
    }
}


// Middleware to check if a session cookie is valid using Firebase Admin
async function allowed(req, res, next) {
    const sessionCookie = req.cookies.session || '';
    try {
        const decodedClaims = await firebaseAdmin.auth().verifySessionCookie(sessionCookie, true);
        res.locals.uid = decodedClaims.uid;
        req.session.userId = decodedClaims.uid// Store user ID in response locals
        next(); // Proceed to the next middleware if successful
    } catch (error) {
        console.error("Session verification failed:", error);
        res.status(401).redirect('/login');
    }
}

export { createUser, signIn, allowed };
