import WebSocket from 'websocket'
import events from 'events'
import { CCLinkDataProcessing, ICCJsonData, ICCRecvJsonData } from './CCLinkDataProcessing'

interface CCLinkJS extends events.EventEmitter {
  addListener(event: 'connect', listener: (connection: WebSocket.connection) => void): this
  addListener(event: 'error', listener: (error: Error) => void): this
  addListener(event: 'close', listener: (code: number, desc: string) => void): this
  addListener(event: 'message', listener: (data: WebSocket.IMessage) => void): this
  addListener(event: string | symbol, listener: (data: ICCRecvJsonData) => void): this
  on(event: 'connect', listener: (connection: WebSocket.connection) => void): this
  on(event: 'error', listener: (error: Error) => void): this
  on(event: 'close', listener: (code: number, desc: string) => void): this
  on(event: 'message', listener: (data: WebSocket.IMessage) => void): this
  on(event: string | symbol, listener: (data: ICCRecvJsonData) => void): this
  once(event: 'connect', listener: (connection: WebSocket.connection) => void): this
  once(event: 'error', listener: (error: Error) => void): this
  once(event: 'close', listener: (code: number, desc: string) => void): this
  once(event: 'message', listener: (data: WebSocket.IMessage) => void): this
  once(event: string | symbol, listener: (data: ICCRecvJsonData) => void): this
  removeListener(event: 'connect', listener: (connection: WebSocket.connection) => void): this
  removeListener(event: 'error', listener: (error: Error) => void): this
  removeListener(event: 'close', listener: (code: number, desc: string) => void): this
  removeListener(event: 'message', listener: (data: WebSocket.IMessage) => void): this
  removeListener(event: string | symbol, listener: (data: ICCRecvJsonData) => void): this
  off(event: 'connect', listener: (connection: WebSocket.connection) => void): this
  off(event: 'error', listener: (error: Error) => void): this
  off(event: 'close', listener: (code: number, desc: string) => void): this
  off(event: 'message', listener: (data: WebSocket.IMessage) => void): this
  off(event: string | symbol, listener: (data: ICCRecvJsonData) => void): this
  emit(event: 'connect', connection: WebSocket.connection): boolean
  emit(event: 'error', error: Error): boolean
  emit(event: 'close', code: number, desc: string): boolean
  emit(event: 'message', data: WebSocket.IMessage): boolean
  emit(event: string | symbol, data: ICCRecvJsonData): boolean
}

interface ICCLinkJSOptions {
  url?: string
  useWss?: boolean
  reconnect?: {
    autoReconnect?: boolean
    reconnectCount?: number
    reconnectTimes?: number
  }
  heartbeatInterval?: number
}

/**
 * cclink.js 主类
 */
class CCLinkJS extends events.EventEmitter {
  public socket: {
    client: WebSocket.client
    server: WebSocket.server
    connection: WebSocket.connection | null
  }

  private cfg: {
    url: string
    useWss: boolean
    reconnect: { autoReconnect: boolean; reconnectCount: number; reconnectTimes: number }
    heartbeatInterval: number
  }

  private _reconnectCount: number
  private _reconnectInterval: NodeJS.Timeout | null
  private _heartbeatInterval: NodeJS.Timeout | null
  private middleware: Array<(data: ICCRecvJsonData, next: () => Promise<unknown>) => void>

  /**
   * 创建一个 cclink.js 对象
   * @param options 配置项
   */
  constructor(options?: ICCLinkJSOptions) {
    super()
    this.cfg = {
      url: options?.url || '//weblink.cc.163.com/',
      useWss: options?.useWss || true,
      reconnect: {
        autoReconnect: options?.reconnect?.autoReconnect || true,
        reconnectCount: options?.reconnect?.reconnectCount || 3,
        reconnectTimes: options?.reconnect?.reconnectTimes || 5000,
      },
      heartbeatInterval: options?.heartbeatInterval || 30000,
    }

    this.socket = {
      client: new WebSocket.client(),
      server: new WebSocket.server(),
      connection: null,
    }

    this.socket.client.on('connect', (connection: WebSocket.connection) => {
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

    this._reconnectCount = 0
    this._reconnectInterval = null
    this._heartbeatInterval = null

    this.middleware = []
  }

  /**
   * 打开连接
   */
  public connect(): this {
    !this.socket.connection && this.socket.client.connect((this.cfg.useWss ? 'wss:' : 'ws:') + this.cfg.url)
    return this
  }

  /**
   * 关闭连接
   */
  public close(): this {
    this.socket.connection && this.socket.connection.close()
    return this
  }

  /**
   * 连接成功处理方法
   * @param connection websocket connection
   */
  private _onConnect(connection: WebSocket.connection): void {
    this.emit('connect', connection)
    this.socket.connection = connection

    this._startHeartBeat()

    if (this.cfg.reconnect.autoReconnect && this._reconnectInterval) {
      this._reconnectCount = 0
      clearInterval(this._reconnectInterval)
    }
  }

  /**
   * 连接错误处理方法
   * @param error
   */
  private _onError(error: Error): void {
    this.emit('error', error)

    this._stopHeartBeat()

    if (this.cfg.reconnect.autoReconnect && !this._reconnectInterval) {
      this._reconnectInterval = setInterval(() => {
        if (this._reconnectCount < this.cfg.reconnect.reconnectCount) {
          this.connect()
          this._reconnectCount++
        } else {
          this._reconnectCount = 0
          this._reconnectInterval && clearInterval(this._reconnectInterval)
        }
      }, this.cfg.reconnect.reconnectTimes)
    }
  }

  /**
   * 连接关闭处理方法
   * @param code 状态码
   * @param desc 描述
   */
  private _onClose(code: number, desc: string): void {
    this.emit('close', code, desc)
    this.socket.connection = null

    this._stopHeartBeat()
  }

  /**
   * 消息处理方法
   * @param data recv data
   */
  private _onMessage(data: WebSocket.IMessage): void {
    if (data.binaryData?.byteLength) {
      const Uint8ArrayData = new Uint8Array(data.binaryData),
        unpackData = CCLinkDataProcessing.unpack(Uint8ArrayData).format('json')

      this.emit(`${unpackData.ccsid.toString()}-${unpackData.cccid.toString()}`, unpackData)

      const fn = this.compose(this.middleware)
      fn(unpackData)
    }
  }

  /**
   * 向服务端发送 JSON 数据，该方法会自动编码需要发送至服务端的 JSON 数据。
   *
   * @param data JSON 数据
   *     其中必须包含 `ccsid` 和 `cccid` 两个属性，这两个属性指定了该数据属于服务端的哪个接口。
   */
  public send(data: ICCJsonData): this {
    const Uint8ArrayData: Uint8Array = new CCLinkDataProcessing(data).dumps(),
      BufferData: Buffer = Buffer.from(Uint8ArrayData)
    this.socket.connection && this.socket.connection.sendBytes(BufferData)

    return this
  }

  /**
   * 开始自动发送心跳包
   */
  private _startHeartBeat(): void {
    const heartBeat = {
      ccsid: 6144,
      cccid: 5,
    }

    this.send(heartBeat)

    this._heartbeatInterval = setInterval(() => {
      this.send(heartBeat)
    }, this.cfg.heartbeatInterval)
  }

  /**
   * 停止自动发送心跳包
   */
  private _stopHeartBeat(): void {
    this._heartbeatInterval && clearInterval(this._heartbeatInterval)
  }

  /**
   * 使用中间件，此方法的`fn`参数接收一个回调方法，在接收到数据时将会回调它。
   *
   * @param fn 回调方法 (callback function)
   *     应传入一个参数为 `data` 和 `next` 的方法，在回调时 `data` 即为接收到并已解码的数据，`next` 为下一个中间件。
   */
  public use(fn: (data: ICCRecvJsonData, next: () => Promise<unknown>) => void): this {
    if (typeof fn !== 'function') {
      throw new TypeError('middleware must be a function!')
    } else {
      this.middleware.push(fn)
    }

    return this
  }

  private compose(middleware: Array<(data: ICCRecvJsonData, next: () => Promise<unknown>) => void>) {
    if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
    for (const fn of middleware) {
      if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
    }

    return function (data: ICCRecvJsonData, next?: () => Promise<unknown>) {
      let index = -1
      return dispatch(0)
      function dispatch(i: number): Promise<unknown> {
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
