import { redirect } from 'next/navigation'

export default function PaymentConfigsRedirectPage() {
  const adminPath = process.env.ADMIN_PAGE_PATH || 'admins'
  redirect(`/${adminPath}/payment-configs`)
}

