export enum HSState {
    TAG_BIT,
    YIELD_LITERAL,
    BACKREF_INDEX_MSB,
    BACKREF_INDEX_LSB,
    BACKREF_COUNT_MSB,
    BACKREF_COUNT_LSB,
    YIELD_BACKREF
}

export interface HSBitstreamState {
    size: number
    index: number
    currentByte: number
    bitIndex: number
}

/**
 * All errors thrown by the heatshrink-ts package will inherit from
 * this class.  Different subclasses are thrown for different kinds of
 * errors.  All errors have a string message that indicates what exactly
 * went wrong.
 *
 * @category Errors
 */
export class HSError extends Error {}

/**
 * The heatshrink engine has been misconfigured.
 *
 * @category Errors
 */
export class HSConfigError extends HSError {}

export class HSInternalError extends HSError {}

export class HSCorruptDataError extends HSError {}

export const HS_MIN_WINDOW_BITS: number = 4
export const HS_MAX_WINDOW_BITS: number = 15
export const HS_MIN_LOOKAHEAD_BITS: number = 3

export const HS_LITERAL_MARKER: number = 0x01
export const HS_BACKREF_MARKER: number = 0x00

export const HS_NOBITS: number = -1
