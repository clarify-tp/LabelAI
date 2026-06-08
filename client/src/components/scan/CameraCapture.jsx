/**
 * src/components/scan/CameraCapture.jsx
 * =====================================
 * Live in-browser camera capture (Task 3A). Zero cost, no API key —
 * uses the native getUserMedia API.
 *
 * Props:
 *   onCapture(base64, mimeType) : called with the captured frame (base64 w/o
 *                                 the data: prefix) and its MIME type.
 *
 * Features:
 *   - Rear ("environment") camera by default — primary mobile use case
 *   - Green scanning-frame overlay
 *   - Flip-camera button (front/back)
 *   - Graceful permission-denied / initialising / unsupported states
 */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Camera, RefreshCw, Loader2, CameraOff } from 'lucide-react'

export default function CameraCapture({ onCapture }) {
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const [facing, setFacing]   = useState('environment')
  const [status, setStatus]   = useState('init') // init | ready | denied | unsupported
  const [error, setError]     = useState('')

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const start = useCallback(async (mode) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      return
    }
    setStatus('init')
    stop()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setStatus('ready')
    } catch (err) {
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        setStatus('denied')
      } else {
        setError(err?.message || 'Camera unavailable')
        setStatus('denied')
      }
    }
  }, [stop])

  useEffect(() => {
    start(facing)
    return () => stop()
  }, [facing, start, stop])

  const handleCapture = () => {
    const video = videoRef.current
    if (!video || status !== 'ready') return
    const w = video.videoWidth, h = video.videoHeight
    if (!w || !h) return
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    const base64  = dataUrl.split(',')[1]
    onCapture?.(base64, 'image/jpeg')
  }

  if (status === 'unsupported') {
    return (
      <div className="rounded-lg border border-gray-300 dark:border-gray-600 p-6 text-center space-y-2">
        <CameraOff size={28} className="mx-auto text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your browser doesn't support live camera. Use the <strong>Upload Photo</strong> tab instead.
        </p>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-6 text-center space-y-3">
        <CameraOff size={28} className="mx-auto text-amber-500" />
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Camera permission denied{error ? `: ${error}` : ''}. Allow camera access in your browser,
          or use the <strong>Upload Photo</strong> tab.
        </p>
        <button
          onClick={() => start(facing)}
          className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Scanning frame overlay — green corner brackets */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative w-[78%] h-[60%]">
            {['top-0 left-0 border-t-4 border-l-4', 'top-0 right-0 border-t-4 border-r-4',
              'bottom-0 left-0 border-b-4 border-l-4', 'bottom-0 right-0 border-b-4 border-r-4'
            ].map((c, i) => (
              <span key={i} className={`absolute ${c} w-8 h-8 border-emerald-400 rounded-sm`} />
            ))}
          </div>
        </div>

        {status === 'init' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
            <Loader2 size={28} className="animate-spin" />
          </div>
        )}

        {/* Flip camera */}
        <button
          onClick={() => setFacing(f => (f === 'environment' ? 'user' : 'environment'))}
          title="Flip camera"
          className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <p className="text-xs text-center text-gray-400 dark:text-gray-500">
        Point at the <strong>ingredients list</strong> and tap capture
      </p>

      <button
        onClick={handleCapture}
        disabled={status !== 'ready'}
        className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
      >
        <Camera size={18} /> Capture & Analyze
      </button>
    </div>
  )
}
