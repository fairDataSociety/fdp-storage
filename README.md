# Fair Data Protocol (FDP)

> Typescript implementation of https://github.com/fairDataSociety/fairOS-dfs

**Warning: This project is in beta state. There might (and most probably will) be changes in the future to its API and working. Also, no guarantees can be made about its stability, efficiency, and security at this stage.**

## Table of Contents

- [Install](#install)
  - [npm](#npm)
  - [Use in Node.js](#use-in-nodejs)
  - [Use in a browser with browserify, webpack or any other bundler](#use-in-a-browser-with-browserify-webpack-or-any-other-bundler)
  - [Use in a browser Using a script tag](#use-in-a-browser-using-a-script-tag)
- [Usage](#usage)
- [API](#api)
- [Contribute](#contribute)
  - [Setup](#setup)
  - [Test](#test)
- [License](#license)

## Install

### npm

```sh
> npm install @fairdatasociety/fair-data-protocol --save
```

### yarn

```sh
> yarn add @fairdatasociety/fair-data-protocol
```

### Use in Node.js

**We require Node.js's version of at least 16.x**

```js
const FDP = require('@fairdatasociety/fair-data-protocol');
```

### Use in a browser with browserify, webpack or any other bundler

```js
const FDP = require('@fairdatasociety/fair-data-protocol');
```

### Use in a browser Using a script tag

Loading this module through a script tag will make the `fdp` object available in the global namespace.

```html
<script src="https://unpkg.com/@fairdatasociety/fair-data-protocol/dist/index.browser.min.js"></script>
```

## Usage

Creating FDP account

```js
import { FairDataProtocol } from '@fairdatasociety/fair-data-protocol'

const fdp = new FairDataProtocol('http://localhost:1633', 'http://localhost:1635')

const account = await fdp.account.register('myusername', 'mypassword')
console.log(account) // prints account information
```

Login with FDP account

```js
// before login, we need to enter the username of the account and the Ethereum address associated with it
await fdp.account.setUserAddress('otherusername', '0x.....')
const wallet = await fdp.account.login('otherusername', 'mypassword')
console.log(wallet) // prints downloaded and decrypted wallet
```

Getting list of pods

```js
const pods = await fdp.personalStorage.list()
console.log(pods) // prints list of user's pods
```

## Documentation

You can generate API docs locally with:

```sh
npm run docs
```

The generated docs can be viewed in browser by opening `./docs/index.html`

## Contribute

There are some ways you can make this module better:

- Consult our [open issues](https://github.com/fairDataSociety/fair-data-protocol/issues) and take on one of them
- Help our tests reach 100% coverage!

### Setup

Install project dependencies with

```sh
npm i
```

### Test

The tests run in both context: node and dom with Jest.

To run the integration tests, you need to use our [`bee-factory`](https://github.com/fairDataSociety/bee-factory/) project. Clone the repo, you can use our prebuilt Docker images with setting env. variables like:

```bash
export FAIROS_VERSION="0.7.3"
export BLOCKCHAIN_VERSION="1.2.0"
export BEE_ENV_PREFIX="swarm-test"
export BEE_IMAGE_PREFIX="docker.pkg.github.com/ethersphere/bee-factory"
```

Customize these values based on which FairOS version you want to run. After the env. variables are set use the `./scripts/environment.sh` script with `start --fairos` parameter.

If you want to skip creation of postage stamps every run of integration tests you can create stamps for both nodes and set them under env. variables `BEE_POSTAGE` and `BEE_PEER_POSTAGE`.

By default, for integration tests two bee nodes are expected to run on localhost on addresses `http://localhost:1633` and `http://localhost:1635`. These are the default values for the `bee-factory` script.
If you want to use custom setup, you can change the behavior of tests to different addresses using environment variables `BEE_API_URL`, `BEE_DEBUG_API_URL`, `BEE_PEER_DEBUG_API_URL` and `BEE_PEER_API_URL`.

In Visual Studio environment, the tests have been set up to run against your local bee node on `http://localhost:1633`
To run Jest tests, choose the `vscode-jest-tests` CI job under the Run tab.

There are also browser tests by Puppeteer, which also provide integrity testing.
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

## Maintainers

- [nugaon](https://github.com/nugaon)
- [IgorShadurin](https://github.com/IgorShadurin)

## License

[BSD-3-Clause](./LICENSE)
