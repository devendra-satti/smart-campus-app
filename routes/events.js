const express = require('express');
const multer = require('multer');
const path = require('path');
const Event = require('../models/Event');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/events/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'event-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Events main page
router.get('/', requireAuth, async (req, res) => {
    try {
        const { category, search } = req.query;
        
        let filter = { date: { $gte: new Date() } };
        
        if (category && category !== 'all') {
            filter.category = category;
        }
        
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { venue: { $regex: search, $options: 'i' } }
            ];
        }

        const events = await Event.find(filter)
            .populate('createdBy', 'username')
            .sort({ date: 1 });

        res.render('events/index', {
            title: 'Events - Smart Campus',
            username: req.session.username,
            events,
            currentFilters: { category, search }
        });
    } catch (error) {
        console.error('Events error:', error);
        res.render('error', { 
            message: 'Error loading events',
            title: 'Error - Smart Campus'
        });
    }
});

// Create event page
router.get('/create', requireAuth, (req, res) => {
    res.render('events/create', {
        title: 'Create Event - Smart Campus',
        username: req.session.username,
        error: null
    });
});

// Create event post
router.post('/create', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { 
            title, 
            description, 
            date, 
            time, 
            venue, 
            organizer, 
            category, 
            registrationLink 
        } = req.body;

        // Validate required fields
        if (!title || !description || !date || !time || !venue || !organizer || !category) {
            return res.render('events/create', {
                title: 'Create Event - Smart Campus',
                username: req.session.username,
                error: 'Please fill in all required fields.'
            });
        }

        // Handle image upload
        let imageUrl = null;
        if (req.file) {
            imageUrl = '/uploads/events/' + req.file.filename;
        }

        const event = new Event({
            title,
            description,
            date,
            time,
            venue,
            organizer,
            category,
            registrationLink: registrationLink || null,
            imageUrl,
            createdBy: req.session.userId
        });

        await event.save();

        res.redirect('/events?success=Event created successfully');
    } catch (error) {
        console.error('Create event error:', error);
        
        let errorMessage = 'Error creating event. Please try again.';
        if (error.code === 'LIMIT_FILE_SIZE') {
            errorMessage = 'File size too large. Maximum size is 5MB.';
        } else if (error.message === 'Only image files are allowed!') {
            errorMessage = 'Only image files (JPG, PNG, etc.) are allowed.';
        }

        res.render('events/create', {
            title: 'Create Event - Smart Campus',
            username: req.session.username,
            error: errorMessage
        });
    }
});

// Event details page
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('createdBy', 'username')
            .populate('attendees', 'username');

        if (!event) {
            return res.status(404).render('error', {
                message: 'Event not found',
                title: 'Error - Smart Campus'
            });
        }

        res.render('events/details', {
            title: `${event.title} - Smart Campus`,
            username: req.session.username,
            event
        });
    } catch (error) {
        console.error('Event details error:', error);
        res.render('error', { 
            message: 'Error loading event details',
            title: 'Error - Smart Campus'
        });
    }
});

// RSVP to event
router.post('/:id/rsvp', requireAuth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Check if user already RSVP'd
        if (event.attendees.includes(req.session.userId)) {
            return res.redirect(`/events/${req.params.id}?info=Already RSVP'd`);
        }

        event.attendees.push(req.session.userId);
        await event.save();

        res.redirect(`/events/${req.params.id}?success=RSVP successful`);
    } catch (error) {
        console.error('RSVP error:', error);
        res.redirect(`/events/${req.params.id}?error=Error RSVPing to event`);
    }
});

// Past events
router.get('/past', requireAuth, async (req, res) => {
    try {
        const events = await Event.find({ date: { $lt: new Date() } })
            .populate('createdBy', 'username')
            .sort({ date: -1 });

        res.render('events/past', {
            title: 'Past Events - Smart Campus',
            username: req.session.username,
            events
        });
    } catch (error) {
        console.error('Past events error:', error);
        res.render('error', { 
            message: 'Error loading past events',
            title: 'Error - Smart Campus'
        });
    }
});

module.exports = router;
