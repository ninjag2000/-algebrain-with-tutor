import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { CalculationResult, ScanMode } from '../types';
import { solveMathProblemFromImage, translateText, solveFromImageAuto } from '../services/geminiService';
import { useLocalization } from '../contexts/LocalizationContext';
import { TutorAvatarIcon } from '../components/icons/TutorAvatarIcon';
import GalleryIcon from '../components/icons/GalleryIcon';
import FlashIcon from '../components/icons/FlashIcon';
import MathRenderer from '../components/MathRenderer';

// PROPS
interface ScanScreenProps {
  cachedCameraStreamRef?: React.MutableRefObject<MediaStream | null>;
  onScanComplete: (result: CalculationResult, mode: ScanMode) => void; // Pass mode
  solveCount: number;
  onOpenPaywall: () => void;
  freeSolveLimit: number;
  isPro: boolean;
  onEditEquation: (problem: string, image: string) => void;
  onCheckAnswer: (result: CalculationResult) => void;
  /** Скриншот с экрана (Scan & solve из плавающего шара): сразу показываем обрезку */
  initialScreenshot?: string | null;
  onClearInitialScreenshot?: () => void;
}

// TYPES
type ScanStep = 'camera' | 'confirmCrop' | 'enhancing' | 'previewProblem' | 'solving';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ScanScreen: React.FC<ScanScreenProps> = ({ cachedCameraStreamRef, onScanComplete, solveCount, onOpenPaywall, freeSolveLimit, isPro, onEditEquation, onCheckAnswer, initialScreenshot, onClearInitialScreenshot }) => {
  const [step, setStep] = useState<ScanStep>('camera');
  const [mode, setMode] = useState<ScanMode | 'auto'>('auto');
  const [targetLang, setTargetLang] = useState('ru');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imgAspectRatio, setImgAspectRatio] = useState<number>(1);
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [recognizedResult, setRecognizedResult] = useState<CalculationResult | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [isTorchSupported, setIsTorchSupported] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [videoReady, setVideoReady] = useState(false);
  
  const [cropArea, setCropArea] = useState<CropArea>({ x: 5, y: 15, width: 90, height: 70 }); 
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const cropperRef = useRef<HTMLDivElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLocalization();

  useEffect(() => {
    if (!initialScreenshot) return;
    const img = new Image();
    img.onload = () => {
      setImgAspectRatio(img.width / img.height);
      setCapturedImage(initialScreenshot);
      setCropArea({ x: 5, y: 15, width: 90, height: 70 });
      setStep('confirmCrop');
    };
    img.src = initialScreenshot;
  }, [initialScreenshot]);

  const modes: { id: ScanMode | 'auto'; label: string }[] = [
    { id: 'auto', label: t('scan.auto') },
    { id: 'math', label: t('scan.math') },
    { id: 'translate', label: t('scan.translate') },
    { id: 'spelling', label: t('scan.spelling') },
    { id: 'general', label: t('scan.general') },
  ];

  const languages = [
    { code: 'ru', label: 'Русский' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'zh', label: '中文' },
    { code: 'other', label: t('translator.otherLanguage') },
  ];
  
  const getScanningStatusText = () => {
    switch(mode) {
        case 'auto':
            return t('scan.statusAuto');
        case 'translate':
            return t('scan.statusTranslate');
        case 'spelling':
            return t('scan.statusSpelling');
        case 'general':
            return t('scan.statusGeneral');
        case 'math':
        default:
            return t('scan.statusMath');
    }
  };

  useLayoutEffect(() => {
    if (step === 'camera') {
      setRecognizedResult(null);
      setCapturedImage(null);
      setCropArea({ x: 5, y: 15, width: 90, height: 70 });
      const cached = cachedCameraStreamRef?.current;
      if (cached?.active) {
        streamRef.current = cached;
        setVideoReady(false);
        const video = videoRef.current;
        if (video) {
          video.srcObject = cached;
          video.play().catch(() => {});
        }
        setHasCameraAccess(true);
        const vt = cached.getVideoTracks()[0];
        if (vt) {
          const cap = vt.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
          if (cap.torch) setIsTorchSupported(true);
        }
      } else {
        setVideoReady(false);
        startCamera();
      }
    } else {
      stopCamera();
      setVideoReady(false);
    }
    return () => {
      if (cachedCameraStreamRef && streamRef.current) {
        cachedCameraStreamRef.current = streamRef.current;
        if (videoRef.current) videoRef.current.srcObject = null;
        streamRef.current = null;
        setIsFlashActive(false);
      } else {
        stopCamera();
      }
    };
  }, [step, initialScreenshot]);

  const startCamera = async () => {
    stopCamera();
    setHasCameraAccess(null);
    setIsFlashActive(false);
    setIsTorchSupported(false);

    try {
      if (cachedCameraStreamRef?.current) {
        cachedCameraStreamRef.current.getTracks().forEach(t => t.stop());
        cachedCameraStreamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, 
        audio: false 
      });
      streamRef.current = stream;
      if (cachedCameraStreamRef) cachedCameraStreamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.play().catch(() => {});
      }
      setHasCameraAccess(true);
      setVideoReady(false);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
        if (capabilities.torch) {
          setIsTorchSupported(true);
        }
      }
    } catch (err) {
      setHasCameraAccess(false);
    }
  };

  // При переключении на экран камеры ref может появиться после startCamera — привязываем поток к видео
  useEffect(() => {
    if (hasCameraAccess !== true || !streamRef.current || !videoRef.current) return;
    if (videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [hasCameraAccess]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        if (track.kind === 'video' && isTorchSupported) {
          track.applyConstraints({ advanced: [{ torch: false }] as unknown as MediaTrackConstraintSet[] })
            .catch(e => {
              console.error("Error turning off torch:", e);
              setIsTorchSupported(false);
              setIsFlashActive(false);
            });
        }
        track.stop();
      });
    }
    if (cachedCameraStreamRef?.current) {
      cachedCameraStreamRef.current.getTracks().forEach(t => t.stop());
      cachedCameraStreamRef.current = null;
    }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsFlashActive(false);
  };

  // Effect to control the camera torch
  useEffect(() => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack && isTorchSupported) {
      videoTrack.applyConstraints({ advanced: [{ torch: isFlashActive }] as unknown as MediaTrackConstraintSet[] })
        .catch(e => {
          console.error("Error setting torch:", e);
          setIsTorchSupported(false); // Disable button if it fails
          setIsFlashActive(false); // Reset flash state
        });
    }
  }, [isFlashActive, isTorchSupported, streamRef.current]);


  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || !frameRef.current) return;
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const frame = frameRef.current;

    if (context) {
      const vRect = video.getBoundingClientRect();
      const fRect = frame.getBoundingClientRect();
      const vW = video.videoWidth;
      const vH = video.videoHeight;
      const vA = vW / vH;
      const cA = vRect.width / vRect.height;

      let rW, rH, oX = 0, oY = 0;
      if (vA > cA) { rH = vRect.height; rW = vRect.height * vA; oX = (rW - vRect.width) / 2; }
      else { rW = vRect.width; rH = vRect.width / vA; oY = (rH - vRect.height) / 2; }

      const sx = ((fRect.left - vRect.left + oX) / rW) * vW;
      const sy = ((fRect.top - vRect.top + oY) / rH) * vH;
      const sw = (fRect.width / rW) * vW;
      const sh = (fRect.height / rH) * vH;

      canvas.width = sw;
      canvas.height = sh;
      context.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(dataUrl);
      setImgAspectRatio(sw / sh);
      setStep('confirmCrop');
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => { setImgAspectRatio(img.width / img.height); setCapturedImage(dataUrl); setStep('confirmCrop'); };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartProcessing = async () => {
    if (!capturedImage || !canvasRef.current) return;
    setStep('enhancing');

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const img = new Image();
    img.src = capturedImage;
    await new Promise((resolve) => { img.onload = resolve; });

    const rX = (cropArea.x / 100) * img.width;
    const rY = (cropArea.y / 100) * img.height;
    const rW = (cropArea.width / 100) * img.width;
    const rH = (cropArea.height / 100) * img.height;

    canvas.width = rW; canvas.height = rH;
    context?.drawImage(img, rX, rY, rW, rH, 0, 0, rW, rH);
    
    const finalCroppedImage = canvas.toDataURL('image/jpeg', 0.95);
    const base64String = finalCroppedImage.split(',')[1];

    try {
      if (mode === 'auto') {
        const result = await solveFromImageAuto(base64String, 'image/jpeg', targetLang, targetLang);
        if (result.problem === 'no_problem_detected' || result.problem.startsWith('error.')) { setStep('camera'); }
        else { setRecognizedResult({ image: finalCroppedImage, problem: result.problem, solution: result.solution, mode: result.type }); setStep('previewProblem'); }
        return;
      }
      if (mode === 'translate') {
        const translationResult = await translateText(null, 'auto', targetLang, { base64: base64String, mimeType: 'image/jpeg' });
        const targetLangName = languages.find(l => l.code === targetLang)?.label || targetLang;
        setRecognizedResult({
          image: finalCroppedImage,
          // Set problem to extractedSourceText for display in preview
          problem: translationResult.extractedSourceText || t('scan.noTextDetected'),
          // Store the actual translation in solution, prefix with target lang for context
          solution: `${t('scan.translatedTo')}: ${targetLangName}\n\n${translationResult.mainTranslation.startsWith('error.') ? t(translationResult.mainTranslation) : translationResult.mainTranslation}`,
          mode: 'translate' // Store the mode
        });
        setStep('previewProblem');
      } else {
        const result = await solveMathProblemFromImage(base64String, 'image/jpeg', targetLang, mode);
        if (result.problem === 'no_problem_detected' || result.problem.startsWith('error.')) { setStep('camera'); } 
        else { setRecognizedResult({ image: finalCroppedImage, problem: result.problem, solution: result.solution, mode: mode }); setStep('previewProblem'); }
      }
    } catch (error) { setStep('camera'); }
  };

  const handleSolve = () => {
    if (!recognizedResult) return;
    if (!isPro && solveCount >= freeSolveLimit) { onOpenPaywall(); return; }
    setStep('solving');
    // Pass the mode along with the result
    setTimeout(() => onScanComplete(recognizedResult, recognizedResult.mode || 'math'), 1500);
  };
  
  const handleEdit = () => {
    if (!recognizedResult) return;
    if (recognizedResult.mode === 'translate') {
      setEditedText(recognizedResult.problem);
      setIsEditingText(true);
    } else {
      onEditEquation(recognizedResult.problem, recognizedResult.image);
    }
  };

  const handleUpdateEditedText = () => {
    if (!recognizedResult) return;
    setRecognizedResult({
        ...recognizedResult,
        problem: editedText,
    });
    setIsEditingText(false);
  };

  const onDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !cropperRef.current) return;
    const rect = cropperRef.current.getBoundingClientRect();
    const cX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const cY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const px = Math.min(Math.max(0, ((cX - rect.left) / rect.width) * 100), 100);
    const py = Math.min(Math.max(0, ((cY - rect.top) / rect.height) * 100), 100);
    setCropArea(prev => {
      let { x, y, width, height } = prev;
      if (isDragging === 'tl') { const dx = x - px; const dy = y - py; x = px; y = py; width += dx; height += dy; }
      else if (isDragging === 'br') { width = px - x; height = py - y; }
      if (width < 5) width = 5; if (height < 5) height = 5;
      return { x, y, width, height };
    });
  }, [isDragging]);

  const CornerDesign: React.FC<{ pos: 'tl' | 'tr' | 'bl' | 'br' }> = ({ pos }) => {
    const isTop = pos.startsWith('t');
    const isLeft = pos.endsWith('l');
    const transform = { 'tl': '', 'tr': 'scaleX(-1)', 'bl': 'scaleY(-1)', 'br': 'scale(-1)' }[pos];
    return (
      <div className={`absolute w-12 h-12 pointer-events-none z-20 ${isTop ? '-top-1' : '-bottom-1'} ${isLeft ? '-left-1' : '-right-1'}`} style={{ transform }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M4 24V8C4 5.79086 5.79086 4 8 4H24" stroke="#5B8CFF" strokeWidth="4" strokeLinecap="round" /></svg>
      </div>
    );
  };

  const renderContent = () => {
    if (step === 'confirmCrop' && capturedImage) {
        return (
          <div className="absolute inset-0 z-50 flex flex-col bg-[#0B0F1A] animate-in fade-in duration-300 select-none overflow-hidden" 
               onMouseMove={onDragMove} onMouseUp={() => setIsDragging(null)} onTouchMove={onDragMove} onTouchEnd={() => setIsDragging(null)}>
             <header className="relative flex flex-col bg-[#0F1115]/80 backdrop-blur-xl sticky top-0 z-50 pt-safe min-w-0">
                <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 px-4 h-12 min-h-12">
                  <button onClick={() => { onClearInitialScreenshot?.(); setStep('camera'); }} aria-label={t('scan.retake')} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full active:scale-90 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <h2 className="text-[12px] font-black text-white uppercase tracking-[0.2em] text-center truncate min-w-0">{t('scan.selectOne')}</h2>
                  <div className="w-10 flex-shrink-0"></div>
                </div>
                <div className="min-h-3" aria-hidden />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" aria-hidden />
             </header>
             <div className="flex-1 w-full flex items-center justify-center p-4 relative overflow-hidden">
                <div ref={cropperRef} className="relative w-full h-full bg-black rounded-[2rem] shadow-2xl border border-white/5 overflow-hidden"
                    style={{ maxHeight: '100%', maxWidth: '100%', aspectRatio: `${imgAspectRatio}`, height: imgAspectRatio > 1 ? 'auto' : '100%', width: imgAspectRatio > 1 ? '100%' : 'auto' }}>
                   <img src={capturedImage} alt="Crop Bg" className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none" />
                   <div className="absolute inset-0 pointer-events-none" style={{ clipPath: `inset(${cropArea.y}% ${100 - (cropArea.x + cropArea.width)}% ${100 - (cropArea.y + cropArea.height)}% ${cropArea.x}%)` }}>
                        <img src={capturedImage} className="w-full h-full object-cover" alt="Crop Highlight" />
                   </div>
                   <div className="absolute border-2 border-[#5B8CFF] shadow-[0_0_15px_rgba(91,140,255,0.4)]" style={{ left: `${cropArea.x}%`, top: `${cropArea.y}%`, width: `${cropArea.width}%`, height: `${cropArea.height}%` }}>
                     <div onMouseDown={(e) => { e.stopPropagation(); setIsDragging('tl'); }} onTouchStart={(e) => { e.stopPropagation(); setIsDragging('tl'); }} className="absolute -top-4 -left-4 w-10 h-10 flex items-center justify-center z-30 cursor-pointer">
                        <div className="w-6 h-6 bg-white rounded-full shadow-lg border-2 border-[#5B8CFF]"></div>
                     </div>
                     <div onMouseDown={(e) => { e.stopPropagation(); setIsDragging('br'); }} onTouchStart={(e) => { e.stopPropagation(); setIsDragging('br'); }} className="absolute -bottom-4 -right-4 w-10 h-10 flex items-center justify-center z-30 cursor-pointer">
                        <div className="w-6 h-6 bg-white rounded-full shadow-lg border-2 border-[#5B8CFF]"></div>
                     </div>
                   </div>
                </div>
             </div>
             <div className="px-8 pb-12 pt-4">
                <button onClick={handleStartProcessing} aria-label={t('scan.solve')} className="w-full bg-[#5B8CFF] py-5 rounded-full text-lg font-black text-white shadow-xl active:scale-[0.97] transition-transform uppercase tracking-widest">{t('scan.solve')}</button>
             </div>
          </div>
        );
    }

    if (step === 'enhancing') {
      return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0F1A] animate-in fade-in duration-300">
          <div className="relative w-32 h-32 flex items-center justify-center mb-8">
            <div className="absolute inset-0 border-2 border-dashed border-[#5B8CFF]/30 rounded-full animate-spin"></div>
            <TutorAvatarIcon className="w-16 h-16 animate-mascot-blink" />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider animate-pulse">{t('scan.scanning')}</h2>
        </div>
      );
    }
    
    if (step === 'solving') {
      const neuralFlowStyle: React.CSSProperties = {
        backgroundImage: 'linear-gradient(45deg, rgba(58, 141, 255, 0.05) 25%, transparent 25%, transparent 50%, rgba(58, 141, 255, 0.05) 50%, rgba(58, 141, 255, 0.05) 75%, transparent 75%, transparent)',
        backgroundSize: '40px 40px',
      };
      return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a]/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="absolute inset-0 animate-neural-flow opacity-30" style={neuralFlowStyle}></div>
          <style>{`
            @keyframes orbit-1 { 0% { transform: rotate(0deg) translateX(100px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(100px) rotate(-360deg); } }
            @keyframes orbit-2 { 0% { transform: rotate(0deg) translateX(100px) rotate(0deg); } 100% { transform: rotate(-360deg) translateX(100px) rotate(360deg); } }
            @keyframes orbit-3 { 0% { transform: rotate(0deg) translateX(100px) rotate(0deg); } 100% { transform: rotate(180deg) translateX(100px) rotate(-180deg); } }
            .animate-orbit-1 { animation: orbit-1 12s linear infinite; }
            .animate-orbit-2 { animation: orbit-2 15s linear infinite; }
            .animate-orbit-3 { animation: orbit-3 10s linear infinite; }
          `}</style>
          
          <div className="relative w-64 h-64 flex items-center justify-center">
            <div className="absolute top-1/2 left-1/2 w-px h-px animate-orbit-1">
              <div className="absolute -translate-x-1/2 -translate-y-1/2 text-[#3A8DFF] text-sm font-mono opacity-60">E=mc²</div>
            </div>
            <div className="absolute top-1/2 left-1/2 w-px h-px animate-orbit-2">
              <div className="absolute -translate-x-1/2 -translate-y-1/2 text-[#6C5CE7] text-sm font-mono opacity-60">a²+b²=c²</div>
            </div>
            <div className="absolute top-1/2 left-1/2 w-px h-px animate-orbit-3">
              <div className="absolute -translate-x-1/2 -translate-y-1/2 text-[#3A8DFF] text-sm font-mono opacity-60">∫(x)dx</div>
            </div>

            <div className="flex items-center space-x-4 bg-black/30 backdrop-blur-sm p-4 rounded-2xl">
              <h2 className="text-lg font-black text-white tracking-wider animate-pulse uppercase">
                  {t('calculator.analyzingLogic')}
              </h2>
              <TutorAvatarIcon className="w-12 h-12 animate-mascot-blink opacity-90" />
            </div>
          </div>
        </div>
      );
    }

    if (step === 'previewProblem' && recognizedResult) {
        const isTranslateMode = recognizedResult.mode === 'translate';
        return (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-end p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            {/* Mascot and Extracted Problem header now outside the main card */}
            <div className="flex flex-col items-center mb-4">
              <TutorAvatarIcon className="w-20 h-20 opacity-90 animate-mascot-glow-pulse" />
              <h2 className="text-[11px] font-black text-[#8A94A6] uppercase tracking-[0.4em] mt-4 text-center">
                {isTranslateMode ? t('scan.extractedText') : t('scan.extractedProblem')}
              </h2>
            </div>
            <div className="w-full max-w-md bg-[#121826] rounded-[2.5rem] p-8 border border-white/10 shadow-3xl animate-in slide-in-from-bottom-12 duration-700 ease-out">
              <div className="bg-[#0B0F1A] p-6 rounded-[1.5rem] mb-8 border border-white/5 shadow-inner flex items-center justify-center min-h-[100px]">
                {isEditingText ? (
                    <textarea 
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="w-full h-24 bg-transparent text-lg text-center text-white leading-relaxed focus:outline-none resize-none"
                    />
                ) : isTranslateMode ? (
                  <p className="text-lg font-bold text-center text-white leading-relaxed whitespace-pre-wrap">{recognizedResult.problem}</p>
                ) : (
                  <div className="text-xl font-bold text-center text-white leading-relaxed">
                      <MathRenderer expression={recognizedResult.problem} displayMode={true} />
                  </div>
                )}
              </div>
              <div className="flex flex-col space-y-3 px-4">
                {isEditingText ? (
                  <>
                    <button 
                      onClick={handleUpdateEditedText} 
                      className="w-full bg-green-500 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] text-white shadow-lg active:scale-[0.98] transition-all"
                    >
                      {t('solution.save')}
                    </button>
                    <button 
                      onClick={() => setIsEditingText(false)}
                      className="w-full bg-white/10 border border-white/10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[#E6EAF2] active:scale-95 transition-all"
                    >
                      {t('solution.cancel')}
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={handleEdit} 
                      aria-label={t('solution.edit')}
                      className="w-full bg-white/10 border border-white/10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[#E6EAF2] active:scale-95 transition-all flex items-center justify-center space-x-2 min-w-0"
                    >
                      <span>📝</span><span className="text-center whitespace-normal">{t('solution.edit')}</span>
                    </button>
                    {!isTranslateMode && (
                      <button 
                          onClick={() => onCheckAnswer(recognizedResult)} 
                          aria-label={t('scan.checkMyAnswer')}
                          className="w-full bg-white/10 border border-white/10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[#E6EAF2] active:scale-95 transition-all flex items-center justify-center space-x-2 min-w-0"
                      >
                          <span>✍️</span><span className="text-center whitespace-normal">{t('scan.checkMyAnswer')}</span>
                      </button>
                    )}
                    <button 
                      onClick={handleSolve} 
                      aria-label={isTranslateMode ? t('translator.translate') : t('solution.showCorrectSolution')}
                      className="w-full bg-[#5B8CFF] py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] text-white shadow-[0_10px_25px_rgba(91,140,255,0.4)] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 min-w-0"
                    >
                      <span>{isTranslateMode ? '🌍' : '💡'}</span><span className="text-center whitespace-normal">{isTranslateMode ? t('translator.translate') : t('solution.showCorrectSolution')}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
    }

    return (
      <div className="absolute inset-0 flex flex-col bg-black overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover bg-black"
          style={{ backgroundColor: '#000' }}
          onCanPlay={() => { videoRef.current?.play(); setVideoReady(true); }}
          onLoadedData={() => setVideoReady(true)}
        />
        {!videoReady && <div className="absolute inset-0 z-10 bg-black" aria-hidden />}
        {isFlashing && <div className="absolute inset-0 bg-white z-[100] animate-out fade-out duration-150"></div>}
        <div className="absolute top-0 left-0 right-0 z-40 flex flex-col items-center pb-8 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 3.25rem)' }}>
            <div className="w-full overflow-x-auto scrollbar-hide px-8 mb-6 pointer-events-auto">
                <div className="flex justify-center space-x-10 min-w-max mx-auto">
                    {modes.map((m) => (
                        <button key={m.id} onClick={() => setMode(m.id)} aria-label={m.label} className={`flex flex-col items-center space-x-2 transition-all ${mode === m.id ? 'text-white' : 'text-white/40'}`}>
                            <span className="text-xs font-black uppercase tracking-widest">{m.label}</span>
                            {mode === m.id && <div className="h-1 w-4 bg-[#5B8CFF] rounded-full"></div>}
                        </button>
                    ))}
                </div>
            </div>
            {(mode === 'auto' || mode === 'translate' || mode === 'spelling') && (
              <div className="pointer-events-auto relative">
                <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} aria-label={t('translator.selectLanguage')} className="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-white flex items-center space-x-2">
                    <span>{languages.find(l => l.code === targetLang)?.label}</span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {isLangMenuOpen && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-32 bg-[#121826] border border-white/10 rounded-2xl p-2 shadow-2xl z-50">
                        {languages.map(l => (
                            <button key={l.code} onClick={() => { setTargetLang(l.code); setIsLangMenuOpen(false); }} aria-label={l.label} className={`w-full py-2 text-[10px] font-bold uppercase transition-colors rounded-lg ${targetLang === l.code ? 'bg-[#5B8CFF] text-white' : 'text-gray-400'}`}>{l.label}</button>
                        ))}
                    </div>
                )}
              </div>
            )}
        </div>
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center pt-14"> {/* Added pt-14 to adjust scan frame below header */}
            <div className="w-[85%] max-w-md aspect-[1.8/1] relative shadow-[0_0_0_5000px_rgba(0,0,0,0.92)]">
                <div className="absolute -top-16 left-0 right-0 text-center flex flex-col items-center pointer-events-auto">
                    <div className="flex items-center space-x-2 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                        <span className="text-sm">🧠</span>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{t('scan.visionMode')}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 italic">“{getScanningStatusText()}”</p>
                </div>
                <div ref={frameRef} className="absolute inset-0 border border-white/10">
                    <CornerDesign pos="tl" /><CornerDesign pos="tr" /><CornerDesign pos="bl" /><CornerDesign pos="br" />
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#5B8CFF] to-transparent shadow-[0_0_10px_#5B8CFF] animate-scan-beam"></div>
                </div>
                <div className="absolute -bottom-16 left-0 right-0 text-center"><p className="text-[10px] font-black text-white/60 uppercase tracking-[0.4em]">{t('scan.tip')}</p></div>
            </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-40 px-10 pb-12 pt-20 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between max-w-sm mx-auto">
                <button onClick={() => galleryInputRef.current?.click()} aria-label={t('translator.chooseFromGallery')} className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center text-white active:scale-90 transition-transform"><GalleryIcon className="w-6 h-6" /></button>
                <button onClick={handleCapture} aria-label={t('translator.takePhoto')} className="w-20 h-20 rounded-full bg-white p-1 shadow-2xl active:scale-95 transition-transform">
                    <div className="w-full h-full rounded-full border-[3px] border-black/5 flex items-center justify-center bg-gradient-to-tr from-[#5B8CFF] to-[#A78BFA]"><div className="w-4 h-4 bg-white rounded-full animate-pulse"></div></div>
                </button>
                <button 
                  onClick={() => setIsFlashActive(!isFlashActive)} 
                  disabled={!isTorchSupported} 
                  aria-label={isFlashActive ? t('scan.flashOff') : t('scan.flashOn')}
                  className={`w-14 h-14 rounded-full backdrop-blur-xl flex items-center justify-center transition-all active:scale-90 border ${isFlashActive ? 'bg-yellow-400 border-yellow-400 text-black' : 'bg-white/10 border-white/10 text-white'} ${!isTorchSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FlashIcon />
                </button>
            </div>
            <input type="file" ref={galleryInputRef} onChange={handleGalleryUpload} className="hidden" accept="image/*" />
        </div>
        <style>{`
          @keyframes scan-beam { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
          .animate-scan-beam { animation: scan-beam 3s linear infinite; }
        `}</style>
      </div>
    );
  };

  return (
    <div className="h-full min-h-0 w-full bg-[#0B0F1A] relative flex flex-col overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />
      {hasCameraAccess === false ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-10">
              <h2 className="text-xl font-black text-white uppercase mb-4">{t('error.cameraFailTitle')}</h2>
              <p className="text-gray-400 mb-6">{t('error.cameraFailMessage')}</p>
              <button onClick={startCamera} aria-label={t('error.retry')} className="bg-[#5B8CFF] px-8 py-4 rounded-2xl font-bold text-white uppercase tracking-widest">{t('error.retry')}</button>
          </div>
      ) : renderContent()}
    </div>
  );
};

export default ScanScreen;