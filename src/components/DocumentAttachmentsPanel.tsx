import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Paperclip, Trash2, Download, Loader2, Mic, MicOff,
  Square, Play, Pause, FileText, Image, File, Volume2
} from "lucide-react";
import {
  fetchDocAttachments,
  uploadDocAttachment,
  deleteDocAttachment,
  getSignedUrl,
  type DocAttachment,
} from "@/lib/document-attachments";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface DocumentAttachmentsPanelProps {
  docType: string;
  docId: string;
  companyId?: string | null;
  readOnly?: boolean;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}

function getFileIcon(type: string | null, isAudio: boolean) {
  if (isAudio) return <Volume2 className="h-4 w-4 text-primary" />;
  if (!type) return <File className="h-4 w-4 text-muted-foreground" />;
  if (type.startsWith("image/")) return <Image className="h-4 w-4 text-primary" />;
  if (type === "application/pdf") return <FileText className="h-4 w-4 text-destructive" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

// ── Audio recorder sub-component ──────────────────────────────
function AudioRecorder({ onRecorded }: { onRecorded: (blob: Blob) => void }) {
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState<Blob | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecorded(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      toast({ title: "Microphone non accessible", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const playPause = () => {
    if (!recorded) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(URL.createObjectURL(recorded));
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const reset = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setRecorded(null);
    setPlaying(false);
    setDuration(0);
  };

  const confirm = () => {
    if (recorded) {
      onRecorded(recorded);
      reset();
    }
  };

  const fmtDur = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!recorded ? (
        recording ? (
          <Button size="sm" variant="destructive" onClick={stopRecording} className="gap-1.5 animate-pulse">
            <Square className="h-3 w-3" /> Arrêter ({fmtDur(duration)})
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={startRecording} className="gap-1.5">
            <Mic className="h-3.5 w-3.5" /> Enregistrer
          </Button>
        )
      ) : (
        <>
          <Button size="sm" variant="outline" onClick={playPause} className="gap-1.5">
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {fmtDur(duration)}
          </Button>
          <Button size="sm" onClick={confirm} className="gap-1.5">
            <Paperclip className="h-3.5 w-3.5" /> Attacher
          </Button>
          <Button size="sm" variant="ghost" onClick={reset}><MicOff className="h-3.5 w-3.5" /></Button>
        </>
      )}
    </div>
  );
}

// ── Audio player for existing attachments ────────────────────
function AudioPlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggle}>
      {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
    </Button>
  );
}

// ── Main panel ───────────────────────────────────────────────
export function DocumentAttachmentsPanel({
  docType,
  docId,
  companyId,
  readOnly = false,
}: DocumentAttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<DocAttachment[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { isAdmin } = useAuth();

  const load = useCallback(async () => {
    if (!docId) return;
    const data = await fetchDocAttachments(docType, docId);
    setAttachments(data);
    // Generate signed URLs for each attachment
    const urls: Record<string, string> = {};
    await Promise.all(
      data.map(async (att) => {
        const url = await getSignedUrl(att.file_url);
        urls[att.id] = url;
      })
    );
    setSignedUrls(urls);
  }, [docType, docId]);

  useEffect(() => { load(); }, [load]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await uploadDocAttachment(file, docType, docId, companyId, false);
    await load();
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleAudioRecorded = async (blob: Blob) => {
    setLoadingAudio(true);
    const now = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const fileName = `note-audio-${now}.webm`;
    const audioFile = new window.File([blob], fileName, { type: "audio/webm" });
    await uploadDocAttachment(audioFile, docType, docId, companyId, true);
    await load();
    setLoadingAudio(false);
  };

  const handleDelete = async (att: DocAttachment) => {
    await deleteDocAttachment(att.id, att.file_url);
    await load();
  };

  const canDelete = (att: DocAttachment) => isAdmin();

  const files = attachments.filter((a) => !a.is_audio);
  const audios = attachments.filter((a) => a.is_audio);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Paperclip className="h-4 w-4 text-primary" />
          Pièces jointes
          {attachments.length > 0 && (
            <Badge variant="secondary" className="text-xs">{attachments.length}</Badge>
          )}
        </h4>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="gap-1.5"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Paperclip className="h-3.5 w-3.5" />
              )}
              Fichier
            </Button>
          </div>
        )}
      </div>

      {/* ── Audio recorder ── */}
      {!readOnly && (
        <div className="bg-muted/30 rounded-md px-3 py-2 border border-dashed border-border">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Mic className="h-3.5 w-3.5" /> Note vocale
          </p>
          {loadingAudio ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement en cours de sauvegarde...
            </div>
          ) : (
            <AudioRecorder onRecorded={handleAudioRecorded} />
          )}
        </div>
      )}

      {/* ── Files list ── */}
      {files.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Documents</p>
          {files.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-3 p-2 rounded-md border border-border hover:bg-muted/40 transition-colors"
            >
              {getFileIcon(att.file_type, false)}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{att.file_name}</p>
                <p className="text-[10px] text-muted-foreground">{formatSize(att.file_size)}</p>
              </div>
              <div className="flex items-center gap-1">
                {signedUrls[att.id] && (
                  <a href={signedUrls[att.id]} target="_blank" rel="noopener noreferrer" download={att.file_name}>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                )}
                {canDelete(att) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDelete(att)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Audio notes list ── */}
      {audios.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes vocales</p>
          {audios.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-3 p-2 rounded-md border border-border bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <Volume2 className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{att.file_name}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(att.created_at).toLocaleString("fr-MA")}</p>
              </div>
              <div className="flex items-center gap-1">
                {signedUrls[att.id] && <AudioPlayer url={signedUrls[att.id]} />}
                {canDelete(att) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDelete(att)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Aucune pièce jointe ni note vocale
        </p>
      )}
    </div>
  );
}
