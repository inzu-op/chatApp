"use server"

import { redirect } from "next/navigation"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import {
  hashPassword,
  verifyPassword,
  generateToken,
  setAuthCookie,
  clearAuthCookie,
} from "@/lib/auth"

export async function signup(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!name || !email || !password) {
    return { error: "All fields are required" }
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" }
  }

  try {
    await connectDB()

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return { error: "User already exists with this email" }
    }

    const hashedPassword = await hashPassword(password)
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    })

    const token = generateToken(user._id.toString())
    await setAuthCookie(token)

    // ✅ Redirect inside the try block
    redirect(`/${user._id}/dashboard`)
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error
    }
    console.error("Signup error:", error)
    return { error: "Something went wrong. Please try again." }
  }
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  try {
    await connectDB()

    const user = await User.findOne({ email })
    if (!user) {
      return { error: "Invalid email or password" }
    }

    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return { error: "Invalid email or password" }
    }

    const token = generateToken(user._id.toString())
    await setAuthCookie(token)

    // ✅ Redirect inside the try block
    redirect(`/${user._id}/dashboard`)
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error
    }
    console.error("Login error:", error)
    return { error: "Something went wrong. Please try again." }
  }
}

export async function logout() {
  await clearAuthCookie()
  redirect("/login")
}
