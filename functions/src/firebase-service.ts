import axios, {isAxiosError} from 'axios';
import {logger} from 'firebase-functions';

import {GoogleAuth} from 'google-auth-library';

import config from './config';

const {
  projectID,
  domainPostfix,
} = config;

// Handles Firebase-associated REST API requests
export class FirebaseService {
  private readonly firebaseHostingURL = 'https://firebasehosting.googleapis.com/v1beta1';

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
    // Get access token for REST API
    await this.getAccessToken();
  }

  // Get Google API access token
  public async getAccessToken() {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/firebase'],
    });

    const authClient = await auth.getClient();
    const accessToken = (await authClient.getAccessToken()).token;

    if (accessToken == null) {
      logger.error('Could not get access token');
      return;
    }

    this.accessToken = accessToken;
  }

  // Create new Hosting website
  public async createNewWebsite(): Promise<string> {
    const siteID = `${projectID}-${domainPostfix}`;

    try {
      const url = `${this.firebaseHostingURL}/projects/${projectID}/sites?siteId=${siteID}`;
      await axios.post(url, {}, {headers: this.jsonHeaders});
    } catch (error) {
      if (isAxiosError(error)) {
        throw Error(`Domain name ${siteID} is already taken. Try reinstalling with a different postfix.`);
      }
    }

    return siteID;
  }

  // Create new Hosting website version
  public async createNewVersion(siteID: string, config: any): Promise<string> {
    const url = `${this.firebaseHostingURL}/sites/${siteID}/versions`;
    const versionResult = await axios.post(url, config, {headers: this.jsonHeaders});

    const versionData = versionResult.data as any;
    const parts = versionData['name'].split('/');

    return parts[parts.length - 1];
  }

  // Finalize new Hosting website version
  public async finalizeVersion(siteID: string, versionID: string) {
    const url = `${this.firebaseHostingURL}/sites/${siteID}/versions/${versionID}?update_mask=status`;

    await axios.patch(url, {status: 'FINALIZED'}, {headers: this.jsonHeaders});
  }

  // Deploy new Hosting website
  public async deployVersion(siteID: string, versionID: string) {
    const url = `${this.firebaseHostingURL}/sites/${siteID}/releases?versionName=sites/${siteID}/versions/${versionID}`;

    await axios.post(url, {}, {headers: this.jsonHeaders});
  }
}
