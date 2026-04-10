# Biometric Authentication Update TODO

## Plan Summary
- Remove all Iris authentication (UI, JS, DB, backend logic)
- Keep Face + Fingerprint (fingerprint already Aadhaar-linked)
- Enhance Face: Auto-verify/extract mock face data from Aadhaar upload
- Files: frontend/registration.html, backend/server.js

## Steps (5/6 completed)

### 1. Create TODO.md [COMPLETED ✓]
- Done

### 2. Edit frontend/registration.html - Remove Iris UI/JS [COMPLETED ✓]
- Delete irisOption div, irisVerification div
- Remove irisVerified, irisStream, simulateIris()
- Update updateProgress(): /2 biometrics, face+fingerprint only
- Remove iris from submit check/data

### 3. Edit frontend/registration.html - Enhance Face for Aadhaar [COMPLETED ✓]
- Update face desc: "Extract face from Aadhaar"
- On Aadhaar/doc upload or select, auto faceVerified=true, mock "face_extracted_from_aadhar_document"
- Integrated with fileInput/docInput logic

### 4. Edit backend/server.js - Update DB Schema [COMPLETED ✓]
- Remove `irisData TEXT,` from users CREATE TABLE

### 5. Edit backend/server.js - Update Register Endpoint [COMPLETED ✓]
- Remove irisData destructuring/INSERT (13→12 params)
- Add face extraction: `extractedFaceData = aadhar ? "face_extracted_from_aadhar_document" : null`
- `finalFaceData = faceData || extractedFaceData`

### 6. Test Changes [PENDING]
- Remove irisVerified, irisStream, simulateIris()
- Update updateProgress(): /2 biometrics, face+fingerprint only
- Remove iris from submit check/data

### 3. Edit frontend/registration.html - Enhance Face for Aadhaar [PENDING]
- Update face desc: "Extract face from Aadhaar"
- On Aadhaar/doc upload or select, auto faceVerified=true, mock "face_extracted_from_aadhar_document"
- Integrate with fileInput/docInput logic

### 4. Edit backend/server.js - Update DB Schema [PENDING]
- Remove `irisData TEXT,` from users CREATE TABLE

### 5. Edit backend/server.js - Update Register Endpoint [PENDING]
- Remove irisData destructuring/INSERT (12 params)
- Add face extraction: `extractedFaceData = aadhar ? "face_extracted_from_aadhar_document" : null`
- `finalFaceData = faceData || extractedFaceData`

### 6. Test Changes [PENDING]
- cd backend && node server.js
- Register: Select Face, upload Aadhaar → auto-verify face
- Check DB: no irisData, faceData populated from Aadhaar
- Verify fingerprint/login/pass flow

