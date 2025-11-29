# Shared Utilities for Supabase Functions

This folder contains shared code for all Supabase Edge Functions in your project.

## Files
- `cors.ts`: CORS headers for browser/API requests
- `ai-utils.ts`: (Legacy) OpenAI/Google Vision helpers. Can be deleted if only Gemini is used.

## Usage
Import from here in your function code:
```typescript
import { corsHeaders } from '../_shared/cors.ts';
```

## Cleanup
If you only use Gemini for analysis, you can safely delete `ai-utils.ts`.
