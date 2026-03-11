export type AppView =
  | { type: "home" }
  | { type: "create" }
  | { type: "edit"; postId: bigint }
  | { type: "my-posts" }
  | { type: "post"; postId: bigint };

export type NavigateFn = (view: AppView) => void;
