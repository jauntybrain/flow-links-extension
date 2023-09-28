import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

// import { GoogleAuth } from "google-auth-library";
import { getExtensions } from "firebase-admin/extensions";
import { HostingService } from "./hosting-service";

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
      const hostingService = new HostingService();
      await hostingService.init();

      // Create a new website
      const siteID = await hostingService.createNewWebsite();

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
      const versionID = await hostingService.createNewVersion(siteID, configPayload);

      // Specify files for upload
      const files = [
        {
          "name": "/index.html",
          "sha": "04f0dc5b6532f6e6f0c441520f8100a60a5915099c5f705db9f087771fd470ef"
        },
        {
          "name": "/404.html",
          "sha": "359f7d565aae5dfbd9aacf7aa4ed7c4378cc9ab18c4ee6f895e49d6c6e197512"
        }
      ]

      // Populate files list for the new version
      await hostingService.populateFiles(siteID, versionID, files);

      // Upload files
      for (var file of files) {
        await hostingService.uploadFile(siteID, versionID, file);
      }

      // Finalize version
      await hostingService.finalizeVersion(siteID, versionID);

      // Deploy to hosting
      await hostingService.deployVersion(siteID, versionID);

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

// iOS Association
app.get('/.well-known/apple-app-site-association', (req, res) => {
  const applicationID = `${process.env.IOS_TEAM_ID}.${process.env.IOS_BUNDLE_ID}`

  res.writeHead(200, { 'Content-Type': 'application/json' })
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
  }))
  res.end();
});

// Android Association
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
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
  ))
  res.end();
});

// WIP
app.get('*', (req, res, next) => {
  // Define values
  const title = 'My Amazing Application';
  const subtitle = 'Find out more about the app...';
  const image = 'https://.../your-app-banner.jpg';

  // Load HTML template
  const templatePath = path.join(__dirname, './assets/html/index.html');

  // Replace handles with content
  var source = fs.readFileSync(templatePath, { encoding: 'utf-8' })
    .replaceAll('{{title}}', title)
    .replaceAll('{{subtitle}}', subtitle)
    .replaceAll('{{image}}', image);

  // Return the webpage
  return res.send(source);
});
