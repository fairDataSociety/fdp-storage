import { Pod } from './types';
import { Utils } from '@ethersphere/bee-js';
import { HDNode } from 'ethers/lib/utils';


export interface PodEnvironment {
  pod: Pod;
  podAddress: Utils.EthAddress;
  podWallet: HDNode;
  lookupAnswer: any;
}
