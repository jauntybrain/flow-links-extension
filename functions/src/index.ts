import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

import { getExtensions } from 'firebase-admin/extensions';
import { FirebaseService } from './firebase-service';
import FlowLink from './flow-link';
import config from './config';

const {
  projectID,
  extensionID,
  location,
  iosAppID,
  iosTeamID,
  androidAppID,
  androidAppSHA,
  domainPostfix,
} = config;

// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize Firestore
const db = admin.firestore();
const collection = db.collection('_flowlinks_');

// Initialize Express app
const app = express();

// Set up Firebase Cloud Functions
exports.api = functions.https.onRequest(app);

// FlowLinks domain name
const hostname = `${projectID}-${domainPostfix}.web.app`;

// Initializate extension
exports.initialize = functions.tasks.taskQueue()
  .onDispatch(async () => {
    try {
      // Initialize Firebase Service
      const firebaseService = new FirebaseService();
      await firebaseService.init();

      // Create a new website
      const siteID = await firebaseService.createNewWebsite();

      // Specify website config
      const configPayload = {
        config: {
          appAssociation: 'NONE',
          rewrites: [
            {
              'glob': '**',
              'function': `ext-${extensionID}-api`,
              'functionRegion': location,
            },
          ],
        },
      };

      // Get the new version ID
      const versionID = await firebaseService.createNewVersion(siteID, configPayload);

      // Finalize version
      await firebaseService.finalizeVersion(siteID, versionID);

      // Deploy to hosting
      await firebaseService.deployVersion(siteID, versionID);

      // Add a sample flow link
      await collection.add({
        'path': 'welcome',
        'og:title': 'Welcome to FlowLinks',
        'og:description': 'Time to set them up!',
        'og:image': `https://${siteID}.web.app/images/thumb.jpg`,
        'redirectToStore': false,
        'redirectUrl': '',
      });

      // [Hack] Fetch the link to reduce future loading speed
      await axios.get(`https://${siteID}.web.app/welcome`);

      // Finalize extension initialization
      await getExtensions().runtime().setProcessingState(
        'PROCESSING_COMPLETE',
        `Initialization is complete`
      );
    } catch (error) {
      const errorMessage = error === Error ? (error as Error).message : error;
      functions.logger.error('Initialization error:', errorMessage);

      await getExtensions().runtime().setProcessingState(
        'PROCESSING_FAILED',
        `Initialization failed. ${errorMessage}`
      );
    }
  });

// Error-handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  functions.logger.error('Error:', err);
  res.status(500).send('Internal Server Error');
});

// iOS Association
app.get('/.well-known/apple-app-site-association', (req, res) => {
  const applicationID = `${iosTeamID}.${iosAppID}`;

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.write(JSON.stringify({
    'applinks': {
      'apps': [],
      'details': [{
        'appID': applicationID,
        'paths': [
          '*',
        ],
      }],
    },
    'webcredentials': {
      'apps': [
        applicationID,
      ],
    },
  }));
  res.end();
});

// Android Association
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.write(JSON.stringify(
    [{
      'relation': [
        'delegate_permission/common.handle_all_urls',
      ],
      'target': {
        'namespace': 'android_app',
        'package_name': androidAppID,
        'sha256_cert_fingerprints': [androidAppSHA],
      },
    }]
  ));
  res.end();
});

// Host assets
app.use('/images', express.static(path.join(__dirname, './assets/images')));

// Handle all other routes
app.get('*', async (req, res, next) => {
  try {
    // Parse link data
    const urlParts = req.url.split('?');
    const linkPath = urlParts[0].split('/').pop();

    // Fetch link document
    const snapshotQuery = collection.where('path', '==', linkPath).limit(1);
    const linkSnapshot = await snapshotQuery.get();

    const linkFound = linkSnapshot.docs.length !== 0;

    if (!linkFound) {
      // If not found, return 404
      return res.status(404).send(getNotFoundResponse());
    }

    const flowLink = linkSnapshot.docs[0].data() as FlowLink;
    const source = await getFlowLinkResponse(flowLink);

    return res.status(200).send(source);
  } catch (error) {
    functions.logger.error('Error processing FlowLink: ', error);
    return res.status(500).send('Internal Server Error');
  }
});

function getNotFoundResponse(): string {
  // Gather metadata
  const thumbnail = `https://${hostname}/images/404-thumb.jpg`;
  const notFoundImage = `https://${hostname}/images/not-found.svg`;
  const flPoweredImage = `https://${hostname}/images/fl-powered.svg`;
  const backgroundImage = `https://${hostname}/images/background.png`;

  const templatePath = path.join(__dirname, './assets/html/404.html');
  const source = fs.readFileSync(templatePath, { encoding: 'utf-8' })
    .replaceAll('{{thumbnail}}', thumbnail)
    .replaceAll('{{notFoundImage}}', notFoundImage)
    .replaceAll('{{backgroundImage}}', backgroundImage)
    .replaceAll('{{flPoweredImage}}', flPoweredImage);

  return source;
}

async function getFlowLinkResponse(flowLink: FlowLink): Promise<string> {
  // Gather metadata
  const title = flowLink['og:title'] || '';
  const description = flowLink['og:description'] || '';
  const image = flowLink['og:image'] || '';
  const redirectToStore = flowLink.redirectToStore || false;
  const redirectUrl = flowLink.redirectUrl || '';

  const statusImage = `https://${hostname}/images/status.svg`;
  const flPoweredImage = `https://${hostname}/images/fl-powered.svg`;
  const backgroundImage = `https://${hostname}/images/background.png`;

  // Get iOS AppStore appID
  let appStoreID = '';
  if (redirectToStore) {
    appStoreID = (await getAppStoreID(iosAppID)) || '';
  }

  const templatePath = path.join(__dirname, './assets/html/index.html');
  const source = fs.readFileSync(templatePath, { encoding: 'utf-8' })
    .replaceAll('{{title}}', title)
    .replaceAll('{{description}}', description)
    .replaceAll('{{appStoreID}}', appStoreID)
    .replaceAll('{{playStoreID}}', androidAppID)
    .replaceAll('{{redirectToStore}}', redirectToStore.toString())
    .replaceAll('{{redirectUrl}}', redirectUrl)
    .replaceAll('{{thumbnail}}', image)
    .replaceAll('{{statusImage}}', statusImage)
    .replaceAll('{{backgroundImage}}', backgroundImage)
    .replaceAll('{{flPoweredImage}}', flPoweredImage);

  return source;
}

// Get AppStore numeric ID
async function getAppStoreID(bundleId: string): Promise<string | null> {
  try {
    const response = await axios.get(`http://itunes.apple.com/lookup?bundleId=${bundleId}`);

    if (response.data && response.data.results.length > 0) {
      const appInfo = response.data.results[0];
      if (appInfo.trackId) {
        return appInfo.trackId;
      }
    }

    return null; // App Store URL not found in the response
  } catch (error) {
    functions.logger.error('Error fetching data from iTunes API:', error);
    return null;
  }
}
