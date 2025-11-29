import { useState, useEffect, ChangeEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { Upload, FileText, Trash2, Loader2, BrainCircuit, FileSignature } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { analyzeEvidence } from '../../services/aiService';
import { generateReport } from '../../services/reportService';

interface Evidence {
  id: string;
  file_name: string;
  created_at: string;
  file_type: string;
  file_path: string;
  ai_summary?: string;
  ai_labels?: string[];
  ai_severity?: 'Low' | 'Medium' | 'High' | 'Critical';
}

interface EvidenceTabProps {
  onReportGenerated: (reportUrl: string) => void;
}

export default function EvidenceTab({ onReportGenerated }: EvidenceTabProps) {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({});
  const [generatingReport, setGeneratingReport] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchEvidence();
    }
  }, [user]);

  const fetchEvidence = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('evidence')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch evidence.');
      console.error('Error fetching evidence:', error);
    } else {
      setEvidence(data || []);
    }
    setLoading(false);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.warning('Please select a file to upload.');
      return;
    }
    if (!user) {
      toast.error('You must be logged in to upload evidence.');
      return;
    }

    setUploading(true);
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = `${user.id}/${Date.now()}-${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('evidence-files')
      .upload(filePath, file);

    if (uploadError) {
      toast.error('Error uploading file.', {
        description: 'Please ensure the \'evidence-files\' bucket exists and you have permission.',
      });
      setUploading(false);
      return;
    }

    const { data: insertData, error: dbError } = await supabase.from('evidence').insert({
      user_id: user.id,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
    }).select().single();

    if (dbError) {
      toast.error('Error saving evidence metadata.');
    } else {
      toast.success('Evidence uploaded successfully! Starting analysis...');
      setFile(null);
      await fetchEvidence();

      if (insertData) {
        handleAnalyze(insertData.id, filePath);
      }
    }

    setUploading(false);
  };

  const handleDelete = async (evidenceId: string, filePath: string) => {
    if (window.confirm('Are you sure you want to delete this evidence?')) {
      const { error: storageError } = await supabase.storage.from('evidence-files').remove([filePath]);
      if (storageError) toast.error('Failed to delete file from storage.');

      const { error: dbError } = await supabase.from('evidence').delete().eq('id', evidenceId);
      if (dbError) {
        toast.error('Failed to delete evidence record.');
      } else {
        toast.success('Evidence deleted successfully.');
        fetchEvidence();
      }
    }
  }

  const handleAnalyze = async (evidenceId: string, filePath: string) => {
    setAnalyzing(prev => ({ ...prev, [evidenceId]: true }));
    try {
      await analyzeEvidence(evidenceId, filePath);
      toast.success('Analysis complete!', { description: 'The AI results are now available.' });
      await fetchEvidence();
    } catch (error) {
      toast.error('Analysis failed.', { description: (error as Error).message });
    } finally {
      setAnalyzing(prev => ({ ...prev, [evidenceId]: false }));
    }
  };

  const handleGenerateReport = async () => {
    const analyzedItems = evidence.filter(item => item.ai_summary);
    if (analyzedItems.length === 0) {
      toast.warning('No analyzed evidence available.', { description: 'Please analyze at least one item before generating a report.' });
      return;
    }
    setGeneratingReport(true);
    try {
      const evidenceIds = analyzedItems.map(item => item.id);
      const reportUrl = await generateReport(evidenceIds);
      onReportGenerated(reportUrl);
      toast.success('Report generated successfully!', { description: 'You can view it in the \'Reports\' tab.' });
    } catch (error) {
      toast.error('Failed to generate report.', { description: (error as Error).message });
    } finally {
      setGeneratingReport(false);
    }
  };

  const getSeverityClass = (severity?: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Medium': return 'bg-yellow-400 text-gray-800';
      case 'Low': return 'bg-green-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  }

  return (
    <div>
      {/* Upload Section */}
      <div className='bg-white p-6 rounded-lg shadow-md mb-6'>
        <h3 className='text-xl font-semibold mb-4'>Upload New Evidence</h3>
        <div className='flex flex-col sm:flex-row gap-4'>
          <label htmlFor='file-upload' className='flex-1 flex items-center justify-center w-full px-4 py-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100'>
            <div className='text-center'>
              <Upload className='mx-auto h-12 w-12 text-gray-400' />
              <p className='mt-2 text-sm text-gray-600'><span className='font-semibold'>Click to upload</span></p>
              {file && <p className='text-sm text-gray-800 mt-2'>Selected: {file.name}</p>}
            </div>
            <input id='file-upload' type='file' className='sr-only' onChange={handleFileChange} />
          </label>
          <button onClick={handleUpload} disabled={!file || uploading} className='flex items-center justify-center sm:w-auto w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg disabled:bg-blue-300 transition-colors'>
            {uploading ? <><Loader2 className='mr-2 h-5 w-5 animate-spin' /> Uploading...</> : <><Upload className='mr-2 h-5 w-5' /> Upload File</>}
          </button>
        </div>
      </div>

      {/* Evidence List Section */}
      <div>
        <div className='flex justify-between items-center mb-4'>
          <h3 className='text-xl font-semibold'>Your Evidence</h3>
          <button onClick={handleGenerateReport} disabled={generatingReport || evidence.every(e => !e.ai_summary)} className='flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-green-300'>
            {generatingReport ? <><Loader2 className='mr-2 h-5 w-5 animate-spin' />Generating...</> : <><FileSignature className='h-5 w-5' />Generate Report</>}
          </button>
        </div>
        {loading ? (
          <div className='flex justify-center items-center h-40'><Loader2 className='h-8 w-8 animate-spin text-gray-500' /></div>
        ) : evidence.length === 0 ? (
          <p className='text-gray-500'>No evidence has been uploaded yet.</p>
        ) : (
          <ul className='space-y-4'>
            {evidence.map((item) => (
              <li key={item.id} className='bg-white p-4 rounded-lg shadow-sm transition-all duration-300'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center flex-grow min-w-0'>
                    <FileText className='h-6 w-6 mr-4 text-blue-500 flex-shrink-0' />
                    <div className='min-w-0'>
                      <p className='font-semibold truncate' title={item.file_name}>{item.file_name}</p>
                      <p className='text-sm text-gray-500'>Uploaded on {new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className='flex items-center gap-2 flex-shrink-0 ml-4'>
                    <button onClick={() => handleAnalyze(item.id, item.file_path)} disabled={!!analyzing[item.id] || !!item.ai_summary} className='flex items-center gap-2 text-sm bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-3 rounded-lg disabled:bg-purple-300'>
                      {analyzing[item.id] ? <Loader2 className='h-4 w-4 animate-spin' /> : <BrainCircuit className='h-4 w-4' />}
                      {item.ai_summary ? 'Analyzed' : 'Analyze'}
                    </button>
                    <button onClick={() => handleDelete(item.id, item.file_path)} className='text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50'>
                      <Trash2 className='h-5 w-5' />
                    </button>
                  </div>
                </div>
                {item.ai_summary && (
                  <div className='mt-4 pt-4 border-t border-gray-200'>
                    <h4 className='font-semibold text-md mb-2'>AI Analysis Results</h4>
                    <div className='flex items-center mb-2'>
                      <span className='font-semibold mr-2'>Severity:</span>
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${getSeverityClass(item.ai_severity)}`}>{item.ai_severity || 'N/A'}</span>
                    </div>
                    <div className='mb-2'>
                      <span className='font-semibold mr-2'>Labels:</span>
                      <div className='flex flex-wrap gap-2 mt-1'>
                        {item.ai_labels && item.ai_labels.length > 0 ? item.ai_labels.map((label, i) => (
                          <span key={i} className='bg-gray-200 text-gray-800 px-2 py-1 text-xs font-medium rounded-full'>{label}</span>
                        )) : <span className='text-sm text-gray-500'>No labels identified.</span>}
                      </div>
                    </div>
                    <div>
                      <p className='font-semibold'>Summary:</p>
                      <p className='text-sm text-gray-700 mt-1'>{item.ai_summary}</p>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
