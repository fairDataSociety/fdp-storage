import {Data} from '@ethersphere/bee-js/dist/src/types'
import {decrypt} from "./encryption";
import {wrapBytesWithHelpers} from "../utils/bytes";
import {sha3_256} from "js-sha3";
import {hexToBytes} from "../utils/hex";

export class Wallet {
  encryptedmnemonic: Data

  constructor(encryptedmnemonic: Data) {
    this.encryptedmnemonic = encryptedmnemonic
  }

  decryptMnemonic(password: string): string {
    const aesKey = hexToBytes(sha3_256(new TextEncoder().encode(password)))

    return decrypt(wrapBytesWithHelpers(aesKey), this.encryptedmnemonic)
  }
}
