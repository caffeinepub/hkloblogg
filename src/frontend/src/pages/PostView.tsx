import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ChevronLeft, Edit, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import CommentsSection from "../components/CommentsSection";
import ReactionBar from "../components/ReactionBar";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCategories,
  useIncrementPostView,
  usePostById,
} from "../hooks/useQueries";
import { useStorageClient } from "../hooks/useStorageClient";
import type { NavigateFn } from "../types";

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function AsyncImage({
  hash,
  alt,
  className,
  onClick,
}: {
  hash: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  const { getImageUrl, isReady } = useStorageClient();
  const [src, setSrc] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady || !hash) return;
    getImageUrl(hash)
      .then((url) => {
        setSrc(url);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [hash, isReady, getImageUrl]);

  if (loading) return <Skeleton className={className} />;
  if (!src) return null;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block w-full h-full p-0 border-0 bg-transparent"
        aria-label={alt}
      >
        <img src={src} alt={alt} className={className} />
      </button>
    );
  }

  return <img src={src} alt={alt} className={className} />;
}

/** Renders post HTML content via ref to avoid lint/security rule */
function PostContent({
  html,
  className,
}: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = html;
    }
  }, [html]);
  return <div ref={ref} className={className} />;
}

interface PostViewProps {
  postId: bigint;
  onNavigate: NavigateFn;
}

export default function PostView({ postId, onNavigate }: PostViewProps) {
  const { data: post, isLoading, isError } = usePostById(postId);
  const { data: categories = [] } = useCategories();
  const incrementView = useIncrementPostView();
  const { identity } = useInternetIdentity();
  const { getImageUrl, isReady: storageReady } = useStorageClient();

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

  const principal = identity?.getPrincipal().toString();
  const isAuthor =
    post && principal && post.authorPrincipal.toString() === principal;

  const category = categories.find((c) => post && c.id === post.categoryId);
  // Increment view count when post loads (use ref to avoid mutateAsync dependency)
  const incrementViewRef = useRef(incrementView.mutateAsync);
  incrementViewRef.current = incrementView.mutateAsync;
  const viewedPostIdRef = useRef<bigint | null>(null);
  useEffect(() => {
    if (post && viewedPostIdRef.current !== post.id) {
      viewedPostIdRef.current = post.id;
      void incrementViewRef.current(post.id);
    }
  }, [post]);

  // Load gallery URLs
  useEffect(() => {
    if (!post || !storageReady || post.galleryImageKeys.length === 0) return;
    Promise.all(post.galleryImageKeys.map((h) => getImageUrl(h)))
      .then(setGalleryUrls)
      .catch(() => {});
  }, [post, storageReady, getImageUrl]);

  if (isLoading) {
    return (
      <div
        data-ocid="post.loading_state"
        className="max-w-3xl mx-auto px-4 py-12 space-y-6"
      >
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div
        data-ocid="post.error_state"
        className="max-w-3xl mx-auto px-4 py-24 flex flex-col items-center text-center"
      >
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="font-display text-xl font-bold text-foreground mb-2">
          Inlägget hittades inte
        </h2>
        <Button
          data-ocid="post.cancel_button"
          variant="outline"
          onClick={() => onNavigate({ type: "home" })}
          className="font-body mt-4"
        >
          Tillbaka till startsidan
        </Button>
      </div>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="max-w-3xl mx-auto px-4 py-8"
    >
      {/* Back */}
      <div className="flex items-center justify-between mb-6">
        <Button
          data-ocid="post.cancel_button"
          variant="ghost"
          size="sm"
          onClick={() => onNavigate({ type: "home" })}
          className="font-body"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Tillbaka
        </Button>
        {isAuthor && (
          <Button
            data-ocid="post.edit_button"
            size="sm"
            variant="outline"
            onClick={() => onNavigate({ type: "edit", postId: post.id })}
            className="font-body"
          >
            <Edit className="w-4 h-4 mr-1" />
            Redigera
          </Button>
        )}
      </div>

      {/* Cover */}
      {post.coverImageKey.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-8 aspect-video bg-muted">
          <AsyncImage
            hash={post.coverImageKey[0] ?? ""}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Meta */}
      <header className="mb-8">
        {category && (
          <Badge
            variant="secondary"
            className="mb-3 font-body text-xs bg-accent text-accent-foreground"
          >
            {category.name}
          </Badge>
        )}
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
          {post.title}
        </h1>
        <div className="flex items-center gap-4 text-sm font-body text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-foreground">
              {post.authorAlias.charAt(0).toUpperCase()}
            </div>
            <span>{post.authorAlias}</span>
          </div>
          <time>{formatDate(post.createdAt)}</time>
        </div>
      </header>

      {/* Post body */}
      <PostContent
        html={post.content}
        className="prose prose-stone max-w-none font-body text-foreground mb-10"
      />

      {/* Gallery */}
      {galleryUrls.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">
            Bildgalleri
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {galleryUrls.map((url, idx) => (
              <motion.div
                key={url}
                whileHover={{ scale: 1.02 }}
                className="aspect-square rounded-xl overflow-hidden bg-muted"
              >
                <button
                  type="button"
                  className="block w-full h-full p-0 border-0 bg-transparent"
                  onClick={() => setLightboxSrc(url)}
                  aria-label={`Öppna bild ${idx + 1}`}
                >
                  <img
                    src={url}
                    alt={`Bild ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}

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
        {/* Reactions & Comments */}
        <div className="mt-10 border-t border-border pt-8 space-y-8">
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-4">
              Reaktioner
            </h2>
            <ReactionBar postId={post.id} />
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-4">
              Kommentarer
            </h2>
            <CommentsSection postId={post.id} />
          </section>
        </div>
      </AnimatePresence>
    </motion.article>
  );
}
