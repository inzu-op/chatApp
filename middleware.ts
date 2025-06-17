import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

const protectedRoutes = ["/dashboard", "/profile"]
const authRoutes = ["/login", "/signup"]

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route))
  const isAuthRoute = authRoutes.includes(path)

  const token = req.cookies.get("auth-token")?.value
 
  // If no token is present and trying to access protected route, redirect to login
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  // If token exists, verify it
  let session = null
  if (token) {
    try {
      session = verifyToken(token)
    } catch (error) {
      console.error("Token verification error:", error)
      // If token is invalid and trying to access protected route, redirect to login
      if (isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }
    }
  }

  // If authenticated and trying to access auth routes, redirect to dashboard
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL(`/${session.userId}/dashboard`, req.nextUrl))
  }

  // If trying to access protected route without valid session, redirect to login
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  // Allow Socket.IO connections
  if (path.startsWith('/api/socket')) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
}