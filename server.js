const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for GitHub Pages
app.use(cors());
app.use(express.json());

// Store winners data (in-memory for simplicity)
let winnersData = [];

// API endpoint to get winners
app.get('/api/winners', (req, res) => {
    res.json(winnersData);
});

// API endpoint to add winners
app.post('/api/winners', (req, res) => {
    const newWinners = req.body;
    
    if (Array.isArray(newWinners)) {
        winnersData = [...winnersData, ...newWinners];
        res.status(201).json({ message: 'Winners added successfully' });
    } else {
        res.status(400).json({ error: 'Invalid data format' });
    }
});

// API endpoint to clear winners
app.delete('/api/winners', (req, res) => {
    winnersData = [];
    res.json({ message: 'All winners data cleared' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 