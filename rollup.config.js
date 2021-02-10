import path from 'path'
import { babel } from '@rollup/plugin-babel'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import typescript from 'rollup-plugin-typescript2'
const pkg = require('./package.json')

const isProduction = process.env.NODE_ENV === 'production'

console.info(`building for ${process.env.NODE_ENV}...`)

const extensions = ['.js', '.ts']
const typescriptConfig = typescript({
  check: isProduction,
  tsconfig: path.resolve(__dirname, 'tsconfig.json'),
})

const resolve = (...args) => path.resolve(__dirname, ...args)

export default {
  input: resolve('./src/index.ts'),
  output: [
    {
      file: resolve('./', 'dist', 'index.esm.js'),
      format: 'es',
    },
    {
      file: resolve('./', 'dist', 'index.cjs.js'),
      format: 'cjs',
    },
  ],
  plugins: [
    nodeResolve({
      preferBuiltins: true,
      extensions,
    }),
    typescriptConfig,
    json({
      namedExports: false,
    }),
    commonjs(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      extensions,
    }),
  ],
  onwarn: (warning) => {
    if (warning.code === 'THIS_IS_UNDEFINED') {
      return
    }
    console.error(warning.message)
  },
}
