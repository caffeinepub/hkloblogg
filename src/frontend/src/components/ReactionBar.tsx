import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddReaction,
  usePostReactions,
  useRemoveReaction,
} from "../hooks/useQueries";
import { useLanguage } from "../i18n/LanguageContext";

const REACTION_CONFIGS = [
  {
    emoji: "\u2764\ufe0f",
    labelKey: "reaction_heart" as const,
    ocid: "reactions.heart_button",
  },
  {
    emoji: "\ud83d\udc4d",
    labelKey: "reaction_thumbsup" as const,
    ocid: "reactions.thumbsup_button",
  },
  {
    emoji: "\ud83c\udf89",
    labelKey: "reaction_party" as const,
    ocid: "reactions.party_button",
  },
];

interface ReactionBarProps {
  postId: bigint;
}

export default function ReactionBar({ postId }: ReactionBarProps) {
  const { identity } = useInternetIdentity();
  const { t } = useLanguage();
  const myPrincipal = identity?.getPrincipal().toString() ?? null;
  const { data: reactions = [] } = usePostReactions(postId);
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  function countFor(emoji: string) {
    return reactions.filter((r) => r.emoji === emoji).length;
  }

  function hasReacted(emoji: string) {
    if (!myPrincipal) return false;
    return reactions.some(
      (r) => r.emoji === emoji && r.userPrincipal.toString() === myPrincipal,
    );
  }

  function handleToggle(emoji: string) {
    if (!identity) return;
    if (hasReacted(emoji)) {
      removeReaction.mutate({ postId, emoji });
    } else {
      addReaction.mutate({ postId, emoji });
    }
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 flex-wrap">
        {REACTION_CONFIGS.map(({ emoji, labelKey, ocid }) => {
          const label = t(labelKey);
          const count = countFor(emoji);
          const active = hasReacted(emoji);
          const btn = (
            <button
              key={emoji}
              type="button"
              data-ocid={ocid}
              disabled={!identity}
              onClick={() => handleToggle(emoji)}
              className={[
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-body transition-all duration-150",
                "border select-none",
                active
                  ? "bg-amber-100 border-amber-400 text-amber-800 font-semibold shadow-sm"
                  : "bg-card border-border text-foreground/70 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700",
                !identity ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              ].join(" ")}
              aria-label={`${label}: ${count}`}
            >
              <span className="text-base leading-none">{emoji}</span>
              {count > 0 && (
                <span className="tabular-nums text-xs font-semibold">
                  {count}
                </span>
              )}
            </button>
          );

          if (!identity) {
            return (
              <Tooltip key={emoji}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{t("reaction_login")}</p>
                </TooltipContent>
              </Tooltip>
            );
          }
          return btn;
        })}
      </div>
    </TooltipProvider>
  );
}
