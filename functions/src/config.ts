export interface Config {
  projectID: string,
  extensionID: string,
  location: string,
  iosAppID: string;
  iosTeamID: string;
  androidAppID: string;
  androidAppSHA?: string;
  domainPostfix: string;
}

const config: Config = {
  projectID: process.env.PROJECT_ID || '',
  extensionID: process.env.EXT_INSTANCE_ID || '',
  location: process.env.LOCATION || 'us-west1',
  iosAppID: process.env.IOS_BUNDLE_ID || '',
  iosTeamID: process.env.IOS_TEAM_ID || '',
  androidAppID: process.env.ANDROID_BUNDLE_ID || '',
  androidAppSHA: process.env.ANDROID_SHA || '',
  domainPostfix: process.env.DOMAIN_POSTFIX || 'flowlinks',
};

export default config;
