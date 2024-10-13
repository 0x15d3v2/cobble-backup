import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';


export default class BackupManager {
  private drive: any;

  constructor(CLIENT_ID : string,CLIENT_SECRET : string, REDIRECT_URI : string, REFRESH_TOKEN : string) {
    const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    this.drive = google.drive({ version: 'v3', auth: oAuth2Client });
  }

  public async backupFileToGoogleDrive(filePath: string): Promise<void> {
    try {
      const fileName = path.basename(filePath);
      const fileMetadata = {
        name: fileName,
      };
      const media = {
        mimeType: 'application/octet-stream',
        body: fs.createReadStream(filePath),
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id',
      });

      console.log(`Successfully uploaded ${fileName} to Google Drive. File ID: ${response.data.id}`);
    } catch (error) {
      console.error('Error during Google Drive backup:', error);
    }
  }
}
