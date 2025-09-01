"use client";

import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import {
    Mic,
    MicOff,
    Play,
    Pause,
    Square,
    Send,
    Trash2,
    Volume2,
    VolumeX
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

interface VoiceRecorderProps {
    onSend: (audioBlob: Blob, duration: number) => void;
    onCancel?: () => void;
    maxDuration?: number; // in seconds
    className?: string;
}

export function VoiceRecorder({
    onSend,
    onCancel,
    maxDuration = 300, // 5 minutes
    className
}: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackTime, setPlaybackTime] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout>();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startRecording = async () => {
        try {
            // Check if mediaDevices is supported (SSR-safe)
            if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
                throw new Error('Media recording is not supported in this browser');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Check if MediaRecorder is supported
            if (typeof MediaRecorder === 'undefined') {
                throw new Error('MediaRecorder is not supported in this browser');
            }

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                setAudioBlob(blob);

                // Stop all tracks
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setDuration(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setDuration(prev => {
                    const newDuration = prev + 1;
                    if (newDuration >= maxDuration) {
                        stopRecording();
                    }
                    return newDuration;
                });
            }, 1000);

        } catch (error) {
            console.error('Failed to start recording:', error);
            toast({
                variant: "destructive",
                description: "Failed to access microphone. Please check permissions.",
            });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);

            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            if (isPaused) {
                mediaRecorderRef.current.resume();
                setIsPaused(false);

                timerRef.current = setInterval(() => {
                    setDuration(prev => {
                        const newDuration = prev + 1;
                        if (newDuration >= maxDuration) {
                            stopRecording();
                        }
                        return newDuration;
                    });
                }, 1000);
            } else {
                mediaRecorderRef.current.pause();
                setIsPaused(true);

                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
            }
        }
    };

    const playPreview = () => {
        if (!audioBlob) return;

        // Check if Audio API is available (SSR-safe)
        if (typeof Audio === 'undefined') {
            console.error('Audio playback is not supported');
            return;
        }

        if (isPlaying) {
            audioRef.current?.pause();
            setIsPlaying(false);
        } else {
            const audio = new Audio(URL.createObjectURL(audioBlob));
            audioRef.current = audio;

            audio.currentTime = playbackTime;
            audio.play();
            setIsPlaying(true);

            audio.onended = () => {
                setIsPlaying(false);
                setPlaybackTime(0);
            };

            audio.ontimeupdate = () => {
                setPlaybackTime(audio.currentTime);
            };
        }
    };

    const reset = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        if (audioRef.current) {
            audioRef.current.pause();
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        setIsRecording(false);
        setIsPaused(false);
        setDuration(0);
        setAudioBlob(null);
        setIsPlaying(false);
        setPlaybackTime(0);
        audioChunksRef.current = [];
        onCancel?.();
    };

    const handleSend = () => {
        if (audioBlob && duration > 0) {
            onSend(audioBlob, duration);
            reset();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <ComponentErrorBoundary componentName="Voice Recorder">
            <div className={cn("flex items-center gap-2 p-3 bg-card border rounded-lg", className)}>
                {!isRecording && !audioBlob && (
                    <Button
                        onClick={startRecording}
                        size="sm"
                        className="gap-2"
                    >
                        <Mic className="w-4 h-4" />
                        Record
                    </Button>
                )}

                {isRecording && (
                    <>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-sm font-mono">{formatTime(duration)}</span>
                        </div>

                        <Button
                            onClick={pauseRecording}
                            size="sm"
                            variant="outline"
                        >
                            {isPaused ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                        </Button>

                        <Button
                            onClick={stopRecording}
                            size="sm"
                            variant="outline"
                        >
                            <Square className="w-4 h-4" />
                        </Button>

                        <Button
                            onClick={reset}
                            size="sm"
                            variant="destructive"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </>
                )}

                {audioBlob && !isRecording && (
                    <>
                        <Button
                            onClick={playPreview}
                            size="sm"
                            variant="outline"
                        >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>

                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-mono">{formatTime(Math.floor(playbackTime))}</div>
                            <div className="w-full bg-muted rounded-full h-1">
                                <div
                                    className="bg-blue-500 h-1 rounded-full transition-all"
                                    style={{ width: `${(playbackTime / duration) * 100}%` }}
                                />
                            </div>
                        </div>

                        <Button
                            onClick={handleSend}
                            size="sm"
                            className="gap-2"
                        >
                            <Send className="w-4 h-4" />
                            Send
                        </Button>

                        <Button
                            onClick={reset}
                            size="sm"
                            variant="outline"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </>
                )}
            </div>
        </ComponentErrorBoundary>
    );
}

// Voice message player component
interface VoiceMessagePlayerProps {
    audioUrl: string;
    duration: number;
    isOwn?: boolean;
    className?: string;
}

export function VoiceMessagePlayer({
    audioUrl,
    duration,
    isOwn = false,
    className
}: VoiceMessagePlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const togglePlay = async () => {
        // Check if Audio API is available (SSR-safe)
        if (typeof Audio === 'undefined') {
            toast({
                variant: "destructive",
                description: "Audio playback is not supported in this browser",
            });
            return;
        }

        if (!audioRef.current) {
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onloadstart = () => setIsLoading(true);
            audio.oncanplay = () => setIsLoading(false);
            audio.onended = () => {
                setIsPlaying(false);
                setCurrentTime(0);
            };
            audio.ontimeupdate = () => {
                setCurrentTime(audio.currentTime);
            };
            audio.onerror = () => {
                setIsLoading(false);
                toast({
                    variant: "destructive",
                    description: "Failed to load voice message",
                });
            };
        }

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            try {
                await audioRef.current.play();
                setIsPlaying(true);
            } catch (error) {
                console.error('Failed to play audio:', error);
                toast({
                    variant: "destructive",
                    description: "Failed to play voice message",
                });
            }
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <ComponentErrorBoundary componentName="Voice Message Player">
            <div className={cn(
                "flex items-center gap-3 p-3 rounded-lg max-w-xs",
                isOwn
                    ? "bg-blue-500 text-white"
                    : "bg-muted",
                className
            )}>
                <Button
                    onClick={togglePlay}
                    size="sm"
                    variant="ghost"
                    className={cn(
                        "w-8 h-8 p-0 rounded-full",
                        isOwn ? "hover:bg-blue-600" : "hover:bg-muted-foreground/10"
                    )}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <LoadingSpinner size="sm" />
                    ) : isPlaying ? (
                        <Pause className="w-4 h-4" />
                    ) : (
                        <Play className="w-4 h-4" />
                    )}
                </Button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Volume2 className="w-3 h-3" />
                        <span className="text-xs font-mono">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className={cn(
                        "w-full rounded-full h-1",
                        isOwn ? "bg-blue-300" : "bg-muted-foreground/20"
                    )}>
                        <div
                            className={cn(
                                "h-1 rounded-full transition-all",
                                isOwn ? "bg-white" : "bg-blue-500"
                            )}
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                    </div>
                </div>

                <Button
                    onClick={toggleMute}
                    size="sm"
                    variant="ghost"
                    className={cn(
                        "w-6 h-6 p-0",
                        isOwn ? "hover:bg-blue-600" : "hover:bg-muted-foreground/10"
                    )}
                >
                    {isMuted ? (
                        <VolumeX className="w-3 h-3" />
                    ) : (
                        <Volume2 className="w-3 h-3" />
                    )}
                </Button>
            </div>
        </ComponentErrorBoundary>
    );
}