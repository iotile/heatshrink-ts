import { HeatshrinkDecoder } from '../src/heatshrink-decoder'

function base64ToArrayBuffer(base64): ArrayBuffer {
    let binaryString = window.atob(base64)
    let len = binaryString.length
    let bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }

    return bytes.buffer
}

function convertToString(myUint8Arr) {
    return String.fromCharCode.apply(null, myUint8Arr)
}

describe('Core Functionality', () => {
    let decoder: HeatshrinkDecoder

    const TEST_VECTORS = [
        {
            decoded: 'This is a test string encoded with window 8, lookahead 4',
            encoded:
                'qlotNzkACKwyC6WW53SQAIblabdZ5BZbdY7fZLLZJBd7TdLQBCt1kt93kE4lkgtlvt9rsNosthDAzQA=',
            window: 8,
            lookahead: 4
        },

        {
            decoded: 'This is a test string encoded with window 8, lookahead 4',
            encoded: 'qlotNzkAlYZBdLLc7pIBG5Wm3WeQWW3WO32Sy2SQXe03S0EVuslvu8gnEskFst9vtdhtFlsNkkE0',
            window: 4,
            lookahead: 3
        },

        {
            decoded:
                'This is a test string encoded with window 8, lookahead 4 aasdfffffffffffffffffffffj;lsjdflansgnjkagnnvladnasfdv;lknasd;lknasdvklnasdvlkn;asdvklnasvnasdv',
            encoded:
                'qlotNzkAlYZBdLLc7pIBG5Wm3WeQWW3WO32Sy2SQXe03S0EVuslvu8gnEskFst9vtdhtFlsNkkE0kFhsNzslmBwcDtU7tlztVks1ssNuudnt1qtdhIbddmGyW6w3OzWS7Tu2WtCshtdrXbDRqnbvc7sNKIA=',
            window: 4,
            lookahead: 3
        },

        {
            decoded:
                'This is a test string encoded with window 13, lookahead 9 aasdfffffffffffffffffffffj;lsjdflansgnjkagnnvladnasfdv;lknasd;lknasdvklnasdvlkn;asdvklnasvnasdv',
            encoded:
                'qlotNzkAAEArDILpZbndJBc7pcrTbrPILLbrHb7JZbJILvabpaAAQBW6yW+7yCYzOWSC2W+32uw2iy2GySCcyCw2G52SzAAATtU7tlztVks1ssNuudnt1qtdhs9ut12tlhslusNzs1ku07tlrACAFZAAYDXa12wAGAgAaAp2AHAi7ACQEA==',
            window: 13,
            lookahead: 9
        }
    ]

    beforeEach(() => {
        decoder = new HeatshrinkDecoder(8, 4, 64)
    })

    it('should sink data correctly until full', () => {
        let data = new Uint8Array([0, 1, 2, 3, 4])

        for (let i = 0; i < 13; ++i) {
            let remaining = decoder.sink(data)

            if (i !== 12) {
                expect(remaining).toEqual(0)
            } else {
                expect(remaining).toEqual(1)
            }
        }
    })

    it('should correctly decode data when fed at once', () => {
        for (let vector of TEST_VECTORS) {
            let input = base64ToArrayBuffer(vector.encoded)
            let expected = vector.decoded

            let engine = new HeatshrinkDecoder(vector.window, vector.lookahead, 64)

            engine.process(input)
            let output = convertToString(engine.outputBuffer.slice(0, engine.outputSize))

            expect(output).toEqual(expected)
        }
    })

    it('should correctly decode data when fed slowly', () => {
        for (let vector of TEST_VECTORS) {
            let input = base64ToArrayBuffer(vector.encoded)
            let expected = vector.decoded

            let engine = new HeatshrinkDecoder(vector.window, vector.lookahead, 64)

            for (let i = 0; i < input.byteLength; ++i) {
                engine.process(input.slice(i, i + 1))
            }

            let output = convertToString(engine.outputBuffer.slice(0, engine.outputSize))

            expect(output).toEqual(expected)
        }
    })

    it('should throw config errors', () => {
        expect(() => new HeatshrinkDecoder(10, 0, 15)).toThrowError(
            'Invalid lookahead (0), window (10) or input (15) size that must be greater than 0'
        )
        expect(() => new HeatshrinkDecoder(5, 5, 0)).toThrowError(
            'Invalid lookahead size (5) that is not smaller than the specified window 5'
        )
        expect(() => new HeatshrinkDecoder(2, 1, 25)).toThrowError(
            'Invalid window bit size that is not in [4, 15]'
        )
    })
})
