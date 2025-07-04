export interface ConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironmentConfig(): ConfigValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required for basic functionality
  if (!process.env.SMITHERY_API_KEY) {
    errors.push('SMITHERY_API_KEY is required for MCP server registry access');
  }

  if (!process.env.NEXTAUTH_SECRET) {
    errors.push('NEXTAUTH_SECRET is required for user sessions');
  }

  if (!process.env.NEXTAUTH_URL) {
    warnings.push('NEXTAUTH_URL not set - using default localhost:3000');
  }

  // Gmail and Google Calendar MCP specific validation
  const hasGoogleClientId = !!process.env.GOOGLE_CLIENT_ID;
  const hasGoogleClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;

  if (!hasGoogleClientId && !hasGoogleClientSecret) {
    warnings.push('Gmail and Google Calendar MCPs are disabled - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not configured');
  } else if (!hasGoogleClientId) {
    errors.push('GOOGLE_CLIENT_ID is required for Gmail and Google Calendar MCP integration');
  } else if (!hasGoogleClientSecret) {
    errors.push('GOOGLE_CLIENT_SECRET is required for Gmail and Google Calendar MCP integration');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getGmailSetupInstructions(): string[] {
  return [
    '1. Go to Google Cloud Console (https://console.cloud.google.com/)',
    '2. Create or select a project',
    '3. Enable the Gmail API',
    '4. Create OAuth 2.0 credentials (Web application)',
    '5. Add redirect URI: http://localhost:3000/api/auth/gmail',
    '6. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local',
  ];
}

export function isGmailConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
} 