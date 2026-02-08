
import React, { useRef, useState, useEffect } from 'react';

interface CameraViewProps {
  onCapture: (image: string) => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isMirrored, setIsMirrored] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    }

    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [facingMode]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (isMirrored) {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL('image/jpeg', 0.9));
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setIsMirrored(prev => !prev);
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-cover transition-transform duration-700 ${isMirrored ? 'scale-x-[-1]' : 'scale-x-100'}`}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Controls Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-12 opacity-100 group-hover:opacity-100 transition-opacity">
        <button
          onClick={toggleCamera}
          className="p-4 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-white/20 transition-all active:scale-90"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <button
          onClick={capture}
          className="w-20 h-20 rounded-full border-4 border-white/30 p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        >
          <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-slate-900 shadow-xl">
             <div className="w-6 h-6 border-2 border-slate-900 rounded-full" />
          </div>
        </button>

        <button
          onClick={() => setIsMirrored(!isMirrored)}
          className={`p-4 rounded-full border transition-all active:scale-90 ${isMirrored ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/10 border-white/20 text-white/50'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </button>
      </div>

      <div className="absolute top-6 left-6 flex gap-2">
         {isMirrored && <span className="px-2 py-1 bg-indigo-600/90 text-[10px] font-bold uppercase rounded-md tracking-widest shadow-lg">Mirror On</span>}
         <span className="px-2 py-1 bg-red-500/90 text-[10px] font-bold uppercase rounded-md tracking-widest shadow-lg flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            Rec Audio
         </span>
      </div>
    </div>
  );
};

export default CameraView;
