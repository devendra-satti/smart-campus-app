const express = require('express');
const LostItem = require('../models/LostItem');
const Event = require('../models/Event');
const Announcement = require('../models/Announcement');
const QueueStatus = require('../models/QueueStatus');
const ExamTimetable = require('../models/ExamTimetable');
const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Dashboard main page
router.get('/', requireAuth, async (req, res) => {
    try {
        // Get statistics and data for dashboard
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [
            lostItemsThisWeek,
            upcomingEvents,
            activeAnnouncements,
            latestQueueStatus,
            upcomingExams
        ] = await Promise.all([
            LostItem.countDocuments({ 
                createdAt: { $gte: sevenDaysAgo },
                status: 'lost'
            }),
            Event.find({ 
                date: { $gte: new Date() }
            }).sort({ date: 1 }).limit(5),
            Announcement.find({ 
                isActive: true,
                effectiveFrom: { $lte: new Date() },
                $or: [
                    { effectiveUntil: { $gte: new Date() } },
                    { effectiveUntil: null }
                ]
            }).sort({ priority: -1, createdAt: -1 }).limit(5),
            QueueStatus.findOne().sort({ createdAt: -1 }),
            ExamTimetable.find({
                examDate: { $gte: new Date() },
                isActive: true
            }).sort({ examDate: 1 }).limit(5)
        ]);

        res.render('dashboard/index', {
            title: 'Dashboard - Smart Campus',
            username: req.session.username,
            stats: {
                lostItems: lostItemsThisWeek,
                upcomingEvents: upcomingEvents.length,
                activeAnnouncements: activeAnnouncements.length
            },
            upcomingEvents,
            activeAnnouncements,
            queueStatus: latestQueueStatus,
            upcomingExams
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('error', { 
            message: 'Error loading dashboard',
            title: 'Error - Smart Campus'
        });
    }
});

module.exports = router;
