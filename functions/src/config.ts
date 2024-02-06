export interface Config {
  projectID: string;
  extensionID: string;
  location: string;
  iosBundleID: string;
  iosTeamID: string;
  androidBundleID: string;
  androidSHA?: string;
  androidScheme?: string;
  domainPostfix: string;
}

const config: Config = {
  projectID: process.env.PROJECT_ID || '',
  extensionID: process.env.EXT_INSTANCE_ID || '',
  location: process.env.LOCATION || 'us-west1',
  iosBundleID: process.env.IOS_BUNDLE_ID || '',
  iosTeamID: process.env.IOS_TEAM_ID || '',
  androidBundleID: process.env.ANDROID_BUNDLE_ID || '',
  androidSHA: process.env.ANDROID_SHA || '',
  androidScheme: process.env.ANDROID_SCHEME || '',
  domainPostfix: process.env.DOMAIN_POSTFIX || 'flowlinks',
};

export default config;
