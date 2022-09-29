import { Utils } from '@ethersphere/bee-js';
/**
 * Calculates swarm reference with passed params
 *
 * @param topic identification of content
 * @param time time in epoch for content
 * @param level level in epoch for content
 * @returns swarm reference
 */
export declare function getId(topic: Utils.Bytes<32>, time?: number, level?: number): Utils.Bytes<32>;
