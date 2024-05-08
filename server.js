import express from 'express';
import firebaseAdmin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MongoClient } from 'mongodb';
import session from 'express-session'; // Import express-session
import 'firebase/compat/auth';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cookieParser());
// MongoDB setup
const client = new MongoClient(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect().then(() => {
    console.log('Connected to MongoDB Atlas');
}).catch(err => {
    console.error('Error connecting to MongoDB Atlas', err);
    process.exit(1); // exit on failure
});

// Middleware setup
app.set('view engine', 'ejs');
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.set('views', join(__dirname, 'views'));
app.use(express.static(join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware configuration
app.use(session({
    secret: 'your-secret-key', // Set a secret key for session
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure to true in production if using HTTPS
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
import authRoutes from './routes/auth.js';
import rideRoutes from './routes/rides.js';
import ticketRoutes from './routes/tickets.js';

app.use((req, res, next) => {
    req.dbClient = client;
    next();
});

app.use('/auth', authRoutes);
app.use('/rides', rideRoutes);
app.use('/tickets', ticketRoutes);

// Redirect to login page
app.get('/', (req, res) => {
    res.redirect('/auth/login');
});

app.use(function(req, res, next) {
    res.status(404).render('404');
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
