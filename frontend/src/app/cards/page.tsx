import { redirect } from 'next/navigation'

export default function CardsRedirectPage() {
  const adminPath = process.env.ADMIN_PAGE_PATH || 'admins'
  redirect(`/${adminPath}/cards`)
}

