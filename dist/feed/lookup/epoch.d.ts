import { Utils } from '@ethersphere/bee-js';
declare const EPOCH_LENGTH = 8;
export declare const HIGHEST_LEVEL = 31;
export declare const LOWEST_LEVEL = 0;
export declare type EpochID = Utils.Bytes<typeof EPOCH_LENGTH>;
/**
 * Calculates base time in form of number
 *
 * @param time unix timestamp parameter for calculation
 * @param level level parameter for calculation
 */
export declare function getBaseTime(time: number, level: number): number;
/**
 * Creates instance of `Epoch` where the first update should be located based on what time is passed
 */
export declare function getFirstEpoch(time: number): Epoch;
/**
 * An epoch represents a concrete time period starting at a specific point in time, called
 * the epoch base time and has a specific length. Period lengths are expressed as powers
 * of 2 in seconds. The shortest period is 20^0 = 1 second, the longest is 2^31 seconds
 */
export declare class Epoch {
    level: number;
    time: number;
    /**
     * Create en Epoch instance
     *
     * @param level level that identify a specific epoch
     * @param time time that identify a specific epoch
     */
    constructor(level: number, time: number);
    /**
     * Calculates base time in form of number for `level` and `time`
     *
     * @returns result number
     */
    base(): number;
    /**
     * Packs time and level into an array of bytes
     *
     * @returns array of bytes with time and level
     */
    id(): EpochID;
    /**
     * Checks if two epochs are equal
     *
     * @param epoch epoch to compare
     */
    equals(epoch: Epoch): boolean;
    /**
     * Calculates the first nonzero bit of the XOR of base and 'time', counting from the highest significant bit
     * but limited to not return a level that is smaller than the base-1
     *
     * @return the frequency level a next update should be placed at, provided where the last update was and what time it is now
     */
    getNextLevel(time: number): number;
    /**
     * Calculates the next epoch based on the current level and the new time
     *
     * @param time new time
     */
    getNextEpoch(time: number): Epoch;
}
export {};
