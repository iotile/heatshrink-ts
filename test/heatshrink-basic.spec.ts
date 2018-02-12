import { HSState } from '../src/heatshrink-basic'

describe('basic enum tests', () => {
    it('should match C enum numbering', () => {
        expect(HSState.TAG_BIT).toEqual(0)
        expect(HSState.YIELD_BACKREF).toEqual(6)
    })
})
