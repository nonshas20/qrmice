'use client';

import { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';

interface QRScannerProps {
  onScan: (data: string) => void;
  isScanning: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, isScanning }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to scan QR code from video frame
  const scanQRCode = () => {
    if (!isScanning || !webcamRef.current || !canvasRef.current || hasScanned) return;

    const webcam = webcamRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Check if webcam is ready
    if (webcam.video && webcam.video.readyState === 4) {
      const videoWidth = webcam.video.videoWidth;
      const videoHeight = webcam.video.videoHeight;

      // Set canvas dimensions to match video
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      // Draw video frame to canvas
      context.drawImage(webcam.video, 0, 0, videoWidth, videoHeight);

      // Get image data for QR code scanning
      const imageData = context.getImageData(0, 0, videoWidth, videoHeight);

      try {
        // Scan for QR code
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        // If QR code found
        if (code) {
          console.log('QR code detected:', code.data);

          // Draw box around QR code
          context.beginPath();
          context.lineWidth = 4;
          context.strokeStyle = '#0ea5e9';
          context.moveTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
          context.lineTo(code.location.topRightCorner.x, code.location.topRightCorner.y);
          context.lineTo(code.location.bottomRightCorner.x, code.location.bottomRightCorner.y);
          context.lineTo(code.location.bottomLeftCorner.x, code.location.bottomLeftCorner.y);
          context.lineTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
          context.stroke();

          // Call onScan callback with QR code data
          onScan(code.data);

          // Prevent multiple scans of the same code
          setHasScanned(true);

          // Reset hasScanned after a delay to allow scanning again
          setTimeout(() => {
            setHasScanned(false);
          }, 3000);
        }
      } catch (err) {
        console.error('Error scanning QR code:', err);
      }
    }
  };

  // Set up scanning interval when isScanning changes
  useEffect(() => {
    if (isScanning) {
      // Clear any existing interval
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }

      // Set new scanning interval
      scanIntervalRef.current = setInterval(scanQRCode, 200);

      // Reset hasScanned when starting to scan
      setHasScanned(false);
    } else {
      // Clear interval when not scanning
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    }

    // Cleanup function
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [isScanning, hasScanned]);

  return (
    <div className="qr-scanner-wrapper relative">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="relative">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }}
          style={{
            width: '100%',
            height: 'auto',
            borderRadius: '8px',
            display: isScanning ? 'block' : 'none'
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            display: 'none', // Hidden canvas for processing
            position: 'absolute',
            top: 0,
            left: 0
          }}
        />

        {!isScanning && (
          <div
            className="flex items-center justify-center"
            style={{
              width: '100%',
              height: '300px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#f9fafb'
            }}
          >
            <p className="text-gray-500">Scanner is paused</p>
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '250px',
            height: '250px',
            transform: 'translate(-50%, -50%)',
            border: '2px solid #0ea5e9',
            borderRadius: '8px',
            zIndex: 9,
            pointerEvents: 'none',
            display: isScanning ? 'block' : 'none'
          }}
        />
      </div>
    </div>
  );
};

export default QRScanner;
