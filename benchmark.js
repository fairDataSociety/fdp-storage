"use strict";
exports.__esModule = true;
exports.preparePrivateKey = exports.prepareEthAddress = exports.mnemonicToSeed = exports.privateKeyToBytes = exports.getWalletByIndex = void 0;
var ethers_1 = require("ethers");
var bee_js_1 = require("@ethersphere/bee-js");
var utils_1 = require("./src/account/utils");
/**
 * Get Hierarchal Deterministic Wallet from seed by index
 *
 * @param seed data for wallet creation
 * @param index wallet index
 */
function getWalletByIndex(seed, index) {
    var node = ethers_1.utils.HDNode.fromSeed(seed);
    return node.derivePath("m/44'/60'/0'/0/".concat(index));
}
exports.getWalletByIndex = getWalletByIndex;
/**
 * Converts string representation of private key to bytes representation
 *
 * @param privateKey string representation of private key
 */
function privateKeyToBytes(privateKey) {
    return bee_js_1.Utils.hexToBytes((0, utils_1.removeZeroFromHex)(privateKey));
}
exports.privateKeyToBytes = privateKeyToBytes;
/**
 * Converts mnemonic to seed bytes
 *
 * @param mnemonic mnemonic phrase
 */
function mnemonicToSeed(mnemonic) {
    return bee_js_1.Utils.hexToBytes((0, utils_1.removeZeroFromHex)(ethers_1.utils.mnemonicToSeed(mnemonic)));
}
exports.mnemonicToSeed = mnemonicToSeed;
/**
 * Converts string to Ethereum address in form of bytes
 *
 * @param address Ethereum address for preparation
 */
function prepareEthAddress(address) {
    return bee_js_1.Utils.makeEthAddress(address);
}
exports.prepareEthAddress = prepareEthAddress;
/**
 * Converts private key from to bytes
 *
 * @param privateKey string representation of private key
 */
function preparePrivateKey(privateKey) {
    return bee_js_1.Utils.hexToBytes((0, utils_1.removeZeroFromHex)(privateKey));
}
exports.preparePrivateKey = preparePrivateKey;
var benny_1 = require("benny");
benny_1["default"].suite('Prepare address vs initial calculated variable', benny_1["default"].add('Calculate prepareEthAddress', function () {
    prepareEthAddress('0x0000000000000000000000000000000000000000');
}), benny_1["default"].add('Initialized prepareEthAddress variable', function () {
    var prepareEthAddress = '0x0000000000000000000000000000000000000000';
}), benny_1["default"].cycle(), benny_1["default"].complete(), benny_1["default"].save({ file: 'reduce', version: '1.0.0' }), benny_1["default"].save({ file: 'reduce', format: 'chart.html' }));
