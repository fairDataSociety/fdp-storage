import { RawDirectoryMetadata, RawFileMetadata } from '../pod/types';
/**
 * Combine passed parts of path to full path
 *
 * @param parts path parts to combine
 */
export declare function combine(...parts: string[]): string;
/**
 * Splits path to parts
 *
 * @param path absolute path
 */
export declare function getPathParts(path: string): string[];
/**
 * Join parts to path with removing a certain number of parts from the end
 *
 * @param parts parts of path
 * @param minusParts hom many parts should be removed
 */
export declare function getPathFromParts(parts: string[], minusParts?: number): string;
/**
 * Asserts that parts length is correct
 */
export declare function assertPartsLength(value: unknown): asserts value is string[];
/**
 * Asserts that directory name is correct
 */
export declare function assertDirectoryName(value: unknown): asserts value is string;
/**
 * Asserts that raw directory metadata is correct
 */
export declare function assertRawDirectoryMetadata(value: unknown): asserts value is RawDirectoryMetadata;
/**
 * Asserts that raw file metadata is correct
 */
export declare function assertRawFileMetadata(value: unknown): asserts value is RawFileMetadata;
/**
 * Raw directory metadata guard
 */
export declare function isRawDirectoryMetadata(value: unknown): value is RawDirectoryMetadata;
/**
 * Raw file metadata guard
 */
export declare function isRawFileMetadata(value: unknown): value is RawFileMetadata;
