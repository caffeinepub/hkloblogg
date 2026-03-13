import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import EmojiPicker from "../components/SimpleEmojiPicker";
type EmojiClickData = { emoji: string };
import {
  Bold,
  ChevronDown,
  ChevronLeft,
  Globe,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  List,
  Loader2,
  Lock,
  Plus,
  Save,
  Send,
  Smile,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AccessLevel, Category } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCategories,
  useCheckIsAdmin,
  useCreateCategory,
  useCreatePost,
  usePostById,
  usePublishPost,
  useSetAlias,
  useUpdatePost,
  useUpdatePostImages,
  useUserProfile,
} from "../hooks/useQueries";
import { useStorageClient } from "../hooks/useStorageClient";
import { useLanguage } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/sv";
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
  { cmd: "bold", icon: Bold, labelKey: "editor_save_draft" as const },
  { cmd: "italic", icon: Italic, labelKey: "editor_save_draft" as const },
  {
    cmd: "formatBlock",
    value: "h2",
    icon: Heading2,
    labelKey: "editor_save_draft" as const,
  },
  {
    cmd: "formatBlock",
    value: "h3",
    icon: Heading3,
    labelKey: "editor_save_draft" as const,
  },
  {
    cmd: "insertUnorderedList",
    icon: List,
    labelKey: "editor_save_draft" as const,
  },
];

const TOOLBAR_LABELS = [
  "Fetstil",
  "Kursiv",
  "Rubrik 2",
  "Rubrik 3",
  "Punktlista",
];

function accessLevelIcon(level: AccessLevel) {
  if ("Public" in level) return Globe;
  if ("Restricted" in level) return Users;
  return Lock;
}

function accessLevelBadge(
  level: AccessLevel,
  t: (k: TranslationKey) => string,
) {
  if ("Public" in level)
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-body">
        {t("cat_public")}
      </Badge>
    );
  if ("Restricted" in level)
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-body">
        {t("cat_restricted")}
      </Badge>
    );
  return (
    <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-xs font-body">
      {t("cat_private")}
    </Badge>
  );
}

// ─── Visibility chip ─────────────────────────────────────────────────────────
function VisibilityChip({
  category,
  t,
}: {
  category: Category | undefined;
  t: (k: TranslationKey) => string;
}) {
  if (!category) return null;
  const level = category.accessLevel;
  const Icon = accessLevelIcon(level);

  let text: string;
  let colorClass: string;
  if ("Public" in level) {
    text = t("editor_visibility_public");
    colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if ("Restricted" in level) {
    const count = category.readerList.length;
    text = `${t("editor_visibility_restricted")} ${category.name}${count > 0 ? ` (${count} personer)` : ""}`;
    colorClass = "bg-amber-50 text-amber-700 border-amber-200";
  } else {
    text = t("editor_visibility_private");
    colorClass = "bg-rose-50 text-rose-700 border-rose-200";
  }

  return (
    <div
      data-ocid="editor.visibility.panel"
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-body border ${colorClass}`}
    >
      <Icon className="w-3 h-3" />
      {text}
    </div>
  );
}

// ─── Create Category Dialog ───────────────────────────────────────────────────
function CreateCategoryDialog({
  open,
  onClose,
  onCreated,
  t,
  isAdmin,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: bigint) => void;
  t: (k: TranslationKey) => string;
  isAdmin: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accessLevel, setAccessLevel] = useState<
    "Public" | "Restricted" | "Private"
  >(isAdmin ? "Public" : "Restricted");
  const createCategory = useCreateCategory();

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(`${t("cat_name")} är obligatoriskt`);
      return;
    }
    const level: AccessLevel =
      accessLevel === "Public"
        ? { Public: null }
        : accessLevel === "Restricted"
          ? { Restricted: null }
          : { Private: null };
    try {
      const id = await createCategory.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        accessLevel: level,
      });
      toast.success(`${t("cat_create")}!`);
      onCreated(id);
      setName("");
      setDescription("");
      setAccessLevel("Public");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-ocid="editor.create_category.dialog"
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-display">
            {t("cat_create_dialog_title")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name" className="font-body font-semibold">
              {t("cat_name")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cat-name"
              data-ocid="editor.category_name.input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="T.ex. Familj, Arbete…"
              className="font-body"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-desc" className="font-body font-semibold">
              {t("cat_description")}
            </Label>
            <Input
              id="cat-desc"
              data-ocid="editor.category_description.input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kort beskrivning…"
              className="font-body"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-body font-semibold">
              {t("cat_access_level")}
            </Label>
            {isAdmin ? (
              <RadioGroup
                data-ocid="editor.access_level.select"
                value={accessLevel}
                onValueChange={(v) =>
                  setAccessLevel(v as "Public" | "Restricted" | "Private")
                }
                className="space-y-2"
              >
                <label
                  htmlFor="al-public"
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/40 cursor-pointer transition-colors"
                >
                  <RadioGroupItem
                    value="Public"
                    id="al-public"
                    className="mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-body font-semibold text-sm">
                      <Globe className="w-3.5 h-3.5 text-emerald-600" />
                      {t("cat_public")}
                    </div>
                    <p className="text-xs text-muted-foreground font-body">
                      {t("cat_public_desc")}
                    </p>
                  </div>
                </label>
                <label
                  htmlFor="al-restricted"
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/40 cursor-pointer transition-colors"
                >
                  <RadioGroupItem
                    value="Restricted"
                    id="al-restricted"
                    className="mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-body font-semibold text-sm">
                      <Users className="w-3.5 h-3.5 text-amber-600" />
                      {t("cat_restricted")}
                    </div>
                    <p className="text-xs text-muted-foreground font-body">
                      {t("cat_restricted_desc")}
                    </p>
                  </div>
                </label>
                <label
                  htmlFor="al-private"
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/40 cursor-pointer transition-colors"
                >
                  <RadioGroupItem
                    value="Private"
                    id="al-private"
                    className="mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-body font-semibold text-sm">
                      <Lock className="w-3.5 h-3.5 text-rose-600" />
                      {t("cat_private")}
                    </div>
                    <p className="text-xs text-muted-foreground font-body">
                      {t("cat_private_desc")}
                    </p>
                  </div>
                </label>
              </RadioGroup>
            ) : (
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-accent/20">
                <div>
                  <div className="flex items-center gap-1.5 font-body font-semibold text-sm">
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                    {t("cat_restricted")}
                  </div>
                  <p className="text-xs text-muted-foreground font-body">
                    {t("cat_restricted_desc")}
                  </p>
                  <p className="text-xs text-muted-foreground font-body mt-1 italic">
                    Synlig för utvalda användare
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            data-ocid="editor.create_category.cancel_button"
            variant="outline"
            onClick={onClose}
            className="font-body"
          >
            {t("cat_cancel")}
          </Button>
          <Button
            data-ocid="editor.create_category.submit_button"
            onClick={handleSubmit}
            disabled={createCategory.isPending}
            className="bg-primary text-primary-foreground font-body"
          >
            {createCategory.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            {t("cat_create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Category Combobox ────────────────────────────────────────────────────────
function CategoryCombobox({
  categories,
  value,
  onChange,
  t,
  isAdmin,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  t: (k: TranslationKey) => string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const selected = categories.find((c) => String(c.id) === value);
  const Icon = selected ? accessLevelIcon(selected.accessLevel) : Globe;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-ocid="editor.category.select"
            className="flex items-center justify-between gap-2 w-full sm:w-72 px-3 py-2 h-10 rounded-lg border border-input bg-card text-sm font-body hover:bg-accent/40 transition-colors text-left"
          >
            <span className="flex items-center gap-2 min-w-0">
              <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate">
                {selected ? selected.name : t("editor_choose_category")}
              </span>
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          data-ocid="editor.category.popover"
          className="w-80 p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Sök kategori…" className="font-body" />
            <CommandList>
              <CommandEmpty className="py-4 text-center text-sm font-body text-muted-foreground">
                Inga kategorier hittades.
              </CommandEmpty>
              <CommandGroup>
                {categories.map((cat) => {
                  const CatIcon = accessLevelIcon(cat.accessLevel);
                  return (
                    <CommandItem
                      key={String(cat.id)}
                      value={cat.name}
                      onSelect={() => {
                        onChange(String(cat.id));
                        setOpen(false);
                      }}
                      className="flex items-start gap-3 px-3 py-2.5 cursor-pointer"
                    >
                      <CatIcon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body font-semibold text-sm">
                            {cat.name}
                          </span>
                          {accessLevelBadge(cat.accessLevel, t)}
                        </div>
                        {cat.description && (
                          <p className="text-xs text-muted-foreground font-body mt-0.5 truncate">
                            {cat.description}
                          </p>
                        )}
                      </div>
                      {String(cat.id) === value && (
                        <span className="text-primary text-xs">✓</span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  data-ocid="editor.create_category.open_modal_button"
                  onSelect={() => {
                    setOpen(false);
                    setDialogOpen(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer text-primary font-body font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  {t("editor_create_category")}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <CreateCategoryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(id) => onChange(String(id))}
        t={t}
        isAdmin={isAdmin}
      />
    </>
  );
}

// ─── Main PostEditor ──────────────────────────────────────────────────────────
export default function PostEditor({ postId, onNavigate }: PostEditorProps) {
  const { t, lang } = useLanguage();
  const isEditing = postId !== undefined;
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal() ?? null;
  const { data: userProfile } = useUserProfile(principalId);
  const authorAlias =
    userProfile?.alias || localStorage.getItem("hklo_alias") || "";
  const setAlias = useSetAlias();
  const [authorName, setAuthorName] = useState(authorAlias);
  const [postLanguage, setPostLanguage] = useState<"sv" | "en">(lang);
  const { data: existingPost, isLoading: postLoading } = usePostById(
    postId ?? null,
  );
  const { data: categories = [], isLoading: catLoading } = useCategories();
  const {
    uploadImage,
    getImageUrl,
    isReady: storageReady,
  } = useStorageClient();

  const { data: isAdmin = false } = useCheckIsAdmin();
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
  const editorEmojiRef = useRef<HTMLDivElement>(null);
  const [showEditorEmoji, setShowEditorEmoji] = useState(false);

  const [initialized, setInitialized] = useState(false);

  // Close editor emoji picker on outside click
  useEffect(() => {
    if (!showEditorEmoji) return;
    function handleClick(e: MouseEvent) {
      if (
        editorEmojiRef.current &&
        !editorEmojiRef.current.contains(e.target as Node)
      ) {
        setShowEditorEmoji(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEditorEmoji]);

  // Sync authorName when userProfile loads
  useEffect(() => {
    if (authorAlias && !authorName) setAuthorName(authorAlias);
  }, [authorAlias, authorName]);

  // Auto-select default category ("Offentligt" or first)
  useEffect(() => {
    if (categoryId || categories.length === 0 || isEditing) return;
    const defaultCat =
      categories.find((c) => c.name === "Offentligt") ?? categories[0];
    if (defaultCat) setCategoryId(String(defaultCat.id));
  }, [categories, categoryId, isEditing]);

  // Populate fields when editing
  useEffect(() => {
    if (!isEditing || !existingPost || initialized) return;
    setTitle(existingPost.title);
    setCategoryId(String(existingPost.categoryId));
    // Set language from existing post if available
    const existingLang = (existingPost as any).language;
    if (existingLang === "sv" || existingLang === "en") {
      setPostLanguage(existingLang);
    }
    if (editorRef.current) {
      editorRef.current.innerHTML = existingPost.content;
    }
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

  const selectedCategory = categories.find((c) => String(c.id) === categoryId);

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
      toast.error(`${t("editor_title")} är obligatoriskt`);
      return false;
    }
    if (!categoryId) {
      toast.error(`${t("editor_category")} måste väljas`);
      return false;
    }
    if (!getContent().trim()) {
      toast.error(`${t("editor_content")} får inte vara tomt`);
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
          language: postLanguage,
        });
        const { coverKey, galleryKeys } = await uploadPendingImages();
        await updatePostImages.mutateAsync({
          postId,
          coverImageKey: coverKey,
          galleryImageKeys: galleryKeys,
        });
        if (authorName.trim() && authorName.trim() !== authorAlias) {
          await setAlias.mutateAsync(authorName.trim());
        }
        toast.success(`${t("editor_save_draft")}!`);
      } else {
        const newId = await createPost.mutateAsync({
          title,
          content,
          categoryId: BigInt(categoryId),
          language: postLanguage,
        });
        const { coverKey, galleryKeys } = await uploadPendingImages();
        await updatePostImages.mutateAsync({
          postId: newId,
          coverImageKey: coverKey,
          galleryImageKeys: galleryKeys,
        });
        if (authorName.trim() && authorName.trim() !== authorAlias) {
          await setAlias.mutateAsync(authorName.trim());
        }
        toast.success(`${t("editor_save_draft")}!`);
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
          language: postLanguage,
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
          language: postLanguage,
        });
        const { coverKey, galleryKeys } = await uploadPendingImages();
        await updatePostImages.mutateAsync({
          postId: targetId!,
          coverImageKey: coverKey,
          galleryImageKeys: galleryKeys,
        });
      }
      const published = await publishPost.mutateAsync(targetId!);
      if (!published) {
        toast.error(
          "Inlägget kunde inte publiceras. Kontrollera att du är inloggad och försök igen.",
        );
        return;
      }
      if (authorName.trim() && authorName.trim() !== authorAlias) {
        await setAlias.mutateAsync(authorName.trim());
      }
      toast.success(`${t("editor_publish")}!`);
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
          {t("editor_back")}
        </Button>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {isEditing ? t("editor_edit_post") : t("editor_new_post")}
        </h1>
      </div>

      <div className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="post-title" className="font-body font-semibold">
            {t("editor_title")}
          </Label>
          <Input
            id="post-title"
            data-ocid="editor.input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("editor_title_placeholder")}
            className="text-lg font-display font-semibold bg-card h-12"
          />
        </div>

        {/* Author name field */}
        <div className="space-y-2">
          <Label className="font-body font-semibold">
            {t("editor_author")}
          </Label>
          <Input
            data-ocid="post.author_name.input"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder={t("editor_author_placeholder")}
            className="font-body h-10 bg-card"
          />
          {!authorAlias && authorName.trim() && (
            <p className="text-xs text-muted-foreground font-body">
              {t("editor_author_save_note")}
            </p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label className="font-body font-semibold">
            {t("editor_category")}
          </Label>
          {catLoading ? (
            <Skeleton className="h-10 w-72" />
          ) : (
            <CategoryCombobox
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              t={t}
              isAdmin={isAdmin}
            />
          )}
          {selectedCategory && (
            <VisibilityChip category={selectedCategory} t={t} />
          )}
        </div>

        {/* Post language selector */}
        <div className="space-y-2">
          <Label className="font-body font-semibold">
            {t("editor_lang_label")}
          </Label>
          <div className="flex gap-2" data-ocid="editor.toggle">
            <button
              type="button"
              onClick={() => setPostLanguage("sv")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-body font-semibold transition-colors ${
                postLanguage === "sv"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-accent/40"
              }`}
            >
              <span>🇸🇪</span> {t("editor_lang_sv")}
            </button>
            <button
              type="button"
              onClick={() => setPostLanguage("en")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-body font-semibold transition-colors ${
                postLanguage === "en"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-accent/40"
              }`}
            >
              <span>🇬🇧</span> {t("editor_lang_en")}
            </button>
          </div>
        </div>

        {/* Rich Text Editor */}
        <div className="space-y-2">
          <Label className="font-body font-semibold">
            {t("editor_content")}
          </Label>
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/50">
              {TOOLBAR_BUTTONS.map((btn, idx) => (
                <button
                  key={btn.cmd + (btn.value ?? "")}
                  type="button"
                  title={TOOLBAR_LABELS[idx]}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCmd(btn.cmd, btn.value);
                  }}
                  className="p-2 rounded-lg hover:bg-accent/70 transition-colors text-foreground/70 hover:text-foreground"
                  aria-label={TOOLBAR_LABELS[idx]}
                >
                  <btn.icon className="w-4 h-4" />
                </button>
              ))}
              {/* Emoji picker for editor */}
              <div ref={editorEmojiRef} className="relative ml-auto">
                <button
                  type="button"
                  title="Lägg till emoji"
                  aria-label="Emoji-väljare"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowEditorEmoji((v) => !v);
                  }}
                  className="p-2 rounded-lg hover:bg-accent/70 transition-colors text-foreground/70 hover:text-amber-600"
                >
                  <Smile className="w-4 h-4" />
                </button>
                {showEditorEmoji && (
                  <div className="absolute top-10 right-0 z-50">
                    <EmojiPicker
                      onEmojiClick={(data: EmojiClickData) => {
                        editorRef.current?.focus();
                        document.execCommand("insertText", false, data.emoji);
                        setShowEditorEmoji(false);
                      }}
                      searchPlaceholder="Sök emoji..."
                    />
                  </div>
                )}
              </div>
            </div>
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
          <Label className="font-body font-semibold">{t("editor_cover")}</Label>
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
              {t("editor_upload_cover")}
            </button>
          )}
        </div>

        {/* Gallery */}
        <div className="space-y-2">
          <Label className="font-body font-semibold">
            {t("editor_gallery")}
          </Label>
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
            {t("editor_add_gallery")}
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
            {t("editor_save_draft")}
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
            {t("editor_publish")}
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
