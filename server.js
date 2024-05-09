// Importing necessary modules and packages
import express from 'express';
import firebaseAdmin from 'firebase-admin';
import dotenv from 'dotenv';  // Handles environment variables from .env file
import { fileURLToPath } from 'url';  // Converts URL to path for local file handling
import { dirname, join } from 'path';  // Helps in managing file paths
import { MongoClient } from 'mongodb';  // MongoDB client for connecting to database
import session from 'express-session';  // Manages sessions in Express applications
import 'firebase/compat/auth';  // Firebase Auth for handling authentication
import cookieParser from 'cookie-parser';  // Parse cookies attached to the client request object

dotenv.config();  // Load environment variables

// Initialize express application
const app = express();
const PORT = process.env.PORT || 3000;  // Set port from environment variables or default to 3000
app.use(cookieParser());  // Middleware to parse cookies

// MongoDB setup
const client = new MongoClient(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect()
  .then(() => {
    console.log('Connected to MongoDB Atlas');  // Success message if connection is successful
  })
  .catch(err => {
    console.error('Error connecting to MongoDB Atlas', err);  // Error handling for MongoDB connection
    process.exit(1);  // Exit process if connection fails
  });

// Middleware setup
app.set('view engine', 'ejs');  // Set EJS as the template engine
const __filename = fileURLToPath(import.meta.url);  // Get current file path
const __dirname = dirname(__filename);  // Get directory name of current file
app.set('views', join(__dirname, 'views'));  // Set views directory for templates
app.use(express.static(join(__dirname, 'public')));  // Serve static files from public directory
app.use(express.json());  // Parse JSON payloads
app.use(express.urlencoded({ extended: true }));  

// Session middleware configuration
app.use(session({
    secret: 'your-secret-key',  
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  
}));

// Firebase setup
const serviceAccount = {
    "type": "service_account",
    "project_id": process.env.FIREBASE_PROJECT_ID,
    "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
    "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Replace escaped newline characters
    "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    "client_id": process.env.FIREBASE_CLIENT_ID,
    "auth_uri": process.env.FIREBASE_AUTH_URI,
    "token_uri": process.env.FIREBASE_TOKEN_URI,
    "auth_provider_x509_cert_url": process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    "client_x509_cert_url": process.env.FIREBASE_CLIENT_CERT_URL,
    "universe_domain": process.env.FIREBASE_UNIVERSE_DOMAIN
};

firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount)
});

// Routes
import authRoutes from './routes/auth.js';  // Authentication routes
import rideRoutes from './routes/rides.js';  // Ride management routes
import ticketRoutes from './routes/tickets.js';  // Ticket handling routes

app.use((req, res, next) => {
    req.dbClient = client;  // Pass MongoDB client to request object
    next();
});

app.use('/auth', authRoutes);  // Use authentication routes
app.use('/rides', rideRoutes);  // Use ride routes
app.use('/tickets', ticketRoutes);  // Use ticket routes

// Redirect to login page from root
app.get('/', (req, res) => {
    res.redirect('/auth/login');
});

// Handle 404 errors
app.use(function(req, res, next) {
    res.status(404).render('404');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);  // Log server running status
});
