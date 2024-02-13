## Version 0.1.5
- Fix: minor typo correction.

## Version 0.1.4

- Fix: remove server response caching, which caused links to not be updated in time.
- Feat: add parameter `minInstances` to allow increasing links loading speed.
- Feat: add paramter `androidSchema` to support Android intent links with custom schema.
- Chore: if both `redirectToStore` and `redirectUrl` are set, the latter will apply to all unsupported platforms (e.g. Web)
- Docs: improve documentation.

## Version 0.1.3

- Allow links to have multi-level path parameters (i.e. /posts/story/234551)
- Breaking change: links paths should start with a backslash.

## Version 0.1.2

- Initial Version
