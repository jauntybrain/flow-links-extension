import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

import { getExtensions } from "firebase-admin/extensions";
import { FirebaseService } from "./firebase-service";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize Express app
const app = express();

// Set up Firebase Cloud Functions
exports.api = functions.https.onRequest(app);

// Initializate extension
exports.initialize = functions.tasks.taskQueue()
  .onDispatch(async () => {
    try {
      const firebaseService = new FirebaseService();
      await firebaseService.init();

      // Create a new website
      const siteID = await firebaseService.createNewWebsite();

      // Specify website config
      const configPayload = {
        config: {
          appAssociation: "NONE",
          rewrites: [
            {
              "glob": "**",
              "function": `ext-${process.env.EXT_INSTANCE_ID}-api`,
              "functionRegion": process.env.LOCATION,
            }
          ]
        }
      };

      // Get the new version ID
      const versionID = await firebaseService.createNewVersion(siteID, configPayload);

      // Finalize version
      await firebaseService.finalizeVersion(siteID, versionID);

      // Deploy to hosting
      await firebaseService.deployVersion(siteID, versionID);

      const db = admin.firestore();
      const collection = db.collection('_flowlinks_');
      await collection.add({
        'path': 'welcome',
        'og:title': 'Welcome to FlowLinks',
        'og:description': 'Time to set them up!',
        'og:image': `https://${siteID}/images/thumb.jpg`,
        'redirectToStore': false,
        'redirectUrl': '',
      });

      // Finalize extension initialization
      await getExtensions().runtime().setProcessingState(
        "PROCESSING_COMPLETE",
        `Initialization is complete`
      );

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const response = error.response;
        if (response) {
          // Axios error with a response, handle it and return response JSON
          const status = response.status;
          const data = response.data;

          console.error(`Axios Error - Status: ${status}`, data);
          await getExtensions().runtime().setProcessingState(
            "PROCESSING_FAILED",
            `Initialization failed. Axios Error - Status: ${status}`
          );
        }
      } else {
        // Other non-Axios errors
        console.error("Error:", error);
        await getExtensions().runtime().setProcessingState(
          "PROCESSING_FAILED",
          `Initialization failed. ${error}`
        );
      }
    }
  });

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(500).send('Internal Server Error');
});

// iOS Association
app.get('/.well-known/apple-app-site-association', (req, res) => {
  const applicationID = `${process.env.IOS_TEAM_ID}.${process.env.IOS_BUNDLE_ID}`;

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.write(JSON.stringify({
    "applinks": {
      "apps": [],
      "details": [{
        "appID": applicationID,
        "paths": [
          "*",
        ],
      }]
    },
    "webcredentials": {
      "apps": [
        applicationID
      ]
    }
  }));
  res.end();
});

// Android Association
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.write(JSON.stringify(
    [{
      "relation": [
        "delegate_permission/common.handle_all_urls"
      ],
      "target": {
        "namespace": "android_app",
        "package_name": process.env.ANDROID_BUNDLE_ID,
        "sha256_cert_fingerprints": [
          process.env.ANDROID_SHA
        ]
      }
    }]
  ));
  res.end();
});

// Host images
app.use('/images', express.static(path.join(__dirname, './assets/images')));

// Handle all other routes
app.get('*', async (req, res, next) => {
  try {
    const urlParts = req.url.split('?');
    const linkPath = urlParts[0].split('/').pop();

    const db = admin.firestore();
    const collection = db.collection('_flowlinks_');

    const linkSnapshot = await collection.where('path', '==', linkPath).get();
    const linkFound = linkSnapshot.docs.length !== 0;

    if (!linkFound) {
      // If the requested link doesn't exist, return 404
      const notFoundImage = `https://${req.hostname}/images/404-thumb.jpg`;
      const templatePath = path.join(__dirname, './assets/html/404.html')
        .replaceAll('{{image}}', notFoundImage);
      const source = fs.readFileSync(templatePath, { encoding: 'utf-8' });
      return res.status(404).send(source);
    }

    const linkData = linkSnapshot.docs[0].data();

    // Gather metadata
    const title = linkData['og:title'] || '';
    const description = linkData['og:description'] || '';
    const image = linkData['og:image'] || '';
    const redirectToStore = linkData['redirectToStore'] || false;
    const redirectUrl = linkData['redirectUrl'] || '';

    const templatePath = path.join(__dirname, './assets/html/index.html');

    // Get iOS AppStore appID
    let appStoreID = '';
    if (redirectToStore) {
      appStoreID = (await getAppStoreID(process.env.IOS_BUNDLE_ID!)) || '';
    }

    const source = fs.readFileSync(templatePath, { encoding: 'utf-8' })
      .replaceAll('{{title}}', title)
      .replaceAll('{{description}}', description)
      .replaceAll('{{image}}', image)
      .replaceAll('{{appStoreID}}', appStoreID)
      .replaceAll('{{playStoreID}}', process.env.ANDROID_BUNDLE_ID!)
      .replaceAll('{{redirectToStore}}', redirectToStore)
      .replaceAll('{{redirectUrl}}', redirectUrl);

    return res.send(source);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send('Internal Server Error');
  }
});

// Get AppStore numeric ID
async function getAppStoreID(bundleId: string): Promise<string | null> {
  try {
    const response = await axios.get(`http://itunes.apple.com/lookup?bundleId=${bundleId}`);
    console.log(response.data);

    if (response.data && response.data.results && response.data.results.length > 0) {
      const appInfo = response.data.results[0];
      if (appInfo.trackId) {
        return appInfo.trackId;
      }
    }

    return null; // App Store URL not found in the response
  } catch (error) {
    console.error('Error fetching data from iTunes API:', error);
    return null;
  }
}
