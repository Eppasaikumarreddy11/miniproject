# Demo — Smart Bus Pass (Recovered)

This workspace contains a simple Smart Bus Pass demo with a Node/Express backend and static frontend files.

Quick actions

- Start backend (runs Express server on port 5000):

```powershell
cd backend
node server.js
```

- Alternatively (if you prefer npm scripts):

```powershell
# from repository root
npm run start-backend
```

- Open frontend (Windows):

```powershell
# opens the default browser with index.html
npm run open-frontend
```

- Serve frontend with a static server (requires `http-server` via npx):

```powershell
npm run serve-frontend
# then open http://localhost:5500
```

Notes & troubleshooting

- The backend already contains `package.json` and dependencies in `backend/node_modules` (if present). If `npm install` is needed but blocked by PowerShell execution policy, run `npm install` in a regular Command Prompt (cmd) or enable script execution in PowerShell (only if you understand the implications):

```powershell
# run in admin PowerShell to allow running scripts (optional & security-sensitive)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

- You can also run the server directly with `node backend/server.js` as shown above.

- API endpoints used by the frontend are under `/api` (e.g. `/api/auth/register`, `/api/pass/create`, `/api/pass/my-pass`, `/api/admin/stats`).

Files of interest

- Backend: [backend/server.js](backend/server.js#L1)
- Backend package: [backend/package.json](backend/package.json#L1)
- Frontend entry: [frontend/index.html](frontend/index.html#L1)

If you want, I can:
- Add a `.vscode/launch.json` or a single `npm` command that runs both backend and a static server concurrently.
- Commit these changes to git (if you want me to initialize a repo here).

What would you like next?