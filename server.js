const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'super-secret-key-for-bus-pass'; // In a real app, use environment variables
// Middleware
app.use(cors()); // Allow all origins for local testing and Live Server compatibility

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend'))); // Serve frontend static files

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)){
    fs.mkdirSync(dataDir);
}

// Database setup
const db = new sqlite3.Database(path.join(dataDir, 'database.db'), (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Create Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstName TEXT NOT NULL,
            lastName TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL,
            password TEXT NOT NULL,
            aadhar TEXT NOT NULL,
            dob TEXT,
            gender TEXT,
            address TEXT,
            city TEXT,
            pincode TEXT,
            faceData TEXT,
            fingerprintData TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error("Error creating users table", err);
        });

        // Create Passes table
        db.run(`CREATE TABLE IF NOT EXISTS passes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            userType TEXT NOT NULL,
            months INTEGER NOT NULL,
            price REAL NOT NULL,
            status TEXT DEFAULT 'ACTIVE',
            validFrom DATETIME DEFAULT CURRENT_TIMESTAMP,
            validUntil DATETIME NOT NULL,
            qrCodeData TEXT,
            FOREIGN KEY(userId) REFERENCES users(id)
        )`, (err) => {
            if (err) console.error("Error creating passes table", err);
        });
    }
});

// Helper function to query DB as Promises
const dbGet = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
const dbRun = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function (err) { err ? reject(err) : resolve(this) }));
const dbAll = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.status(401).json({ error: "No token provided" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid or expired token" });
        req.user = user;
        next();
    });
};

// --- AUTHENTICATION ROUTES ---

// Register User
app.post('/api/auth/register', async (req, res) => {
    try {
        const { 
            firstName, lastName, email, phone, password, aadhar, dob, gender, address, city, pincode,
            faceData, fingerprintData
        } = req.body;

        // Check if user exists
        const existingUser = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // If they uploaded an Aadhar card document, we "extract" the fingerprint from it.
        // In a real system, this would involve OCR/Image processing.
        const extractedFingerprint = aadhar ? "extracted_from_aadhar_document" : null;
        const finalFingerprintData = fingerprintData || extractedFingerprint;

        // Insert new user
        // Extract face from Aadhaar similar to fingerprint
        const extractedFaceData = aadhar ? "face_extracted_from_aadhar_document" : null;
        const finalFaceData = faceData || extractedFaceData;

        const result = await dbRun(
            `INSERT INTO users (firstName, lastName, email, phone, password, aadhar, dob, gender, address, city, pincode, faceData, fingerprintData) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [firstName, lastName, email, phone, hashedPassword, aadhar, dob, gender, address, city, pincode, finalFaceData, finalFingerprintData]
        );

        res.status(201).json({ message: 'User registered successfully', userId: result.lastID });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // email can be either email or aadhar

        const user = await dbGet('SELECT * FROM users WHERE email = ? OR aadhar = ?', [email, email]);
        if (!user) {
            return res.status(400).json({ error: 'Invalid Aadhar/Email or password' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid Aadhar/Email or password' });
        }

        // Create token
        const token = jwt.sign(
            { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}` }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({ 
            token, 
            user: { id: user.id, name: `${user.firstName} ${user.lastName}`, email: user.email } 
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- PASS MANAGEMENT ROUTES ---

// Create/Purchase Bus Pass
app.post('/api/pass/create', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { userType, months, price } = req.body;

        // Calculate validity
        const validFrom = new Date();
        const validUntil = new Date();
        validUntil.setMonth(validUntil.getMonth() + parseInt(months));

        // Generate Secure QR Code content for offline validation
        const qrContent = JSON.stringify({
            uid: userId,
            type: userType,
            exp: validUntil.toISOString(),
            sig: jwt.sign({ uid: userId, exp: validUntil.getTime() }, JWT_SECRET) // Offline signature verification
        });

        const qrCodeData = await QRCode.toDataURL(qrContent);

        const result = await dbRun(
            `INSERT INTO passes (userId, userType, months, price, validFrom, validUntil, qrCodeData) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, userType, months, price, validFrom.toISOString(), validUntil.toISOString(), qrCodeData]
        );

        res.status(201).json({ message: 'Pass created successfully', passId: result.lastID });
    } catch (error) {
        console.error("Pass creation error:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Renew Bus Pass
app.post('/api/pass/renew', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { fingerprintData, months, price } = req.body;

        // Verify fingerprint against the stored Aadhar fingerprint
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        
        if (!user.fingerprintData || user.fingerprintData !== fingerprintData) {
            return res.status(403).json({ error: 'Biometric fingerprint verification failed. Does not match Aadhar records.' });
        }

        // Get currently active or most recent pass
        const oldPass = await dbGet('SELECT * FROM passes WHERE userId = ? ORDER BY validUntil DESC LIMIT 1', [userId]);
        
        // Calculate new validity
        const validFrom = new Date();
        const validUntil = new Date(oldPass && new Date(oldPass.validUntil) > validFrom ? oldPass.validUntil : validFrom);
        validUntil.setMonth(validUntil.getMonth() + parseInt(months));

        // Generate *Unique* QR for Renewal
        const uniqueId = Math.random().toString(36).substring(2, 15);
        const qrContent = JSON.stringify({
            uid: userId,
            type: oldPass ? oldPass.userType : 'general',
            exp: validUntil.toISOString(),
            unique: uniqueId,
            sig: jwt.sign({ uid: userId, exp: validUntil.getTime(), unq: uniqueId }, JWT_SECRET)
        });

        const qrCodeData = await QRCode.toDataURL(qrContent);

        const result = await dbRun(
            `INSERT INTO passes (userId, userType, months, price, validFrom, validUntil, qrCodeData) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, oldPass ? oldPass.userType : 'general', months, price, validFrom.toISOString(), validUntil.toISOString(), qrCodeData]
        );

        res.status(201).json({ message: 'Pass renewed successfully with verified biometric', passId: result.lastID });
    } catch (error) {
        console.error("Pass renewal error:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get User's Active Pass Details
app.get('/api/pass/my-pass', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const pass = await dbGet(
            `SELECT * FROM passes 
             WHERE userId = ? 
             ORDER BY validUntil DESC LIMIT 1`, 
            [userId]
        );

        if (!pass) {
            return res.status(404).json({ error: 'No active pass found' });
        }

        // Check if expired
        const now = new Date();
        const expiry = new Date(pass.validUntil);
        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        
        let status = pass.status;
        if (daysLeft < 0) {
            status = 'EXPIRED';
            await dbRun('UPDATE passes SET status = ? WHERE id = ?', ['EXPIRED', pass.id]);
        }

        res.json({
            ...pass,
            status,
            daysLeft,
            isExpiringSoon: daysLeft > 0 && daysLeft <= 7
        });
    } catch (error) {
        console.error("Fetch pass error:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- ADMIN ROUTES ---
app.get('/api/admin/stats', async (req, res) => {
    try {
        const totalUsers = await dbGet('SELECT COUNT(*) as count FROM users');
        const totalPasses = await dbGet('SELECT COUNT(*) as count FROM passes');
        const revenue = await dbGet('SELECT SUM(price) as total FROM passes');
        
        res.json({
            users: totalUsers.count,
            passes: totalPasses.count,
            revenue: revenue.total || 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// QR Verification for Conductor
app.post('/api/pass/verify-qr', async (req, res) => {
    try {
        const { qrData } = req.body;
        if (!qrData) return res.status(400).json({ error: 'QR data required' });

        const qrContent = JSON.parse(qrData.replace('data:image/png;base64,', '')); // Simple decode for demo

        const now = new Date();
        const exp = new Date(qrContent.exp);
        
        if (exp < now) {
            return res.json({ valid: false, error: 'Pass expired' });
        }

        // Verify signature (simplified for demo)
        if (!qrContent.sig) {
            return res.json({ valid: false, error: 'Invalid QR format' });
        }

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [qrContent.uid]);
        const pass = await dbGet('SELECT * FROM passes WHERE userId = ? AND qrCodeData LIKE ?', [qrContent.uid, `%${qrContent.sig.substring(0,20)}%`]);

        if (!user || !pass || pass.status !== 'ACTIVE') {
            return res.json({ valid: false, error: 'Pass not found or inactive' });
        }

        res.json({
            valid: true,
            user: {
                name: `${user.firstName} ${user.lastName}`,
                aadhar: user.aadhar,
                phone: user.phone
            },
            pass: {
                id: pass.id,
                userType: pass.userType,
                validUntil: pass.validUntil
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Verification error' });
    }
});

// Admin - List Users
app.get('/api/admin/users', (req, res) => {
    db.all('SELECT id, firstName, lastName, email, aadhar, phone, faceData, fingerprintData, createdAt FROM users ORDER BY createdAt DESC LIMIT 50', (err, rows) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
        } else {
            res.json(rows);
        }
    });
});

// Admin - List Passes
app.get('/api/admin/passes', (req, res) => {
    db.all(`
        SELECT p.*, u.firstName, u.lastName, u.aadhar 
        FROM passes p 
        JOIN users u ON p.userId = u.id 
        ORDER BY p.validUntil DESC LIMIT 50
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
        } else {
            res.json(rows);
        }
    });
});


// Fallback to frontend index for SPA-like behavior if not hitting API
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
