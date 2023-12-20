import * as functions from 'firebase-functions';
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

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

// Initialize Express app
const app = express();

// Set up Firebase Cloud Functions
exports.api = functions.https.onRequest(app);

// FlowLinks domain name
const hostname = `${projectID}-${domainPostfix}.web.app`;

// Initializate extension
exports.initialize = functions.tasks.taskQueue()
  .onDispatch(async () => {
    const { getExtensions } = await import('firebase-admin/extensions');
    const { FirebaseService } = await import('./firebase-service');
    const admin = await import('firebase-admin');

    try {
      // Initialize Firebase Admin SDK
      admin.initializeApp();

      // Initialize Firestore
      const db = admin.firestore();
      const collection = db.collection('_flowlinks_');

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
        'path': '/welcome',
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
app.get('/.well-known/apple-app-site-association', async (req, res) => {
  const applicationID = `${iosTeamID}.${iosAppID}`;

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.write(JSON.stringify({
    'applinks': {
      'apps': [],
      'details': [{
        'appID': applicationID,
        'paths': ['*'],
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
    const admin = await import('firebase-admin');

    // Initialize Firebase Admin SDK
    try {
      admin.initializeApp();
    } catch (_) { }

    // Get Firestore instance
    const db = admin.firestore();
    const collection = db.collection('_flowlinks_');

    // Parse link data
    const urlObject = new URL(req.url, 'https://flowlinks');
    const linkPath = urlObject.pathname;

    // Fetch link document
    const snapshotQuery = collection.where('path', '==', linkPath).limit(1);
    const linkSnapshot = await snapshotQuery.get();

    const linkFound = linkSnapshot.docs.length !== 0;

    // If not found, return 404
    if (!linkFound) {
      return res.status(404).send(getNotFoundResponse());
    }

    const flowLink = linkSnapshot.docs[0].data() as FlowLink;
    const source = await getFlowLinkResponse(flowLink);

    res.setHeader('Cache-Control', 'public, max-age=86400');
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
  let title = flowLink['og:title'] || '';
  let description = flowLink['og:description'] || '';
  let image = flowLink['og:image'] || '';

  const redirectToStore = flowLink.redirectToStore || false;
  const redirectUrl = flowLink.redirectUrl || '';
  const expires = flowLink.expires;

  if (expires && expires.toMillis() < Date.now()) {
    return ''; // Return nothing if the timestamp is in the past
  }

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
