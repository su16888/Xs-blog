/**
 * @file middleware.ts
 * @description Next.js 中间件 - 仅处理静态资源排除
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|uploads|.*\\.).*)',
  ],
}
