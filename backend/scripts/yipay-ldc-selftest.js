const assert = require('assert')

const axios = require('axios')

async function main() {
  const originalPost = axios.post
  let captured = null

  axios.post = async (url, body, options) => {
    captured = { url, body, options }
    return {
      status: 302,
      headers: { location: 'https://credit.linux.do/paying?order_no=TEST123' },
      data: ''
    }
  }

  const yipay = require('../src/services/payment/providers/yipay')

  const result = await yipay.createPayment({
    order: { id: 1, amount: 10, payment_trade_no: null },
    service: { name: 'Test' },
    paymentConfig: {
      config_json: {
        gateway_url: 'https://credit.linux.do/epay',
        gateway_variant: 'ldc',
        pid: '001',
        key: 'secret',
        pay_type: '',
        api_path: '/pay/submit.php',
        submit_method: 'POST',
        return_base_url: 'https://example.com'
      }
    },
    req: { headers: {}, protocol: 'https', get: () => 'example.com' }
  })

  assert.strictEqual(result.paymentUrl, 'https://credit.linux.do/paying?order_no=TEST123')
  assert.ok(captured)
  assert.strictEqual(captured.url, 'https://credit.linux.do/epay/pay/submit.php')
  assert.ok(String(captured.body).includes('type=epay'))
  assert.ok(String(captured.body).includes('pid=001'))
  assert.ok(captured.options && captured.options.maxRedirects === 0)

  axios.post = originalPost
  console.log('yipay ldc selftest ok')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

