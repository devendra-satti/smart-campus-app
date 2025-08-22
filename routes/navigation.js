const express = require('express');
const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Campus locations data
const campusLocations = [
    {
        id: 1,
        name: 'Main Library',
        category: 'academic',
        description: 'Central library with study areas, computer labs, and book collections',
        floor: 'Ground Floor - 4th Floor',
        coordinates: { x: 45, y: 60 },
        amenities: ['WiFi', 'Study Rooms', 'Computers', 'Printing'],
        hours: '8:00 AM - 10:00 PM',
        contact: 'library@campus.edu'
    },
    {
        id: 2,
        name: 'Main Cafeteria',
        category: 'food',
        description: 'Main dining hall serving breakfast, lunch, and dinner',
        floor: 'Ground Floor',
        coordinates: { x: 70, y: 30 },
        amenities: ['Vegetarian Options', 'Coffee Shop', 'Outdoor Seating'],
        hours: '7:00 AM - 9:00 PM',
        contact: 'cafeteria@campus.edu'
    },
    {
        id: 3,
        name: 'Computer Science Department',
        category: 'academic',
        description: 'Department offices, labs, and classrooms for CS students',
        floor: '2nd Floor',
        coordinates: { x: 25, y: 40 },
        amenities: ['Labs', 'Faculty Offices', 'Study Areas'],
        hours: '9:00 AM - 5:00 PM',
        contact: 'cs@campus.edu'
    },
    {
        id: 4,
        name: 'Administration Building',
        category: 'administration',
        description: 'Main administrative offices including registrar and student services',
        floor: 'Ground Floor - 3rd Floor',
        coordinates: { x: 60, y: 70 },
        amenities: ['Registrar', 'Financial Aid', 'Student Services'],
        hours: '8:30 AM - 4:30 PM',
        contact: 'admin@campus.edu'
    },
    {
        id: 5,
        name: 'Sports Complex',
        category: 'recreation',
        description: 'Gymnasium, swimming pool, and sports facilities',
        floor: 'Ground Floor',
        coordinates: { x: 80, y: 80 },
        amenities: ['Gym', 'Pool', 'Basketball Court', 'Track'],
        hours: '6:00 AM - 10:00 PM',
        contact: 'sports@campus.edu'
    },
    {
        id: 6,
        name: 'Student Center',
        category: 'student',
        description: 'Student lounge, meeting rooms, and event space',
        floor: 'Ground Floor - 2nd Floor',
        coordinates: { x: 40, y: 20 },
        amenities: ['Lounge', 'Meeting Rooms', 'Event Space'],
        hours: '8:00 AM - 11:00 PM',
        contact: 'studentcenter@campus.edu'
    },
    {
        id: 7,
        name: 'Health Center',
        category: 'health',
        description: 'Campus medical services and health clinic',
        floor: 'Ground Floor',
        coordinates: { x: 20, y: 80 },
        amenities: ['Medical Services', 'Pharmacy', 'Emergency Care'],
        hours: '24/7',
        contact: 'health@campus.edu'
    },
    {
        id: 8,
        name: 'Parking Garage',
        category: 'transportation',
        description: 'Main campus parking facility',
        floor: 'Multiple Levels',
        coordinates: { x: 90, y: 50 },
        amenities: ['Parking', 'EV Charging', 'Security'],
        hours: '24/7',
        contact: 'parking@campus.edu'
    }
];

// Navigation main page
router.get('/', requireAuth, (req, res) => {
    const { category, search } = req.query;
    
    let filteredLocations = campusLocations;
    
    if (category && category !== 'all') {
        filteredLocations = filteredLocations.filter(loc => loc.category === category);
    }
    
    if (search) {
        filteredLocations = filteredLocations.filter(loc =>
            loc.name.toLowerCase().includes(search.toLowerCase()) ||
            loc.description.toLowerCase().includes(search.toLowerCase())
        );
    }

    // Get unique categories for filter dropdown
    const categories = [...new Set(campusLocations.map(loc => loc.category))];

    res.render('navigation/index', {
        title: 'Campus Navigation - Smart Campus',
        username: req.session.username,
        locations: filteredLocations,
        categories,
        currentFilters: { category, search }
    });
});

// Location details page
router.get('/:id', requireAuth, (req, res) => {
    const locationId = parseInt(req.params.id);
    const location = campusLocations.find(loc => loc.id === locationId);
    
    if (!location) {
        return res.status(404).render('error', {
            message: 'Location not found',
            title: 'Error - Smart Campus'
        });
    }

    // Find nearby locations (within certain coordinate range)
    const nearbyLocations = campusLocations.filter(loc =>
        loc.id !== locationId &&
        Math.abs(loc.coordinates.x - location.coordinates.x) < 20 &&
        Math.abs(loc.coordinates.y - location.coordinates.y) < 20
    );

    res.render('navigation/details', {
        title: `${location.name} - Smart Campus`,
        username: req.session.username,
        location,
        nearbyLocations
    });
});

// Campus map view
router.get('/map', requireAuth, (req, res) => {
    res.render('navigation/map', {
        title: 'Campus Map - Smart Campus',
        username: req.session.username,
        locations: campusLocations
    });
});

// API endpoint for locations (for potential mobile app integration)
router.get('/api/locations', requireAuth, (req, res) => {
    const { category } = req.query;
    
    let filteredLocations = campusLocations;
    
    if (category && category !== 'all') {
        filteredLocations = filteredLocations.filter(loc => loc.category === category);
    }

    res.json({
        success: true,
        data: filteredLocations
    });
});

module.exports = router;
