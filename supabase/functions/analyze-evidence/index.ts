import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import { corsHeaders } from '../_shared/cors.ts';
import { encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

console.log('analyze-evidence function is booting up.');

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request.');
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log('Received a new analysis request.');
    if (!req.body) {
      throw new Error('Request body is missing.');
    }

    const requestPayload = await req.json();
    const { evidenceId, filePath } = requestPayload;

    if (!evidenceId || !filePath) {
      throw new Error('`evidenceId` and `filePath` are required.');
    }

    console.log(`Fetching evidence with ID: ${evidenceId}`);

    // Fetch evidence metadata
    const { data: evidenceData, error: fetchError } = await supabase
      .from('evidence')
      .select('*')
      .eq('id', evidenceId)
      .single();

    if (fetchError || !evidenceData) {
      console.error('Failed to fetch evidence metadata:', fetchError);
      throw new Error('Evidence record not found.');
    }

    console.log('Evidence metadata fetched. Downloading file...');

    // Download file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('evidence-files')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('Failed to download evidence file:', downloadError);
      throw new Error('Failed to retrieve evidence file from storage.');
    }

    // Determine MIME type
    const fileName = evidenceData.file_name || filePath;
    let mimeType = fileData.type || 'application/octet-stream';
    if (!mimeType || mimeType === 'application/octet-stream') {
      const ext = fileName.toLowerCase().split('.').pop() || '';
      const mimeMap: Record<string, string> = {
        'txt': 'text/plain',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'json': 'application/json',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
      };
      mimeType = mimeMap[ext] || mimeType;
    }

    console.log(`Determined MIME type: ${mimeType} for file: ${fileName}`);

    console.log('Performing AI analysis on evidence...');

    let summary = '';
    let labels = [];
    let severity = 'Medium';
    let details = {
      threats: [],
      harassment: [],
      sexualAbuse: [],
      hateSpeech: [],
      blackmail: [],
      other: [],
    };

    try {
      const geminiKey = Deno.env.get('GEMINI_API_KEY');
      if (!geminiKey) throw new Error('GEMINI_API_KEY environment variable is not set');

      // Convert file to base64
      const arrayBuffer = await fileData.arrayBuffer();
      const base64Data = encode(arrayBuffer);

      const prompt = `You are an expert in detecting gender-based violence (GBV) in digital communications and documents. Analyze the provided evidence (which may be text, image, or document) for any signs of GBV, including threats, harassment, sexual abuse, hate speech, blackmail, or other harmful content. 
        
        Respond ONLY in valid JSON format with the following structure: 
        { 
            "labels": ["label1", "label2"], 
            "severity": "Low|Medium|High|Critical", 
            "summary": "Brief summary of the findings", 
            "details": { 
                "threats": ["detail1"], 
                "harassment": [], 
                "sexualAbuse": [], 
                "hateSpeech": [], 
                "blackmail": [], 
                "other": [] 
            } 
        }
        Do not include markdown formatting (like \`\`\`json) in the response.`;

      // Construct parts for Gemini 1.5 Flash (Multimodal)
      const parts = [
        { text: prompt },
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        }
      ];

      // Call Gemini 1.5 Flash
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + geminiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${error}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) throw new Error('No response from Gemini');

      // Clean up markdown if present
      const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();

      let result;
      try {
        result = JSON.parse(cleanContent);
      } catch (e) {
        console.error("Failed to parse JSON:", cleanContent);
        throw new Error("Invalid JSON response from AI");
      }

      labels = result.labels || [];
      severity = result.severity || 'Medium';
      summary = result.summary || '';
      details = result.details || details;

      console.log(`Analysis complete. Severity: ${severity}`);

    } catch (analysisError) {
      const errorMsg = analysisError instanceof Error ? analysisError.message : String(analysisError);
      console.error('Error during Gemini analysis:', errorMsg);
      labels = ['error-during-analysis'];
      summary = `Analysis attempt failed: ${errorMsg}. File: ${evidenceData.file_name}`;
      severity = 'High';
    }

    console.log('Updating database...');

    const { error: updateError } = await supabase
      .from('evidence')
      .update({
        ai_summary: summary,
        ai_labels: labels,
        ai_severity: severity,
        ai_details: details,
        analyzed_at: new Date().toISOString(),
      })
      .eq('id', evidenceId);

    if (updateError) {
      console.error('Failed to update evidence:', updateError);
      throw new Error('Failed to save analysis results.');
    }

    const analysisResult = {
      id: evidenceId,
      summary,
      labels,
      severity,
      details,
      analyzedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify({ result: analysisResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in analyze-evidence function:', errorMessage);
    return new Response(JSON.stringify({ error: `Function error: ${errorMessage}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
