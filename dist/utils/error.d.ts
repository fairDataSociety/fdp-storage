export declare class BeeError extends Error {
    constructor(message: string);
}
export declare class BeeArgumentError extends BeeError {
    readonly value: unknown;
    constructor(message: string, value: unknown);
}
export declare class BeeResponseError extends BeeError {
    readonly status: number;
    constructor(status: number, message: string);
}
