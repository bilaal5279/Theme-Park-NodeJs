const express = require('express');
const session = require('express-session');
const firebaseAdmin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');
const { MongoClient } = require('mongodb');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecretkey',
    resave: false,
    saveUninitialized: false,
}));

// Firebase setup
const serviceAccount = require(path.join(__dirname, process.env.FIREBASE_KEY_FILE));
firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount)
});

// Routes
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rides');
const ticketRoutes = require('./routes/tickets');

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
