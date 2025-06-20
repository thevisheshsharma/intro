# Intro - AI-Powered Twitter Analysis Platform

A Next.js application that leverages Grok AI to analyze Twitter profiles and provide intelligent insights about users and organizations.

## Features

- **Twitter Profile Analysis**: Analyze Twitter profiles to extract professional insights, role identification, and company information
- **Grok AI Integration**: Powered by Grok 3 models for intelligent analysis and real-time information retrieval
- **Organization Management**: Track and analyze organizations with their Twitter presence and ICP (Ideal Customer Profile) data
- **Real-time Streaming**: Stream responses from AI for better user experience
- **Caching System**: Efficient caching of Twitter data and analysis results
- **Authentication**: Secure user authentication with Clerk
- **Database Integration**: Supabase for data persistence and management

## Tech Stack

- **Frontend**: Next.js 13 with App Router, React 18, TypeScript
- **Styling**: Tailwind CSS with custom components
- **Authentication**: Clerk
- **Database**: Supabase (PostgreSQL)
- **AI/ML**: Grok AI (X.AI API), OpenAI compatible
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Package Manager**: pnpm

## Prerequisites

- Node.js 18+ 
- pnpm
- Supabase account and project
- Clerk account and application
- Grok API key from X.AI

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Database
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Authentication
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# AI Services
GROK_API_KEY=your_grok_api_key

# Optional - External APIs
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
SOCIALAPI_BEARER_TOKEN=your_social_api_token

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd intro
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up your environment variables (see above)

4. Run database migrations:
```bash
pnpm db:migrate
```

5. Start the development server:
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint issues automatically
- `pnpm type-check` - Run TypeScript type checking
- `pnpm clean` - Clean build artifacts and cache
- `pnpm db:migrate` - Run database migrations

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── manage-org/        # Organization management
├── components/            # React components
│   ├── auth/              # Authentication components
│   ├── grok/              # Grok AI related components
│   ├── icp/               # ICP management components
│   ├── twitter/           # Twitter analysis components
│   └── ui/                # Reusable UI components
├── lib/                   # Utility libraries
│   ├── hooks/             # Custom React hooks
│   ├── api-client.ts      # API client utilities
│   ├── api-utils.ts       # Server-side API utilities
│   ├── constants.ts       # Application constants
│   ├── grok.ts            # Grok AI client
│   ├── supabase.ts        # Supabase client
│   └── twitter-cache.ts   # Twitter data caching
└── middleware.ts          # Next.js middleware
```

## Key Features

### Twitter Analysis
- Profile data extraction and caching
- Follower/following analysis
- Professional role and company identification
- Engagement pattern analysis

### Grok AI Integration
- Multiple model support (Grok 3, Grok 3 Mini, Grok 3 Mini Fast)
- Real-time streaming responses
- Live search capabilities
- Function calling support

### Organization Management
- ICP (Ideal Customer Profile) tracking
- Twitter presence monitoring
- Automated analysis and insights

### Caching System
- Twitter API response caching
- Analysis result caching
- Configurable cache durations
- Automatic cache invalidation

## API Endpoints

### Grok AI
- `POST /api/grok-analyze` - Analyze content with Grok
- `POST /api/grok-analyze-org` - Organization-specific analysis

### Twitter
- `GET /api/twitter/user-lookup` - Look up Twitter users
- `GET /api/twitter/followings` - Get user followings
- `GET /api/twitter/followers` - Get user followers

### Organizations
- `POST /api/organization-icp-analysis/save` - Save ICP analysis

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and commit: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact [your-email] or create an issue in the repository.
