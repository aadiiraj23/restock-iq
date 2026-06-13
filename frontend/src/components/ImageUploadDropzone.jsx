import { useState, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';

export default function ImageUploadDropzone({ onDetect }) {
  const [preview, setPreview] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const inputRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    setDetecting(true);
    setTimeout(() => {
      const detectedItems = ['toothpaste', 'medicine', 'snacks', 'cleaning', 'detergent'];
      const item = detectedItems[Math.floor(Math.random() * detectedItems.length)];
      onDetect?.({ detectedItem: `I need ${item}`, confidence: 0.78 });
      setDetecting(false);
    }, 1500);
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-amazon-orange transition-colors">
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Upload" className="max-h-32 mx-auto rounded" />
          <button onClick={() => setPreview(null)} className="absolute top-0 right-0 bg-white rounded-full p-1 shadow"><X size={14} /></button>
          {detecting && <p className="text-sm text-amazon-orange mt-2 animate-pulse">Analyzing image...</p>}
        </div>
      ) : (
        <>
          <Camera size={32} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 mb-2">Snap a photo or upload an image</p>
          <button onClick={() => inputRef.current?.click()} className="amazon-btn text-sm inline-flex items-center gap-1">
            <Upload size={14} /> Upload Image
          </button>
        </>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
    </div>
  );
}
