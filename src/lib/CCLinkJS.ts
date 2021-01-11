import WebSocket from 'websocket'
import { CCLinkDataProcessing, CCJsonData } from './CCLinkDataProcessing'

interface CCLinkJSOptions {
  url?: string
  usWss?: boolean
  reconnectTimes?: number
  heartbeatInterval?: number
}

type onConnectCallbackFunction = (connection: WebSocket.connection) => void
type onErrorCallbackFunction = (error: Error) => void
type onCloseCallbackFunction = (code: number, desc: string) => void
type onMessageCallbackFunction = (data: WebSocket.IMessage) => void

/**
 * cclink.js 主类
 */
class CCLinkJS {
  public WebSocket: {
    client: WebSocket.client
    server: WebSocket.server
    socketConnection: WebSocket.connection | null
  }
  public cfg: { url: string; useWss: boolean }
  private _event: {
    connect?: onConnectCallbackFunction
    error?: onErrorCallbackFunction
    close?: onCloseCallbackFunction
    message?: onMessageCallbackFunction
  }
  private _heartbeatInterval: NodeJS.Timeout | null = null
  private middleware: Function[]
  constructor(options?: CCLinkJSOptions) {
    this.cfg = {
      url: '//weblink.cc.163.com/',
      useWss: true,
    }

    this.WebSocket = {
      client: new WebSocket.client(),
      server: new WebSocket.server(),
      socketConnection: null,
    }

    this._event = {
      connect: undefined,
      error: undefined,
      close: undefined,
      message: undefined,
    }

    this.middleware = []
  }

  /**
   * 连接服务器
   */
  public connect(): this {
    this.WebSocket.client.connect((this.cfg.useWss ? 'wss:' : 'ws:') + this.cfg.url)
    this.WebSocket.client.on('connect', (connection: WebSocket.connection) => {
      this._onConnect(connection)
      connection
        .on('error', (error: Error) => {
          this._onError(error)
        })
        .on('close', (code: number, desc: string) => {
          this._onClose(code, desc)
        })
        .on('message', (data: WebSocket.IMessage) => {
          if (data.type === 'binary') {
            this._onMessage(data)
          }
        })
    })

    return this
  }

  /**
   * 设置事件回调
   * @param event 事件名称
   * @param callback 回调方法
   */
  public on(event: 'connect', callback?: (connection: WebSocket.connection) => void): this
  public on(event: 'error', callback?: (error: Error) => void): this
  public on(event: 'close', callback?: (code: number, desc: string) => void): this
  public on(event: 'message', callback?: (data: WebSocket.IMessage) => void): this
  public on(event: string, callback?: Function): this {
    switch (event) {
      case 'connect':
        this._event.connect = <onConnectCallbackFunction>callback
        break
      case 'error':
        this._event.error = <onErrorCallbackFunction>callback
        break
      case 'close':
        this._event.close = <onCloseCallbackFunction>callback
        break
      case 'message':
        this._event.message = <onMessageCallbackFunction>callback
        break
    }
    return this
  }

  /**
   * 连接成功处理方法
   * @param {WebSocket.connection} connection
   */
  private _onConnect(connection: WebSocket.connection): void {
    this.WebSocket.socketConnection = connection
    this._event.connect && this._event.connect(connection)
    this._startHeartBeat()
  }

  /**
   * 连接错误处理方法
   * @param {Error} error
   */
  private _onError(error: Error): void {
    this._event.error && this._event.error(error)
  }

  /**
   * 连接关闭处理方法
   * @param {number} code
   * @param {string} desc
   */
  private _onClose(code: number, desc: string): void {
    this.WebSocket.socketConnection = null
    this._event.close && this._event.close(code, desc)
    this._stopHeartBeat()
  }

  /**
   * 消息处理方法
   * @param {WebSocket.IMessage} data
   */
  private _onMessage(data: WebSocket.IMessage): void {
    if (data.binaryData?.byteLength) {
      let Uint8ArrayData = new Uint8Array(data.binaryData),
        unpackData = CCLinkDataProcessing.unpack(Uint8ArrayData).format('json')

      this._event.message && this._event.message(data)

      const fn = this.compose(this.middleware)
      fn(unpackData)
    }
  }

  /**
   * 发送JSON数据
   * cclink.js:0 send(t)
   * @param {CCJsonData} data JSON数据
   */
  public send(data: CCJsonData): void {
    let Uint8ArrayData: Uint8Array = new CCLinkDataProcessing(data).dumps(),
      BufferData: Buffer = Buffer.from(Uint8ArrayData)
    this.WebSocket.socketConnection && this.WebSocket.socketConnection.sendBytes(BufferData)
  }

  /**
   * 开始发送心跳包
   */
  private _startHeartBeat(): void {
    this.send({
      ccsid: 6144,
      cccid: 5,
    })
    this._heartbeatInterval = setInterval(() => {
      this.send({
        ccsid: 6144,
        cccid: 5,
      })
    }, 30000)
  }

  /**
   * 停止发送心跳包
   */
  private _stopHeartBeat(): void {
    this._heartbeatInterval && clearInterval(this._heartbeatInterval)
  }

  /**
   * 使用中间件
   * @param {Function} fn callback function
   */
  public use(fn: (data: CCJsonData, next: Function) => void): this {
    if (typeof fn !== 'function') {
      throw new TypeError('middleware must be a function!')
    } else {
      this.middleware.push(fn)
    }

    return this
  }

  private compose(middleware: Function[]) {
    if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
    for (const fn of middleware) {
      if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
    }

    return function (data: CCJsonData, next?: Function) {
      let index = -1
      return dispatch(0)
      function dispatch(i: number) {
        if (i <= index) return Promise.reject(new Error('next() called multiple times'))
        index = i
        let fn = middleware[i]
        if (i === middleware.length && next) fn = next
        if (!fn) return Promise.resolve()
        try {
          return Promise.resolve(
            fn(data, function next() {
              return dispatch(i + 1)
            })
          )
        } catch (err) {
          return Promise.reject(err)
        }
      }
    }
  }
}

export { CCLinkJS }
