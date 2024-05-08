import express from 'express';
import * as authController from '../authcontroller.js'; // Assuming you have your auth controller functions in a separate file

const router = express.Router();

router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/register', authController.createUser); // Use createUser middleware for registering

router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', authController.signIn); // Use signIn middleware for login

router.get('/protected-route', authController.allowed, (req, res) => {
    // This route is protected, only accessible if the user has a valid session cookie
    res.render('protected-route', { userId: res.locals.uid });
});

export default router;
