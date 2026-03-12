import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type {
  AccessLevel,
  Category,
  ModerationLog,
  Notification,
  Post,
  UserProfile,
} from "../backend.d";
import { useActor } from "./useActor";

export function useInitDefaultCategories() {
  const { actor, isFetching } = useActor();
  const qc = useQueryClient();
  useEffect(() => {
    if (!actor || isFetching) return;
    actor
      .initDefaultCategories()
      .then(() => {
        qc.invalidateQueries({ queryKey: ["categories"] });
      })
      .catch(() => {
        /* ignore */
      });
  }, [actor, isFetching, qc]);
}

export function usePublishedPosts() {
  const { actor, isFetching } = useActor();
  return useQuery<Post[]>({
    queryKey: ["publishedPosts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPublishedPosts() as Promise<Post[]>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDiscoverPosts() {
  const { actor, isFetching } = useActor();
  return useQuery<Post[]>({
    queryKey: ["discoverPosts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getDiscoverPosts() as Promise<Post[]>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSearchPosts(query: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Post[]>({
    queryKey: ["searchPosts", query],
    queryFn: async () => {
      if (!actor || query.length < 2) return [];
      return actor.searchPosts(query) as Promise<Post[]>;
    },
    enabled: !!actor && !isFetching && query.length >= 2,
  });
}

export function useCategories() {
  const { actor, isFetching } = useActor();
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCategories() as Promise<Category[]>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateCategory() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
      accessLevel,
    }: {
      name: string;
      description: string;
      accessLevel: AccessLevel;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.createCategory(name, description, accessLevel);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      accessLevel,
    }: {
      id: bigint;
      name: string;
      description: string;
      accessLevel: AccessLevel;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateCategory(id, name, description, accessLevel);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteCategory(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useAddReaderAlias() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      categoryId,
      alias,
      principal,
    }: {
      categoryId: bigint;
      alias: string;
      principal: Principal;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addReaderAliasToCategory(categoryId, alias, principal);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function usePostsByAuthor() {
  const { actor, isFetching } = useActor();
  return useQuery<Post[]>({
    queryKey: ["postsByAuthor"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPostsByAuthor() as Promise<Post[]>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function usePostById(postId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Post | null>({
    queryKey: ["post", postId?.toString()],
    queryFn: async () => {
      if (!actor || postId === null) return null;
      const result = await actor.getPostById(postId);
      return result.length > 0 ? result[0] : null;
    },
    enabled: !!actor && !isFetching && postId !== null,
  });
}

export function useCreatePost() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      content,
      categoryId,
    }: {
      title: string;
      content: string;
      categoryId: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.createPost(title, content, categoryId);
      if ("err" in result) throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["postsByAuthor"] });
      qc.invalidateQueries({ queryKey: ["publishedPosts"] });
      qc.invalidateQueries({ queryKey: ["discoverPosts"] });
      qc.invalidateQueries({ queryKey: ["allPosts"] });
    },
  });
}

export function useUpdatePost() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      title,
      content,
      categoryId,
    }: {
      postId: bigint;
      title: string;
      content: string;
      categoryId: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.updatePost(postId, title, content, categoryId);
      if ("err" in result) throw new Error(result.err);
      return result.ok;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["postsByAuthor"] });
      qc.invalidateQueries({ queryKey: ["post", vars.postId.toString()] });
      qc.invalidateQueries({ queryKey: ["publishedPosts"] });
      qc.invalidateQueries({ queryKey: ["discoverPosts"] });
      qc.invalidateQueries({ queryKey: ["allPosts"] });
    },
  });
}

export function useUpdatePostImages() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      coverImageKey,
      galleryImageKeys,
    }: {
      postId: bigint;
      coverImageKey: [] | [string];
      galleryImageKeys: string[];
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updatePostImages(postId, coverImageKey, galleryImageKeys);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["post", vars.postId.toString()] });
      qc.invalidateQueries({ queryKey: ["postsByAuthor"] });
      qc.invalidateQueries({ queryKey: ["publishedPosts"] });
      qc.invalidateQueries({ queryKey: ["discoverPosts"] });
    },
  });
}

export function useDeletePost() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deletePost(postId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["postsByAuthor"] });
      qc.invalidateQueries({ queryKey: ["publishedPosts"] });
      qc.invalidateQueries({ queryKey: ["discoverPosts"] });
      qc.invalidateQueries({ queryKey: ["allPosts"] });
    },
  });
}

export function usePublishPost() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.publishPost(postId);
    },
    onSuccess: (_data, postId) => {
      qc.invalidateQueries({ queryKey: ["postsByAuthor"] });
      qc.invalidateQueries({ queryKey: ["post", postId.toString()] });
      qc.invalidateQueries({ queryKey: ["publishedPosts"] });
      qc.invalidateQueries({ queryKey: ["discoverPosts"] });
      qc.invalidateQueries({ queryKey: ["allPosts"] });
    },
  });
}

export function useSetAlias() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alias: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.setAlias(alias);
    },
    onSuccess: (_data, alias) => {
      qc.invalidateQueries({ queryKey: ["userProfile"] });
      qc.invalidateQueries({ queryKey: ["publishedPosts"] });
      qc.invalidateQueries({ queryKey: ["postsByAuthor"] });
      localStorage.setItem("hklo_alias", alias);
    },
  });
}

export function useUserProfile(principal: Principal | null) {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      const result = await actor.getUserProfile(principal);
      return result.length > 0 ? (result[0] as UserProfile) : null;
    },
    enabled: !!actor && !isFetching && !!principal,
  });
}

export function useAllUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile[]>({
    queryKey: ["allUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsers() as Promise<UserProfile[]>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useBlockedUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<Principal[]>({
    queryKey: ["blockedUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBlockedUsers() as Promise<Principal[]>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useBlockUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (principal: Principal) => {
      if (!actor) throw new Error("Not connected");
      return actor.blockUser(principal);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allUsers"] });
      qc.invalidateQueries({ queryKey: ["blockedUsers"] });
    },
  });
}

export function useUnblockUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (principal: Principal) => {
      if (!actor) throw new Error("Not connected");
      return actor.unblockUser(principal);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allUsers"] });
      qc.invalidateQueries({ queryKey: ["blockedUsers"] });
    },
  });
}

export function useUpdateUserAlias() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      principal,
      alias,
    }: { principal: Principal; alias: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateUserAliasAdmin(principal, alias);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allUsers"] });
      qc.invalidateQueries({ queryKey: ["moderationLogs"] });
    },
  });
}

export function useModerationLogs() {
  const { actor, isFetching } = useActor();
  return useQuery<ModerationLog[]>({
    queryKey: ["moderationLogs"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getModerationLogs() as Promise<ModerationLog[]>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllPosts() {
  const { actor, isFetching } = useActor();
  return useQuery<Post[]>({
    queryKey: ["allPosts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPublishedPosts() as Promise<Post[]>;
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Fas 5: Notifications ───────────────────────────────────────────────────────────

export function useUnreadNotifications() {
  const { actor, isFetching } = useActor();
  return useQuery<Notification[]>({
    queryKey: ["unreadNotifications"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUnreadNotifications() as Promise<Notification[]>;
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
  });
}

export function useAllNotifications() {
  const { actor, isFetching } = useActor();
  return useQuery<Notification[]>({
    queryKey: ["allNotifications"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllNotifications() as Promise<Notification[]>;
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationsRead() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.markNotificationsRead();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unreadNotifications"] });
      qc.invalidateQueries({ queryKey: ["allNotifications"] });
    },
  });
}

// ─── Fas 5: Follow system ─────────────────────────────────────────────────────

export function useFollowUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (followeePrincipal: Principal) => {
      if (!actor) throw new Error("Not connected");
      return actor.followUser(followeePrincipal);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followers"] });
      qc.invalidateQueries({ queryKey: ["following"] });
      qc.invalidateQueries({ queryKey: ["isFollowing"] });
    },
  });
}

export function useUnfollowUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (followeePrincipal: Principal) => {
      if (!actor) throw new Error("Not connected");
      return actor.unfollowUser(followeePrincipal);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followers"] });
      qc.invalidateQueries({ queryKey: ["following"] });
      qc.invalidateQueries({ queryKey: ["isFollowing"] });
    },
  });
}

export function useFollowers(principalId: Principal | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Principal[]>({
    queryKey: ["followers", principalId?.toString()],
    queryFn: async () => {
      if (!actor || !principalId) return [];
      return actor.getFollowers(principalId) as Promise<Principal[]>;
    },
    enabled: !!actor && !isFetching && !!principalId,
  });
}

export function useFollowing(principalId: Principal | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Principal[]>({
    queryKey: ["following", principalId?.toString()],
    queryFn: async () => {
      if (!actor || !principalId) return [];
      return actor.getFollowing(principalId) as Promise<Principal[]>;
    },
    enabled: !!actor && !isFetching && !!principalId,
  });
}

export function useIsFollowing(followeePrincipal: Principal | null) {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isFollowing", followeePrincipal?.toString()],
    queryFn: async () => {
      if (!actor || !followeePrincipal) return false;
      return actor.isFollowing(followeePrincipal) as Promise<boolean>;
    },
    enabled: !!actor && !isFetching && !!followeePrincipal,
  });
}

export function usePostsByPrincipal(principalId: Principal | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Post[]>({
    queryKey: ["postsByPrincipal", principalId?.toString()],
    queryFn: async () => {
      if (!actor || !principalId) return [];
      return actor.getPostsByPrincipal(principalId) as Promise<Post[]>;
    },
    enabled: !!actor && !isFetching && !!principalId,
  });
}

// ─── Fas 6: Reactions ─────────────────────────────────────────────────────────

export function usePostReactions(postId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["reactions", postId?.toString()],
    queryFn: async () => {
      if (!actor || postId === null) return [];
      return actor.getPostReactions(postId);
    },
    enabled: !!actor && !isFetching && postId !== null,
    refetchInterval: 15_000,
  });
}

export function useAddReaction() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      emoji,
    }: { postId: bigint; emoji: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addReactionToPost(postId, emoji);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["reactions", vars.postId.toString()] });
      qc.invalidateQueries({ queryKey: ["publishedPosts"] });
      qc.invalidateQueries({ queryKey: ["discoverPosts"] });
    },
  });
}

export function useRemoveReaction() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      emoji,
    }: { postId: bigint; emoji: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.removeReactionFromPost(postId, emoji);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["reactions", vars.postId.toString()] });
    },
  });
}

// ─── Fas 6: Comments ─────────────────────────────────────────────────────────

export function useComments(postId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["comments", postId?.toString()],
    queryFn: async () => {
      if (!actor || postId === null) return [];
      return actor.getComments(postId);
    },
    enabled: !!actor && !isFetching && postId !== null,
    refetchInterval: 15_000,
  });
}

export function useAddComment() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      content,
      imageKeys,
    }: {
      postId: bigint;
      content: string;
      imageKeys: string[];
    }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.addComment(postId, content, imageKeys);
      if ("err" in result) throw new Error(result.err);
      return result.ok;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["comments", vars.postId.toString()] });
    },
  });
}
