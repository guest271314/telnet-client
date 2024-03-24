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
deno run -A deno_install.js
```

### Generate private and public keys, write to file system 

This only has to be done once. `generateWebCryptoKeys.js` can be run with `node`, `deno`, or `bun`.

```
node --experimental-default-type=module generateWebCryptoKeys.js
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
deno run --unstable-byonm -A index.js
```


### Build/rebuild `wbn-bundle.js` from `src/index.ts` with `bun`

```
try {
  console.log(
    await Bun.build({
      entrypoints: ["./src/index.ts"],
      outdir: ".",
      sourcemap: "external",
      splitting: false,
      target: "bun" // or "node"
      format: "esm",
      // minify: true,
      external: ["mime", "base32-encode", "wbn-sign-webcrypto", "wbn"],
      naming: {
        entry: "[dir]/wbn-bundle.[ext]",
      },
    }),
  );
} catch (e) {
  console.log(e);
}
```

### Dynamically build/rebuild `wbn-bundle.js` from `src/index.ts` with `esbuild` and run

```
// import bundleIsolatedWebApp from "./wbn-bundle.js";
import * as esbuild from "esbuild";

// Deno-specific workaround for dynamic imports. 
const dynamicImport = "./wbn-bundle.js";

await esbuild.build({
  entryPoints: ["src/index.ts"],
  platform: "node",
  outfile: dynamicImport,
  format: "esm",
  packages: "external",
  legalComments: "inline",
  sourcemap: true,
  bundle: true,
  keepNames: true,
  allowOverwrite: true,
});

// https://github.com/denoland/deno/issues/20945
// "" + "/path" and "/path" + "": Deno-specific workaround to avoid module not found error
 const { default: bundleIsolatedWebApp } = await import(dynamicImport);
```

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

Activate the notification which will prompt to save the generated WebRTC `RTCPeerConnection` SDP to the file `direct-socket-controller.sdp` in `Downloads` folder, click `Save`. Activate the second notification and select the `direct-socket-controller.sdp` file from `Downloads` folder. Click to save changes if prompted.

The calling Web page will create a WebRTC Data Channel, and pass the SDP to the Isolated Web App in a new `window` using `open()`, then exchange SDP with a WebRTC Data Channel in the Isolated Web App to facilitate bi-directional communication between the arbitrary Web page and the IWA where a `TCPSocket` communicates with a local (or remote) TCP server.

Watch for the `open` event of the WebRTC Data Channel connection between the IWA and the current Web page, then run something like the following which should print the values echoed back in uppercase


```
channel.send(encoder.encode("live")); // "LIVE" in channel.onmessage handler
```

The `direct-sockets` browser extension starts one of the above local TCP servers specified in `nm_tcpsocket.json`.

To close the TCP connection and the Isolated Web App `window` call `channel.close()`.

