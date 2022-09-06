[![Release Github](https://github.com/fairDataSociety/fdp-storage/actions/workflows/release_github.yaml/badge.svg?branch=master)](https://github.com/fairDataSociety/fdp-storage/actions/workflows/release_github.yaml)

# Fair Data Protocol Storage

> Typescript implementation of https://github.com/fairDataSociety/fairOS-dfs

**Warning: This project is in beta state. There might (and most probably will) be changes in the future to its API and working. Also, no guarantees can be made about its stability, efficiency, and security at this stage.**

## Table of Contents

- [Install](#install)
  - [npm](#npm)
  - [yarn](#yarn)
  - [Use in Node.js](#use-in-nodejs-and-browser)
  - [Use in a browser using a script tag](#use-in-a-browser-using-a-script-tag)
  - [Use in React Native](#use-in-react-native)
- [Usage](#usage)
- [Contribute](#contribute)
  - [Setup](#setup)
  - [Test](#test)
  - [Compile code](#compile-code)
  - [System environment](#system-environment)
- [License](#license)

## Install

### npm

```sh
npm install @fairdatasociety/fdp-storage
```

### yarn

```sh
yarn add @fairdatasociety/fdp-storage
```

### Use in Node.js and browser

**We require Node.js's version of at least 16.x**

```js
const FDP = require('@fairdatasociety/fdp-storage');
```

### Use in a browser using a script tag

Loading this module through a script tag will make the `fdp` object available in the global namespace.

```html
<script src="https://unpkg.com/@fairdatasociety/fdp-storage/dist/index.browser.min.js"></script>
```

### Use in React Native

FDP Storage is ready to work with React Native. But a few shims need to be added to the initialization script of your project to make the library components work.

```js
import 'react-native-url-polyfill/auto' // for bee-js. URL polyfill
import 'react-native-get-random-values' // for ethers.js cryptography
import '@ethersproject/shims' // commong shims for ethers.js
import 'text-encoding' // for fdp-storage to make TextEncoding work
```

## Usage

Creating FDP account

```js
import { FdpStorage } from '@fairdatasociety/fdp-storage'

const batchId = 'GET_BATCH_ID_FROM_YOUR_NODE' // fill it with batch id from your Bee node
const fdp = new FdpStorage('http://localhost:1633', batchId)
const wallet = fdp.account.createWallet() // after creating a wallet, the user must top up its balance before registration
await fdp.account.register('myusername', 'mypassword')
```

Login with FDP account

```js
const wallet = await fdp.account.login('otherusername', 'mypassword')
console.log(wallet) // prints downloaded and decrypted wallet
```

Creating a pod

```js
const pod = await fdp.personalStorage.create('my-new-pod')
console.log(pods) // prints info about created pod
```

Getting list of pods

```js
const pods = await fdp.personalStorage.list()
console.log(pods.getPods()) // prints list of user's pods
console.log(pods.getSharedPods()) // prints list of pods that a user has added to their account
```

Sharing a pod

```js
const shareReference = await fdp.personalStorage.share('my-new-pod')
console.log(shareReference) // prints share reference of a pod
```

Getting information about shared pod

```js
await fdp.personalStorage.getSharedInfo(shareReference)
```

Saving shared pod under user's account

```js
await fdp.personalStorage.saveShared(shareReference)
```

Creating a directory

```js
await fdp.directory.create('my-new-pod', '/my-dir')
```

Deleting a directory

```js
await fdp.directory.delete('my-new-pod', '/my-dir')
```

Uploading data as a file into a pod

```js
await fdp.file.uploadData('my-new-pod', '/my-dir/myfile.txt', 'Hello world!')
```

Deleting a file from a pod

```js
await fdp.file.delete('my-new-pod', '/my-dir/myfile.txt')
```

Sharing a file from a pod

```js
const shareReference = await fdp.file.share('my-new-pod', '/my-dir/myfile.txt')
console.log(shareReference) // prints share reference of a file
```

Get information about shared file

```js
await fdp.file.getSharedInfo(shareReference)
```

Save shared file to a pod

```js
await fdp.file.saveShared('my-new-pod', '/', shareReference)
```

Getting list of files and directories with recursion or not

```js
// with recursion
const list = await fdp.directory.read('my-new-pod', '/', true)
// without recursion
await fdp.directory.read('my-new-pod', '/')
console.log(list) // prints list of files and directories
```

Downloading data from a file path

```js
const data = await fdp.file.downloadData('my-new-pod', '/myfile.txt')
console.log(data.text()) // prints data content in text format 'Hello world!'

```

Deleting a pod

```js
await fdp.personalStorage.delete('my-new-pod')
```

### Migrate from v1 to v2 account

Export old wallet with mnemonic

```js
const wallet = await fdp.account.exportWallet('oldusername', 'oldpassword', {
  mnemonic: 'one two three one two three one two three one two three'
})
```

or with address

```js
const wallet = await fdp.account.exportWallet('oldusername', 'oldpassword', {
  address: '0x...'
})
```

```js
// ask user to top up his account, then can be started the migration process
await fdp.account.migrate('oldusername', 'oldpassword', {
  mnemonic: wallet.mnemonic.phrase
})
```

## Documentation

You can generate API docs locally with:

```sh
npm run docs
```

The generated docs can be viewed in browser by opening `./docs/index.html`

## Contribute

There are some ways you can make this module better:

- Consult our [open issues](https://github.com/fairDataSociety/fdp-storage/issues) and take on one of them
- Help our tests reach 100% coverage!

### Setup

Install project dependencies with

```sh
npm ci
```

### Test

The tests run in both context: Jest and Puppeteer.

To run the integration tests, you need to use our [`bee-factory`](https://github.com/fairDataSociety/bee-factory/) project. Clone the repo, you can use our prebuilt Docker images with setting .env variables.

Customize .env values based on which FairOS version you want to run. After the .env variables are set use the `./scripts/environment.sh` script with `start --fairos` parameter.

There are browser tests by Puppeteer, which also provide integrity testing.

```sh
npm run test:browser
```

The test HTML file which Puppeteer uses is the [test/testpage/testpage.html](test/testpage/testpage.html).
To open and manually test FDP with developer console, it is necessary to build the library first with `npm run compile:browser` (running the browser tests `npm run test:browser` also builds the library).

### Compile code

In order to compile NodeJS code run

`npm run compile:node`

or for Browsers

`npm run compile:browser`

### System environment

With specific system environment variables you can alter the behaviour of the tests.

* `BEE_API_URL` - API URL of Bee client
* `BEE_DEBUG_API_URL` - Debug API URL of Bee client
* `BEE_BATCH_ID` - Batch ID for data uploading
* `FAIROS_API_URL` - FairOS API URL

## Maintainers

- [nugaon](https://github.com/nugaon)
- [IgorShadurin](https://github.com/IgorShadurin)

## License

[BSD-3-Clause](./LICENSE)
