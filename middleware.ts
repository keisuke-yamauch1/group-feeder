export { auth as middleware } from '@/auth'

export const config = {
  matcher: ['/dashboard/:path*', '/api/group/:path*', '/api/feed/:path*', '/api/read-status/:path*'],
}
