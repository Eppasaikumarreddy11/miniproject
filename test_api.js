const http = require('http');

async function testApi() {
    console.log("Starting API Tests...");

    const baseUrl = 'http://localhost:5000/api';
    let token = '';

    // 1. Test Registration
    console.log("\n1. Testing Registration...");
    const regData = JSON.stringify({
        firstName: "John",
        lastName: "Doe",
        email: "john.test@example.com",
        phone: "9876543210",
        password: "password123",
        aadhar: "123456789012",
        dob: "2000-01-01",
        gender: "male",
        address: "123 Test St",
        city: "TestCity",
        pincode: "123456",
        faceData: "mock_face_data"
    });

    try {
        const regRes = await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: regData
        });
        const regJson = await regRes.json();
        console.log("Registration Response:", regRes.status, regJson);
        
        if (regRes.status !== 201 && regJson.error !== 'User with this email already exists') {
            throw new Error("Registration Failed");
        }
    } catch(e) {
        console.error(e);
    }

    // 2. Test Login
    console.log("\n2. Testing Login...");
    try {
        const loginRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: "john.test@example.com", password: "password123" })
        });
        const loginJson = await loginRes.json();
        console.log("Login Response:", loginRes.status);
        
        if (loginRes.status === 200) {
            token = loginJson.token;
            console.log("Token received successfully.");
        } else {
            throw new Error("Login Failed");
        }
    } catch(e) {
        console.error(e);
    }

    if (!token) return console.log("Aborting remaining tests (no token).");

    // 3. Test Pass Creation
    console.log("\n3. Testing Pass Creation...");
    try {
        const passRes = await fetch(`${baseUrl}/pass/create`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userType: "general", months: 3, price: 800 })
        });
        const passJson = await passRes.json();
        console.log("Pass Creation Response:", passRes.status, passJson);
    } catch(e) {
        console.error(e);
    }

    // 4. Test Get My Pass
    console.log("\n4. Testing Get My Pass...");
    try {
        const myPassRes = await fetch(`${baseUrl}/pass/my-pass`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const myPassJson = await myPassRes.json();
        console.log("Get Pass Response:", myPassRes.status);
        if(myPassJson.qrCodeData) {
            console.log(`Success! Received Pass with ID: ${myPassJson.id} and QR Code present.`);
        }
    } catch(e) {
        console.error(e);
    }

    // 5. Test Admin Stats
    console.log("\n5. Testing Admin Stats...");
    try {
        const statsRes = await fetch(`${baseUrl}/admin/stats`);
        const statsJson = await statsRes.json();
        console.log("Admin Stats Response:", statsRes.status, statsJson);
    } catch(e) {
        console.error(e);
    }

    console.log("\n--- All Tests Done ---");
}

testApi();
