import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import EmojiPicker from "../components/SimpleEmojiPicker";
type EmojiClickData = { emoji: string };
import { ImagePlus, Loader2, Smile, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Comment } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useAddComment, useComments } from "../hooks/useQueries";
import { useStorageClient } from "../hooks/useStorageClient";
import { useLanguage } from "../i18n/LanguageContext";

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CommentImage({ hash }: { hash: string }) {
  const { getImageUrl, isReady } = useStorageClient();
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!isReady || !hash) return;
    getImageUrl(hash)
      .then(setSrc)
      .catch(() => {});
  }, [hash, isReady, getImageUrl]);

  if (!src) return <Skeleton className="w-20 h-20 rounded-lg" />;
  return (
    <img
      src={src}
      alt="Bifogad bild"
      className="w-20 h-20 object-cover rounded-lg border border-border"
      loading="lazy"
    />
  );
}

function CommentItem({ comment, index }: { comment: Comment; index: number }) {
  const { t } = useLanguage();
  const initial = comment.authorAlias
    ? comment.authorAlias[0].toUpperCase()
    : "?";
  return (
    <div
      data-ocid={`comments.item.${index}`}
      className="flex gap-3 py-4 border-b border-border last:border-0"
    >
      <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
        <AvatarFallback className="bg-amber-100 text-amber-700 text-xs font-semibold">
          {initial}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm text-foreground font-body">
            {comment.authorAlias || t("comments_anon")}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(comment.createdAt)}
          </span>
        </div>
        <p className="text-sm text-foreground font-body whitespace-pre-wrap break-words">
          {comment.content}
        </p>
        {comment.imageKeys.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {comment.imageKeys.map((key) => (
              <CommentImage key={key} hash={key} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface CommentsSectionProps {
  postId: bigint;
}

export default function CommentsSection({ postId }: CommentsSectionProps) {
  const { identity } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const { t } = useLanguage();
  const { data: comments = [], isLoading } = useComments(postId);
  const addComment = useAddComment();
  const { uploadImage, isReady: storageReady } = useStorageClient();

  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachments, setAttachments] = useState<
    { file: File; previewUrl: string; uploading: boolean; key?: string }[]
  >([]);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Actor is ready when it exists and is not being fetched
  const actorReady = !!actor && !actorFetching;

  useEffect(() => {
    if (!showEmoji) return;
    function handleClick(e: MouseEvent) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmoji(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmoji]);

  function onEmojiClick(data: EmojiClickData) {
    const ta = textareaRef.current;
    if (!ta) {
      setText((prev) => prev + data.emoji);
      return;
    }
    const start = ta.selectionStart ?? text.length;
    const end = ta.selectionEnd ?? text.length;
    const newText = text.slice(0, start) + data.emoji + text.slice(end);
    setText(newText);
    requestAnimationFrame(() => {
      ta.selectionStart = start + data.emoji.length;
      ta.selectionEnd = start + data.emoji.length;
      ta.focus();
    });
    setShowEmoji(false);
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (attachments.length + files.length > 3) {
      toast.error(t("comments_max_images"));
      return;
    }
    const newItems = files.map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      uploading: true,
    }));
    setAttachments((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        const key = await uploadImage(item.file);
        setAttachments((prev) =>
          prev.map((a) =>
            a.previewUrl === item.previewUrl
              ? { ...a, uploading: false, key }
              : a,
          ),
        );
      } catch {
        toast.error(t("comments_upload_error"));
        setAttachments((prev) =>
          prev.filter((a) => a.previewUrl !== item.previewUrl),
        );
      }
    }
    if (e.target) e.target.value = "";
  }

  function removeAttachment(previewUrl: string) {
    setAttachments((prev) => prev.filter((a) => a.previewUrl !== previewUrl));
  }

  async function handleSubmit() {
    if (!actorReady) {
      toast.error("Anslutningen är inte redo. Försök igen om ett ögonblick.");
      return;
    }
    if (!text.trim() && attachments.length === 0) return;
    if (attachments.some((a) => a.uploading)) {
      toast.error(t("comments_uploading"));
      return;
    }
    const imageKeys = attachments.map((a) => a.key ?? "").filter(Boolean);
    try {
      await addComment.mutateAsync({ postId, content: text.trim(), imageKeys });
      setText("");
      setAttachments([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("comments_error"));
    }
  }

  const sortedComments = [...comments].sort((a, b) =>
    Number(a.createdAt - b.createdAt),
  );

  return (
    <div>
      {isLoading ? (
        <div className="space-y-4" data-ocid="comments.loading_state">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedComments.length === 0 ? (
        <div
          className="text-center py-8 text-muted-foreground font-body text-sm"
          data-ocid="comments.empty_state"
        >
          {t("comments_none")}
        </div>
      ) : (
        <div data-ocid="comments.list">
          {sortedComments.map((comment, idx) => (
            <CommentItem
              key={comment.id.toString()}
              comment={comment}
              index={idx + 1}
            />
          ))}
        </div>
      )}

      {identity ? (
        <div className="mt-4 space-y-3">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((a) => (
                <div key={a.previewUrl} className="relative">
                  <img
                    src={a.previewUrl}
                    alt="Förhandsgranskning"
                    className="w-16 h-16 object-cover rounded-lg border border-border"
                  />
                  {a.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.previewUrl)}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                    aria-label="Ta bort bild"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                actorReady ? t("comments_placeholder") : "Ansluter..."
              }
              data-ocid="comments.textarea"
              className="font-body text-sm resize-none pr-4 min-h-[80px]"
              disabled={!actorReady}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 relative">
              <div ref={emojiPickerRef} className="relative">
                <button
                  type="button"
                  data-ocid="comments.emoji_button"
                  onClick={() => setShowEmoji((v) => !v)}
                  disabled={!actorReady}
                  className="p-2 rounded-lg hover:bg-accent/60 transition-colors text-muted-foreground hover:text-amber-600 disabled:opacity-40"
                  title="Lägg till emoji"
                  aria-label="Emoji-väljare"
                >
                  <Smile className="w-4 h-4" />
                </button>
                {showEmoji && (
                  <div className="absolute bottom-10 left-0 z-50">
                    <EmojiPicker
                      onEmojiClick={onEmojiClick}
                      searchPlaceholder="Sök emoji..."
                    />
                  </div>
                )}
              </div>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
                disabled={
                  !storageReady || !actorReady || attachments.length >= 3
                }
              />
              <button
                type="button"
                data-ocid="comments.upload_button"
                onClick={() => imageInputRef.current?.click()}
                disabled={
                  !storageReady || !actorReady || attachments.length >= 3
                }
                className="p-2 rounded-lg hover:bg-accent/60 transition-colors text-muted-foreground hover:text-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
                title={attachments.length >= 3 ? "Max 3 bilder" : "Bifoga bild"}
                aria-label="Bifoga bild"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
            </div>

            <Button
              size="sm"
              data-ocid="comments.submit_button"
              onClick={handleSubmit}
              disabled={
                !actorReady ||
                addComment.isPending ||
                (!text.trim() && attachments.length === 0) ||
                attachments.some((a) => a.uploading)
              }
              className="bg-amber-600 hover:bg-amber-700 text-white font-body disabled:opacity-50"
            >
              {!actorReady ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : addComment.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : null}
              {!actorReady ? "Ansluter..." : t("comments_submit")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 text-center py-4 text-sm text-muted-foreground font-body">
          {t("comments_login")}
        </div>
      )}
    </div>
  );
}
