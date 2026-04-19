require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Spin = require('./models/Spin');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/decisio';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public
app.use(express.static(path.join(__dirname, 'public')));

// DB Connection
mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB successfully!'))
    .catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.get('/api/stats', async (req, res) => {
    try {
        const spins = await Spin.find().sort({ timestamp: -1 }).limit(10);
        res.json(spins);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

app.post('/api/spin', async (req, res) => {
    try {
        const { options, result, mood } = req.body;
        const newSpin = new Spin({ 
            options, 
            result, 
            mood: mood || 'default',
            regretStatus: 'pending'
        });
        await newSpin.save();
        res.status(201).json(newSpin);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save spin' });
    }
});

app.put('/api/spin/:id/regret', async (req, res) => {
    try {
        const { id } = req.params;
        const { regretStatus } = req.body;
        const updatedSpin = await Spin.findByIdAndUpdate(
            id, 
            { regretStatus }, 
            { new: true }
        );
        res.json(updatedSpin);
    } catch(err) {
        res.status(500).json({ error: 'Failed to update regret status' });
    }
})

// Catch-all to serve index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
