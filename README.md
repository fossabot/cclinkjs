# CCLinkJS Node [![Build Status](https://www.travis-ci.com/hhui64/cclinkjs.svg?branch=master)](https://www.travis-ci.com/hhui64/cclinkjs) ![GitHub](https://img.shields.io/github/license/hhui64/cclinkjs) ![GitHub](https://img.shields.io/github/languages/top/hhui64/cclinkjs)

网易CC直播前端通讯模块(cclink.js) Node.js 版，使用 TypeScript 编写并实现了与网易CC直播服务端的通信协议

## 安装

```bash
npm install @hhui64/cclinkjs --save
```

## 快速开始

引入并创建一个 CCLinkJS 对象

```javascript
// CommonJS
const CCLinkJS = require('@hhui64/cclinkjs').CCLinkJS
// ES6 Moudule
import { CCLinkJS } from '@hhui64/cclinkjs'

const cclinkjs = new CCLinkJS()

// 连接服务器
cclinkjs
  .connect()
  .on('connect', (connection) => {
    console.log('连接成功')
  })
  .on('close', (code, desc) => {
    console.log('连接关闭:', code, desc)
  })
  .on('error', (error) => {
    console.log('连接错误:', error)
  })
```

向服务器发送数据

```javascript
// 发送 JSON 数据
cclinkjs.send({ ccsid: 6144, cccid: 5 })
```

使用中间件处理数据

```javascript
/**
 * use() 方法接收一个回调方法，该回调方法有 data, next 两个参数
 * 可在中间件里处理服务器发来的数据，用法参考 koa 框架的中间件功能
 */
cclinkjs
  .use(async (data, next) => {
    if (data.ccsid === 515 && data.cccid === 32785) {
      console.log(data)
    }
    await next()
  })
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
