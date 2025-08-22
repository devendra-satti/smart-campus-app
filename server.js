const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'smart-campus-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ✅ NEW: Middleware to make username available in all EJS templates
app.use((req, res, next) => {
    res.locals.username = req.session.username || null;
    next();
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-campus';
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('MongoDB connection error:', err));

// Import Models
const User = require('./models/User');
const LostItem = require('./models/LostItem');
const Event = require('./models/Event');
const Announcement = require('./models/Announcement');
const QueueStatus = require('./models/QueueStatus');
const ExamTimetable = require('./models/ExamTimetable');

// Import Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const lostFoundRoutes = require('./routes/lostFound');
const eventsRoutes = require('./routes/events');
const cafeteriaRoutes = require('./routes/cafeteria');
const navigationRoutes = require('./routes/navigation');
const timetableRoutes = require('./routes/timetable');
const announcementsRoutes = require('./routes/announcements');

// Use Routes
app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/lost-found', lostFoundRoutes);
app.use('/events', eventsRoutes);
app.use('/cafeteria', cafeteriaRoutes);
app.use('/navigation', navigationRoutes);
app.use('/timetable', timetableRoutes);
app.use('/announcements', announcementsRoutes);

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Home route
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { 
        message: 'Something went wrong!',
        title: 'Error - Smart Campus'
        // ❌ no need to manually add username anymore
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', { 
        message: 'Page not found',
        title: '404 - Page Not Found'
        // ❌ no need to manually add username anymore
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});
