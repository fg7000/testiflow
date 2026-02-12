"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Video,
  Square,
  RotateCcw,
  Send,
  CheckCircle,
  Camera,
  Mic,
  AlertCircle,
} from "lucide-react";

interface Collection {
  id: string;
  name: string;
  slug: string;
  welcomeMessage: string | null;
  promptQuestions: string[];
  logoUrl: string | null;
  brandColor: string;
  maxDuration: number;
  isActive: boolean;
}

type Step = "info" | "permission" | "ready" | "recording" | "review" | "uploading" | "done" | "error";

function getMediaRecorderOptions(): MediaRecorderOptions {
  if (typeof MediaRecorder === "undefined") return {};
  if (MediaRecorder.isTypeSupported("video/mp4")) {
    return { mimeType: "video/mp4" };
  }
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
    return { mimeType: "video/webm;codecs=vp9" };
  }
  if (MediaRecorder.isTypeSupported("video/webm")) {
    return { mimeType: "video/webm" };
  }
  return {};
}

export function RecordingPage({ collection }: { collection: Collection }) {
  const [step, setStep] = useState<Step>("info");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCompany, setClientCompany] = useState("");

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const reviewRef = useRef<HTMLVideoElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const brandStyle = { backgroundColor: collection.brandColor };

  // Stop all tracks when done
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [stream]);

  // Request camera permission
  async function requestPermission() {
    try {
      setPermissionError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      setStream(mediaStream);
      setStep("ready");
    } catch (err) {
      const error = err as Error;
      if (error.name === "NotAllowedError") {
        setPermissionError(
          "Camera access was denied. Please allow camera and microphone access in your browser settings and try again."
        );
      } else if (error.name === "NotFoundError") {
        setPermissionError(
          "No camera or microphone found. Please connect a camera and try again."
        );
      } else {
        setPermissionError(
          "Unable to access camera. Please make sure your browser supports video recording and try again."
        );
      }
    }
  }

  // Attach stream to video preview
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, step]);

  // Start recording
  function startRecording() {
    if (!stream) return;

    chunksRef.current = [];
    const options = getMediaRecorderOptions();
    const mr = new MediaRecorder(stream, options);

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: options.mimeType || "video/webm",
      });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);
      setStep("review");
    };

    mr.start(1000); // Collect data every second
    setRecorder(mr);
    setTimeElapsed(0);
    setStep("recording");

    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => {
        if (prev + 1 >= collection.maxDuration) {
          mr.stop();
          if (timerRef.current) clearInterval(timerRef.current);
          return collection.maxDuration;
        }
        return prev + 1;
      });
    }, 1000);
  }

  // Stop recording
  function stopRecording() {
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // Retake
  function retake() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setTimeElapsed(0);
    setStep("ready");
  }

  // Upload to Mux and save metadata
  async function submitVideo() {
    if (!recordedBlob) return;

    setStep("uploading");
    setUploadProgress(0);

    try {
      // 1. Get upload URL from our API
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId: collection.id }),
      });

      if (!uploadRes.ok) throw new Error("Failed to get upload URL");

      const { uploadUrl, uploadId } = await uploadRes.json();

      // 2. Upload directly to Mux
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Upload network error"));
        xhr.send(recordedBlob);
      });

      // 3. Save video metadata
      const metaRes = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId: collection.id,
          clientName,
          clientEmail: clientEmail || null,
          clientCompany: clientCompany || null,
          muxUploadId: uploadId,
        }),
      });

      if (!metaRes.ok) throw new Error("Failed to save video");

      stopStream();
      setStep("done");
    } catch (err) {
      console.error("Upload failed:", err);
      setStep("error");
    }
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-bold"
            style={brandStyle}
          >
            {collection.name.charAt(0)}
          </div>
          <span className="font-semibold">{collection.name}</span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8">
        {/* Step 1: Client Info */}
        {step === "info" && (
          <div className="space-y-6">
            {collection.welcomeMessage && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm leading-relaxed">
                    {collection.welcomeMessage}
                  </p>
                </CardContent>
              </Card>
            )}

            {collection.promptQuestions.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <p className="mb-3 text-sm font-medium">
                    Here are some questions to guide your testimonial:
                  </p>
                  <ol className="space-y-2">
                    {collection.promptQuestions.map((q, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
                          style={brandStyle}
                        >
                          {i + 1}
                        </span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="space-y-4 pt-6">
                <h2 className="text-lg font-semibold">
                  A little about you
                </h2>
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company (optional)</Label>
                  <Input
                    id="company"
                    placeholder="Acme Inc."
                    value={clientCompany}
                    onChange={(e) => setClientCompany(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full text-white"
                  style={brandStyle}
                  disabled={!clientName.trim()}
                  onClick={() => {
                    setStep("permission");
                    requestPermission();
                  }}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Continue to Record
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Permission request (shown briefly while requesting) */}
        {step === "permission" && (
          <div className="flex flex-1 flex-col items-center justify-center space-y-4">
            {permissionError ? (
              <>
                <AlertCircle className="h-16 w-16 text-destructive" />
                <p className="text-center text-sm text-destructive">
                  {permissionError}
                </p>
                <Button onClick={requestPermission}>Try Again</Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Camera className="h-8 w-8 text-muted-foreground animate-pulse" />
                  <Mic className="h-8 w-8 text-muted-foreground animate-pulse" />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Please allow camera and microphone access...
                </p>
              </>
            )}
          </div>
        )}

        {/* Step 3: Ready to record (camera preview) */}
        {step === "ready" && (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full"
                style={{ transform: "scaleX(-1)" }}
              />
            </div>
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Max duration: {formatTime(collection.maxDuration)}
              </p>
              <Button
                size="lg"
                className="rounded-full px-8 text-white"
                style={brandStyle}
                onClick={startRecording}
              >
                <Video className="mr-2 h-5 w-5" />
                Start Recording
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Recording */}
        {step === "recording" && (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full"
                style={{ transform: "scaleX(-1)" }}
              />
              {/* Recording indicator */}
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1">
                <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                <span className="text-sm font-mono text-white">
                  {formatTime(timeElapsed)} / {formatTime(collection.maxDuration)}
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(timeElapsed / collection.maxDuration) * 100}%`,
                  backgroundColor: collection.brandColor,
                }}
              />
            </div>
            <div className="flex justify-center">
              <Button
                size="lg"
                variant="destructive"
                className="rounded-full px-8"
                onClick={stopRecording}
              >
                <Square className="mr-2 h-5 w-5" />
                Stop Recording
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === "review" && recordedUrl && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center">
              Review your testimonial
            </h2>
            <div className="overflow-hidden rounded-lg bg-black">
              <video
                ref={reviewRef}
                src={recordedUrl}
                controls
                playsInline
                className="w-full"
              />
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="lg" onClick={retake}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button
                size="lg"
                className="text-white"
                style={brandStyle}
                onClick={submitVideo}
              >
                <Send className="mr-2 h-4 w-4" />
                Submit
              </Button>
            </div>
          </div>
        )}

        {/* Step 6: Uploading */}
        {step === "uploading" && (
          <div className="flex flex-1 flex-col items-center justify-center space-y-4">
            <div className="relative">
              <Video className="h-16 w-16 text-muted-foreground" />
            </div>
            <p className="font-medium">Uploading your testimonial...</p>
            <div className="w-full max-w-xs">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${uploadProgress}%`,
                    backgroundColor: collection.brandColor,
                  }}
                />
              </div>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                {uploadProgress}%
              </p>
            </div>
          </div>
        )}

        {/* Step 7: Done */}
        {step === "done" && (
          <div className="flex flex-1 flex-col items-center justify-center space-y-4">
            <CheckCircle className="h-20 w-20" style={{ color: collection.brandColor }} />
            <h2 className="text-2xl font-bold">Thank you!</h2>
            <p className="text-center text-muted-foreground">
              Your testimonial has been submitted successfully. It will be
              reviewed shortly.
            </p>
          </div>
        )}

        {/* Error state */}
        {step === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center space-y-4">
            <AlertCircle className="h-16 w-16 text-destructive" />
            <h2 className="text-xl font-bold">Something went wrong</h2>
            <p className="text-center text-sm text-muted-foreground">
              We couldn&apos;t upload your video. Please try again.
            </p>
            <Button onClick={retake}>Try Again</Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
        Powered by TestiFlow
      </footer>
    </div>
  );
}
