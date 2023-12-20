## Welcome!

Thank you for using FlowLinks.

## Dashboard

The Dashboard allows editing flow links through friendly user interface. You can find it [here](https://edit.flowlinks.app/).

## How to access the links

Before testing the extension, make sure the initialization is complete by checking the `Runtime status` tab.

The extension has automatically created a new website with [Firebase Hosting](https://console.firebase.google.com/project/${param:PROJECT_ID}/hosting/sites/${param:PROJECT_ID}-${param:DOMAIN_POSTFIX}).

Your website URL is: [https://${param:PROJECT_ID}-${param:DOMAIN_POSTFIX}.web.app/](https://${param:PROJECT_ID}-${param:DOMAIN_POSTFIX}.web.app/).

This website will handle all created FlowLinks and it's domain name must be added to the application that you would like to open the links in.

Due to a quite lengthy domain name, it's advised to link a [custom domain/subdomain](https://firebase.google.com/docs/hosting/custom-domain) to the new website and add that domain to the application.

## How to set up the links

The extension has automatically created a new Firestore collection called `_flowlinks_`. Every document in that collection represents a dynamic/flow link.

A sample path `/welcome` was created as a reference. Check it out [here](https://${param:PROJECT_ID}-${param:DOMAIN_POSTFIX}.web.app/welcome).

The setup is similar to Dynamic Links and must follow this structure:

```
{
	"path": (required, String)
	"og:title": (optional, String)
	"og:description": (optional, String)
    "og:image": (optional, String)
    "redirectToStore": (optional, Bool)
    "redirectUrl": (optional, String. Must start with "https://")
    "expires": (optional, Timestamp)
}
```

- `path`: represents the URL path for your link (e.g. /referral).

- `og:title`: represents the meta-tag **title** of the link.

- `og:description`: represents the meta-tag **description** of the link.

- `og:image`: represents the meta-tag **image** of the link.

- `redirectToStore`: decides whether to redirect the link to the AppStore/GooglePlay on available devices. Defaults to `false`.

- `redirectUrl`: redirects the link to a custom URL when the app is not installed. **redirectToStore** must be set to 'false' for this to work. **Must start with "https://"**

- `expires`: specifies the Timestamp after which the link will become inactive. Note: this will still make the link open the app.


## How to handle query parameters

Any `path` that was added to the `_flowlinks_` collection can have custom query parameters when called. There is no need to specify them in the colleciton.

## How to handle multi-level paths

Flowlinks support multi-level paths (i.e. `/archive/2004/articles/`) out of the box!

## Links logic

Your links are curerntly set up for an iOS app (`${param:IOS_BUNDLE_ID}`) and an Android app (`${param:ANDROID_BUNDLE_ID}`).

1. If the link is opened on a platform that is not iOS/Android, it will do nothing or redirect the user is `redirectUrl` is set.

2. If the link is opened on iOS/Android and the app **is installed**, it will open the app and trigger the according logic.

3. If the link is opened on iOS/Android and the app **is not installed**:

   - If the `redirectToStore` is `true`, the according application store will open.

   - If the `redirectToStore` is `false` and `redirectUrl` is set up, it will redirect the user.

## How to handle links in the apps

Unfortunately, this extension does not support the Firebase Dynamic Links libraries/packages. Therefore, it is recommended to use the native implementations for handling deep links - most of them are very easy to setup:

- [Flutter](https://pub.dev/packages/uni_links)
- [React Native](https://reactnative.dev/docs/linking)
- [Native Android](https://developer.android.com/training/app-links)
- [Native iOS](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app)

## Shorten URLs: Coming Soon

The short URLs implementation is currently in progress and will be available later.

## Missing a feature or have a question?

Feel free to open a new issue [here](https://github.com/jauntybrain/flow-links-extension/issues).

## Known issues

- Links take a long time to load when opened for the first time in a while due to the Cloud Functions creating a new instance for the process. Sadly, there is no workaround for it yet.

## Monitoring

As a best practice, you can [monitor the activity](https://firebase.google.com/docs/extensions/manage-installed-extensions#monitor) of your installed extension, including checks on its health, usage, and logs.
