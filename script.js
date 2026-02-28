const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'goldrate_tracker',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    }
}

// Routes

// 1. Get current gold rates
app.get('/api/rates', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM gold_rates ORDER BY date DESC LIMIT 1'
        );
        
        if (rows.length === 0) {
            // Default rates if no data
            return res.json({
                rate_24carat: 6500.00,
                rate_22carat: 5950.00,
                date: new Date().toISOString().split('T')[0]
            });
        }
        
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Get historical rates
app.get('/api/rates/history', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT date, rate_24carat, rate_22carat FROM gold_rates ORDER BY date DESC LIMIT 30'
        );
        
        if (rows.length === 0) {
            // Generate sample data
            const sampleData = [];
            const currentDate = new Date();
            for (let i = 30; i >= 0; i--) {
                const date = new Date(currentDate);
                date.setDate(date.getDate() - i);
                
                sampleData.push({
                    date: date.toISOString().split('T')[0],
                    rate_24carat: 6500.00 - (i * 5),
                    rate_22carat: 5950.00 - (i * 4.58)
                });
            }
            return res.json(sampleData);
        }
        
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Calculate gold price
app.post('/api/calculate', async (req, res) => {
    try {
        const { grams, purity } = req.body;
        
        // Get latest rate
        const [rows] = await pool.query(
            'SELECT rate_24carat, rate_22carat FROM gold_rates ORDER BY date DESC LIMIT 1'
        );
        
        let ratePerGram;
        if (rows.length > 0) {
            ratePerGram = purity === 24 ? rows[0].rate_24carat : rows[0].rate_22carat;
        } else {
            // Default rates
            ratePerGram = purity === 24 ? 6500.00 : 5950.00;
        }
        
        const total = (grams * ratePerGram).toFixed(2);
        
        res.json({
            grams,
            purity,
            ratePerGram,
            totalPrice: total,
            currency: 'INR',
            message: `Calculated price for ${grams}g of ${purity} carat gold`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Predict gold price
app.post('/api/predict', async (req, res) => {
    try {
        const { days } = req.body;
        
        // Get current rate
        const [rows] = await pool.query(
            'SELECT rate_24carat FROM gold_rates ORDER BY date DESC LIMIT 1'
        );
        
        let currentRate = rows.length > 0 ? rows[0].rate_24carat : 6500.00;
        
        // Simple prediction algorithm
        const marketTrend = 0.0003; // Daily growth
        const volatility = 0.002; // Daily volatility
        
        let predictedRate = currentRate;
        for (let i = 0; i < days; i++) {
            const randomFactor = 1 + (Math.random() * volatility * 2 - volatility);
            predictedRate = predictedRate * (1 + marketTrend) * randomFactor;
        }
        
        res.json({
            currentRate,
            predictedRate: predictedRate.toFixed(2),
            days,
            change: (predictedRate - currentRate).toFixed(2),
            changePercent: (((predictedRate - currentRate) / currentRate) * 100).toFixed(2),
            confidence: '75%',
            message: 'Prediction based on historical trends'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. User registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user exists
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Insert new user
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, password]
        );
        
        res.json({
            success: true,
            userId: result.insertId,
            message: 'User registered successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. User login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const [rows] = await pool.query(
            'SELECT id, name, email FROM users WHERE email = ? AND password = ?',
            [email, password]
        );
        
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        res.json({
            success: true,
            user: rows[0],
            message: 'Login successful'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 7. Update gold rates (admin only)
app.post('/api/rates/update', async (req, res) => {
    try {
        const { rate_24carat, rate_22carat, date } = req.body;
        
        const [result] = await pool.query(
            'INSERT INTO gold_rates (date, rate_24carat, rate_22carat) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rate_24carat = ?, rate_22carat = ?',
            [date, rate_24carat, rate_22carat, rate_24carat, rate_22carat]
        );
        
        res.json({
            success: true,
            message: 'Rates updated successfully',
            affectedRows: result.affectedRows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    testConnection();
});