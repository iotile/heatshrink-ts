import {
    HSState,
    HSBitstreamState,
    HSCorruptDataError,
    HSConfigError,
    HSInternalError,
    HS_LITERAL_MARKER,
    HS_MIN_LOOKAHEAD_BITS,
    HS_MIN_WINDOW_BITS,
    HS_MAX_WINDOW_BITS,
    HS_NOBITS
} from "./heatshrink-basic";
import { getBits } from "./heatshrink-utils";

/**
 * A typescript implementation of the heatshrink compression library.
 *
 * Heatshrink is an open-source LZSS based compression library suitable
 * for use in embedded systems since it has a very small and bounded
 * memory footprint.  This is an adaptation of the heatshink code to
 * typescript with a slightly more user-fiendly API.
 */
export class HeatshrinkDecoder {
    public inputBuffer: Uint8Array;

    public outputBuffer: Uint8Array;
    public outputSize: number = 0;

    private windowBuffer: Uint8Array;

    private headIndex: number = 0;
    private outputIndex: number = 0;
    private outputCount: number = 0;

    private state: HSState = HSState.TAG_BIT;

    private inputState: HSBitstreamState = {
        size: 0,
        index: 0,
        currentByte: 0,
        bitIndex: 0
    };

    private windowBits: number;
    private lookaheadBits: number;

    constructor(windowBits: number, lookaheadBits: number, inputBufferSize: number) {
        if (lookaheadBits >= windowBits) {
            throw new HSConfigError(
                `Invalid lookahead size (${lookaheadBits}) that is not smaller than the specified window ${windowBits}`
            );
        } else if (lookaheadBits <= 0 || windowBits <= 0 || inputBufferSize <= 0) {
            throw new HSConfigError(
                `Invalid lookahead (${lookaheadBits}), window (${windowBits}) or input (${inputBufferSize}) size that must be greater than 0`
            );
        } else if (windowBits < HS_MIN_WINDOW_BITS || windowBits > HS_MAX_WINDOW_BITS) {
            throw new HSConfigError(
                `Invalid window bit size that is not in [${HS_MIN_WINDOW_BITS}, ${HS_MAX_WINDOW_BITS}]`
            );
        }

        this.windowBits = windowBits;
        this.lookaheadBits = lookaheadBits;

        this.inputBuffer = new Uint8Array(inputBufferSize);
        this.outputBuffer = new Uint8Array(0);
        this.windowBuffer = new Uint8Array(Math.pow(2, this.windowBits));

        this.reset();
    }

    public reset() {
        this.inputState = {
            size: 0,
            index: 0,
            currentByte: 0,
            bitIndex: 0
        };

        this.state = HSState.TAG_BIT;
        this.headIndex = 0;
        this.outputIndex = 0;
        this.outputCount = 0;
        this.outputSize = 0;

        this.inputBuffer.fill(0);
        this.windowBuffer.fill(0);
        this.outputBuffer.fill(0);
    }

    /**
     * Feed data into the heatshrink decoder state machine.
     *
     * This function will take the chunk of input data and turn it into as
     * much expanded output as it can.  Decoding a stream of data should be
     * done by calling this function repeatedly with chunks of data from the
     * stream.
     *
     * You can call isFinished() to check and see if all of the data that you
     * have fed in from previous calls to process() has been successfully
     * decoded.
     *
     * @param rawInput A chunk of data that has encoded using the heatshrink
     *      library.  You can push data a little bit at a time and stop at
     *      any byte boundary.
     */
    public process(rawInput: Uint8Array | ArrayBuffer) {
        let input: Uint8Array = this.assureUint8Array(rawInput);

        while (input.byteLength > 0) {
            let remaining = this.sink(input);
            this.poll();

            input = input.slice(input.byteLength - remaining);
        }
    }

    public sink(input: Uint8Array): number {
        let remaining = this.inputBuffer.byteLength - this.inputState.size;
        let copySize = input.byteLength;

        if (copySize > remaining) {
            copySize = remaining;
        }

        this.inputBuffer.set(input.slice(0, copySize), this.inputState.size);
        this.inputState.size += copySize;

        return input.byteLength - copySize;
    }

    public poll() {
        while (true) {
            let inState = this.state;

            switch (inState) {
                case HSState.TAG_BIT:
                    this.state = this.processTag();
                    break;

                case HSState.YIELD_LITERAL:
                    this.state = this.yieldLiteral();
                    break;

                case HSState.BACKREF_COUNT_MSB:
                    this.state = this.processBackrefCountMSB();
                    break;

                case HSState.BACKREF_COUNT_LSB:
                    this.state = this.processBackrefCountLSB();
                    break;

                case HSState.BACKREF_INDEX_MSB:
                    this.state = this.processBackrefIndexMSB();
                    break;

                case HSState.BACKREF_INDEX_LSB:
                    this.state = this.processBackrefIndexLSB();
                    break;

                case HSState.YIELD_BACKREF:
                    this.state = this.yieldBackref();
                    break;
            }

            /*
             * If our state didn't change, we can't process any more input data so return.
             */
            if (this.state === inState) {
                return;
            }
        }
    }

    public isFinished(): boolean {
        return this.inputState.size === 0;
    }

    private assureUint8Array(buffer: Uint8Array | ArrayBuffer): Uint8Array {
        if (buffer instanceof ArrayBuffer) {
            return new Uint8Array(buffer);
        }

        return buffer;
    }

    private processTag(): HSState {
        let bit: number = getBits(1, this.inputBuffer, this.inputState);

        if (bit === HS_NOBITS) {
            return HSState.TAG_BIT;
        } else if (bit === HS_LITERAL_MARKER) {
            return HSState.YIELD_LITERAL;
        } else if (this.windowBits > 8) {
            return HSState.BACKREF_INDEX_MSB;
        } else {
            this.outputIndex = 0;
            return HSState.BACKREF_INDEX_LSB;
        }
    }

    private yieldLiteral(): HSState {
        let byte = getBits(8, this.inputBuffer, this.inputState);

        if (byte === HS_NOBITS) {
            return HSState.YIELD_LITERAL;
        }

        this.emitByte(byte);
        this.storeByte(byte);

        return HSState.TAG_BIT;
    }

    private processBackrefIndexMSB(): HSState {
        if (this.windowBits <= 8) {
            throw new HSInternalError(
                "There should not be any index MSB handling when the backref index is <= 8 bits."
            );
        }

        let msb = getBits(this.windowBits - 8, this.inputBuffer, this.inputState);
        if (msb === HS_NOBITS) {
            return HSState.BACKREF_INDEX_MSB;
        }

        this.outputIndex = msb << 8;
        return HSState.BACKREF_INDEX_LSB;
    }

    private processBackrefIndexLSB(): HSState {
        let bitCount = this.windowBits;

        if (bitCount > 8) {
            bitCount = 8;
        }

        let lsb = getBits(bitCount, this.inputBuffer, this.inputState);
        if (lsb === HS_NOBITS) {
            return HSState.BACKREF_INDEX_LSB;
        }

        this.outputIndex |= lsb;
        this.outputIndex += 1;

        this.outputCount = 0;

        if (this.lookaheadBits > 8) {
            return HSState.BACKREF_COUNT_MSB;
        }

        return HSState.BACKREF_COUNT_LSB;
    }

    private processBackrefCountMSB(): HSState {
        if (this.lookaheadBits <= 8) {
            throw new HSInternalError(
                "There should not be any count MSB handling when the backref index is <= 8 bits."
            );
        }

        let msb = getBits(this.lookaheadBits - 8, this.inputBuffer, this.inputState);
        if (msb === HS_NOBITS) {
            return HSState.BACKREF_COUNT_MSB;
        }

        this.outputCount = msb << 8;
        return HSState.BACKREF_COUNT_LSB;
    }

    private processBackrefCountLSB(): HSState {
        let bitCount = this.lookaheadBits;

        if (bitCount > 8) {
            bitCount = 8;
        }

        let lsb = getBits(bitCount, this.inputBuffer, this.inputState);
        if (lsb === HS_NOBITS) {
            return HSState.BACKREF_COUNT_LSB;
        }

        this.outputCount |= lsb;
        this.outputCount += 1;

        return HSState.YIELD_BACKREF;
    }

    private yieldBackref() {
        let negativeOffset = this.outputIndex;

        if (negativeOffset > this.windowBuffer.byteLength) {
            throw new HSCorruptDataError(
                "A negative offset was received that was larger than our window size."
            );
        }

        if (this.outputCount > this.windowBuffer.byteLength) {
            throw new HSCorruptDataError(
                "A backreference size was received that was larger than our window size."
            );
        }

        for (let i = 0; i < this.outputCount; ++i) {
            let index = this.headIndex - negativeOffset;

            if (index < 0) {
                index += this.windowBuffer.byteLength;
            }

            let byte = this.windowBuffer[index];
            this.emitByte(byte);
            this.storeByte(byte);
        }

        return HSState.TAG_BIT;
    }

    private ensureOutputSpace(neededBytes: number) {
        let remaining = this.outputBuffer.byteLength - this.outputSize;

        if (remaining < neededBytes) {
            let newSize = 2 * Math.max(this.outputBuffer.byteLength, 1);
            let newBuffer = new Uint8Array(newSize);
            newBuffer.set(this.outputBuffer.slice(0, this.outputSize));

            this.outputBuffer = newBuffer;
        }
    }

    private emitByte(byte: number) {
        this.ensureOutputSpace(1);
        this.outputBuffer[this.outputSize] = byte;
        this.outputSize += 1;

        let char = String.fromCharCode(byte);
    }

    private storeByte(byte: number) {
        this.windowBuffer[this.headIndex] = byte;
        this.headIndex += 1;

        if (this.headIndex >= this.windowBuffer.byteLength) {
            this.headIndex %= this.windowBuffer.byteLength;
        }
    }
}
