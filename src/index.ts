import { createServer } from 'http';
import { google } from 'googleapis';
import BackupManager from './backupmanager';

const CLIENT_ID = Bun.env.CLIENT_ID;
const CLIENT_SECRET = Bun.env.CLIENT_SECRET;
const BACKUP_FILE = Bun.env.BACKUP_FILE;

if (!CLIENT_ID || !CLIENT_SECRET || !BACKUP_FILE) {
  console.log("Missing environment variables. Please check your .env file.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, "http://localhost:3000/callback");
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive.file'],
});

const server = createServer(async (req, res) => {
  if (req.url?.startsWith('/callback')) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const code = url.searchParams.get('code') as string;

    if (code) {
      try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const REFRESH_TOKEN = tokens.refresh_token;
        console.log('Refresh Token:', REFRESH_TOKEN);
        if(!REFRESH_TOKEN) return;
        const backupManager = new BackupManager(CLIENT_ID, CLIENT_SECRET, "http://localhost:3000/callback", REFRESH_TOKEN);
        await backupManager.backupFileToGoogleDrive(BACKUP_FILE);

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Backup completed successfully! You can close this window.');
      } catch (error) {
        console.error('Error retrieving access token', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error retrieving access token.');
      }
    } else {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Authorization code missing.');
    }
  } else {
    res.writeHead(302, { Location: authUrl });
    res.end();
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Open the http://localhost:${PORT} url.`);
});
