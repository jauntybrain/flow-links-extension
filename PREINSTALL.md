The Flow Links Extension offers a powerful alternative for the [retiring Dynamic Links](https://firebase.google.com/support/dynamic-links-faq) service and provides similar functionality.

This extension allows you to create **Flow Links** - deep links that work on both iOS and Android platforms.

Upon installation, a new **Firebase Hosting** website & domain are automatically created to handle link functionality.

Newly created links are stored in a **Cloud Firestore** collection.

You can create and manage your links with the [FlowLinks Dashboard](https://edit.flowlinks.app/).

Read more about what inspired this extension in [this blog](https://medium.com/@jauntybrain/dynamic-links-are-dead-what-to-do-c73ad0669540).

### Additional setup

Before installing this extension, make sure that you’ve set up the following services in your Firebase project:

- Cloud Firestore database
- Firebase Hosting

### Billing

To install an extension, your project must be on the [Blaze (pay as you go) plan](https://firebase.google.com/pricing)

This extension uses other Firebase and Google Cloud Platform services, which have associated charges if you exceed the service’s no-cost tier:

- Cloud Firestore
- Cloud Functions (Node.js 10+ runtime. [See FAQs](https://firebase.google.com/support/faq#extensions-pricing))
