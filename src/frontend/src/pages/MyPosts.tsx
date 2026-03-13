import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Edit,
  Eye,
  Heart,
  Loader2,
  MessageSquare,
  PenSquare,
  Send,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Post } from "../backend.d";
import MyPostsFilterPanel, {
  type PostFilters,
  EMPTY_FILTERS,
  countActiveFilters,
} from "../components/MyPostsFilterPanel";
import { useCommentsForPosts } from "../hooks/useCommentsForPosts";
import {
  useCategories,
  useDeletePost,
  useFollowerCount,
  usePostsByAuthor,
  usePublishPost,
} from "../hooks/useQueries";
import type { NavigateFn } from "../types";

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isDraft(post: Post): boolean {
  return "Draft" in post.status;
}

interface PostCardProps {
  post: Post;
  index: number;
  commentCount: number;
  followerCount: number;
  onEdit: () => void;
  onView: () => void;
}

function PostCard({
  post,
  index,
  commentCount,
  followerCount,
  onEdit,
  onView,
}: PostCardProps) {
  const deletePost = useDeletePost();
  const publishPost = usePublishPost();

  const handleDelete = async () => {
    try {
      await deletePost.mutateAsync(post.id);
      toast.success("Inlägg borttaget");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Fel vid borttagning");
    }
  };

  const handlePublish = async () => {
    try {
      await publishPost.mutateAsync(post.id);
      toast.success("Publicerat!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Fel vid publicering");
    }
  };

  return (
    <motion.div
      data-ocid={`posts.item.${index + 1}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
    >
      <Card className="bg-card border-border hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle
              className="font-display text-lg font-bold text-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors"
              onClick={onView}
            >
              {post.title}
            </CardTitle>
            <Badge
              variant={isDraft(post) ? "secondary" : "default"}
              className={`shrink-0 font-body text-xs ${
                isDraft(post)
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary/15 text-primary border-primary/20"
              }`}
            >
              {isDraft(post) ? "Utkast" : "Publicerat"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs font-body text-muted-foreground mb-3">
            Skapad {formatDate(post.createdAt)} · Uppdaterad{" "}
            {formatDate(post.updatedAt)}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-4 mb-4">
            <span className="flex items-center gap-1 text-xs font-body text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              {Number(post.viewCount)}
            </span>
            <span className="flex items-center gap-1 text-xs font-body text-muted-foreground">
              <MessageSquare className="w-3.5 h-3.5" />
              {commentCount}
            </span>
            <span className="flex items-center gap-1 text-xs font-body text-muted-foreground">
              <Heart className="w-3.5 h-3.5" />
              {(post.reactions ?? []).length}
            </span>
            <span className="flex items-center gap-1 text-xs font-body text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              {followerCount} följare
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              data-ocid={`posts.edit_button.${index + 1}`}
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="font-body text-xs"
            >
              <Edit className="w-3.5 h-3.5 mr-1" />
              Redigera
            </Button>

            {isDraft(post) && (
              <Button
                data-ocid={`posts.submit_button.${index + 1}`}
                size="sm"
                onClick={handlePublish}
                disabled={publishPost.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-body text-xs"
              >
                {publishPost.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 mr-1" />
                )}
                Publicera
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  data-ocid={`posts.delete_button.${index + 1}`}
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 font-body text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Ta bort
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent data-ocid="posts.dialog">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display">
                    Ta bort inlägg?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="font-body">
                    Det här inlägget tas bort permanent och kan inte
                    återställas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    data-ocid="posts.cancel_button"
                    className="font-body"
                  >
                    Avbryt
                  </AlertDialogCancel>
                  <AlertDialogAction
                    data-ocid="posts.confirm_button"
                    onClick={handleDelete}
                    disabled={deletePost.isPending}
                    className="bg-destructive text-white font-body"
                  >
                    {deletePost.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Ta bort
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface MyPostsProps {
  onNavigate: NavigateFn;
}

export default function MyPosts({ onNavigate }: MyPostsProps) {
  const { data: posts = [], isLoading } = usePostsByAuthor();
  const { data: categories = [] } = useCategories();

  const [filters, setFilters] = useState<PostFilters>(EMPTY_FILTERS);

  const aliasFilterActive = filters.aliasQuery.trim().length > 0;
  const postIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const { data: commentsMap = {} } = useCommentsForPosts(postIds, true);

  // Collect unique author principals to fetch follower counts
  const authorPrincipals = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{
      principal: (typeof posts)[0]["authorPrincipal"];
      key: string;
    }> = [];
    for (const p of posts) {
      const key = p.authorPrincipal.toString();
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ principal: p.authorPrincipal, key });
      }
    }
    return result;
  }, [posts]);

  // We only have one author (own posts), so just use the first
  const firstAuthor = authorPrincipals[0]?.principal ?? null;
  const { data: myFollowerCount = BigInt(0) } = useFollowerCount(firstAuthor);

  // Build follower count map (all posts share the same author)
  const followerCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const { key } of authorPrincipals) {
      map[key] = Number(myFollowerCount);
    }
    return map;
  }, [authorPrincipals, myFollowerCount]);

  const activeCount = countActiveFilters(filters);

  const patchFilters = (patch: Partial<PostFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const filteredAndSortedPosts = useMemo(() => {
    // First filter
    const hasAccessFilter =
      filters.showPublic || filters.showRestricted || filters.showPrivate;
    const hasAnyFilter =
      activeCount > 0 && (activeCount > 1 || filters.sortBy !== "date");
    const filterActive =
      aliasFilterActive ||
      filters.categoryId ||
      hasAccessFilter ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.minLikes !== "";

    let result = filterActive
      ? posts.filter((post) => {
          // OR logic: include post if ANY active filter matches
          if (aliasFilterActive) {
            const q = filters.aliasQuery.trim().toLowerCase();
            const postComments = commentsMap[post.id.toString()] ?? [];
            const hasMatch = postComments.some((c) =>
              c.authorAlias.toLowerCase().includes(q),
            );
            if (hasMatch) return true;
          }

          if (filters.categoryId) {
            if (String(post.categoryId) === filters.categoryId) return true;
          }

          const postCategory = categories.find(
            (c) => String(c.id) === String(post.categoryId),
          );
          if (filters.showPublic && postCategory) {
            if ("Public" in postCategory.accessLevel) return true;
          }
          if (filters.showRestricted && postCategory) {
            if ("Restricted" in postCategory.accessLevel) return true;
          }
          if (filters.showPrivate && postCategory) {
            if ("Private" in postCategory.accessLevel) return true;
          }

          const dateFilterActive = filters.dateFrom || filters.dateTo;
          if (dateFilterActive) {
            const postMs = Number(post.createdAt) / 1_000_000;
            const postDate = new Date(postMs);
            let inRange = true;
            if (filters.dateFrom) {
              inRange = inRange && postDate >= new Date(filters.dateFrom);
            }
            if (filters.dateTo) {
              const to = new Date(filters.dateTo);
              to.setHours(23, 59, 59, 999);
              inRange = inRange && postDate <= to;
            }
            if (inRange) return true;
          }

          if (filters.minLikes !== "") {
            const min = Number(filters.minLikes);
            if (!Number.isNaN(min) && (post.reactions ?? []).length >= min)
              return true;
          }

          return false;
        })
      : [...posts];

    // Then sort
    if (filters.sortBy === "mostComments") {
      result = result.sort(
        (a, b) =>
          (commentsMap[b.id.toString()]?.length ?? 0) -
          (commentsMap[a.id.toString()]?.length ?? 0),
      );
    } else if (filters.sortBy === "mostFollowers") {
      result = result.sort(
        (a, b) =>
          (followerCountMap[b.authorPrincipal.toString()] ?? 0) -
          (followerCountMap[a.authorPrincipal.toString()] ?? 0),
      );
    } else if (filters.sortBy === "mostViews") {
      result = result.sort((a, b) => Number(b.viewCount) - Number(a.viewCount));
    } else {
      // date (default) -- newest first
      result = result.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    }

    void hasAnyFilter; // suppress unused warning
    return result;
  }, [
    posts,
    filters,
    activeCount,
    aliasFilterActive,
    commentsMap,
    categories,
    followerCountMap,
  ]);

  const isFiltered = activeCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto px-4 py-8"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Mina inlägg
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <MyPostsFilterPanel
            filters={filters}
            onChange={patchFilters}
            onClear={() => setFilters(EMPTY_FILTERS)}
            categories={categories}
            activeCount={activeCount}
          />
          <Button
            data-ocid="posts.primary_button"
            onClick={() => onNavigate({ type: "create" })}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-body"
          >
            <PenSquare className="w-4 h-4 mr-2" />
            Skapa nytt
          </Button>
        </div>
      </div>

      {/* Stats row */}
      {posts.length > 0 && (
        <p className="font-body text-sm text-muted-foreground mb-6">
          {isFiltered ? (
            <>
              Visar{" "}
              <span className="text-foreground font-medium">
                {filteredAndSortedPosts.length}
              </span>{" "}
              av{" "}
              <span className="text-foreground font-medium">
                {posts.length}
              </span>{" "}
              inlägg
            </>
          ) : (
            <>{posts.length} inlägg totalt</>
          )}
        </p>
      )}

      {isLoading ? (
        <div data-ocid="posts.loading_state" className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-6 space-y-3"
            >
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <motion.div
          data-ocid="posts.empty_state"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-accent/50 flex items-center justify-center mb-5">
            <BookOpen className="w-9 h-9 text-primary" />
          </div>
          <h3 className="font-display text-xl font-bold text-foreground mb-2">
            Inga inlägg än
          </h3>
          <p className="font-body text-muted-foreground text-sm mb-6 max-w-xs">
            Du har inte skrivit något ännu. Börja dela dina tankar!
          </p>
          <Button
            data-ocid="posts.secondary_button"
            onClick={() => onNavigate({ type: "create" })}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-body"
          >
            <PenSquare className="w-4 h-4 mr-2" />
            Skapa ditt första inlägg
          </Button>
        </motion.div>
      ) : filteredAndSortedPosts.length === 0 ? (
        <motion.div
          data-ocid="posts.empty_state"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <SlidersHorizontal className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground mb-2">
            Inga inlägg matchar filtret
          </h3>
          <p className="font-body text-muted-foreground text-sm mb-5 max-w-xs">
            Prova att ändra eller rensa filtren för att se fler inlägg.
          </p>
          <Button
            data-ocid="posts.filter.delete_button"
            variant="outline"
            size="sm"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="font-body text-sm"
          >
            Rensa filter
          </Button>
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="space-y-4">
            {filteredAndSortedPosts.map((post, i) => (
              <PostCard
                key={String(post.id)}
                post={post}
                index={i}
                commentCount={commentsMap[post.id.toString()]?.length ?? 0}
                followerCount={
                  followerCountMap[post.authorPrincipal.toString()] ?? 0
                }
                onEdit={() => onNavigate({ type: "edit", postId: post.id })}
                onView={() => onNavigate({ type: "post", postId: post.id })}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}
