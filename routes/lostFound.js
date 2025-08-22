const express = require('express');
const LostItem = require('../models/LostItem');
const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Lost & Found main page
router.get('/', requireAuth, async (req, res) => {
    try {
        const { category, status, search } = req.query;
        
        let filter = {};
        
        if (category && category !== 'all') {
            filter.category = category;
        }
        
        if (status && status !== 'all') {
            filter.status = status;
        }
        
        if (search) {
            filter.$or = [
                { itemName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { locationLost: { $regex: search, $options: 'i' } }
            ];
        }

        const items = await LostItem.find(filter)
            .populate('reportedBy', 'username')
            .populate('claimedBy', 'username')
            .sort({ createdAt: -1 });

        res.render('lost-found/index', {
            title: 'Lost & Found - Smart Campus',
            username: req.session.username,
            items,
            currentFilters: { category, status, search }
        });
    } catch (error) {
        console.error('Lost & Found error:', error);
        res.render('error', { 
            message: 'Error loading Lost & Found',
            title: 'Error - Smart Campus'
        });
    }
});

// Report lost item page
router.get('/report-lost', requireAuth, (req, res) => {
    res.render('lost-found/report-lost', {
        title: 'Report Lost Item - Smart Campus',
        username: req.session.username,
        error: null
    });
});

// Report lost item post
router.post('/report-lost', requireAuth, async (req, res) => {
    try {
        const { itemName, description, category, locationLost, dateLost, contactInfo } = req.body;

        const lostItem = new LostItem({
            itemName,
            description,
            category,
            locationLost,
            dateLost,
            contactInfo,
            reportedBy: req.session.userId,
            status: 'lost'
        });

        await lostItem.save();

        res.redirect('/lost-found?success=Item reported successfully');
    } catch (error) {
        console.error('Report lost item error:', error);
        res.render('lost-found/report-lost', {
            title: 'Report Lost Item - Smart Campus',
            username: req.session.username,
            error: 'Error reporting item. Please try again.'
        });
    }
});

// Report found item page
router.get('/report-found', requireAuth, (req, res) => {
    res.render('lost-found/report-found', {
        title: 'Report Found Item - Smart Campus',
        username: req.session.username,
        error: null
    });
});

// Report found item post
router.post('/report-found', requireAuth, async (req, res) => {
    try {
        const { itemName, description, category, locationLost, contactInfo } = req.body;

        const foundItem = new LostItem({
            itemName,
            description,
            category,
            locationLost,
            dateLost: new Date(),
            contactInfo,
            reportedBy: req.session.userId,
            status: 'found'
        });

        await foundItem.save();

        res.redirect('/lost-found?success=Found item reported successfully');
    } catch (error) {
        console.error('Report found item error:', error);
        res.render('lost-found/report-found', {
            title: 'Report Found Item - Smart Campus',
            username: req.session.username,
            error: 'Error reporting found item. Please try again.'
        });
    }
});

// Mark item as returned/claimed
router.post('/:id/claim', requireAuth, async (req, res) => {
    try {
        const item = await LostItem.findById(req.params.id);
        
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        item.status = 'returned';
        item.claimedBy = req.session.userId;
        await item.save();

        res.redirect('/lost-found?success=Item marked as returned');
    } catch (error) {
        console.error('Claim item error:', error);
        res.redirect('/lost-found?error=Error claiming item');
    }
});

module.exports = router;
