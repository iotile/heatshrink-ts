/**
 * @module heatshrink-utils
 * @external
 * @preferred
 *
 * This internal module contains private utility functions that are used inside
 * the heatshrink-ts package.  They are not meant to be used externally nor are
 * they externally visible.
 */

import { HSBitstreamState, HSInternalError, HS_NOBITS } from './heatshrink-basic'

/**
 * Get a specific number of bits from the input buffer.  You can get between
 * 1 and 15 bits at a time and those bits are popped from the input buffer and
 * returned.  If there are not enough bits remaining in buffer according to the
 * state information in state, then HS_NOBITS is returned as a sentinal value
 * and no bits are consumed from teh buffer.
 *
 * @param count The number of bits to return, must be in the range [1, 15]
 * @param state The current state of the input bitstream.  This parameter is
 *    modified with every invocation of this function to maintain state between
 *    calls.
 * @param buffer A buffer of input data that will be used to retrieve a fixed
 *    number of bits.  This parameter is never modified.  The state of what
 *    bits have and have not been extracted is stored in the state parameter.
 * @returns The bits that were popped from the input buffer.  If there are not
 *    enough bits left in the buffer then HS_NOBITS is returned and state is left
 *    unchanged.
 */
export function getBits(count: number, buffer: Uint8Array, state: HSBitstreamState): number {
    if (count > 15) {
        throw new HSInternalError(
            `getBits called with invalid number of bits requested (${count} not in [1, 15])`
        )
    }

    /*
     * Make sure that we have enough available bits to satisfy this call.  There are two cases where
     * we could fail to have enough bits:
     * 1. We are on the last byte and there are fewer bits left than count
     * 2. We are on the penultimate byte and there are fewers bits left in the byte than count - 8
     *    so that when we move to the next byte 
     */
    if (state.size === 0 && state.bitIndex < 1 << (count - 1)) {
        return HS_NOBITS
    } else if (state.size - state.index === 1 && count > 8) {
        let requiredBitmask = 1 << (count - 8 - 1)
        if (state.bitIndex < requiredBitmask) {
            return HS_NOBITS
        }
    }

    let accum: number = 0

    for (let i = 0; i < count; ++i) {
        if (state.bitIndex === 0 && state.size === 0) {
            return HS_NOBITS
        }

        if (state.bitIndex === 0) {
            state.currentByte = buffer[state.index]
            state.index += 1

            // Keep track of when the inputBuffer is used up and mark it as empty again
            if (state.index === state.size) {
                state.index = 0
                state.size = 0
            }

            state.bitIndex = 1 << 7
        }

        accum <<= 1
        if (state.currentByte & state.bitIndex) {
            accum |= 1
        }

        state.bitIndex >>= 1
    }

    return accum
}
