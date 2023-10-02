<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/jauntybrain/flow-links-extension/assets/105740958/0484ed43-a8bc-4958-abd6-eb998f0a70ae">
    <img width="400px" src="https://github.com/jauntybrain/flow-links-extension/assets/105740958/35d91f07-1d89-46ba-8461-a4fbe3cc6f2a">
  </picture>
</p>

# FlowLinks - Dynamic Links Replacement

**Author**: JauntyBrain ([https://www.jauntybrain.com](https://www.jauntybrain.com))

**Install**: Follow [this link](https://console.firebase.google.com/project/_/extensions/install?ref=jauntybrain/flow-links).

**Description**: A powerful replacement for the Dynamic Links service that provides similar functionality.


---

Missing a feature or found a bug? Feel free to submit a [bug report or a feature request](https://github.com/jauntybrain/flow-links-extension/issues). Pull requests are always welcome!

### Installation: Firebase CLI

```bash
firebase ext:install jauntybrain/flow-links --project=<your-project-id>
```


---

### Details

The Flow Links Extension offers a powerful replacement for the [retiring Dynamic Links](https://firebase.google.com/support/dynamic-links-faq) service and provides similar functionality.

This extension allows you to create **Flow Links** - deep links that work on both iOS and Android platforms.

Upon installation, a new **Firebase Hosting** website & domain are automatically created to handle link functionality.

Newly created links are stored in a **Cloud Firestore** collection.

A friendly-UI **Dashboard** for Flow Links creation and management is currently under development.

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
