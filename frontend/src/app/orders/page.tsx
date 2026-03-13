import { redirect } from 'next/navigation'

export default function OrdersRedirectPage() {
  const adminPath = process.env.ADMIN_PAGE_PATH || 'admins'
  redirect(`/${adminPath}/orders`)
}

