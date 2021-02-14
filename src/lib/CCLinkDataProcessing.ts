import { encode, decode } from '@msgpack/msgpack'
import pako from 'pako'

/**
 * 发送至服务端的 JSON 数据
 */
interface ICCJsonData {
  ccsid: number
  cccid: number
  [propName: string]: unknown
}

/**
 * 从服务端接收到的 JSON 数据
 */
interface ICCRecvJsonData extends ICCJsonData {
  readonly reason?: string
  readonly result?: number
  readonly _cid?: number
  readonly _sid?: number
  readonly [propName: string]: unknown
}

/**
 * 去除了 `ccsid` 与 `cccid` 两个属性的 JSON 数据
 */
interface ICCJsonDataWithOutSidCid {
  ccsid?: number
  cccid?: number
  [propName: string]: unknown
}

/**
 * cclink.js 数据处理类
 */
class CCLinkDataProcessing {
  public ccsid: number
  public cccid: number
  public msgWithOutSidCid: ICCJsonDataWithOutSidCid

  /**
   * 创建一个数据处理类
   * @param data JSON 数据
   */
  constructor(data: ICCJsonData) {
    this.ccsid = data.ccsid || 0
    this.cccid = data.cccid || 0
    this.msgWithOutSidCid = data
    delete this.msgWithOutSidCid.ccsid
    delete this.msgWithOutSidCid.cccid
  }

  /**
   * 格式化JSON数据
   *
   * cclink.js:2074 format(t)
   *
   * @param type 格式化类型
   * @returns 格式化后的数据
   */
  public format(type?: 'json'): ICCRecvJsonData
  public format(type?: 'string'): string
  public format(type?: string): ICCRecvJsonData | string | this {
    const _temp = {
      ccsid: this.ccsid,
      cccid: this.cccid,
    }

    switch (type) {
      case 'json':
        return Object.assign({}, _temp, this.msgWithOutSidCid)
      case 'string':
        return JSON.stringify(this)
      default:
        return JSON.stringify(this)
    }
  }

  /**
   * 编码数据
   *
   * cclink.js:2082 dumps()
   *
   * @returns Uint8Array Data
   */
  public dumps(): Uint8Array {
    const msgpackEncodeUint8Array = encode(this.msgWithOutSidCid)
    const dumpsUint8Array = new Uint8Array(8 + msgpackEncodeUint8Array.byteLength)
    const dumpsDataView = new DataView(dumpsUint8Array.buffer)

    dumpsDataView.setUint16(0, this.ccsid, true)
    dumpsDataView.setUint16(2, this.cccid, true)

    msgpackEncodeUint8Array.forEach((t, n) => {
      dumpsUint8Array[8 + n] = t
    })

    return dumpsUint8Array
  }

  /**
   * 解码数据
   *
   * cclink.js:2094 unpack(e)
   *
   * @param Uint8ArrayData 原始数据 Uint8Array
   * @returns CCLinkDataProcessing
   */
  public static unpack(Uint8ArrayData: Uint8Array): CCLinkDataProcessing {
    const n = new DataView(Uint8ArrayData.buffer)
    const ccsid = n.getUint16(0, true)
    const cccid = n.getUint16(2, true)

    let o = new Uint8Array(Uint8ArrayData.buffer, 8)

    if (n.getUint32(4, true)) {
      const s = n.getUint32(8, true)
      const u = new Uint8Array(Uint8ArrayData.buffer, 12)
      if (u.byteLength === s) {
        o = pako.inflate(u)
      }
    }

    const recvJsonData = <ICCRecvJsonData>decode(Buffer.from(o))

    return new CCLinkDataProcessing(
      Object.assign(
        {},
        {
          ccsid,
          cccid,
        },
        this.replaceLinkBreak(recvJsonData)
      )
    )
  }

  /**
   * 过滤JSON数据
   *
   * cclink.js:2113 replaceLinkBreak(t)
   *
   * @param t 原始数据对象
   * @returns 格式化后的数据
   */
  public static replaceLinkBreak(t: string): ICCRecvJsonData
  public static replaceLinkBreak(t: ICCRecvJsonData): ICCRecvJsonData
  public static replaceLinkBreak(t: ICCRecvJsonData | string): ICCRecvJsonData {
    return (
      'object' === (void 0 === t ? 'undefined' : typeof t) && (t = JSON.stringify(t)),
      (t = ('' + t).replace(/\\r\\n/g, '')),
      JSON.parse(t)
    )
  }
}

export { CCLinkDataProcessing, ICCJsonData, ICCRecvJsonData, ICCJsonDataWithOutSidCid }
