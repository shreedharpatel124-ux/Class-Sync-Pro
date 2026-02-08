
import React, { useState, useEffect, useRef } from 'react';
import { AppState, LectureSession, LectureSlide } from './types';
import CameraView from './components/CameraView';
import { summarizeLecture } from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('setup');
  const [session, setSession] = useState<LectureSession | null>(null);
  const [currentTitle, setCurrentTitle] = useState('New Lecture');
  const [loading, setLoading] = useState(false);
  
  // Capturing State
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [tempDesc, setTempDesc] = useState('');

  // Audio Recorder State
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startSession = async () => {
    const newSession: LectureSession = {
      id: Date.now().toString(),
      title: currentTitle,
      date: new Date().toLocaleDateString(),
      slides: [],
      isComplete: false
    };
    setSession(newSession);
    setAppState('active');

    // Start Audio Recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      recorder.start();
    } catch (err) {
      console.error("Audio recording failed:", err);
    }
  };

  const handleCapture = (image: string) => {
    setTempImage(image);
    setAppState('capture-review');
    setTempDesc('');
  };

  const saveSlide = () => {
    if (!tempImage || !session) return;

    const newSlide: LectureSlide = {
      id: Date.now().toString(),
      image: tempImage,
      description: tempDesc,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setSession({
      ...session,
      slides: [...session.slides, newSlide]
    });

    setTempImage(null);
    setAppState('active');
  };

  const endSession = async () => {
    if (!session) return;
    setLoading(true);

    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }

    try {
      const summary = await summarizeLecture(session.title, session.slides);
      const completedSession = { ...session, audioSummary: summary, isComplete: true };
      setSession(completedSession);
      setAppState('summary');
    } catch (error) {
      console.error(error);
      alert("Failed to summarize lecture audio/notes.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!session) return;
    const { jsPDF } = (window as any).jspdf;
    // A4 dimensions: 210 x 297 mm
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    
    let y = margin + 10;

    // --- PAGE 1: Title and AI Summary ---
    doc.setFontSize(26);
    doc.setTextColor(30, 64, 175); // Indigo-900 color
    doc.text(session.title, margin, y);
    y += 10;
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Date: ${session.date}`, margin, y);
    y += 15;

    if (session.audioSummary) {
      doc.setFontSize(18);
      doc.setTextColor(30, 64, 175);
      doc.text("AI Lecture Insights", margin, y);
      y += 10;
      
      doc.setFontSize(11);
      doc.setTextColor(40);
      const splitSummary = doc.splitTextToSize(session.audioSummary, contentWidth);
      doc.text(splitSummary, margin, y);
      y += (splitSummary.length * 5) + 10;
    }

    // --- SUBSEQUENT PAGES: One Slide Per Page ---
    session.slides.forEach((slide, index) => {
      doc.addPage();
      let slideY = margin;

      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.text(`Slide ${index + 1} - Captured at ${slide.timestamp}`, margin, slideY);
      slideY += 10;

      // Calculate Large Image Dimensions
      // Aspect ratio of capture is usually 16:9 or similar
      const imgWidth = contentWidth;
      const imgHeight = (imgWidth * 9) / 16; // Assumption for landscape blackboard

      try {
        doc.addImage(slide.image, 'JPEG', margin, slideY, imgWidth, imgHeight);
        slideY += imgHeight + 15;
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text("Description:", margin, slideY);
        slideY += 7;
        
        doc.setFont("helvetica", "normal");
        const splitDesc = doc.splitTextToSize(slide.description || "No description provided for this visual.", contentWidth);
        doc.text(splitDesc, margin, slideY);
      } catch (e) {
        doc.setTextColor(200, 0, 0);
        doc.text("[Image processing error]", margin, slideY);
      }
    });

    doc.save(`${session.title.replace(/\s+/g, '_')}_StudyGuide.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Session Progress Header */}
      {appState !== 'setup' && (
        <div className="glass sticky top-0 z-[100] px-6 py-3 flex justify-between items-center border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-red-500 recording-pulse" />
            <div>
              <h2 className="font-bold text-sm text-slate-200">{session?.title}</h2>
              <p className="text-[10px] text-slate-500 font-mono">{session?.date} • {session?.slides.length} SLIDES</p>
            </div>
          </div>
          <button 
            onClick={endSession}
            className="px-4 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-bold hover:bg-red-500/30 transition-all"
          >
            END SESSION
          </button>
        </div>
      )}

      <main className="flex-1 flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full">
        {appState === 'setup' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="text-center space-y-2">
              <div className="text-6xl mb-4">🎓</div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">
                ClassSync Pro
              </h1>
              <p className="text-slate-500 text-sm">Real-time classroom capture and AI synthesis.</p>
            </div>
            
            <div className="w-full max-w-sm glass p-8 rounded-3xl border-white/10 shadow-2xl">
              <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Class Name</label>
              <input 
                type="text" 
                value={currentTitle}
                onChange={(e) => setCurrentTitle(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-lg font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="e.g. Physics 101"
              />
              <button 
                onClick={startSession}
                className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-lg shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
              >
                Start Recording
              </button>
              <p className="mt-4 text-[10px] text-center text-slate-500 uppercase tracking-tight">Syncing active between your mobile & laptop</p>
            </div>
          </div>
        )}

        {appState === 'active' && (
          <div className="flex-1 flex flex-col gap-6 animate-in slide-in-from-right-10 duration-500">
            <div className="flex-1">
               <CameraView onCapture={handleCapture} />
            </div>
            
            <div className="glass rounded-3xl p-6 h-64 overflow-y-auto custom-scrollbar">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-widest">Session Slides</h3>
              {session?.slides.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-slate-600">
                   <p className="text-sm">No slides captured yet. Click the shutter above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {session?.slides.map(slide => (
                    <div key={slide.id} className="group relative rounded-xl overflow-hidden aspect-video border border-white/10">
                      <img src={slide.image} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
                         <p className="text-[10px] text-white line-clamp-3">{slide.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {appState === 'capture-review' && (
          <div className="flex-1 flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="relative aspect-video rounded-3xl overflow-hidden border-2 border-indigo-500 shadow-2xl">
              <img src={tempImage!} className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 bg-indigo-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase">Captured Slide</div>
            </div>
            
            <div className="flex-1 glass rounded-3xl p-6 space-y-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Slide Description</label>
              <textarea 
                autoFocus
                value={tempDesc}
                onChange={(e) => setTempDesc(e.target.value)}
                placeholder="What was on the board? Formulas, diagrams, key points..."
                className="w-full flex-1 bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px] text-sm resize-none"
              />
              <div className="flex gap-4">
                <button onClick={() => setAppState('active')} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold">Discard</button>
                <button onClick={saveSlide} className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold">Add to Session</button>
              </div>
            </div>
          </div>
        )}

        {appState === 'summary' && (
          <div className="flex-1 flex flex-col gap-6 animate-in zoom-in duration-500 pb-12">
            <div className="glass p-8 rounded-[40px] border-indigo-500/20 space-y-8">
              <div className="text-center">
                <div className="inline-block px-4 py-1 bg-indigo-600/20 text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 border border-indigo-500/20">Session Complete</div>
                <h1 className="text-3xl font-bold">{session?.title}</h1>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                  <span className="text-lg">✨</span> Gemini AI Synthesis
                </h3>
                <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed bg-slate-900/40 p-6 rounded-2xl border border-white/5 whitespace-pre-wrap">
                  {session?.audioSummary}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400">Captured Gallery ({session?.slides.length} slides)</h3>
                <div className="grid grid-cols-2 gap-4">
                  {session?.slides.map(slide => (
                    <div key={slide.id} className="glass p-3 rounded-2xl border-white/5">
                      <img src={slide.image} className="w-full aspect-video object-cover rounded-lg mb-2" />
                      <p className="text-[10px] text-slate-400 line-clamp-2 italic">"{slide.description}"</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 pt-6">
                <button 
                  onClick={downloadPDF}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/20"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Export PDF Note
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-slate-300"
                >
                  New Lecture
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[1000] glass flex flex-col items-center justify-center gap-6">
          <div className="relative">
             <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
             <div className="absolute inset-0 flex items-center justify-center text-2xl animate-pulse">✨</div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-indigo-400">Processing Audio & Slides</h2>
            <p className="text-slate-500 text-sm mt-1">Gemini is building your study guide...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
