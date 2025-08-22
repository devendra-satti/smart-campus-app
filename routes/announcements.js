const express = require('express');
const Announcement = require('../models/Announcement');
const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Announcements main page
router.get('/', requireAuth, async (req, res) => {
    try {
        const { category, priority, audience, page = 1, limit = 10 } = req.query;
        
        let filter = { 
            isActive: true,
            effectiveFrom: { $lte: new Date() },
            $or: [
                { effectiveUntil: { $gte: new Date() } },
                { effectiveUntil: null }
            ]
        };
        
        if (category && category !== 'all') {
            filter.category = category;
        }
        
        if (priority && priority !== 'all') {
            filter.priority = priority;
        }
        
        if (audience && audience !== 'all') {
            filter.targetAudience = audience;
        }

        // Get counts for statistics
        const [
            totalAnnouncements,
            activeAnnouncements,
            importantAnnouncements,
            emergencyAnnouncements,
            announcements
        ] = await Promise.all([
            Announcement.countDocuments({ isActive: true }),
            Announcement.countDocuments({ 
                isActive: true,
                effectiveFrom: { $lte: new Date() },
                $or: [
                    { effectiveUntil: { $gte: new Date() } },
                    { effectiveUntil: null }
                ]
            }),
            Announcement.countDocuments({ 
                isActive: true,
                priority: 'important',
                effectiveFrom: { $lte: new Date() },
                $or: [
                    { effectiveUntil: { $gte: new Date() } },
                    { effectiveUntil: null }
                ]
            }),
            Announcement.countDocuments({ 
                isActive: true,
                priority: 'emergency',
                effectiveFrom: { $lte: new Date() },
                $or: [
                    { effectiveUntil: { $gte: new Date() } },
                    { effectiveUntil: null }
                ]
            }),
            Announcement.find(filter)
                .populate('createdBy', 'username')
                .sort({ priority: -1, createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit)
        ]);

        const totalPages = Math.ceil(activeAnnouncements / limit);
        const currentPage = parseInt(page);
        
        // Build query string for pagination
        const queryParams = new URLSearchParams();
        if (category && category !== 'all') queryParams.append('category', category);
        if (priority && priority !== 'all') queryParams.append('priority', priority);
        if (audience && audience !== 'all') queryParams.append('audience', audience);
        const queryString = queryParams.toString();

        res.render('announcements/index', {
            title: 'Announcements - Smart Campus',
            username: req.session.username,
            announcements,
            currentFilters: { category, priority, audience },
            totalAnnouncements,
            activeAnnouncements,
            importantAnnouncements,
            emergencyAnnouncements,
            totalPages,
            currentPage,
            queryString
        });
    } catch (error) {
        console.error('Announcements error:', error);
        res.render('error', { 
            message: 'Error loading announcements',
            title: 'Error - Smart Campus'
        });
    }
});

// Create announcement page (admin functionality)
router.get('/create', requireAuth, (req, res) => {
    res.render('announcements/create', {
        title: 'Create Announcement - Smart Campus',
        username: req.session.username,
        error: null
    });
});

// Create announcement post
router.post('/create', requireAuth, async (req, res) => {
    try {
        const { 
            title, 
            content, 
            category, 
            priority, 
            targetAudience, 
            effectiveFrom, 
            effectiveUntil 
        } = req.body;

        const announcement = new Announcement({
            title,
            content,
            category,
            priority,
            targetAudience,
            effectiveFrom,
            effectiveUntil: effectiveUntil || null,
            createdBy: req.session.userId
        });

        await announcement.save();

        res.redirect('/announcements?success=Announcement created successfully');
    } catch (error) {
        console.error('Create announcement error:', error);
        res.render('announcements/create', {
            title: 'Create Announcement - Smart Campus',
            username: req.session.username,
            error: 'Error creating announcement. Please try again.'
        });
    }
});

// Announcement details page
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id)
            .populate('createdBy', 'username');

        if (!announcement) {
            return res.status(404).render('error', {
                message: 'Announcement not found',
                title: 'Error - Smart Campus'
            });
        }

        res.render('announcements/details', {
            title: `${announcement.title} - Smart Campus`,
            username: req.session.username,
            announcement
        });
    } catch (error) {
        console.error('Announcement details error:', error);
        res.render('error', { 
            message: 'Error loading announcement details',
            title: 'Error - Smart Campus'
        });
    }
});

// Archive announcement (admin functionality)
router.post('/:id/archive', requireAuth, async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        announcement.isActive = false;
        await announcement.save();

        res.redirect('/announcements?success=Announcement archived');
    } catch (error) {
        console.error('Archive announcement error:', error);
        res.redirect('/announcements?error=Error archiving announcement');
    }
});

// Emergency announcements (high priority)
router.get('/emergency', requireAuth, async (req, res) => {
    try {
        const emergencyAnnouncements = await Announcement.find({
            isActive: true,
            priority: 'high',
            effectiveFrom: { $lte: new Date() },
            $or: [
                { effectiveUntil: { $gte: new Date() } },
                { effectiveUntil: null }
            ]
        })
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 });

        res.render('announcements/emergency', {
            title: 'Emergency Announcements - Smart Campus',
            username: req.session.username,
            announcements: emergencyAnnouncements
        });
    } catch (error) {
        console.error('Emergency announcements error:', error);
        res.render('error', { 
            message: 'Error loading emergency announcements',
            title: 'Error - Smart Campus'
        });
    }
});

// RSS feed for announcements
router.get('/rss', async (req, res) => {
    try {
        const announcements = await Announcement.find({
            isActive: true,
            effectiveFrom: { $lte: new Date() },
            $or: [
                { effectiveUntil: { $gte: new Date() } },
                { effectiveUntil: null }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(20);

        const rssContent = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
<title>Smart Campus Announcements</title>
<description>Latest announcements from Smart Campus</description>
<link>https://your-campus-domain.com</link>
${announcements.map(announcement => `
<item>
<title>${announcement.title}</title>
<description>${announcement.content}</description>
<link>https://your-campus-domain.com/announcements/${announcement._id}</link>
<guid>https://your-campus-domain.com/announcements/${announcement._id}</guid>
<pubDate>${announcement.createdAt.toUTCString()}</pubDate>
<category>${announcement.category}</category>
</item>
`).join('')}
</channel>
</rss>`;

        res.setHeader('Content-Type', 'application/rss+xml');
        res.send(rssContent);
    } catch (error) {
        console.error('RSS feed error:', error);
        res.status(500).send('Error generating RSS feed');
    }
});

module.exports = router;
