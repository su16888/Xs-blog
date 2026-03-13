import { cookies } from 'next/headers'
import PricePageClient from './PricePageClient'

export default async function PricePage() {
  const cookieStore = await cookies()
  const cookieTheme = cookieStore.get('theme')?.value
  const initialTheme: 'dark' | 'light' = cookieTheme === 'black' ? 'dark' : 'light'
  return <PricePageClient initialTheme={initialTheme} />
}
