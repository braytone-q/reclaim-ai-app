import { supabase } from '../lib/supabaseClient';

export const analyzeEvidence = async (evidenceId: string, filePath: string) => {
  console.log(`Starting mock analysis for ${evidenceId}...`);

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Mock analysis result - only using columns that exist in the remote DB
  const mockAnalysis = {
    ai_summary: "This document contains clear indicators of harassment and coercive control. The language used demonstrates a pattern of intimidation and emotional manipulation consistent with gender-based violence. Multiple instances of derogatory terms and veiled threats were identified.",
    ai_labels: ["Harassment", "Coercion", "Intimidation", "Emotional Abuse"],
    ai_severity: "High"
  };

  // Update the database directly with only the core AI fields
  const { data, error } = await supabase
    .from('evidence')
    .update(mockAnalysis)
    .eq('id', evidenceId)
    .select()
    .single();

  if (error) {
    console.error('Mock analysis update failed:', error);
    throw new Error(`Failed to save analysis results: ${error.message}`);
  }

  // Return the full mock structure including details for the UI if it needs it (though currently it doesn't seem to)
  return {
    result: {
      ...mockAnalysis,
      ai_details: {
        threats: ["I'll make you regret this", "You'll pay for this"],
        harassment: ["Constant messaging", "Derogatory name calling"],
        sexualAbuse: [],
        hateSpeech: [],
        blackmail: [],
        other: []
      }
    }
  };
};

export const getChatResponse = async (message: string) => {
  if (!message.trim()) {
    throw new Error('Message cannot be empty.');
  }

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return "I understand this is a difficult situation. Based on the evidence you've provided, it looks like there are several documented instances of harassment. I recommend keeping a detailed log of these events. Would you like me to help you draft a report for your lawyer or support services?";
};
