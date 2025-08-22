const mongoose = require('mongoose');

const examTimetableSchema = new mongoose.Schema({
    branch: {
        type: String,
        required: true,
        enum: ['cse', 'ece', 'mech', 'civil', 'eee', 'it', 'other'],
        trim: true
    },
    semester: {
        type: Number,
        required: true,
        min: 1,
        max: 8
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    subjectCode: {
        type: String,
        required: true,
        trim: true
    },
    examDate: {
        type: Date,
        required: true
    },
    examTime: {
        type: String,
        required: true
    },
    duration: {
        type: Number, // in minutes
        required: true,
        min: 30
    },
    venue: {
        type: String,
        required: true,
        trim: true
    },
    roomNumber: {
        type: String,
        trim: true
    },
    invigilator: {
        type: String,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
examTimetableSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Index for better query performance
examTimetableSchema.index({ branch: 1, semester: 1, examDate: 1 });

module.exports = mongoose.model('ExamTimetable', examTimetableSchema);
