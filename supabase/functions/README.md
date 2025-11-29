# Supabase Functions Directory

This directory contains all serverless functions for your Reclaim AI App project, powered by Supabase Edge Functions.

## Structure

- `_shared/` — Shared utilities (CORS headers, etc.)
- `analyze-evidence/` — Main function for analyzing evidence using Gemini (GBV detection)
- `chat-support/` — Simple chatbot function for user support

## Environment Variables

Set these in your Supabase project:
- `SUPABASE_URL` — Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key for DB/storage access
- `GEMINI_API_KEY` — API key for Gemini (Google Generative Language API)

## Usage

- `analyze-evidence` expects a POST request with `{ evidenceId, filePath }`.
- It fetches the file from Supabase Storage, determines MIME type, and analyzes text files for GBV using Gemini.
- Results are saved to the `evidence` table.

## Adding/Removing Functions
- To add a new function: create a new folder with an `index.ts`.
- To remove legacy AI code: delete unused files (e.g., `ai-utils.ts` if not needed).

## Deployment

Deploy with:
```bash
supabase functions deploy analyze-evidence
supabase functions deploy chat-support
```

## Logs

View logs in the Supabase dashboard or with:
```bash
supabase functions logs analyze-evidence
```

## Contact
For help, see the Supabase docs or ask your developer lead.
