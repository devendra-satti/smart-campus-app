const express = require('express');
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

// Exam timetable main page
router.get('/', requireAuth, async (req, res) => {
    try {
        const { branch, semester } = req.query;
        
        let filter = { 
            examDate: { $gte: new Date() },
            isActive: true 
        };
        
        if (branch && branch !== 'all') {
            filter.branch = branch;
        }
        
        if (semester && semester !== 'all') {
            filter.semester = parseInt(semester);
        }

        const timetables = await ExamTimetable.find(filter)
            .populate('createdBy', 'username')
            .sort({ examDate: 1, examTime: 1 });

        // Group by date for better display
        const groupedByDate = {};
        timetables.forEach(exam => {
            const dateKey = exam.examDate.toISOString().split('T')[0];
            if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
            }
            groupedByDate[dateKey].push(exam);
        });

        // Get unique branches and semesters for filters
        const branches = await ExamTimetable.distinct('branch');
        const semesters = await ExamTimetable.distinct('semester');

        res.render('timetable/index', {
            title: 'Exam Timetable - Smart Campus',
            username: req.session.username,
            groupedTimetables: groupedByDate,
            branches,
            semesters,
            currentFilters: { branch, semester }
        });
    } catch (error) {
        console.error('Timetable error:', error);
        res.render('error', { 
            message: 'Error loading exam timetable',
            title: 'Error - Smart Campus'
        });
    }
});

// Create timetable page (admin functionality)
router.get('/create', requireAuth, (req, res) => {
    res.render('timetable/create', {
        title: 'Create Exam Schedule - Smart Campus',
        username: req.session.username,
        error: null
    });
});

// Create timetable post
router.post('/create', requireAuth, async (req, res) => {
    try {
        const { 
            branch, 
            semester, 
            subject, 
            subjectCode, 
            examDate, 
            examTime, 
            duration, 
            venue, 
            roomNumber, 
            invigilator 
        } = req.body;

        const timetable = new ExamTimetable({
            branch,
            semester: parseInt(semester),
            subject,
            subjectCode,
            examDate,
            examTime,
            duration: parseInt(duration),
            venue,
            roomNumber,
            invigilator,
            createdBy: req.session.userId
        });

        await timetable.save();

        res.redirect('/timetable?success=Exam schedule created successfully');
    } catch (error) {
        console.error('Create timetable error:', error);
        res.render('timetable/create', {
            title: 'Create Exam Schedule - Smart Campus',
            username: req.session.username,
            error: 'Error creating exam schedule. Please try again.'
        });
    }
});

// My exams (filtered by user's branch - this would typically come from user profile)
router.get('/my-exams', requireAuth, async (req, res) => {
    try {
        // In a real application, you would get the user's branch from their profile
        // For now, we'll show all upcoming exams
        const myExams = await ExamTimetable.find({
            examDate: { $gte: new Date() },
            isActive: true
        })
        .populate('createdBy', 'username')
        .sort({ examDate: 1, examTime: 1 });

        // Calculate upcoming and completed exams
        const now = new Date();
        const upcomingExams = myExams.filter(exam => exam.examDate >= now);
        const completedExams = myExams.filter(exam => exam.examDate < now);

        // Add days left/ago calculations
        upcomingExams.forEach(exam => {
            const timeDiff = exam.examDate - now;
            exam.daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        });

        completedExams.forEach(exam => {
            const timeDiff = now - exam.examDate;
            exam.daysAgo = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        });

        // For demo purposes, use default values
        const userBranch = 'cse'; // This should come from user profile
        const userSemester = 4;   // This should come from user profile

        res.render('timetable/my-exams', {
            title: 'My Exams - Smart Campus',
            username: req.session.username,
            exams: myExams,
            upcomingExams,
            completedExams,
            userBranch,
            userSemester
        });
    } catch (error) {
        console.error('My exams error:', error);
        res.render('error', { 
            message: 'Error loading your exams',
            title: 'Error - Smart Campus'
        });
    }
});

// Export timetable as CSV
router.get('/export', requireAuth, async (req, res) => {
    try {
        const { branch, semester } = req.query;
        
        let filter = { 
            examDate: { $gte: new Date() },
            isActive: true 
        };
        
        if (branch && branch !== 'all') {
            filter.branch = branch;
        }
        
        if (semester && semester !== 'all') {
            filter.semester = parseInt(semester);
        }

        const timetables = await ExamTimetable.find(filter)
            .sort({ examDate: 1, examTime: 1 });

        // Generate CSV content
        let csvContent = 'Date,Time,Subject,Subject Code,Branch,Semester,Venue,Room,Duration,Invigilator\n';
        
        timetables.forEach(exam => {
            csvContent += `"${exam.examDate.toISOString().split('T')[0]}",`;
            csvContent += `"${exam.examTime}",`;
            csvContent += `"${exam.subject}",`;
            csvContent += `"${exam.subjectCode}",`;
            csvContent += `"${exam.branch}",`;
            csvContent += `"${exam.semester}",`;
            csvContent += `"${exam.venue}",`;
            csvContent += `"${exam.roomNumber || ''}",`;
            csvContent += `"${exam.duration} minutes",`;
            csvContent += `"${exam.invigilator || ''}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=exam-timetable.csv');
        res.send(csvContent);
    } catch (error) {
        console.error('Export error:', error);
        res.redirect('/timetable?error=Error exporting timetable');
    }
});

module.exports = router;
