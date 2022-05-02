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
const wallet = await fdp.account.login('otherusername', 'mypassword', '0x.....')
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
console.log(pods) // prints list of user's pods
```

Creating a directory

```js
await fdp.directory.create('my-new-pod', 'my-dir')
```

Uploading data as a file into a pod

```js
await fdp.file.uploadData('my-new-pod', '/my-dir/myfile.txt', 'Hello world!')
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

## Maintainers

- [nugaon](https://github.com/nugaon)
- [IgorShadurin](https://github.com/IgorShadurin)

## License

[BSD-3-Clause](./LICENSE)
