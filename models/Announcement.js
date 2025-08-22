const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['academic', 'holiday', 'event', 'emergency', 'general'],
        default: 'general'
    },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
    },
    targetAudience: {
        type: String,
        enum: ['all', 'students', 'faculty', 'staff'],
        default: 'all'
    },
    effectiveFrom: {
        type: Date,
        required: true
    },
    effectiveUntil: {
        type: Date
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
announcementSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Index for better query performance
announcementSchema.index({ isActive: 1, effectiveFrom: 1, effectiveUntil: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
