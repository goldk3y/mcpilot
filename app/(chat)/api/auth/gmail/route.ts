import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { updateUserGmailToken, } from '@/lib/db/queries';

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Gmail scopes needed for the MCP server
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing'
].join(' ');

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return NextResponse.json({ error: 'Google Client ID not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      // Step 1: Redirect to Google OAuth
      const authUrl = new URL(GOOGLE_OAUTH_URL);
      authUrl.searchParams.set('client_id', googleClientId);
      authUrl.searchParams.set('redirect_uri', `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/gmail`);
      authUrl.searchParams.set('scope', GMAIL_SCOPES);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', session.user.id);

      return NextResponse.redirect(authUrl.toString());
    }

    // Step 2: Exchange code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/gmail`,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return NextResponse.json({ error: 'Token exchange failed' }, { status: 400 });
    }

    const tokens = await tokenResponse.json();

    if (!tokens.refresh_token) {
      return NextResponse.json({ 
        error: 'No refresh token received. Please revoke access and try again.' 
      }, { status: 400 });
    }

    // Store the refresh token in the database
    await updateUserGmailToken(session.user.id, tokens.refresh_token);
    
    // Redirect back to the app with success
    const redirectUrl = new URL('/', process.env.NEXTAUTH_URL || 'http://localhost:3000');
    redirectUrl.searchParams.set('gmail_connected', 'true');
    
    return NextResponse.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('Gmail OAuth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For disconnecting Gmail - remove stored refresh token from database
    await updateUserGmailToken(session.user.id, null);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gmail disconnect error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 