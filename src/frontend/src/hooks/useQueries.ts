import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Category, Post } from "../backend.d";
import { useActor } from "./useActor";

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
    },
  });
}

export function useSetAlias() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (alias: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.setAlias(alias);
    },
  });
}
