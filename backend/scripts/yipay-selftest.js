const assert = require('assert')
const crypto = require('crypto')

const yipay = require('../src/services/payment/providers/yipay')

function pickValue(v) {
  return v === undefined || v === null ? '' : String(v)
}

function buildSignContent(params) {
  return Object.keys(params || {})
    .filter((k) => k !== 'sign' && k !== 'sign_type' && pickValue(params[k]) !== '')
    .sort()
    .map((k) => `${k}=${pickValue(params[k])}`)
    .join('&')
}

function md5(input) {
  return crypto.createHash('md5').update(input, 'utf8').digest('hex')
}

function signRsaSha256(content, privateKeyPem) {
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(content, 'utf8')
  signer.end()
  return signer.sign(privateKeyPem, 'base64')
}

function testRsaVerifyNotify() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  })

  const basePayload = {
    pid: '1001',
    trade_no: '2024072320222180092',
    out_trade_no: 'XS123456',
    type: 'wxpay',
    trade_status: 'TRADE_SUCCESS',
    money: '1.00',
    timestamp: String(Math.floor(Date.now() / 1000)),
    sign_type: 'RSA'
  }

  const content = buildSignContent(basePayload)
  const sign = signRsaSha256(content, privateKey)

  const payload = { ...basePayload, sign }
  const paymentConfig = {
    config_json: {
      platform_public_key: publicKey
    }
  }

  assert.strictEqual(yipay.verifyNotify({ payload, paymentConfig }), true)

  const payload2 = { ...basePayload, foo: 'bar' }
  payload2.sign = signRsaSha256(buildSignContent(payload2), privateKey)
  assert.strictEqual(yipay.verifyNotify({ payload: payload2, paymentConfig }), true)

  const payloadBad = { ...payload2, sign: payload2.sign.slice(0, -2) + 'ab' }
  assert.strictEqual(yipay.verifyNotify({ payload: payloadBad, paymentConfig }), false)
}

function testMd5VerifyNotify() {
  const key = 'test_md5_key'
  const basePayload = {
    pid: '1001',
    trade_no: '20160806151343349',
    out_trade_no: 'XS123456',
    type: 'alipay',
    trade_status: 'TRADE_SUCCESS',
    money: '9.99',
    sign_type: 'MD5'
  }
  const sign = md5(buildSignContent(basePayload) + key)
  const payload = { ...basePayload, sign }

  const paymentConfig = { config_json: { key } }
  assert.strictEqual(yipay.verifyNotify({ payload, paymentConfig }), true)

  assert.strictEqual(yipay.verifyNotify({ payload: { ...payload, sign: 'deadbeef' }, paymentConfig }), false)
}

function main() {
  testRsaVerifyNotify()
  testMd5VerifyNotify()
  console.log('yipay selftest ok')
}

main()

