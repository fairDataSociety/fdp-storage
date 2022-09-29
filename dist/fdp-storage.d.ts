import { BatchId } from '@ethersphere/bee-js';
import { AccountData } from './account/account-data';
import { PersonalStorage } from './pod/personal-storage';
import { Connection } from './connection/connection';
import { Options } from './types';
import { Directory } from './directory/directory';
import { File } from './file/file';
import { ENS } from '@fairdatasociety/fdp-contracts';
export declare class FdpStorage {
    readonly connection: Connection;
    readonly account: AccountData;
    readonly personalStorage: PersonalStorage;
    readonly directory: Directory;
    readonly file: File;
    readonly ens: ENS;
    constructor(beeUrl: string, postageBatchId: BatchId, options?: Options);
}
