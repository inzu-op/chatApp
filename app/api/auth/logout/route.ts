import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  
  // Clear the auth cookie with multiple approaches to ensure it's removed
  const response = NextResponse.json(
    { message: "Logged out successfully" },
    { status: 200 }
  );

  // Set cookie with immediate expiration
  response.cookies.set({
    name: "auth-token",
    value: "",
    expires: new Date(0),
    maxAge: 0,
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  });

  // Also clear it from the cookie store
  cookieStore.delete("auth-token");

  return response;
} 