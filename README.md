<a href="https://chat.vercel.ai/">
  <img alt="Next.js 14 and App Router-ready AI chatbot." src="app/(chat)/opengraph-image.png">
  <h1 align="center">Chat SDK</h1>
</a>

<p align="center">
    Chat SDK is a free, open-source template built with Next.js and the AI SDK that helps you quickly build powerful chatbot applications.
</p>

<p align="center">
  <a href="https://chat-sdk.dev"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports xAI (default), OpenAI, Fireworks, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Model Providers

This template ships with [xAI](https://x.ai) `grok-2-1212` as the default chat model. However, with the [AI SDK](https://sdk.vercel.ai/docs), you can switch LLM providers to [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://sdk.vercel.ai/providers/ai-sdk-providers) with just a few lines of code.

## Deploy Your Own

You can deploy your own version of the Next.js AI Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot&env=AUTH_SECRET&envDescription=Learn+more+about+how+to+get+the+API+Keys+for+the+application&envLink=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot%2Fblob%2Fmain%2F.env.example&demo-title=AI+Chatbot&demo-description=An+Open-Source+AI+Chatbot+Template+Built+With+Next.js+and+the+AI+SDK+by+Vercel.&demo-url=https%3A%2F%2Fchat.vercel.ai&products=%5B%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22ai%22%2C%22productSlug%22%3A%22grok%22%2C%22integrationSlug%22%3A%22xai%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22neon%22%2C%22integrationSlug%22%3A%22neon%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22upstash-kv%22%2C%22integrationSlug%22%3A%22upstash%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D)

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run Next.js AI Chatbot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000).

# MCPilot

MCPilot is a tool for running MCP servers with AI-powered email automation.

## Getting Started

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Required for MCP server registry
SMITHERY_API_KEY=your_smithery_api_key

# Required for Gmail MCP integration
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# NextAuth configuration (required for user sessions)
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your_nextauth_secret
```

### Gmail MCP Setup

To enable Gmail functionality, follow these steps:

#### 1. Google Cloud Console Setup

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create or select a project**
3. **Enable the Gmail API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Gmail API" and click "Enable"

4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - If prompted, configure the OAuth consent screen first:
     - Choose "External" user type
     - Fill in app name, user support email, and developer contact
     - Add scopes: `../auth/gmail.readonly`, `../auth/gmail.send`, `../auth/gmail.modify`, `../auth/gmail.compose`, `../auth/gmail.labels`, `../auth/gmail.settings.basic`, `../auth/gmail.settings.sharing`
   - For the OAuth client ID:
     - Application type: "Web application"
     - Name: "MCPilot Gmail Integration"
     - Authorized redirect URIs: `http://localhost:3001/api/auth/gmail`

5. **Download the credentials JSON file**

#### 2. Extract OAuth Credentials

From the downloaded JSON file, copy:
- `client_id` → Set as `GOOGLE_CLIENT_ID` in `.env.local`
- `client_secret` → Set as `GOOGLE_CLIENT_SECRET` in `.env.local`

#### 3. User Authentication Flow

Each user needs to connect their own Gmail account:

1. Start the development server: `npm run dev`
2. Open the MCP dropdown in the top navigation
3. Click "Configure Gmail Access"
4. Complete the Google OAuth flow
5. Grant the requested permissions

The Gmail MCP will then be available with 60+ email automation tools.

## Available MCP Servers

- **Exa Search**: Advanced web search and content discovery
- **Gmail MCP**: Comprehensive Gmail integration with tools for:
  - Sending and receiving emails
  - Managing drafts and labels
  - Searching and organizing messages
  - Handling attachments
  - Email automation and filtering

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) to view the application.

## Features

- ✨ Dynamic MCP server integration via Smithery Registry
- 🔐 Secure OAuth flow for Gmail authentication
- 📧 60+ Gmail automation tools through MCP
- 🔄 Real-time server status and connection management
- 🛡️ Automatic fallback for offline scenarios
- 👥 Per-user authentication (each user connects their own Gmail)

## Gmail MCP Tools

Once connected, users get access to powerful email automation including:

- **Email Management**: Send, read, search, organize
- **Draft Handling**: Create, edit, send drafts
- **Label Management**: Create, modify, organize labels
- **Thread Operations**: Manage email conversations
- **Advanced Features**: Filters, forwarding, vacation responder
- **Attachments**: Download and manage file attachments
- **Settings**: Modify Gmail preferences and configurations

## Security

- OAuth 2.0 flow ensures secure Gmail access
- Each user connects their own Google account
- Refresh tokens are handled securely
- Minimal required permissions (only Gmail-related scopes)
