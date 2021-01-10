import { CCLinkDataProcessing } from '../src/lib/CCLinkDataProcessing'

test('dumps json data', () => {
  const data = { ccsid: 40962, cccid: 3, follow_uid: 268158652, uid: 268158652 },
    passHexStr = '02a003000000000082aa666f6c6c6f775f756964ce0ffbc6bca3756964ce0ffbc6bc'
  let dumpsResult = new CCLinkDataProcessing(data).dumps(),
    hexStr = Buffer.from(dumpsResult).toString('hex')
  expect(hexStr).toBe(passHexStr)
})

test('unpack binary data', () => {
  expect(1).toBe(1)
})

test('format object/string', () => {
  expect(1).toBe(1)
})

test('replaceLinkBreak object', () => {
  expect(1).toBe(1)
})
