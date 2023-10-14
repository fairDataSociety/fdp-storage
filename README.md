[![Release Github](https://github.com/fairDataSociety/fdp-storage/actions/workflows/release_github.yaml/badge.svg?branch=master)](https://github.com/fairDataSociety/fdp-storage/actions/workflows/release_github.yaml)

# Fair Data Protocol Storage

**FDP Storage** is a serverless web3 filesystem for organizing users' personal data implemented in Typescript.

Such data is stored using certain structures that allow the data created in one dApp to be interpreted in another dApp. The current implementation allows to create and manage pods (similar to disks in file systems), directories, and files.

The library requires the API endpoint of a [Bee](https://github.com/ethersphere/bee) node to interact with the data. If you plan to do write operations, you will need to specify [postage batch id](https://docs.ethswarm.org/docs/access-the-swarm/keep-your-data-alive).
To run a local test node trying out the functionalities, you can use [FDP Play](https://github.com/fairDataSociety/fdp-play).

The FDP Storage user account is a wallet based on the [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki) mnemonic phrase from which one can create a portable account allowing retrieving the wallet from anywhere by providing a username and a password to the library.

The library can work in the browser, in Node.js and in mobile applications using [React Native](https://reactnative.dev/). There is an implementation of Personal Storage in Golang: https://github.com/fairDataSociety/fairOS-dfs

Project development plans and details of how each of the parts works can be found in [FIPs](https://github.com/fairDataSociety/FIPs). In this repository, you can create your proposal, which will be considered and taken into account in further development.

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

After creating instance of `FdpStorage` replace `bee-js` upload method to the new one because of bug [#757](https://github.com/ethersphere/bee-js/issues/757).

```js
const fdp = new FdpStorage('https://localhost:1633', batchId)

fdp.connection.bee.uploadData = async (batchId, data) => {
  return (await fetch(fdp.connection.bee.url + '/bytes', {
    method: 'POST',
    headers: {
      'swarm-postage-batch-id': batchId,
      'swarm-encrypt': true,
      'swarm-pin': true,
    },
    body: data
  })).json()
}
```

## Usage

Creating FDP account

```js
import { FdpStorage } from '@fairdatasociety/fdp-storage'

const batchId = 'GET_BATCH_ID_FROM_YOUR_NODE' // fill it with batch id from your Bee node
const fdp = new FdpStorage('http://localhost:1633', batchId)
const wallet = fdp.account.createWallet() // after creating a wallet, the user must top up its balance before registration
// Associate the created wallet with the username in the smart contract.
// This method makes the account portable.
// Seed is saved encrypted in Swarm.
// Registration is performed in two steps, first create a registration object
const registrationRequest = fdp.account.createRegistrationRequest('myusername', 'mypassword')
// Then pass this object to the register method
await fdp.account.register(registrationRequest)
// If registration fails, it can be safely retried by passing the same object again

// If necessary, the account can be re-uploaded to Swarm.
await fdp.personalStorage.reuploadPortableAccount('username', 'password')
```

Login with FDP account

```js
const wallet = await fdp.account.login('otherusername', 'mypassword')
console.log(wallet) // prints downloaded and decrypted wallet
```

Creating and using a user without interacting with the blockchain

It is not necessary to register a user in a smart contract and make his wallet portable. You can create a wallet, save the mnemonic phrase locally and import this account to interact with all the data.

```js
// Create a wallet for interacting with data.
// It does not need to be funded.
// Operations in the blockchain will not pass through it.
const wallet = fdp.account.createWallet()

// Get mnemonic phrase of the account.
// This is the key to all data in FDP Storage.
// You need to store in a safe place.
const mnemonic = wallet.mnemonic.phrase

// to access your account, you need to import the phrase
fdp.account.setAccountFromMnemonic(mnemonic)
```

Creating a pod

```js
const pod = await fdp.personalStorage.create('my-new-pod')
console.log(pod) // prints info about created pod
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

Upload an entire directory with files in Node.js

```js
// `recursively: false` will upload only files in passed directory
// `recursively: true` will find all files recursively in nested directories and upload them to the network
await fdp.directory.upload('my-new-pod', '/Users/fdp/MY_LOCAL_DIRECTORY', { isRecursive: true })
```

Upload an entire directory with files in browser.

Create input element with `webkitdirectory` property. With this property entire directory can be chosen instead of a file.

```html
<input type="file" id="upload-directory" webkitdirectory/>
```

```js
// getting list of files in a directory
const files = document.getElementById('upload-directory').files
// `recursively: false` will upload only files in passed directory
// `recursively: true` will find all files recursively in nested directories and upload them to the network
await fdp.directory.upload('my-new-pod', files, { isRecursive: true })
```

Uploading data as a file into a pod

```js
await fdp.file.uploadData('my-new-pod', '/my-dir/myfile.txt', 'Hello world!')

// you can also track the progress of data upload
// using the callback, you can track not only the progress of uploaded blocks but also other time-consuming operations required for data upload
await fdp.file.uploadData('my-new-pod', '/my-dir/myfile.txt', 'Hello world!', {
  progressCallback: event => {
    console.log(event)
  }
})
```

Data can also be uploaded block by block, even without an FDP account. Each block will be secured by a Swarm node. Later, with an FDP account, the data can be finalized in the form of a file.
```js
const data = '123'
const blockSize = 1 // recommended value is 1000000 bytes
const blocksCount = 3
const blocks = []
for (let i = 0; i < blocksCount; i++) {
  const dataBlock = getDataBlock(data, blockSize, i)
  // fdp instance with or without logged in user
  blocks.push(await fdp.file.uploadDataBlock(dataBlock, i))
}

// fdp instance with logged in user
const fileMeta = await fdp.file.uploadData(pod, fullPath, blocks)
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

// you can also track the progress of data download
// using the callback, you can track not only the progress of downloaded blocks but also other time-consuming operations required for data download
await fdp.file.downloadData('my-new-pod', '/myfile.txt', {
  progressCallback: event => {
    console.log(event)
  }
})
```

Deleting a pod

```js
await fdp.personalStorage.delete('my-new-pod')
```

Checks whether the public key associated with the username in ENS is identical with the wallet's public key

```js
await fdp.account.isPublicKeyEqual('username')
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

Using FDP instance with cache

```js
const fdpCache = new FdpStorage('https://localhost:1633', batchId, {
  cacheOptions: {
    isUseCache: true,
    onSaveCache: async cacheObject => {
      const cache = JSON.stringify(cacheObject)
      console.log('cache updated', cache)
    },
  }
})
```

Recovering FDP instance with saved cache

```js
const fdpCache = new FdpStorage('https://localhost:1633', batchId, {
  cacheOptions: {
    isUseCache: true,
  }
})
fdpCache.cache.object = JSON.parse(cache)
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

To run the integration tests, you need to use our [`fdp-play`](https://github.com/fairDataSociety/fdp-play) project.

With specific system environment variables you can alter the behaviour of the tests.

* `BEE_API_URL` - API URL of Bee client
* `BEE_DEBUG_API_URL` - Debug API URL of Bee client
* `BEE_BATCH_ID` - Batch ID for data uploading
* `FAIROS_API_URL` - FairOS API URL

There are browser tests by Puppeteer, which also provide integrity testing.

To run the tests for this project, you can use the following commands:

```sh
# to run all tests
npm run test

# to run node tests
npm run test:node

# to run FairOS-dfs integration tests
npm run test:fairos

# to run unit tests
npm run test:unit

# to run browser tests
npm run test:browser
```

The test HTML file which Puppeteer uses is the [test/integration/testpage/testpage.html](test/integration/testpage/testpage.html).
To open and manually test FDP with developer console, it is necessary to build the library first with `npm run compile:browser` (running the browser tests `npm run test:browser` also builds the library).

### Compile code

In order to compile NodeJS code run

`npm run compile:node`

or for Browsers

`npm run compile:browser`

## Maintainers

- [nugaon](https://github.com/nugaon)
- [IgorShadurin](https://github.com/IgorShadurin)

## License

[BSD-3-Clause](./LICENSE)
