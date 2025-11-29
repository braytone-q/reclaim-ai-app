# analyze-evidence Supabase Function

This function analyzes evidence files for gender-based violence (GBV) using Gemini (Google Generative Language API).

## How It Works
- Accepts a POST request with `{ evidenceId, filePath }`.
- Fetches the file from Supabase Storage.
- Determines MIME type.
- If the file is text, sends it to Gemini with a GBV detection prompt.
- Parses Gemini's JSON response and updates the evidence record in the database.
- Returns a structured JSON result.

## Environment Variables
- `GEMINI_API_KEY` must be set in your Supabase project.

## Example Request
```json
{
  "evidenceId": "abc123",
  "filePath": "user/abc123/evidence.txt"
}
```

## Example Response
```json
{
  "result": {
    "id": "abc123",
    "summary": "Brief summary of findings",
    "labels": ["harassment", "threats"],
    "severity": "High",
    "details": {
      "threats": ["example"],
      "harassment": [],
      "sexualAbuse": [],
      "hateSpeech": [],
      "blackmail": [],
      "other": []
    },
    "analyzedAt": "2025-11-29T12:00:00Z"
  }
}
```

## Error Handling
- Returns 500 with error details if analysis fails or Gemini API is unavailable.
