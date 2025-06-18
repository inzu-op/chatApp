export const runtime = "nodejs"; 

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Message from '@/app/models/Message';

// Send a new message
export async function POST(req: Request) {
  try {
    await connectDB();
    const { text, receiverId, senderId } = await req.json();

    // Validate required fields
    if (!text || !receiverId || !senderId) {
      return NextResponse.json(
        { error: 'Missing required fields: text, receiverId, or senderId' },
        { status: 400 }
      );
    }

    // Validate text length
    if (text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message text cannot be empty' },
        { status: 400 }
      );
    }

    // Create new message
    const message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      text: text.trim(),
      timestamp: new Date(),
      read: false
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}

// Get messages between two users
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const currentUserId = searchParams.get('currentUserId');

    // Validate required parameters
    if (!userId || !currentUserId) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId or currentUserId' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find messages where either user is sender or receiver
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ]
    })
    .sort({ timestamp: 1 })
    .populate('sender', 'name email')
    .populate('receiver', 'name email');

    // Mark messages as read
    await Message.updateMany(
      {
        sender: userId,
        receiver: currentUserId,
        read: false
      },
      { read: true }
    );

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
} 
