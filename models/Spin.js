const mongoose = require('mongoose');

const spinSchema = new mongoose.Schema({
    options: [String],
    result: String,
    mood: { type: String, default: 'default' },
    regretStatus: { type: String, enum: ['pending', 'satisfied', 'regret'], default: 'pending' },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Spin', spinSchema);
