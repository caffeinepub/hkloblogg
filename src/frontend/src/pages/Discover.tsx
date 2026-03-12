import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Globe } from "lucide-react";
import { motion } from "motion/react";
import type { Post } from "../backend.d";
import { useDiscoverPosts } from "../hooks/useQueries";
import type { NavigateFn } from "../types";

function formatDate(timestamp: bigint): string {
  const ms = Number(timestamp) / 1_000_000;
  return new Date(ms).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function DiscoverCard({
  post,
  index,
  onNavigate,
}: {
  post: Post;
  index: number;
  onNavigate: NavigateFn;
}) {
  const excerpt = post.content.replace(/<[^>]*>/g, "").slice(0, 180);
  return (
    <motion.article
      data-ocid={`discover.item.${index + 1}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: "easeOut" }}
      onClick={() => onNavigate({ type: "post", postId: post.id })}
      className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all cursor-pointer group flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <Badge
          variant="secondary"
          className="text-xs font-body bg-accent/60 text-foreground/70"
        >
          <Globe className="w-3 h-3 mr-1" />
          Offentligt
        </Badge>
        <time className="text-xs text-muted-foreground font-body shrink-0">
          {formatDate(post.createdAt)}
        </time>
      </div>

      <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
        {post.title}
      </h3>

      {excerpt && (
        <p className="text-sm text-muted-foreground font-body line-clamp-3 flex-1">
          {excerpt}…
        </p>
      )}

      <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border/50">
        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
          {post.authorAlias.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-body text-muted-foreground">
          {post.authorAlias}
        </span>
      </div>
    </motion.article>
  );
}

interface DiscoverProps {
  onNavigate: NavigateFn;
}

export default function Discover({ onNavigate }: DiscoverProps) {
  const { data: posts = [], isLoading } = useDiscoverPosts();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto px-4 py-10"
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Upptäck
          </h1>
        </div>
        <p className="font-body text-muted-foreground max-w-xl">
          Offentliga berättelser från hela gemenskapen — inga krav på
          inloggning.
        </p>
      </div>

      {isLoading ? (
        <div
          data-ocid="discover.loading_state"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-6 space-y-3"
            >
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <motion.div
          data-ocid="discover.empty_state"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-accent/50 flex items-center justify-center mb-5">
            <BookOpen className="w-9 h-9 text-primary" />
          </div>
          <h3 className="font-display text-xl font-bold text-foreground mb-2">
            Inga offentliga inlägg än
          </h3>
          <p className="font-body text-muted-foreground text-sm max-w-xs">
            Bli den första att publicera ett offentligt inlägg!
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post, i) => (
            <DiscoverCard
              key={String(post.id)}
              post={post}
              index={i}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
