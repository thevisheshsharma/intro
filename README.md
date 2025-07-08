# Intro - AI-Powered Twitter Analysis Platform

A Next.js application that leverages Grok AI to analyze Twitter profiles and provide intelligent insights about users and organizations. The platform features a Neo4j-based graph database for efficient relationship mapping and mutual connections analysis.

## Features

- **Twitter Profile Analysis**: Analyze Twitter profiles to extract professional insights, role identification, and company information
- **Mutual Connections Discovery**: Find mutual followers and following connections between users using graph database relationships
- **Neo4j Graph Database**: Efficient storage and querying of Twitter user relationships and connections
- **Grok AI Integration**: Powered by Grok 3 models for intelligent analysis and real-time information retrieval
- **Organization Management**: Track and analyze organizations with their Twitter presence and ICP (Ideal Customer Profile) data
- **Real-time Streaming**: Stream responses from AI for better user experience
- **Intelligent Caching**: Efficient caching of Twitter data and analysis results with automatic invalidation
- **Authentication**: Secure user authentication with Clerk
- **Hybrid Database Architecture**: Neo4j for relationships, Supabase for structured data

## Tech Stack

- **Frontend**: Next.js 13 with App Router, React 18, TypeScript
- **Styling**: Tailwind CSS with custom components
- **Authentication**: Clerk
- **Graph Database**: Neo4j (for user relationships and connections)
- **Primary Database**: Supabase (PostgreSQL for structured data)
- **AI/ML**: Grok AI (X.AI API), OpenAI compatible
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Package Manager**: pnpm

## Prerequisites

- Node.js 18+ 
- pnpm
- Neo4j database (local or cloud instance)
- Supabase account and project
- Clerk account and application
- Grok API key from X.AI
- SocialAPI token for Twitter data access

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Neo4j Database
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password

# Supabase Database
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

# External APIs
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

4. Initialize Neo4j database schema:
```bash
# The schema will be automatically initialized on first API call
# Or manually trigger via: POST /api/neo4j/init-schema
```

5. Run Supabase migrations (if applicable):
```bash
pnpm db:migrate
```

6. Start the development server:
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
│   │   ├── find-mutuals/  # Mutual connections discovery
│   │   ├── find-from-org/ # Organization-based discovery
│   │   ├── grok-analyze/  # AI content analysis
│   │   ├── grok-analyze-org/ # Organization AI analysis
│   │   ├── neo4j/         # Neo4j database operations
│   │   ├── organization-icp-analysis/ # ICP management
│   │   ├── profile/       # User profile operations
│   │   ├── twitter/       # Twitter API endpoints
│   │   └── user/          # User synchronization
│   ├── auth/              # Authentication pages
│   ├── sign-in/           # Sign-in flow
│   └── sign-up/           # Sign-up flow
├── components/            # React components
│   ├── icp/               # ICP management components
│   ├── twitter/           # Twitter analysis components
│   └── ui/                # Reusable UI components
├── lib/                   # Utility libraries
│   ├── hooks/             # Custom React hooks
│   ├── neo4j/             # Neo4j services and utilities
│   │   └── services/      # Database service layer
│   ├── api-utils.ts       # Server-side API utilities
│   ├── constants.ts       # Application constants
│   ├── grok.ts            # Grok AI client
│   ├── neo4j.ts           # Neo4j driver configuration
│   ├── socialapi-pagination.ts # SocialAPI integration
│   ├── supabase.ts        # Supabase client
│   └── twitter-cache.ts   # Twitter data caching
└── middleware.ts          # Next.js middleware
```

## Key Features

### Mutual Connections Discovery
- **Neo4j Graph Database**: Efficient storage and querying of Twitter user relationships
- **Intelligent Syncing**: Automatic detection of stale data with incremental updates
- **Relationship Mapping**: Track follower/following relationships between users
- **Fast Mutual Finding**: Graph-based queries for discovering mutual connections

### Twitter Analysis
- **Profile Data Extraction**: Comprehensive Twitter profile information caching
- **Follower/Following Analysis**: Track and analyze user connections
- **Professional Role Identification**: AI-powered extraction of job roles and companies
- **Engagement Pattern Analysis**: Insights into user interaction patterns

### Grok AI Integration
- **Multiple Model Support**: Grok 3, Grok 3 Mini, Grok 3 Mini Fast
- **Real-time Streaming**: Live response streaming for better UX
- **Live Search Capabilities**: Access to real-time information
- **Function Calling Support**: Advanced AI capabilities for complex tasks

### Organization Management
- **ICP (Ideal Customer Profile) Tracking**: Manage and analyze target customer profiles
- **Twitter Presence Monitoring**: Track organizational Twitter activity
- **Automated Analysis**: AI-powered insights and recommendations

### Intelligent Caching System
- **Multi-layer Caching**: Twitter API responses, analysis results, and graph data
- **Automatic Invalidation**: Smart cache invalidation based on data freshness
- **Configurable Durations**: Flexible cache timing configurations
- **Performance Optimization**: Reduced API calls and improved response times

## Architecture

### Database Design

The application uses a hybrid database architecture optimized for different data types:

#### Neo4j Graph Database
- **User Relationships**: Stores follower/following connections as graph relationships
- **Mutual Connections**: Efficient graph queries for finding mutual connections
- **Relationship Metadata**: Tracks relationship creation dates and sync status
- **Schema**: Automated constraint creation for data integrity

#### Supabase (PostgreSQL)
- **Structured Data**: User profiles, organizations, and ICP analysis results
- **Analytics Data**: Engagement metrics and analysis history
- **Authentication Data**: User session and preference management

### Data Flow

1. **User Sync**: Twitter data fetched via SocialAPI and stored in Neo4j
2. **Relationship Mapping**: Follower/following relationships created as graph edges
3. **Mutual Discovery**: Graph queries find connections between users
4. **AI Analysis**: Grok AI analyzes profiles and relationships
5. **Result Storage**: Analysis results cached in both databases

### Performance Optimizations

- **Incremental Updates**: Only sync changed follower/following data
- **Intelligent Caching**: Multi-layer caching strategy
- **Batch Operations**: Bulk relationship creation for efficiency
- **Stale Data Detection**: Automatic identification of outdated user data

## API Endpoints

### Core Features
- `POST /api/find-mutuals` - Find mutual connections between two Twitter users
- `POST /api/find-from-org` - Find connections from organization members
- `GET /api/profile/[userId]` - Get comprehensive user profile data
- `POST /api/user/sync-followers` - Synchronize user follower data

### Neo4j Database
- `POST /api/neo4j/init-schema` - Initialize database schema and constraints

### Grok AI
- `POST /api/grok-analyze` - Analyze content with Grok AI models
- `POST /api/grok-analyze-org` - Organization-specific AI analysis

### Twitter Integration
- `GET /api/twitter/user-lookup` - Look up Twitter user information
- `GET /api/twitter/following-list` - Get user's following list with pagination
- `GET /api/twitter/followers` - Get user's followers with pagination

### Organizations
- `POST /api/organization-icp-analysis/save` - Save ICP analysis results

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and commit: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Create a Pull Request

### Development Guidelines

- Follow TypeScript best practices and maintain type safety
- Use the service layer pattern for database operations
- Implement proper error handling and logging
- Write comprehensive tests for new features
- Ensure Neo4j relationships are properly managed
- Cache strategically to minimize API calls

### Code Structure

- **Services**: Database operations go in `/src/lib/neo4j/services/`
- **API Routes**: RESTful endpoints in `/src/app/api/`
- **Components**: Reusable UI components in `/src/components/`
- **Utilities**: Helper functions in `/src/lib/`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact [your-email] or create an issue in the repository.
