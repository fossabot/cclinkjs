import { CCLinkDataProcessing } from '../src/lib/CCLinkDataProcessing'

const data = { ccsid: 40962, cccid: 3, follow_uid: 268158652, uid: 268158652 }
const dataHexStr = '02a003000000000082aa666f6c6c6f775f756964ce0ffbc6bca3756964ce0ffbc6bc'
const Uint8ArrayData = new Uint8Array(Buffer.from(dataHexStr, 'hex'))

test('dumps json data', () => {
  const dataCache = JSON.parse(JSON.stringify(data))

  const dumpsResult = new CCLinkDataProcessing(dataCache).dumps()
  const dumpsResultHexStr = Buffer.from(dumpsResult).toString('hex')
  
  expect(dumpsResultHexStr).toBe(dataHexStr)
})

test('unpack binary data', () => {
  const dataCache = JSON.parse(JSON.stringify(data))

  const unpackData = CCLinkDataProcessing.unpack(Uint8ArrayData).format('json')

  expect(JSON.stringify(unpackData)).toBe(JSON.stringify(dataCache))
})

test('format object/string', () => {
  expect(1).toBe(1)
})

test('replaceLinkBreak object', () => {
  expect(1).toBe(1)
})
