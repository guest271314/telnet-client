## Synposis

Dynamically create an [Isolated Web App](https://github.com/WICG/isolated-web-apps/blob/main/README.md) to use [Direct Sockets API](https://wicg.github.io/direct-sockets/).

- Substitute Web Cryptography API ([wbn-sign-webcrypto](https://github.com/guest271314/wbn-sign-webcrypto)) for `node:crypto` implementation of Ed25519 algorithm 
- Install and run same JavaScript source code in different JavaScript runtimes, e.g., `node`, `deno`, `bun`
- TODO: Create Signed Web Bundle and Isolated Web App in the browser

## Building

### Fetch dependencies

Creates a `node_modules` folder containing dependencies

```
bun install
```

or 

```
npm install
```

or 

```
deno add npm:wbn
```

### Generate private and public keys, write to file system 

This only has to be done once. `generateWebCryptoKeys.js` can be run with `node`, `deno`, or `bun`.

```
bun run generateWebCryptoKeys.js
```

### Build the Signed Web Bundle and Isolated Web App


Entry point is `assets` directory; contains `manifest.webmanifest`, `index.html`, `script.js` and any other scripts or resources to be bundled. 

Write `signed.swbn` to current directory, and write the generated Signed Web Bundle `isolated-app:` ID to `direct-socket-controller.js` in `direct-sockets` extension folder.

Node.js

```
node --experimental-default-type=module index.js
```
Bun
```
bun run index.js
```
Deno
```
 deno -A --unstable-byonm index.js
```

### Dynamically fetch dependencies and create `node_module` folder and create the `.swbn` file and IWA

```
deno -A --import-map=import-map.json --unstable-byonm index.js
```

### Build/rebuild `wbn-bundle.js` from `webbundle-plugins/packages/rollup-plugin-webbundle/src/index.ts` with `bun`


1. `git clone https://github.com/GoogleChromeLabs/webbundle-plugins`
2. `cd webbundle-plugins/packages/rollup-plugin-webbundle`
3. `bun install -p`
4. In `src/index.ts` comment line 18, `: EnforcedPlugin`, line 32 `const opts = await getValidatedOptionsWithDefaults(rawOpts);` and lines 65-121, because I will not be using Rollup
5. Bundle with Bun `bun build --target=node --format=esm --sourcemap=none --outfile=webpackage-bundle.js ./webbundle-plugins/packages/rollup-plugin-webbundle/src/index.ts`
6. Create reference to Web Cryptography API that will be used in the code in the bundled script instead of `node:crypto` directly `import { webcrypto } from "node:crypto";`
7. In `/node_modules/wbn-sign/lib/utils/utils.js` use `switch (key.algorithm.name) {`
8. `getRawPublicKey` becomes an `async` function for substituting `const exportedKey = await webcrypto.subtle.exportKey("spki", publicKey);` for `publicKey.export({ type: "spki", format: "der" });`
9. In `/node_modules/wbn-sign/lib/signers/integrity-block-signer.js` use `const publicKey = await signingStrategy.getPublicKey();` and `[getPublicKeyAttributeName(publicKey)]: await getRawPublicKey(publicKey)`; `verifySignature()` also becomes an `async` function where `const algorithm = { name: "Ed25519" }; const isVerified = await webcrypto.subtle.verify(algorithm, publicKey, signature, data);` is substituted for `const isVerified = crypto2.verify(undefined, data, publicKey, signature);`
10. In `/node_modules/wbn-sign/lib/web-bundle-id.js` `serialize()` function becomes `async` for `return base32Encode(new Uint8Array([...await getRawPublicKey(this.key), ...this.typeSuffix]), "RFC4648", { padding: false }).toLowerCase();`; and `serializeWithIsolatedWebAppOrigin()` becomes an `async` function for `return ${this.scheme}${await this.serialize()}/;`; `toString()` becomes an `async` function for `return Web Bundle ID: ${await this.serialize()} Isolated Web App Origin: ${await this.serializeWithIsolatedWebAppOrigin()};`
11. In `src/index.ts` `export {WebBundleId, bundleIsolatedWebApp};`
12. In `index.js`, the entry point for how I am creating the SWBN and IWA I get the public and private keys created with Web Cryptography API, and use Web Cryptography API to sign and verify

## Installation of browser extension and Native Messaging host on Chrome and Chromium

1. Navigate to `chrome://extensions`.
2. Toggle `Developer mode`.
3. Click `Load unpacked`.
4. Select `direct-sockets` folder.
5. Note the generated extension ID.
6. Open `nm_tcpsocket.json` in a text editor, set `"path"` to absolute path of [Deno](https://github.com/denoland/deno) `deno_echo_tcp.js`, [txiki.js](https://github.com/saghul/txiki.js) `txikijs_echo_tcp.js`, [Bun](https://github.com/oven-sh/bun) `bun_echo_tcp.js`, and [Node.js](https://github.com/nodejs/node) TCP servers `node_echo_tcp.js`, and set `"allowed_origins"` array value to `chrome-extension://<ID>/` using ID from 5 . 
7. Copy the `nm_tcpsocket.json` file to Chrome or Chromium configuration folder, e.g., on Chromium on Linux `~/.config/chromium/NativeMessagingHosts`.
8. Make sure the TCP echo server `*.js` file is executable.

## Usage 
To launch the IWA `window` from an arbitrary Web page run the code in `/direct-sockets/direct-socket-controller.js` in DevTools `console` or Snippets.

We could recently open the IWA `window` from arbitrary Web sites in DevTools `console` or Snippets with 

```
var iwa = open("isolated-app://<IWA_ID>");
```

[iwa: Mark isolated-app: as being handled by Chrome](https://chromium-review.googlesource.com/c/chromium/src/+/5466063) evidently had the side effect of blocking that capability, see [window.open("isolated-app://<ID>") is blocked](https://issues.chromium.org/issues/339994757#comment6). [isolated-web-app-utilities](https://github.com/guest271314/isolated-web-app-utilities) provides approaches to open the IWA window from arbitrary Web sites, `chrome:`, `chrome-extension:` URL's.

Activate the notification which will prompt to save the generated WebRTC `RTCPeerConnection` SDP to the file `direct-socket-controller.sdp` in `Downloads` folder, click `Save`. Activate the second notification and select the `direct-socket-controller.sdp` file from `Downloads` folder. Click to save changes if prompted.

The calling Web page will create a WebRTC Data Channel, and pass the SDP to the Isolated Web App in a new `window` using `open()`, then exchange SDP with a WebRTC Data Channel in the Isolated Web App to facilitate bi-directional communication between the arbitrary Web page and the IWA where a `TCPSocket` communicates with a local (or remote) TCP server.

Watch for the `open` event of the WebRTC Data Channel connection between the IWA and the current Web page, then run something like the following which should print the values echoed back in uppercase


```
channel.send(encoder.encode("live")); // "LIVE" in channel.onmessage handler
```

The `direct-sockets` browser extension starts one of the above local TCP servers specified in `nm_tcpsocket.json`.

To close the TCP connection and the Isolated Web App `window` call `channel.close()`.

