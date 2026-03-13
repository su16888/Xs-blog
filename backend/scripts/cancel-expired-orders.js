const { cancelExpiredUnpaidOrdersOnce } = require('../src/services/orderAutoCancelScheduler')

async function main() {
  const result = await cancelExpiredUnpaidOrdersOnce()
  console.log(result)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

