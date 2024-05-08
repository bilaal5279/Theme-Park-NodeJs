const express = require('express');
const router = express.Router();
const firebaseAdmin = require('firebase-admin');

router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userRecord = await firebaseAdmin.auth().createUser({
            email: username,
            password: password
        });

        req.session.userId = userRecord.uid; // Corrected
        res.redirect('/tickets/order');
    } catch (err) {
        console.error("Error registering user:", err);
        res.status(500).send("An error occurred during registration.");
    }
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await firebaseAdmin.auth().getUserByEmail(username);
        req.session.userId = user.uid; // Corrected
        res.redirect('/tickets/order');
    } catch (err) {
        console.error("Error logging in:", err);
        res.status(500).send("An error occurred during login.");
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Error logging out:", err);
            return res.status(500).send("An error occurred during logout.");
        } else {
            res.redirect('/auth/login');
        }
    });
});

module.exports = router;
