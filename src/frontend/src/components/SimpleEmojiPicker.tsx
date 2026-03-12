import { useState } from "react";

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Populära",
    emojis: [
      "😀",
      "😂",
      "🥰",
      "😍",
      "🤩",
      "😎",
      "🥳",
      "😇",
      "🤗",
      "😊",
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "💖",
      "💯",
      "👍",
      "👎",
      "👏",
      "🙌",
      "🤝",
      "✌️",
      "🤞",
      "🙏",
      "💪",
      "👋",
      "🎉",
      "🎊",
      "✨",
      "🔥",
      "💥",
      "⭐",
      "🌟",
      "🎈",
      "🎁",
      "🎂",
    ],
  },
  {
    label: "Natur",
    emojis: [
      "🌸",
      "🌺",
      "🌻",
      "🌹",
      "🍀",
      "🌿",
      "🌱",
      "🌲",
      "🌳",
      "🌴",
      "🦋",
      "🐝",
      "🐞",
      "🦄",
      "🐶",
      "🐱",
      "🐻",
      "🦊",
      "🐼",
      "🐨",
      "☀️",
      "🌙",
      "⭐",
      "🌈",
      "❄️",
      "🌊",
      "🌸",
      "🍁",
      "🍂",
      "🌾",
    ],
  },
  {
    label: "Mat",
    emojis: [
      "🍕",
      "🍔",
      "🍣",
      "🍜",
      "🍦",
      "🍰",
      "🎂",
      "🍪",
      "🍩",
      "🍫",
      "☕",
      "🧋",
      "🍵",
      "🥤",
      "🍷",
      "🍸",
      "🥂",
      "🍺",
      "🫖",
      "🧃",
      "🥑",
      "🍓",
      "🍒",
      "🍇",
      "🍉",
      "🍊",
      "🍋",
      "🍑",
      "🫐",
      "🍍",
    ],
  },
];

interface SimpleEmojiPickerProps {
  onEmojiClick: (data: { emoji: string }) => void;
  searchPlaceholder?: string;
}

export default function SimpleEmojiPicker({
  onEmojiClick,
  searchPlaceholder = "Sök emoji...",
}: SimpleEmojiPickerProps) {
  const [search, setSearch] = useState("");

  const filteredGroups = search
    ? [
        {
          label: "Resultat",
          emojis: EMOJI_GROUPS.flatMap((g) => g.emojis).filter((e) =>
            e.includes(search),
          ),
        },
      ]
    : EMOJI_GROUPS;

  return (
    <div className="w-72 bg-card border border-border rounded-xl shadow-xl p-3 space-y-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={searchPlaceholder}
        className="w-full px-3 py-1.5 text-sm rounded-lg border border-input bg-background font-body focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-muted-foreground font-body mb-1">
              {group.label}
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {group.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onEmojiClick({ emoji })}
                  className="text-lg h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent/70 transition-colors"
                  aria-label={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
        {filteredGroups[0]?.emojis.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4 font-body">
            Inga emojis hittades
          </p>
        )}
      </div>
    </div>
  );
}
