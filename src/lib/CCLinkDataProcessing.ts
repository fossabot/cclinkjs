import { encode, decode } from '@msgpack/msgpack'
import pako from 'pako'

interface CCJsonData {
  ccsid: number
  cccid: number
  cid?: number
  readonly reason?: string
  readonly result?: number
  msg?: ChatMsgData[]
  [propName: string]: any
}

interface CCJsonDataWithOutSidCid {
  ccsid?: number
  cccid?: number
  [propName: string]: any
}

interface ChatMsgData {
  '1'?: string
  '4': string
  '5'?: string
  '7'?: object
  '9'?: string
  '99': string
  '197': string
  [propName: string]: any
}

/**
 * cclink.js 数据处理类
 */
class CCLinkDataProcessing {
  public ccsid: number
  public cccid: number
  public msgWithOutSidCid: CCJsonDataWithOutSidCid

  constructor(data: CCJsonData) {
    this.ccsid = data.ccsid || 0
    this.cccid = data.cccid || 0
    this.msgWithOutSidCid = data
    delete this.msgWithOutSidCid.ccsid
    delete this.msgWithOutSidCid.cccid
  }

  /**
   * 格式化JSON数据
   * cclink.js:2074 format(t)
   * @param {string} type 格式化类型
   * @returns {CCJsonData}
   */
  public format(type: 'json'): CCJsonData
  public format(type: 'string'): string
  public format(type: string): CCJsonData | string {
    let _temp = {
      ccsid: this.ccsid,
      cccid: this.cccid,
    }

    if (type === 'json') {
      return Object.assign({}, _temp, this.msgWithOutSidCid)
    }

    if (type === 'string') {
      return JSON.stringify(this)
    }

    return this
  }

  /**
   * 编码数据
   * cclink.js:2082 dumps()
   * @returns {Uint8Array}
   */
  public dumps(): Uint8Array {
    let msgpackEncodeUint8Array = encode(this.msgWithOutSidCid),
      dumpsUint8Array = new Uint8Array(8 + msgpackEncodeUint8Array.byteLength),
      dumpsDataView = new DataView(dumpsUint8Array.buffer)

    dumpsDataView.setUint16(0, this.ccsid, true)
    dumpsDataView.setUint16(2, this.cccid, true)

    msgpackEncodeUint8Array.forEach((t, n) => {
      dumpsUint8Array[8 + n] = t
    })

    return dumpsUint8Array
  }

  /**
   * 解码数据
   * cclink.js:2094 unpack(e)
   * @param {Uint8Array} Uint8ArrayData 原始数据 Uint8Array
   * @returns {CCLinkDataProcessing} CCLinkDataProcessing
   */
  public static unpack(Uint8ArrayData: Uint8Array): CCLinkDataProcessing {
    let n: DataView = new DataView(Uint8ArrayData.buffer),
      ccsid: number = n.getUint16(0, true),
      cccid: number = n.getUint16(2, true),
      o: Uint8Array = new Uint8Array()
    if (n.getUint32(4, true)) {
      let s = n.getUint32(8, true),
        u = new Uint8Array(Uint8ArrayData.buffer, 12)
      u.byteLength === s && (o = pako.inflate(u))
    } else {
      o = new Uint8Array(Uint8ArrayData.buffer, 8)
    }

    let f = <object>decode(Buffer.from(o))

    return new CCLinkDataProcessing(
      Object.assign(
        {},
        {
          ccsid,
          cccid,
        },
        this.replaceLinkBreak(f)
      )
    )
  }

  /**
   * 过滤JSON数据
   * cclink.js:2113 replaceLinkBreak(t)
   * @param {Object} t 原始数据对象
   * @returns {object|string} 格式化后的数据
   */
  public static replaceLinkBreak(t: object): string
  public static replaceLinkBreak(t: string): object
  public static replaceLinkBreak(t: object | string): string | object {
    return (
      'object' === (void 0 === t ? 'undefined' : typeof t) && (t = JSON.stringify(t)),
      (t = ('' + t).replace(/\\r\\n/g, '')),
      JSON.parse(t)
    )
  }
}

export { CCLinkDataProcessing, CCJsonData, CCJsonDataWithOutSidCid, ChatMsgData }
