import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Fetching user with ID:', params.id);
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      console.error('Invalid user ID format:', params.id);
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    const user = await User.findById(params.id, { password: 0 });
    
    if (!user) {
      console.error('User not found with ID:', params.id);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Transform the data to match the expected format
    const userData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email
    };

    console.log('Sending user data:', userData);
    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error in user API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
} 