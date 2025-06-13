import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('Received request for userId:', userId);

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the current user and populate their chat users
    const user = await User.findById(userId).populate('chatUsers.userId', 'name email');
    
    if (!user) {
      console.log('User not found for ID:', userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('Found user:', user.name, 'with chat users:', user.chatUsers);

    // Transform the data to match the expected format
    const chatUsers = user.chatUsers.map((chatUser: any) => {
      const userData = {
        id: chatUser.userId._id.toString(),
        name: chatUser.userId.name,
        email: chatUser.userId.email,
        addedAt: chatUser.addedAt
      };
      console.log('Transformed user data:', userData);
      return userData;
    });

    console.log('Sending chat users:', chatUsers);
    return NextResponse.json(chatUsers);
  } catch (error) {
    console.error('Error in chat-users API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat users' },
      { status: 500 }
    );
  }
} 