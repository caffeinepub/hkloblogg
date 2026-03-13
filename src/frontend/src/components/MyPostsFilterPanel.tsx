import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CalendarDays, Filter, SlidersHorizontal, X } from "lucide-react";
import type { Category } from "../backend.d";

export type SortBy = "date" | "mostComments" | "mostFollowers" | "mostViews";

export interface PostFilters {
  aliasQuery: string;
  categoryId: string;
  showPublic: boolean;
  showRestricted: boolean;
  showPrivate: boolean;
  dateFrom: string;
  dateTo: string;
  minLikes: string;
  sortBy: SortBy;
}

export const EMPTY_FILTERS: PostFilters = {
  aliasQuery: "",
  categoryId: "",
  showPublic: false,
  showRestricted: false,
  showPrivate: false,
  dateFrom: "",
  dateTo: "",
  minLikes: "",
  sortBy: "date",
};

export function countActiveFilters(f: PostFilters): number {
  let n = 0;
  if (f.aliasQuery.trim()) n++;
  if (f.categoryId) n++;
  if (f.showPublic) n++;
  if (f.showRestricted) n++;
  if (f.showPrivate) n++;
  if (f.dateFrom || f.dateTo) n++;
  if (f.minLikes !== "") n++;
  if (f.sortBy !== "date") n++;
  return n;
}

function setQuickDate(
  period: "week" | "month" | "3months",
  onChange: (f: Partial<PostFilters>) => void,
) {
  const now = new Date();
  const from = new Date(now);
  if (period === "week") from.setDate(now.getDate() - 7);
  else if (period === "month") from.setMonth(now.getMonth() - 1);
  else from.setMonth(now.getMonth() - 3);
  onChange({
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
  });
}

interface Props {
  filters: PostFilters;
  onChange: (patch: Partial<PostFilters>) => void;
  onClear: () => void;
  categories: Category[];
  activeCount: number;
}

export default function MyPostsFilterPanel({
  filters,
  onChange,
  onClear,
  categories,
  activeCount,
}: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          data-ocid="posts.filter.toggle"
          variant="outline"
          size="sm"
          className="relative gap-2 border-border bg-card text-foreground hover:bg-accent/40 font-body text-sm"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filter
          {activeCount > 0 && (
            <Badge
              data-ocid="posts.filter.toggle"
              className="ml-1 h-5 min-w-5 px-1 text-xs bg-primary text-primary-foreground"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent
        data-ocid="posts.filter.panel"
        side="right"
        className="w-80 sm:w-96 flex flex-col gap-0 p-0 bg-card border-border"
      >
        <SheetHeader className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <SheetTitle className="font-display text-base font-semibold text-foreground">
              Filtrera inlägg
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Sortering */}
          <div className="space-y-2">
            <Label className="font-body text-sm font-medium text-foreground">
              Sortera efter
            </Label>
            <Select
              value={filters.sortBy}
              onValueChange={(v) => onChange({ sortBy: v as SortBy })}
            >
              <SelectTrigger
                data-ocid="posts.filter.select"
                className="font-body text-sm bg-background border-border"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="font-body text-sm">
                <SelectItem value="date">Senaste datum</SelectItem>
                <SelectItem value="mostViews">Mest lästa</SelectItem>
                <SelectItem value="mostComments">Flest kommentarer</SelectItem>
                <SelectItem value="mostFollowers">
                  Flest följare (författare)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-border" />

          {/* Alias / kommentarsförfattare */}
          <div className="space-y-2">
            <Label className="font-body text-sm font-medium text-foreground">
              Alias (kommentarsförfattare)
            </Label>
            <Input
              data-ocid="posts.filter.input"
              placeholder="Sök på alias…"
              value={filters.aliasQuery}
              onChange={(e) => onChange({ aliasQuery: e.target.value })}
              className="font-body text-sm bg-background border-border"
            />
            <p className="text-xs text-muted-foreground font-body">
              Visar inlägg som har kommentarer från detta alias.
            </p>
          </div>

          <Separator className="bg-border" />

          {/* Kategori */}
          <div className="space-y-2">
            <Label className="font-body text-sm font-medium text-foreground">
              Kategori
            </Label>
            <Select
              value={filters.categoryId || "__all__"}
              onValueChange={(v) =>
                onChange({ categoryId: v === "__all__" ? "" : v })
              }
            >
              <SelectTrigger
                data-ocid="posts.filter.select"
                className="font-body text-sm bg-background border-border"
              >
                <SelectValue placeholder="Alla kategorier" />
              </SelectTrigger>
              <SelectContent className="font-body text-sm">
                <SelectItem value="__all__">Alla kategorier</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={String(cat.id)} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-border" />

          {/* Åtkomstnivå */}
          <div className="space-y-3">
            <Label className="font-body text-sm font-medium text-foreground">
              Åtkomstnivå
            </Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  data-ocid="posts.filter.checkbox"
                  id="filter-public"
                  checked={filters.showPublic}
                  onCheckedChange={(v) => onChange({ showPublic: Boolean(v) })}
                  className="border-border"
                />
                <Label
                  htmlFor="filter-public"
                  className="font-body text-sm text-foreground cursor-pointer"
                >
                  Offentligt
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  data-ocid="posts.filter.checkbox"
                  id="filter-restricted"
                  checked={filters.showRestricted}
                  onCheckedChange={(v) =>
                    onChange({ showRestricted: Boolean(v) })
                  }
                  className="border-border"
                />
                <Label
                  htmlFor="filter-restricted"
                  className="font-body text-sm text-foreground cursor-pointer"
                >
                  Begränsad
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  data-ocid="posts.filter.checkbox"
                  id="filter-private"
                  checked={filters.showPrivate}
                  onCheckedChange={(v) => onChange({ showPrivate: Boolean(v) })}
                  className="border-border"
                />
                <Label
                  htmlFor="filter-private"
                  className="font-body text-sm text-foreground cursor-pointer"
                >
                  Privat
                </Label>
              </div>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Datum */}
          <div className="space-y-3">
            <Label className="font-body text-sm font-medium text-foreground flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              Datum
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="font-body text-xs text-muted-foreground">
                  Från
                </Label>
                <Input
                  data-ocid="posts.filter.input"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => onChange({ dateFrom: e.target.value })}
                  className="font-body text-xs bg-background border-border h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-body text-xs text-muted-foreground">
                  Till
                </Label>
                <Input
                  data-ocid="posts.filter.input"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => onChange({ dateTo: e.target.value })}
                  className="font-body text-xs bg-background border-border h-8"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["week", "Senaste veckan"],
                  ["month", "Senaste månaden"],
                  ["3months", "Senaste 3 månaderna"],
                ] as const
              ).map(([period, label]) => (
                <button
                  key={period}
                  type="button"
                  data-ocid="posts.filter.toggle"
                  onClick={() => setQuickDate(period, onChange)}
                  className="text-xs font-body px-2.5 py-1 rounded-full border border-border bg-background hover:bg-accent/40 text-foreground transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Antal gilla */}
          <div className="space-y-2">
            <Label className="font-body text-sm font-medium text-foreground">
              Minsta antal gillningar
            </Label>
            <Input
              data-ocid="posts.filter.input"
              type="number"
              min="0"
              placeholder="t.ex. 1"
              value={filters.minLikes}
              onChange={(e) => onChange({ minLikes: e.target.value })}
              className="font-body text-sm bg-background border-border"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          <Button
            data-ocid="posts.filter.delete_button"
            variant="outline"
            className="w-full gap-2 font-body text-sm border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
            onClick={onClear}
            disabled={activeCount === 0}
          >
            <X className="w-4 h-4" />
            Rensa filter
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {activeCount} aktiva
              </Badge>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
