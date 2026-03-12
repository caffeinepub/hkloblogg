import { useQuery } from "@tanstack/react-query";
import type { Comment } from "../backend.d";
import { useActor } from "./useActor";

/**
 * Fetches comments for multiple posts in parallel.
 * Used by MyPosts filter panel when alias filter is active.
 */
export function useCommentsForPosts(postIds: bigint[], enabled: boolean) {
  const { actor, isFetching } = useActor();
  const key = postIds.map(String).join(",");

  return useQuery<Record<string, Comment[]>>({
    queryKey: ["commentsForPosts", key],
    queryFn: async () => {
      if (!actor || postIds.length === 0) return {};
      const pairs = await Promise.all(
        postIds.map(async (id) => {
          const comments = (await actor.getComments(id)) as Comment[];
          return [id.toString(), comments] as const;
        }),
      );
      return Object.fromEntries(pairs);
    },
    enabled: !!actor && !isFetching && enabled && postIds.length > 0,
    staleTime: 30_000,
  });
}
