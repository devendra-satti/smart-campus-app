const mongoose = require('mongoose');

const queueStatusSchema = new mongoose.Schema({
    cafeteria: {
        type: String,
        required: true,
        enum: ['main', 'north', 'south', 'east', 'west'],
        default: 'main'
    },
    status: {
        type: String,
        required: true,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    estimatedWaitTime: {
        type: Number, // in minutes
        min: 0
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
queueStatusSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Index for better query performance
queueStatusSchema.index({ cafeteria: 1, createdAt: -1 });

module.exports = mongoose.model('QueueStatus', queueStatusSchema);
