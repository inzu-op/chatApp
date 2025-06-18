export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    await connectDB();

    const { userId, targetUserId } = await req.json();
    console.log('Removing chat user:', { userId, targetUserId });

    if (!userId || !targetUserId) {
      console.log('Missing required fields:', { userId, targetUserId });
      return NextResponse.json(
        { error: "Both user IDs are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      console.log('Invalid ObjectId format:', { userId, targetUserId });
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      );
    }

    // Convert string IDs to ObjectIds
    const currentUserId = new mongoose.Types.ObjectId(userId);
    const targetUserObjectId = new mongoose.Types.ObjectId(targetUserId);

    // Remove target user from current user's chatUsers
    const currentUser = await User.findByIdAndUpdate(
      currentUserId,
      { $pull: { chatUsers: { userId: targetUserObjectId } } },
      { new: true }
    ).populate('chatUsers.userId', 'name email');

    if (!currentUser) {
      console.log('Current user not found:', userId);
      return NextResponse.json(
        { error: "Current user not found" },
        { status: 404 }
      );
    }

    // Remove current user from target user's chatUsers (reciprocal removal)
    const targetUser = await User.findByIdAndUpdate(
      targetUserObjectId,
      { $pull: { chatUsers: { userId: currentUserId } } },
      { new: true }
    );

    if (!targetUser) {
      console.log('Target user not found:', targetUserId);
      // Continue anyway since the main operation succeeded
    }

    console.log('Successfully removed chat users');
    
    // Transform the data to match the expected format
    const chatUsers = currentUser.chatUsers.map((chatUser: any) => ({
      _id: chatUser.userId._id.toString(),
      id: chatUser.userId._id.toString(),
      name: chatUser.userId.name,
      email: chatUser.userId.email,
      addedAt: chatUser.addedAt,
      pinned: chatUser.pinned || false
    }));

    return NextResponse.json({
      success: true,
      chatUsers
    });
  } catch (error) {
    console.error('Error in remove-chat API:', error);
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to remove user from chat" },
      { status: 500 }
    );
  }
}
