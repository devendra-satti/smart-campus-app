const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Login Page
router.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('auth/login', { 
        title: 'Login - Smart Campus',
        error: null,
        success: req.query.success
    });
});

// Login Post
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Find user by username
        const user = await User.findOne({ username });
        if (!user) {
            return res.render('auth/login', {
                title: 'Login - Smart Campus',
                error: 'Invalid username or password',
                success: null
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.render('auth/login', {
                title: 'Login - Smart Campus',
                error: 'Invalid username or password',
                success: null
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Set session
        req.session.userId = user._id;
        req.session.username = user.username;

        res.redirect('/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        res.render('auth/login', {
            title: 'Login - Smart Campus',
            error: 'An error occurred during login',
            success: null
        });
    }
});

// Register Page
router.get('/register', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('auth/register', { 
        title: 'Register - Smart Campus',
        error: null
    });
});

// Register Post
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;

        // Validation
        if (password !== confirmPassword) {
            return res.render('auth/register', {
                title: 'Register - Smart Campus',
                error: 'Passwords do not match'
            });
        }

        if (password.length < 6) {
            return res.render('auth/register', {
                title: 'Register - Smart Campus',
                error: 'Password must be at least 6 characters long'
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            return res.render('auth/register', {
                title: 'Register - Smart Campus',
                error: 'Username or email already exists'
            });
        }

        // Create new user
        const user = new User({
            username,
            email,
            password
        });

        await user.save();

        res.redirect('/login?success=Registration successful. Please login.');
    } catch (error) {
        console.error('Registration error:', error);
        res.render('auth/register', {
            title: 'Register - Smart Campus',
            error: 'An error occurred during registration'
        });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
});

module.exports = router;
