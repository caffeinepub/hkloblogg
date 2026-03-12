import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Principal } from "@icp-sdk/core/principal";
import { ArrowLeft, UserCheck, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Post } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useFollowUser,
  useFollowers,
  useFollowing,
  useIsFollowing,
  usePostsByPrincipal,
  useSetAlias,
  useUnfollowUser,
  useUserProfile,
} from "../hooks/useQueries";
import type { NavigateFn } from "../types";

function formatDate(timestamp: bigint): string {
  const ms = Number(timestamp) / 1_000_000;
  return new Date(ms).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PostMiniCard({
  post,
  index,
  onNavigate,
}: {
  post: Post;
  index: number;
  onNavigate: NavigateFn;
}) {
  return (
    <motion.article
      data-ocid={`profile.post.item.${index + 1}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      onClick={() => onNavigate({ type: "post", postId: post.id })}
      className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow group"
    >
      <h3 className="font-display font-bold text-base text-foreground mb-1.5 group-hover:text-primary transition-colors line-clamp-2">
        {post.title}
      </h3>
      <p className="text-sm text-muted-foreground font-body line-clamp-2 mb-3">
        {post.content.replace(/<[^>]*>/g, "").slice(0, 120)}
      </p>
      <time className="text-xs text-muted-foreground/70 font-body">
        {formatDate(post.createdAt)}
      </time>
    </motion.article>
  );
}

export default function UserProfile({
  principalId,
  onNavigate,
}: {
  principalId: string;
  onNavigate: NavigateFn;
}) {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal() ?? null;

  const targetPrincipal = useMemo(() => {
    try {
      return Principal.fromText(principalId);
    } catch {
      return null;
    }
  }, [principalId]);

  const isOwnProfile =
    myPrincipal && targetPrincipal
      ? myPrincipal.toString() === targetPrincipal.toString()
      : false;

  const { data: profile, isLoading: profileLoading } =
    useUserProfile(targetPrincipal);
  const { data: followers = [] } = useFollowers(targetPrincipal);
  const { data: following = [] } = useFollowing(targetPrincipal);
  const { data: posts = [], isLoading: postsLoading } =
    usePostsByPrincipal(targetPrincipal);
  const { data: alreadyFollowing } = useIsFollowing(
    isOwnProfile ? null : targetPrincipal,
  );

  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const setAlias = useSetAlias();

  const [aliasInput, setAliasInput] = useState("");

  useEffect(() => {
    if (profile?.alias) setAliasInput(profile.alias);
  }, [profile?.alias]);

  const displayName =
    profile?.alias ||
    (isOwnProfile ? localStorage.getItem("hklo_alias") : null) ||
    `${principalId.slice(0, 10)}…`;

  const avatarLetter = (profile?.alias || principalId).charAt(0).toUpperCase();

  const handleFollow = async () => {
    if (!targetPrincipal) return;
    try {
      await followMutation.mutateAsync(targetPrincipal);
      toast.success(`Du följer nu ${displayName}`);
    } catch {
      toast.error("Kunde inte följa användaren");
    }
  };

  const handleUnfollow = async () => {
    if (!targetPrincipal) return;
    try {
      await unfollowMutation.mutateAsync(targetPrincipal);
      toast.success(`Du följer inte längre ${displayName}`);
    } catch {
      toast.error("Kunde inte avfölja användaren");
    }
  };

  const handleSaveAlias = async () => {
    const trimmed = aliasInput.trim();
    if (!trimmed) return;
    try {
      await setAlias.mutateAsync(trimmed);
      toast.success("Alias sparat!");
    } catch {
      toast.error("Kunde inte spara alias");
    }
  };

  const publishedPosts = posts.filter((p) => "Published" in p.status);

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
      {/* Back button */}
      <button
        type="button"
        data-ocid="profile.back.button"
        onClick={() => onNavigate({ type: "discover" })}
        className="flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Tillbaka
      </button>

      {/* Profile header */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6 mb-8"
      >
        {profileLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold font-display text-primary shrink-0">
              {avatarLetter}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-bold text-foreground mb-1">
                {displayName}
              </h1>
              <p className="font-mono text-xs text-muted-foreground mb-3 truncate">
                {principalId.slice(0, 20)}…{principalId.slice(-5)}
              </p>

              {/* Follow stats */}
              <div className="flex items-center gap-4 text-sm font-body">
                <span>
                  <strong className="text-foreground">
                    {followers.length}
                  </strong>{" "}
                  <span className="text-muted-foreground">följare</span>
                </span>
                <span>
                  <strong className="text-foreground">
                    {following.length}
                  </strong>{" "}
                  <span className="text-muted-foreground">följer</span>
                </span>
              </div>
            </div>

            {/* Follow / Unfollow button */}
            {myPrincipal && !isOwnProfile && (
              <div className="shrink-0">
                {alreadyFollowing ? (
                  <Button
                    data-ocid="profile.secondary_button"
                    variant="outline"
                    size="sm"
                    onClick={handleUnfollow}
                    disabled={unfollowMutation.isPending}
                    className="gap-1.5"
                  >
                    <UserCheck className="w-4 h-4" />
                    Följer
                  </Button>
                ) : (
                  <Button
                    data-ocid="profile.primary_button"
                    size="sm"
                    onClick={handleFollow}
                    disabled={followMutation.isPending}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    Följ
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Own profile: editable alias */}
        {isOwnProfile && (
          <div className="mt-5 pt-5 border-t border-border">
            <Label
              htmlFor="profile-alias"
              className="text-xs font-body text-muted-foreground mb-1.5 block"
            >
              Alias (visas som författarnamn)
            </Label>
            <div className="flex gap-2">
              <Input
                id="profile-alias"
                data-ocid="profile.input"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveAlias()}
                placeholder="Ditt alias"
                className="flex-1 text-sm"
              />
              <Button
                data-ocid="profile.save_button"
                size="sm"
                onClick={handleSaveAlias}
                disabled={setAlias.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Spara
              </Button>
            </div>
          </div>
        )}
      </motion.section>

      {/* Posts */}
      <section>
        <h2 className="font-display text-lg font-bold text-foreground mb-4">
          Inlägg ({publishedPosts.length})
        </h2>
        {postsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : publishedPosts.length === 0 ? (
          <div
            data-ocid="profile.post.empty_state"
            className="py-12 text-center text-muted-foreground font-body text-sm"
          >
            Inga publicerade inlägg ännu.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {publishedPosts.map((post, i) => (
              <PostMiniCard
                key={String(post.id)}
                post={post}
                index={i}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
