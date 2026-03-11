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
import { BookOpen, Edit, Loader2, PenSquare, Send, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import type { Post } from "../backend.d";
import {
  useDeletePost,
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
  onEdit: () => void;
  onView: () => void;
}

function PostCard({ post, index, onEdit, onView }: PostCardProps) {
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
          <p className="text-xs font-body text-muted-foreground mb-4">
            Skapad {formatDate(post.createdAt)} · Uppdaterad{" "}
            {formatDate(post.updatedAt)}
          </p>
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto px-4 py-8"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Mina inlägg
          </h1>
          {posts.length > 0 && (
            <p className="font-body text-sm text-muted-foreground mt-1">
              {posts.length} inlägg totalt
            </p>
          )}
        </div>
        <Button
          data-ocid="posts.primary_button"
          onClick={() => onNavigate({ type: "create" })}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-body"
        >
          <PenSquare className="w-4 h-4 mr-2" />
          Skapa nytt
        </Button>
      </div>

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
      ) : (
        <AnimatePresence>
          <div className="space-y-4">
            {posts.map((post, i) => (
              <PostCard
                key={String(post.id)}
                post={post}
                index={i}
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
