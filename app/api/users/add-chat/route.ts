import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  try {
    const { userId, targetUserId } = await request.json();

    if (!userId || !targetUserId) {
      return NextResponse.json(
        { error: 'Both userId and targetUserId are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Validate both users exist
    const [currentUser, targetUser] = await Promise.all([
      User.findById(userId),
      User.findById(targetUserId)
    ]);

    if (!currentUser || !targetUser) {
      return NextResponse.json(
        { error: 'One or both users not found' },
        { status: 404 }
      );
    }

    // Check if user is trying to add themselves
    if (userId === targetUserId) {
      return NextResponse.json(
        { error: 'Cannot add yourself to chat' },
        { status: 400 }
      );
    }

    // Check if user is already in chat list
    const isAlreadyAdded = currentUser.chatUsers?.some(
      (chatUser: any) => chatUser.userId.toString() === targetUserId
    );

    if (isAlreadyAdded) {
      return NextResponse.json(
        { error: 'User is already in your chat list' },
        { status: 400 }
      );
    }

    // Add target user to current user's chat list
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          chatUsers: {
            userId: new mongoose.Types.ObjectId(targetUserId),
            addedAt: new Date()
          }
        }
      },
      { new: true }
    ).populate('chatUsers.userId', 'name email');

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Transform the data to match the expected format
    const chatUsers = updatedUser.chatUsers.map((chatUser: any) => ({
      id: chatUser.userId._id.toString(),
      name: chatUser.userId.name,
      email: chatUser.userId.email,
      addedAt: chatUser.addedAt
    }));

    return NextResponse.json(chatUsers);
  } catch (error) {
    console.error('Error adding chat user:', error);
    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to add chat user' },
      { status: 500 }
    );
  }
} 