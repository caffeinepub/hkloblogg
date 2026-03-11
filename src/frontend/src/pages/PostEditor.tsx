import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bold,
  ChevronLeft,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  List,
  Loader2,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useCategories,
  useCreatePost,
  usePostById,
  usePublishPost,
  useUpdatePost,
  useUpdatePostImages,
} from "../hooks/useQueries";
import { useStorageClient } from "../hooks/useStorageClient";
import type { NavigateFn } from "../types";

interface GalleryItem {
  file?: File;
  hash?: string;
  previewUrl: string;
  uploading?: boolean;
  uploadProgress?: number;
  error?: string;
}

interface CoverItem {
  file?: File;
  hash?: string;
  previewUrl: string;
  uploading?: boolean;
  uploadProgress?: number;
}

interface PostEditorProps {
  postId?: bigint;
  onNavigate: NavigateFn;
}

const TOOLBAR_BUTTONS = [
  { cmd: "bold", icon: Bold, label: "Fetstil" },
  { cmd: "italic", icon: Italic, label: "Kursiv" },
  { cmd: "formatBlock", value: "h2", icon: Heading2, label: "Rubrik 2" },
  { cmd: "formatBlock", value: "h3", icon: Heading3, label: "Rubrik 3" },
  { cmd: "insertUnorderedList", icon: List, label: "Punktlista" },
];

export default function PostEditor({ postId, onNavigate }: PostEditorProps) {
  const isEditing = postId !== undefined;
  const { data: existingPost, isLoading: postLoading } = usePostById(
    postId ?? null,
  );
  const { data: categories = [], isLoading: catLoading } = useCategories();
  const {
    uploadImage,
    getImageUrl,
    isReady: storageReady,
  } = useStorageClient();

  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const updatePostImages = useUpdatePostImages();
  const publishPost = usePublishPost();

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [cover, setCover] = useState<CoverItem | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [initialized, setInitialized] = useState(false);

  // Populate fields when editing
  useEffect(() => {
    if (!isEditing || !existingPost || initialized) return;
    setTitle(existingPost.title);
    setCategoryId(String(existingPost.categoryId));
    if (editorRef.current) {
      editorRef.current.innerHTML = existingPost.content;
    }
    // Load existing images
    const loadImages = async () => {
      if (existingPost.coverImageKey.length > 0) {
        try {
          const coverKey = existingPost.coverImageKey[0] ?? "";
          const url = await getImageUrl(coverKey);
          setCover({ hash: coverKey, previewUrl: url });
        } catch (_) {
          /* ignore */
        }
      }
      if (existingPost.galleryImageKeys.length > 0) {
        const items: GalleryItem[] = await Promise.all(
          existingPost.galleryImageKeys.map(async (hash) => {
            try {
              const url = await getImageUrl(hash);
              return { hash, previewUrl: url };
            } catch (_) {
              return { hash, previewUrl: "" };
            }
          }),
        );
        setGallery(items);
      }
    };
    loadImages();
    setInitialized(true);
  }, [existingPost, isEditing, initialized, getImageUrl]);

  const execCmd = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setCover({ file, previewUrl, uploading: false });
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const items: GalleryItem[] = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setGallery((prev) => [...prev, ...items]);
    e.target.value = "";
  };

  const removeGalleryItem = (index: number) => {
    setGallery((prev) => {
      const item = prev[index];
      if (item.file) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadPendingImages = useCallback(async (): Promise<{
    coverKey: [] | [string];
    galleryKeys: string[];
  }> => {
    // Upload cover if new file
    let coverKey: [] | [string] = cover?.hash ? [cover.hash] : [];
    if (cover?.file) {
      setCover((c) => (c ? { ...c, uploading: true, uploadProgress: 0 } : c));
      const hash = await uploadImage(cover.file, (pct) => {
        setCover((c) => (c ? { ...c, uploadProgress: pct } : c));
      });
      setCover((c) =>
        c ? { ...c, hash, uploading: false, file: undefined } : c,
      );
      coverKey = [hash];
    }

    // Upload gallery items with new files
    const galleryKeys: string[] = [];
    const updated = await Promise.all(
      gallery.map(async (item, idx) => {
        if (item.hash) {
          galleryKeys.push(item.hash);
          return item;
        }
        if (!item.file) return item;
        setGallery((prev) =>
          prev.map((g, i) =>
            i === idx ? { ...g, uploading: true, uploadProgress: 0 } : g,
          ),
        );
        const hash = await uploadImage(item.file, (pct) => {
          setGallery((prev) =>
            prev.map((g, i) => (i === idx ? { ...g, uploadProgress: pct } : g)),
          );
        });
        galleryKeys.push(hash);
        return { ...item, hash, uploading: false, file: undefined };
      }),
    );
    setGallery(updated);
    return { coverKey, galleryKeys };
  }, [cover, gallery, uploadImage]);

  const getContent = () => editorRef.current?.innerHTML ?? "";

  const validate = () => {
    if (!title.trim()) {
      toast.error("Ange en titel");
      return false;
    }
    if (!categoryId) {
      toast.error("Välj en kategori");
      return false;
    }
    if (!getContent().trim()) {
      toast.error("Innehållet får inte vara tomt");
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    try {
      const content = getContent();
      if (isEditing && postId !== undefined) {
        await updatePost.mutateAsync({
          postId,
          title,
          content,
          categoryId: BigInt(categoryId),
        });
        const { coverKey, galleryKeys } = await uploadPendingImages();
        await updatePostImages.mutateAsync({
          postId,
          coverImageKey: coverKey,
          galleryImageKeys: galleryKeys,
        });
        toast.success("Utkast sparat!");
      } else {
        const newId = await createPost.mutateAsync({
          title,
          content,
          categoryId: BigInt(categoryId),
        });
        const { coverKey, galleryKeys } = await uploadPendingImages();
        await updatePostImages.mutateAsync({
          postId: newId,
          coverImageKey: coverKey,
          galleryImageKeys: galleryKeys,
        });
        toast.success("Utkast sparat!");
        onNavigate({ type: "edit", postId: newId });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    }
  };

  const handlePublish = async () => {
    if (!validate()) return;
    try {
      const content = getContent();
      let targetId = postId;
      if (isEditing && postId !== undefined) {
        await updatePost.mutateAsync({
          postId,
          title,
          content,
          categoryId: BigInt(categoryId),
        });
        const { coverKey, galleryKeys } = await uploadPendingImages();
        await updatePostImages.mutateAsync({
          postId,
          coverImageKey: coverKey,
          galleryImageKeys: galleryKeys,
        });
      } else {
        targetId = await createPost.mutateAsync({
          title,
          content,
          categoryId: BigInt(categoryId),
        });
        const { coverKey, galleryKeys } = await uploadPendingImages();
        await updatePostImages.mutateAsync({
          postId: targetId!,
          coverImageKey: coverKey,
          galleryImageKeys: galleryKeys,
        });
      }
      await publishPost.mutateAsync(targetId!);
      toast.success("Publicerat!");
      onNavigate({ type: "my-posts" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    }
  };

  const isBusy =
    createPost.isPending ||
    updatePost.isPending ||
    updatePostImages.isPending ||
    publishPost.isPending ||
    cover?.uploading ||
    gallery.some((g) => g.uploading);

  if (isEditing && postLoading) {
    return (
      <div
        className="max-w-3xl mx-auto px-4 py-12 space-y-4"
        data-ocid="editor.loading_state"
      >
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto px-4 py-8"
    >
      {/* Back + title */}
      <div className="flex items-center gap-3 mb-8">
        <Button
          data-ocid="editor.cancel_button"
          variant="ghost"
          size="sm"
          onClick={() => onNavigate({ type: "my-posts" })}
          className="font-body"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Tillbaka
        </Button>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {isEditing ? "Redigera inlägg" : "Nytt inlägg"}
        </h1>
      </div>

      <div className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="post-title" className="font-body font-semibold">
            Titel
          </Label>
          <Input
            id="post-title"
            data-ocid="editor.input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ge ditt inlägg en rubrik…"
            className="text-lg font-display font-semibold bg-card h-12"
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label className="font-body font-semibold">Kategori</Label>
          {catLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger
                data-ocid="editor.select"
                className="w-full sm:w-64 font-body bg-card"
              >
                <SelectValue placeholder="Välj kategori…" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={String(cat.id)} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Rich Text Editor */}
        <div className="space-y-2">
          <Label className="font-body font-semibold">Innehåll</Label>
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/50">
              {TOOLBAR_BUTTONS.map((btn) => (
                <button
                  key={btn.cmd + (btn.value ?? "")}
                  type="button"
                  title={btn.label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCmd(btn.cmd, btn.value);
                  }}
                  className="p-2 rounded-lg hover:bg-accent/70 transition-colors text-foreground/70 hover:text-foreground"
                  aria-label={btn.label}
                >
                  <btn.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
            {/* Editable area */}
            <div
              ref={editorRef}
              data-ocid="editor.editor"
              contentEditable
              suppressContentEditableWarning
              className="min-h-[240px] p-4 font-body text-foreground focus:outline-none prose prose-sm max-w-none"
              style={{ lineHeight: 1.75 }}
            />
          </div>
        </div>

        {/* Cover image */}
        <div className="space-y-2">
          <Label className="font-body font-semibold">Omslagsbild</Label>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverSelect}
          />
          {cover ? (
            <div className="relative rounded-xl overflow-hidden border border-border bg-muted aspect-video w-full max-w-md">
              <img
                src={cover.previewUrl}
                alt="Cover preview"
                className="w-full h-full object-cover"
              />
              {cover.uploading && (
                <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-2 p-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <Progress
                    value={cover.uploadProgress ?? 0}
                    className="w-32 h-1.5"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setCover(null)}
                className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-destructive hover:text-white transition-colors"
                aria-label="Ta bort omslagsbild"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-ocid="editor.upload_button"
              onClick={() => coverInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-xl text-sm font-body text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
              Ladda upp omslagsbild
            </button>
          )}
        </div>

        {/* Gallery */}
        <div className="space-y-2">
          <Label className="font-body font-semibold">Bildgalleri</Label>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleGallerySelect}
          />
          {gallery.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
              <AnimatePresence>
                {gallery.map((item, idx) => (
                  <motion.div
                    key={item.previewUrl}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted cursor-pointer"
                    onClick={() => setLightboxSrc(item.previewUrl)}
                  >
                    {item.previewUrl && (
                      <img
                        src={item.previewUrl}
                        alt={`Gallery ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {item.uploading && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeGalleryItem(idx);
                      }}
                      className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 hover:bg-destructive hover:text-white transition-colors"
                      aria-label="Ta bort bild"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          <button
            type="button"
            data-ocid="editor.dropzone"
            onClick={() => galleryInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-xl text-sm font-body text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
          >
            <ImagePlus className="w-4 h-4" />
            Lägg till bilder i galleriet
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
          <Button
            data-ocid="editor.save_button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={!!isBusy || !storageReady}
            className="flex-1 font-body"
          >
            {createPost.isPending || updatePost.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Spara utkast
          </Button>
          <Button
            data-ocid="editor.submit_button"
            onClick={handlePublish}
            disabled={!!isBusy || !storageReady}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-body"
          >
            {publishPost.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Publicera
          </Button>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/90 flex items-center justify-center p-4"
            onClick={() => setLightboxSrc(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={lightboxSrc}
              alt="Förstoring"
              className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            />
            <button
              type="button"
              className="absolute top-4 right-4 bg-card rounded-full p-2 hover:bg-destructive hover:text-white transition-colors"
              onClick={() => setLightboxSrc(null)}
              aria-label="Stäng"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sr-only" aria-live="polite">
        {isBusy ? "Sparar…" : ""}
      </div>
    </motion.div>
  );
}
