export type AppView =
  | { type: "home" }
  | { type: "create" }
  | { type: "edit"; postId: bigint }
  | { type: "my-posts" }
  | { type: "post"; postId: bigint }
  | { type: "discover" }
  | { type: "admin" }
  | { type: "profile"; principalId: string };

export type NavigateFn = (view: AppView) => void;
