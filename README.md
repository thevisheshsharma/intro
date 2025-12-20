# Intro - AI-Powered Twitter Analysis Platform

A sophisticated Next.js application that leverages Grok AI and advanced graph databases to provide comprehensive Twitter profile analysis, organizational intelligence, and relationship mapping. The platform specializes in Web3 ecosystem analysis with deep ICP (Ideal Customer Profile) insights and automated classification systems.

## Features

- **Advanced Twitter Profile Analysis**: AI-powered extraction of professional insights, role identification, and company affiliations with confidence scoring
- **Intelligent Classification System**: Automated detection of individuals, organizations, spam accounts, and Web3 entities with detailed categorization
- **Comprehensive ICP Analysis**: Deep organizational profiling including market position, tokenomics, community health, and competitive landscape
- **Graph-Based Relationship Mapping**: Neo4j-powered storage and analysis of Twitter connections with mutual discovery capabilities
- **Multi-Model AI Integration**: Grok 4 models with enhanced reasoning and live search capabilities for real-time information retrieval
- **Organization Discovery Pipeline**: Automated identification and classification of Web3 organizations from Twitter data
- **Employment Relationship Tracking**: AI-driven extraction and mapping of professional relationships and company affiliations
- **Real-time Streaming Analysis**: Live AI response streaming with progressive data processing
- **Intelligent Caching System**: Multi-layer caching with automatic invalidation and stale data detection
- **Web3-Focused Analytics**: Specialized analysis for DeFi protocols, DAOs, exchanges, infrastructure, and investment funds

## Tech Stack

- **Frontend**: Next.js 13 with App Router, React 18, TypeScript
- **Styling**: Tailwind CSS with Radix UI primitives and Lucide React icons
- **Authentication**: Clerk with role-based access control
- **Graph Database**: Neo4j (relationships, connections, organizational hierarchies, ICP analysis storage)
- **AI/ML**: Grok AI (X.AI API) with OpenAI-compatible interface
- **External APIs**: SocialAPI for Twitter data, live search integration
- **Package Manager**: pnpm with optimized dependency management
- **Job Scheduling**: node-cron for automated data synchronization

## Prerequisites

- Node.js 18+
- pnpm package manager
- Neo4j database (local or cloud instance)
- Clerk authentication application
- Grok API key from X.AI
- SocialAPI bearer token for Twitter data access

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Neo4j Graph Database
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password

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

3. Set up environment variables (see above)

4. Initialize Neo4j database schema:
```bash
# Schema automatically initializes on first API call
# Manual trigger: POST /api/neo4j/init-schema
```

5. Start the development server:
```bash
pnpm dev
```

Access the application at `http://localhost:3000`

## Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build optimized production bundle
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint code analysis
- `pnpm lint:fix` - Auto-fix ESLint issues
- `pnpm type-check` - Run TypeScript type checking
- `pnpm clean` - Clean build artifacts and cache
- `pnpm db:migrate` - Run database migrations

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                     # API endpoints
│   │   ├── find-mutuals/        # Mutual connections discovery
│   │   ├── find-from-org/       # Organization-based user discovery
│   │   ├── grok-analyze/        # General AI content analysis
│   │   ├── grok-analyze-org/    # Organization-specific AI analysis
│   │   ├── neo4j/               # Neo4j database operations
│   │   ├── organization-icp-analysis/ # ICP management endpoints
│   │   ├── profile/             # User profile operations
│   │   ├── twitter/             # Twitter API integration
│   │   └── user/                # User data synchronization
│   ├── (dashboard)/             # Protected dashboard routes
│   ├── auth/                    # Authentication pages
│   └── globals.css              # Global styles
├── components/                   # React components
│   ├── icp/                     # ICP analysis and management
│   │   ├── enhanced-icp-display.tsx    # Comprehensive ICP visualization
│   │   ├── find-from-org-panel.tsx     # Organization discovery interface
│   │   └── manage-org-panel.tsx        # Organization management UI
│   ├── twitter/                 # Twitter-specific components
│   │   └── profile-analysis.tsx # Profile analysis interface
│   └── ui/                      # Reusable UI components
├── jobs/                        # Scheduled job handlers
├── lib/                         # Core utilities and services
│   ├── hooks/                   # Custom React hooks
│   │   └── useGrok.ts          # Grok AI integration hook
│   ├── neo4j/                  # Neo4j database layer
│   │   └── services/           # Database service implementations
│   │       └── user-service.ts # User and organization data services
│   ├── api-utils.ts            # Server-side API utilities
│   ├── classifier.ts           # AI-powered classification system
│   ├── constants.ts            # Application constants and enums
│   ├── error-utils.ts          # Error handling utilities
│   ├── grok.ts                 # Grok AI client and analysis functions
│   ├── neo4j.ts               # Neo4j driver configuration
│   ├── socialapi-pagination.ts # SocialAPI integration utilities
│   └── validation.ts          # Data validation schemas
└── middleware.ts               # Next.js middleware for auth and routing
```

## Key Features

### Advanced Classification System
- **AI-Powered Entity Detection**: Automatically classifies Twitter accounts as individuals, organizations, or spam
- **Web3 Specialization**: Detailed categorization of protocols, exchanges, DAOs, infrastructure, and investment funds
- **Employment Relationship Mapping**: Extracts and tracks professional relationships between individuals and organizations
- **Confidence Scoring**: Provides reliability metrics for all classification results

### Comprehensive ICP Analysis
- **Multi-Dimensional Profiling**: Analyzes organizations across 50+ data points including market position, tokenomics, and community health
- **Real-Time Data Integration**: Leverages live search to gather current information from multiple sources
- **Classification-Specific Analysis**: Tailored analysis approaches for different organization types (DeFi, infrastructure, exchanges, etc.)
- **Structured Data Output**: Consistent schema for all analysis results with validation

### Organization Discovery Pipeline
- **Automated Discovery**: Identifies organization members and relationships from Twitter data
- **Batch Processing**: Efficient handling of large-scale organizational analysis
- **Relationship Mapping**: Creates comprehensive org charts and professional networks
- **Grok-Powered Insights**: AI-driven analysis of organizational structure and dynamics

### Neo4j Graph Database
- **Relationship Storage**: Efficient storage of follower/following connections as graph relationships
- **Mutual Connection Discovery**: Fast graph queries for finding shared connections
- **Organizational Hierarchies**: Maps employment relationships and company structures
- **Performance Optimization**: Batch operations and intelligent caching for scalability

### Twitter Data Management
- **Intelligent Caching**: Multi-layer caching strategy with automatic invalidation
- **SocialAPI Integration**: Robust Twitter data fetching with pagination and rate limiting
- **Stale Data Detection**: Automatic identification and refresh of outdated information
- **Error Handling**: Comprehensive error recovery and logging systems

### Grok AI Integration
- **Multiple Model Support**: Grok 4 Latest, Grok 4.1 Fast Reasoning, and Grok 4.1 Fast Non-Reasoning variants optimized for speed and efficiency
- **Live Search Capabilities**: Real-time information retrieval and analysis
- **Streaming Responses**: Progressive result delivery for better user experience
- **Function Calling**: Advanced AI capabilities for complex analytical tasks

## API Endpoints

### Core Discovery Features
- `POST /api/find-mutuals` - Find mutual connections between Twitter users
- `POST /api/find-from-org` - Discover individuals associated with organizations
- `GET /api/profile/[userId]` - Retrieve comprehensive user profile data
- `POST /api/user/sync-followers` - Synchronize user follower/following data

### AI Analysis
- `POST /api/grok-analyze` - General-purpose AI content analysis
- `POST /api/grok-analyze-org` - Organization-specific AI analysis with classification

### Database Operations
- `POST /api/neo4j/init-schema` - Initialize Neo4j database schema and constraints

### Twitter Integration
- `GET /api/twitter/user-lookup` - Look up Twitter user information
- `GET /api/twitter/following-list` - Get paginated following list
- `GET /api/twitter/followers` - Get paginated followers list

### Organization Management
- `POST /api/organization-icp-analysis/save` - Save comprehensive ICP analysis results

## Architecture

### Hybrid Database Strategy

#### Neo4j Graph Database
- **User Relationships**: Follower/following connections as graph edges
- **Employment Relationships**: WORKS_AT and WORKED_AT relationships
- **Organizational Hierarchies**: Company structures and team relationships
- **Mutual Discovery**: Efficient graph traversal for connection analysis

#### Neo4j Graph Database
- **Relationship Storage**: Social connections, employment relationships, affiliations
- **ICP Analysis Storage**: Comprehensive organizational profiling data with flattened properties
- **User Profiles**: Twitter profile data with entity classification
- **Authentication Data**: User sessions and application preferences
- **Real-time Analytics**: Performance metrics and usage statistics

### Data Processing Pipeline

1. **Profile Discovery**: SocialAPI fetches Twitter profile and connection data
2. **Classification**: AI-powered entity detection and categorization  
3. **Relationship Mapping**: Graph database storage of connections and employment
4. **ICP Analysis**: Comprehensive organizational profiling stored as Neo4j properties
5. **Real-time Processing**: Live data processing with intelligent caching

### Performance Optimizations

- **Batch Processing**: Bulk operations for large-scale data processing
- **Intelligent Caching**: Strategic caching at multiple layers
- **Incremental Updates**: Only process changed data to minimize API calls
- **Parallel Processing**: Concurrent analysis of multiple profiles
- **Schema Optimization**: Efficient database schemas and indexing strategies

## Web3 Specialization

### Supported Organization Types
- **DeFi Protocols**: TVL analysis, yield mechanisms, tokenomics
- **Infrastructure**: Network performance, developer adoption, security audits
- **Exchanges**: Trading volume, liquidity analysis, regulatory compliance
- **Investment Funds**: Portfolio analysis, fund metrics, investment thesis
- **DAOs/Communities**: Governance analysis, treasury management, member engagement
- **Service Providers**: Market analysis, client relationships, service offerings

### Data Sources Integration
- **On-chain Analytics**: DeFiLlama, Dune Analytics, Etherscan
- **Market Data**: CoinGecko, CoinMarketCap, Messari
- **Developer Metrics**: GitHub, documentation sites, technical forums
- **Community Data**: Discord, Telegram, governance platforms
- **News and Analysis**: Crypto news sites, research reports, social media

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with proper TypeScript typing
4. Add comprehensive tests for new functionality
5. Commit changes: `git commit -am 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Create a Pull Request

### Development Guidelines

- **TypeScript First**: Maintain strict type safety throughout the codebase
- **Service Layer Pattern**: Database operations through dedicated service classes
- **Error Handling**: Comprehensive error handling with proper logging
- **Testing**: Unit and integration tests for all new features
- **Performance**: Optimize for scalability and efficient resource usage
- **Documentation**: Clear inline documentation and API documentation

### Code Organization

- **Services**: Database operations in `/src/lib/neo4j/services/`
- **API Routes**: RESTful endpoints in `/src/app/api/`
- **Components**: Reusable React components in `/src/components/`
- **Utilities**: Helper functions and configurations in `/src/lib/`
- **Jobs**: Scheduled tasks and background processes in `/src/jobs/`

## Deployment

### Production Requirements
- Neo4j database with appropriate memory allocation for relationship traversals
- Environment variables configured for production
- Clerk authentication properly configured
- SocialAPI rate limits configured for production usage

### Performance Monitoring
- Monitor Neo4j query performance and memory usage
- Track API response times and error rates
- Monitor Grok AI usage and costs
- Implement logging for debugging and analytics

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For technical support, feature requests, or bug reports, please create an issue in the repository with detailed information about your environment and the issue encountered.