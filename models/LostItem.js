const mongoose = require('mongoose');

const lostItemSchema = new mongoose.Schema({
    itemName: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['electronics', 'books', 'clothing', 'accessories', 'documents', 'other'],
        default: 'other'
    },
    locationLost: {
        type: String,
        required: true,
        trim: true
    },
    dateLost: {
        type: Date,
        required: true
    },
    contactInfo: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['lost', 'found', 'returned'],
        default: 'lost'
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    claimedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    imageUrl: {
        type: String,
        trim: true
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
lostItemSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('LostItem', lostItemSchema);
