import { HSBitstreamState, HSInternalError, HS_NOBITS } from "../src/heatshrink-basic";
import { getBits } from "../src/heatshrink-utils";

describe("getBits helper function", () => {
    let state: HSBitstreamState;

    beforeEach(() => {
        state = {
            index: 0,
            size: 0,
            bitIndex: 0,
            currentByte: 0
        };
    });

    it("should allow taking bits in groups", () => {
        let input = new Uint8Array([0b10101010, 0b11110000, 0b11001100]);
        state.size = input.byteLength;

        for (let i = 0; i < 4; ++i) {
            expect(getBits(2, input, state)).toEqual(0b10);
        }

        expect(getBits(4, input, state)).toEqual(0b1111);
        expect(getBits(4, input, state)).toEqual(0b0000);
        expect(getBits(7, input, state)).toEqual(0b1100110);
        expect(getBits(2, input, state)).toEqual(HS_NOBITS);
        expect(getBits(1, input, state)).toEqual(0);
        expect(getBits(1, input, state)).toEqual(HS_NOBITS);

        expect(() => getBits(16, input, state)).toThrowError("getBits called with invalid number of bits requested (16 not in [1, 15])");
    });

    it("should allow grouping bits across byte boundaries", () => {
        let input = new Uint8Array([0b10101010, 0b11110000, 0b11001100]);
        state.size = input.byteLength;

        expect(getBits(13, input, state)).toEqual(0b1010101011110);
        expect(getBits(13, input, state)).toEqual(HS_NOBITS);
        expect(getBits(11, input, state)).toEqual(0b00011001100);
        expect(getBits(1, input, state)).toEqual(HS_NOBITS);
    });

    it("should allow complex bit grouping", () => {
        let input = new Uint8Array([0xaa, 0x5a, 0x2d, 0x37, 0x39, 0x00, 0x00, 0x40, 0x2b]);
        state.size = input.byteLength;

        expect(getBits(9, input, state)).toEqual(340);
        expect(getBits(9, input, state)).toEqual(360);
        expect(getBits(9, input, state)).toEqual(361);
        expect(getBits(9, input, state)).toEqual(371);
        expect(getBits(9, input, state)).toEqual(288);

        expect(getBits(1, input, state)).toEqual(0);
        expect(getBits(5, input, state)).toEqual(0);
        expect(getBits(8, input, state)).toEqual(2);
        expect(getBits(1, input, state)).toEqual(0);
        expect(getBits(8, input, state)).toEqual(2);
    });

    it("should return no bits on an empty input", () => {
        let input = new Uint8Array([0xaa, 0x5a, 0x2d, 0x37, 0x39, 0x00, 0x00, 0x40, 0x2b]);
        state.size = 0;

        expect(getBits(10, input, state)).toEqual(HS_NOBITS);
    });
});
