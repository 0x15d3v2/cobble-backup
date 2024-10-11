import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { config } from 'dotenv';

config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

async function getUserInfo(drive: any) {
  try {
    const res = await drive.about.get({
      fields: 'user',
    });
    const user = res.data.user;
    console.log(`Bağlandığınız kullanıcı: ${user.displayName} (${user.emailAddress})`);
  } catch (error) {
    console.error('Kullanıcı bilgileri alınırken hata:', error);
  }
}

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = process.env.TOKEN_PATH || 'token.json';
async function getAccessToken() {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Bu linke girdiğinizde çıkan yerden hesabınıza giriş yapıp http://localhost/?code=4/0AVG7fiRCgjj ile başlayıp &scope=https://www.googleapis.com/auth/drive.file ile biten kısım sizin AUTHORIZATION_CODE niz.:', authUrl);

  const authorizationCode = process.env.AUTHORIZATION_CODE;

  if (!authorizationCode) {
    throw new Error('Lütfen yönlendirildiğiniz sitedeki http://localhost/?code= ile başlayıp &scope=https://www.googleapis.com/auth/drive.file ile biten 4/0AVG7fiRCgjj kısmını .env configinize koyun.');
  }

  const tokenResponse = await oAuth2Client.getToken(authorizationCode);

  if (tokenResponse.tokens) {
    oAuth2Client.setCredentials(tokenResponse.tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokenResponse.tokens));
    console.log('Tokenler belirlediğiniz jsona eklendi: ', TOKEN_PATH);
  } else {
    throw new Error('Tokenleri alırken bir hata meydana geldi.');
  }
}

async function backupMinecraftServer() {
  const backupPath = process.env.BACKUP_PATH;
  const backupFileName = `cobble_backup.zip`;
  if (!backupPath) return;
  const zipFilePath = path.join(backupPath, backupFileName);

  const output = fs.createWriteStream(zipFilePath);
  const archive = archiver('zip');

  output.on('close', async () => {
    console.log(`${archive.pointer()} byte`);
    console.log('Zip dosyası başarıyla oluşturuldu.');

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    await getUserInfo(drive);

    const fileMetadata = {
      name: backupFileName,
    };
    const media = {
      mimeType: 'application/zip',
      body: fs.createReadStream(zipFilePath),
    };

    try {
      const res = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
      });

      if (res && res.data) {
        console.log('Dosya ID:', res.data.id);
      } else {
        console.error('Bir hata meydana geldi');
      }
    } catch (error) {
      console.error('Dosyayı yüklerken bir hata ile karşılaşıldı:', error);
    }
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);
  archive.directory(path.join(backupPath, 'world'), 'world');
  archive.directory(path.join(backupPath, 'world_nether'), 'world_nether');
  archive.directory(path.join(backupPath, 'world_the_end'), 'world_the_end');
  await archive.finalize();
}

(async () => {
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    oAuth2Client.setCredentials(token);
    await backupMinecraftServer().catch(console.error);
  } else {
    await getAccessToken();
  }
})();
