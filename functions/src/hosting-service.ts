import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

import { GoogleAuth } from "google-auth-library";

export class HostingService {

    private readonly firebaseHostingURL = 'https://firebasehosting.googleapis.com/v1beta1';
    private readonly firebaseUploadURL = 'https://upload-firebasehosting.googleapis.com/upload';

    private accessToken: string | undefined;

    // Get common JSON headers
    private get jsonHeaders() {
        return {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
        };
    }

    // Initialize service
    public async init() {
        await this.getAccessToken();
    }

    // Get Google API access token
    public async getAccessToken() {
        const auth = new GoogleAuth({
            scopes: ["https://www.googleapis.com/auth/firebase"],
        });

        const authClient = await auth.getClient();
        const accessToken = (await authClient.getAccessToken()).token!;

        this.accessToken = accessToken;
    }

    // Get random number ID
    private getRandomNumber(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Create new Hosting website
    public async createNewWebsite(): Promise<string> {
        // Generate new website ID
        const randomNumber = this.getRandomNumber(10000, 40000);
        const siteID = `${process.env.PROJECT_ID}-flowlinks-${randomNumber}`;

        const url = `${this.firebaseHostingURL}/projects/${process.env.PROJECT_ID}/sites?siteId=${siteID}`;
        await axios.post(url, {}, { headers: this.jsonHeaders });

        return siteID;
    }

    // Create new Hosting website version
    public async createNewVersion(siteID: string, config: any): Promise<string> {
        const url = `${this.firebaseHostingURL}/sites/${siteID}/versions`;
        const versionResult = await axios.post(url, config, { headers: this.jsonHeaders });

        const versionData = versionResult.data as any;
        const parts = versionData['name'].split('/');

        return parts[parts.length - 1];
    }

    // Populite new Hosting website files
    public async populateFiles(siteID: string, versionID: string, files: any[]) {
        const filesPayload: { [key: string]: string } = {};
        files.forEach((file) => {
            filesPayload[file.name] = file.sha;
        });

        const url = `${this.firebaseHostingURL}/sites/${siteID}/versions/${versionID}:populateFiles`;

        await axios.post(url, { "files": filesPayload }, { headers: this.jsonHeaders });
    }

    // Upload new Hosting website file
    public async uploadFile(siteID: string, versionID: string, file: any) {
        const filePath = path.join(__dirname, `../src${file.name}.gz`);
        const fileBytes = fs.readFileSync(filePath);

        const url = `${this.firebaseUploadURL}/sites/${siteID}/versions/${versionID}/files/${file.sha}`;
        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/octet-stream'
        };

        await axios.post(url, fileBytes, { headers: headers });
    }

    // Finalize new Hosting website version
    public async finalizeVersion(siteID: string, versionID: string) {
        const url = `${this.firebaseHostingURL}/sites/${siteID}/versions/${versionID}?update_mask=status`;

        await axios.patch(url, { status: 'FINALIZED' }, { headers: this.jsonHeaders });
    }

    // Deploy new Hosting website
    public async deployVersion(siteID: string, versionID: string) {
        const url = `${this.firebaseHostingURL}/sites/${siteID}/releases?versionName=sites/${siteID}/versions/${versionID}`;

        await axios.post(url, {}, { headers: this.jsonHeaders });
    }
}