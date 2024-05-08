import express from 'express';
import firebaseAdmin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MongoClient } from 'mongodb';
import session from 'express-session'; // Import express-session
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
dotenv.config();


const firebaseConfig = {
    apiKey: "AIzaSyAA4LDOCKaO6JjMo5D8Zbo-tj45CEHCuHQ",
    authDomain: "process.env.FIREBASE_AUTH_URI",
    projectId: "process.env.FIREBASE_PROJECT_ID",
    storageBucket: "your-storageBucket",
    messagingSenderId: "your-messagingSenderId",
    appId: "your-appId"
  };
const firebaseApp = firebase.initializeApp(firebaseConfig);

// Firebase services
const auth = firebase.auth();

export { auth, firebaseApp };