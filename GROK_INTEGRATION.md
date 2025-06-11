# Grok API Integration Documentation

## Overview

This document provides comprehensive information about the Grok API integration in the intro app. The integration provides AI-powered insights and analysis capabilities using xAI's Grok models.

## 🚀 Quick Start

### 1. Environment Setup
Ensure your `.env.local` file contains:
```bash
GROK_API_KEY="your_grok_api_key_here"
```

### 2. Available Models
- **grok-beta**: Full-featured model for detailed analysis
- **grok-vision-beta**: Vision-capable model (for future use)

### 3. Testing the Integration
Visit `/grok-test` to test the API endpoints directly.

## 📁 File Structure

```
src/
├── lib/
│   ├── grok.ts                     # Core Grok API client
│   └── hooks/
│       └── useGrok.ts              # React hooks for Grok
├── app/
│   └── api/
│       ├── grok-analyze/           # Standard completions
│       ├── grok-stream/            # Streaming responses
│       └── grok-functions/         # Function calling
└── components/
    └── grok/
        ├── grok-chat.tsx           # Chat interface
        ├── grok-analysis-panel.tsx # Analysis panel
        └── grok-quick-actions.tsx  # Quick action buttons
```

## 🔧 API Endpoints

### 1. `/api/grok-analyze` (POST)
Standard chat completions with different analysis types.

**Request Body:**
```json
{
  "message": "Your message here",
  "context": "Optional context",
  "analysisType": "general|twitter|profile|content",
  "useFullModel": true
}
```

**Response:**
```json
{
  "response": "Grok's response",
  "model": "grok-beta",
  "usage": { "total_tokens": 150 },
  "analysisType": "general"
}
```

### 2. `/api/grok-stream` (POST)
Streaming responses for real-time text generation.

**Request Body:** Same as `/api/grok-analyze`

**Response:** Server-Sent Events (SSE)
```
data: {"content": "Partial response...", "done": false}
data: {"content": "", "done": true}
```

### 3. `/api/grok-functions` (POST)
Function calling capabilities for structured responses.

**Request Body:**
```json
{
  "message": "Analyze this profile",
  "context": "Profile data...",
  "functions": [...], // Optional custom functions
  "useFullModel": true
}
```

## 🎯 Analysis Types

### General
- **Purpose**: General AI assistance
- **Use Case**: Any general questions or analysis
- **System Prompt**: Conversational and informative responses

### Twitter
- **Purpose**: Social media strategy analysis
- **Use Case**: Analyzing Twitter profiles, engagement, growth strategies
- **System Prompt**: Focus on social media insights and optimization

### Profile
- **Purpose**: Profile optimization suggestions
- **Use Case**: Improving online presence and professional positioning
- **System Prompt**: Professional insights and networking opportunities

### Content
- **Purpose**: Content strategy recommendations
- **Use Case**: Content creation, engagement optimization
- **System Prompt**: Creative content suggestions and audience insights

## 🎨 React Components

### GrokChat
Full-featured chat interface with streaming support.

```tsx
import { GrokChat } from '@/components/grok/grok-chat'

<GrokChat 
  context="Optional context"
  analysisType="twitter"
  onAnalysisComplete={(analysis) => console.log(analysis)}
/>
```

**Features:**
- Real-time streaming responses
- Model selection (Grok-Beta vs Grok-Mini)
- Stream vs Standard mode toggle
- Message history
- Context-aware conversations

### GrokAnalysisPanel
Analysis panel for data insights.

```tsx
import { GrokAnalysisPanel } from '@/components/grok/grok-analysis-panel'

<GrokAnalysisPanel 
  data={profileData}
  dataType="profile"
  title="Profile Analysis"
/>
```

**Features:**
- Multiple analysis types
- Quick action buttons
- Error handling
- Loading states

### GrokQuickActions
Pre-built action buttons for common tasks.

```tsx
import { GrokQuickActions } from '@/components/grok/grok-quick-actions'

<GrokQuickActions 
  data={userData}
  context="User analysis"
  onResult={(result, action) => handleResult(result, action)}
/>
```

**Available Actions:**
- Profile Optimization
- Content Ideas
- Growth Strategy
- Audience Analysis
- Engagement Boost
- Quick Summary

## 🔨 React Hooks

### useGrokAnalysis
For standard API calls.

```tsx
import { useGrokAnalysis } from '@/lib/hooks/useGrok'

const { analyze, loading, error } = useGrokAnalysis()

const result = await analyze('Your message', {
  context: 'Optional context',
  analysisType: 'twitter',
  useFullModel: true
})
```

### useGrokStream
For streaming responses.

```tsx
import { useGrokStream } from '@/lib/hooks/useGrok'

const { stream, streaming, error } = useGrokStream()

await stream(
  'Your message',
  (chunk) => {
    if (chunk.content) {
      console.log('Received:', chunk.content)
    }
    if (chunk.done) {
      console.log('Stream completed')
    }
  },
  { analysisType: 'general' }
)
```

### useGrokFunctions
For function calling.

```tsx
import { useGrokFunctions } from '@/lib/hooks/useGrok'

const { callFunction, executeFunction, loading, error } = useGrokFunctions()

const result = await callFunction('Analyze this profile', customFunctions)
```

## 🎛️ Configuration

### Model Configurations

```typescript
// Available in src/lib/grok.ts
export const GROK_CONFIGS = {
  MINI: {
    model: 'grok-beta',
    temperature: 0.7,
    max_tokens: 1000,
  },
  FULL: {
    model: 'grok-beta',
    temperature: 0.3,
    max_tokens: 4000,
  },
  VISION: {
    model: 'grok-vision-beta',
    temperature: 0.5,
    max_tokens: 2000,
  },
}
```

### Custom System Prompts

You can customize system prompts for different use cases:

```typescript
const customPrompt = "You are a social media expert focused on Twitter growth strategies."

const result = await analyze(userMessage, {
  context: `System: ${customPrompt}\n\nUser Data: ${userData}`,
  analysisType: 'twitter'
})
```

## 🔍 Integration Points

### Main App Integration

The Grok integration is seamlessly integrated into the main app:

1. **Sidebar**: Grok AI menu item with chat panel
2. **Search Results**: AI insights for searched profiles
3. **Profile Analysis**: Quick action buttons for instant analysis
4. **Network Analysis**: Automated insights for mutual connections

### Usage in Main App

```tsx
// In your main page component
import { GrokAnalysisPanel } from '@/components/grok/grok-analysis-panel'
import { GrokQuickActions } from '@/components/grok/grok-quick-actions'

// For profile analysis
<GrokAnalysisPanel
  data={{
    searchedProfile,
    mutualConnections: followings,
    connectionCount: followings.length
  }}
  dataType="followers"
  title="Network Analysis"
/>

// For quick actions
<GrokQuickActions 
  data={searchedProfile}
  context={`Analyzed profile: ${profile.name}`}
/>
```

## 🛠️ Development

### Adding New Analysis Types

1. Update the `systemPrompts` object in API routes
2. Add the new type to TypeScript interfaces
3. Update component prop types
4. Add UI elements for the new type

### Creating Custom Functions

```typescript
const customFunction = {
  name: 'analyze_engagement',
  description: 'Analyze engagement patterns',
  parameters: {
    type: 'object',
    properties: {
      posts: { type: 'array', description: 'Array of posts' },
      timeframe: { type: 'string', description: 'Analysis timeframe' }
    },
    required: ['posts']
  }
}

const result = await callFunction('Analyze engagement', [customFunction])
```

### Error Handling

All components and hooks include comprehensive error handling:

```tsx
const { analyze, loading, error } = useGrokAnalysis()

if (error) {
  console.error('Grok API Error:', error)
  // Handle error appropriately
}
```

## 📊 Best Practices

### 1. Context Management
- Always provide relevant context for better responses
- Keep context concise but informative
- Use structured data when possible

### 2. Model Selection
- Use FULL model for complex analysis
- Use MINI model for quick responses
- Consider using streaming for better UX

### 3. Rate Limiting
- Implement client-side debouncing for frequent requests
- Cache results when appropriate
- Use streaming for long responses

### 4. Error Handling
- Always handle API errors gracefully
- Provide meaningful error messages to users
- Implement retry logic for transient failures

## 🔒 Security

### Authentication
All API endpoints are protected with Clerk authentication:

```typescript
const { userId } = auth()
if (!userId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### API Key Management
- API key is stored securely in environment variables
- Never expose the API key in client-side code
- Rotate API keys regularly

## 🚀 Future Enhancements

### Planned Features
1. **Conversation History**: Persistent chat history
2. **Response Caching**: Cache frequent queries
3. **Batch Analysis**: Analyze multiple profiles at once
4. **Custom Templates**: User-defined analysis templates
5. **Real-time Insights**: Live data analysis
6. **Export Functionality**: Save and share analysis results

### Advanced Integrations
1. **Twitter API Integration**: Direct Twitter data analysis
2. **Scheduled Reports**: Automated analysis reports
3. **Team Collaboration**: Share insights with team members
4. **Analytics Dashboard**: Visual representation of insights

## 📝 Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check authentication, ensure user is logged in
2. **API Key Invalid**: Verify GROK_API_KEY in environment variables
3. **Streaming Issues**: Check network connectivity and CORS settings
4. **Type Errors**: Ensure all TypeScript interfaces are properly imported

### Debug Mode

Enable debug logging:

```typescript
// In development
if (process.env.NODE_ENV === 'development') {
  console.log('Grok API Request:', requestData)
  console.log('Grok API Response:', responseData)
}
```

## 📞 Support

For issues or questions:
1. Check the test page at `/grok-test`
2. Review browser console for errors
3. Check API endpoint logs
4. Verify environment configuration

---

*This integration provides a powerful AI-enhanced experience for your Twitter networking app. The modular design makes it easy to extend and customize for your specific needs.*
