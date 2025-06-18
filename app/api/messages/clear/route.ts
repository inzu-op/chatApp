export const runtime = "nodejs"; 

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Message from "@/app/models/Message";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { userId, targetUserId } = await req.json();

    if (!userId || !targetUserId) {
      return NextResponse.json(
        { error: "Both userId and targetUserId are required" },
        { status: 400 }
      );
    }

    // Delete all messages between the two users
    await Message.deleteMany({
      $or: [
        { sender: userId, receiver: targetUserId },
        { sender: targetUserId, receiver: userId }
      ]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing messages:", error);
    return NextResponse.json(
      { error: "Failed to clear messages" },
      { status: 500 }
    );
  }
} 
