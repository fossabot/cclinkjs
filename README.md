# CCLinkJS Node [![Build Status](https://img.shields.io/travis/com/hhui64/cclinkjs/master?style=flat-square)](https://www.travis-ci.com/hhui64/cclinkjs) ![GitHub](https://img.shields.io/github/license/hhui64/cclinkjs?style=flat-square) ![GitHub](https://img.shields.io/github/languages/top/hhui64/cclinkjs?style=flat-square) ![Release](https://img.shields.io/github/v/release/hhui64/cclinkjs?style=flat-square)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fhhui64%2Fcclinkjs.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fhhui64%2Fcclinkjs?ref=badge_shield)

网易CC直播前端通讯模块 Node.js 包，使用 TypeScript 编写并实现了与网易CC直播服务端的通信协议

## 简介

CCLinkJS 是一个 Node.js 包，它实现了与网易CC直播服务端的通信协议，例如：与服务端使用 JSON 数据通信时的编、解码，你可以使用它来快速开发一些扩展或自动化应用而不需要过多的关心它的数据处理过程，只需把精力放在你的应用代码上即可；同时该项目使用 TypeScript 编写，可完美支持类型检查等特性。

## 安装

```bash
npm install @hhui64/cclinkjs --save
```

## 快速开始

### 引入并实例化 CCLinkJS 类

```javascript
// CommonJS
const CCLinkJS = require('@hhui64/cclinkjs').CCLinkJS
// ES6 Moudule
import { CCLinkJS } from '@hhui64/cclinkjs'

const cclinkjs = new CCLinkJS()

// 连接服务端
cclinkjs.connect()

// 监听 websocket 事件
cclinkjs.socket.client.on('connect', (connection) => {
  console.log('连接成功')
  connection
    .on('close', (code, desc) => {
      console.log('连接关闭:', code, desc)
    })
    .on('error', (error) => {
      console.log('连接错误:', error)
    })
})

// 也可以使用 cclinkjs.on() 监听 websocket 事件
cclinkjs.on('connect', (connection) => {
  console.log('连接成功')
})

```

## 数据发送与接收处理

### 向服务器发送数据

```javascript
// 异步发送 JSON 数据
// 6144-5：心跳包协议
cclinkjs.send({ ccsid: 6144, cccid: 5 })

// 同步发送 JSON 数据
// 可等待服务端响应请求并返回数据
const recvJsonData = await cclinkjs.sendSync({ ccsid: 6144, cccid: 5 })
console.log(recvJsonData) // "{ ccsid: 6144, cccid: 5, reason: 'ok', result: 0 }"
```

### 使用事件处理数据

通常情况下，你应该使用这种方式去处理接收到的数据

```javascript
// 事件名称格式为 `ccsid-cccid`，需要监听指定协议只需按照该格式组合事件名称即可
// 当接收到数据时会触发特定事件名称的事件，可参考 EventEmitter 的事件发布与订阅制
// 40962-28：观众关注主播协议
cclinkjs.on('40962-28', (data) => {
  console.log(data) // "{ ccsid: 40962, cccid: 28, follow_user: [{...}], ... }"
})
```

### 使用中间件处理数据

在事件不能满足你的需求时，你可以使用**中间件**的方式来处理接收到的数据

```javascript
// use() 方法接收一个回调方法，该回调方法有 data, next 两个参数
// 可在中间件里处理服务器发来的数据，用法参考 koa 框架的中间件功能
cclinkjs
  .use(async (data, next) => {
    // 515-32785：公屏发言协议
    if (data.ccsid === 515 && data.cccid === 32785) {
      console.log(data) // "{ ccsid: 515, cccid: 32785, msg: [{...}], ... }"
    }
    await next()
  })
  // 512-32784：观众进入直播间协议
  .use(async (data, next) => {
    if (data.ccsid === 512 && data.cccid === 32784) {
      // do something :)
    }
  })
```

## 声明

本项目仅供学习使用，禁止用作其它用途，如使用本项目造成的一切问题均与作者无关

## License

[MIT licensed](LICENSE)


[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fhhui64%2Fcclinkjs.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fhhui64%2Fcclinkjs?ref=badge_large)