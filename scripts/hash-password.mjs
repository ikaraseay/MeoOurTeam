#!/usr/bin/env node
/**
 * 生成口令的 SHA-256 哈希。
 * 用法：node scripts/hash-password.mjs <password>
 */
import { createHash } from 'node:crypto'

const password = process.argv[2]
if (!password) {
  console.error('用法：node scripts/hash-password.mjs <password>')
  process.exit(1)
}

const hash = createHash('sha256').update(password).digest('hex')
console.log(hash)
