import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getUserGmailToken } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has a Gmail refresh token stored
    const refreshToken = await getUserGmailToken(session.user.id);
    const connected = !!refreshToken;

    return NextResponse.json({ connected });
  } catch (error) {
    console.error('Gmail status check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 