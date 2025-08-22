const express = require('express');
const QueueStatus = require('../models/QueueStatus');
const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Cafeteria queue status page
router.get('/', requireAuth, async (req, res) => {
    try {
        const { cafeteria } = req.query;
        
        let filter = {};
        if (cafeteria && cafeteria !== 'all') {
            filter.cafeteria = cafeteria;
        }

        // Get latest status for each cafeteria
        const latestStatus = await QueueStatus.aggregate([
            { $match: filter },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$cafeteria',
                    latestStatus: { $first: '$$ROOT' }
                }
            }
        ]);

        // Get status history for charts (last 24 hours)
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const statusHistory = await QueueStatus.find({
            createdAt: { $gte: twentyFourHoursAgo },
            ...filter
        }).sort({ createdAt: 1 });

        res.render('cafeteria/index', {
            title: 'Cafeteria Queue - Smart Campus',
            username: req.session.username,
            latestStatus: latestStatus.map(item => item.latestStatus),
            statusHistory,
            currentFilter: { cafeteria }
        });
    } catch (error) {
        console.error('Cafeteria error:', error);
        res.render('error', { 
            message: 'Error loading cafeteria queue status',
            title: 'Error - Smart Campus'
        });
    }
});

// Report queue status page
router.get('/report', requireAuth, (req, res) => {
    res.render('cafeteria/report', {
        title: 'Report Queue Status - Smart Campus',
        username: req.session.username,
        error: null
    });
});

// Report queue status post
router.post('/report', requireAuth, async (req, res) => {
    try {
        const { cafeteria, status, description, estimatedWaitTime } = req.body;

        const queueStatus = new QueueStatus({
            cafeteria,
            status,
            description,
            estimatedWaitTime: estimatedWaitTime || null,
            reportedBy: req.session.userId
        });

        await queueStatus.save();

        res.redirect('/cafeteria?success=Queue status reported successfully');
    } catch (error) {
        console.error('Report queue status error:', error);
        res.render('cafeteria/report', {
            title: 'Report Queue Status - Smart Campus',
            username: req.session.username,
            error: 'Error reporting queue status. Please try again.'
        });
    }
});

// Get current queue status (API endpoint)
router.get('/api/status', requireAuth, async (req, res) => {
    try {
        const { cafeteria } = req.query;
        
        let filter = {};
        if (cafeteria) {
            filter.cafeteria = cafeteria;
        }

        const latestStatus = await QueueStatus.findOne(filter)
            .sort({ createdAt: -1 })
            .populate('reportedBy', 'username');

        res.json({
            success: true,
            data: latestStatus
        });
    } catch (error) {
        console.error('API status error:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching queue status'
        });
    }
});

// Get queue history (API endpoint)
router.get('/api/history', requireAuth, async (req, res) => {
    try {
        const { cafeteria, hours = 24 } = req.query;
        
        let filter = {};
        if (cafeteria) {
            filter.cafeteria = cafeteria;
        }

        const timeAgo = new Date();
        timeAgo.setHours(timeAgo.getHours() - parseInt(hours));

        const history = await QueueStatus.find({
            createdAt: { $gte: timeAgo },
            ...filter
        }).sort({ createdAt: 1 })
          .populate('reportedBy', 'username');

        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('API history error:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching queue history'
        });
    }
});

module.exports = router;
