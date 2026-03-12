# HKLOBlogg

## Current State

Sidan "Mina inlägg" (`MyPosts.tsx`) visar en lista av användarens egna inlägg (utkast och publicerade). Det finns ingen filtreringsfunktion idag -- alla inlägg visas alltid.

Backend-data tillgänglig per inlägg:
- `title`, `content`, `authorAlias`, `categoryId`, `createdAt`, `updatedAt`, `status` (Draft/Published)
- `reactions: Reaction[]` (varje reaktion har `emoji` och `userPrincipal`)
- Backend: `getComments(postId)` returnerar kommentarer med `authorAlias`
- Backend: `getCategories()` returnerar alla kategorier med `name` och `accessLevel` (Public/Restricted/Private)

## Requested Changes (Diff)

### Add
- **FilterPanel-komponent** (`MyPostsFilterPanel.tsx`): fällbar sidopanel/sheet med alla filteralternativ
- **Filter: Alias (kommentarsförfattare)** -- textsökning på `authorAlias` i kommentarerna på användarens inlägg
- **Filter: Kategori** -- dropdown med alla användarens kategorier
- **Filter: Åtkomstnivå** -- checkboxar för Begränsad (Restricted) och Privat (Private)
- **Filter: Datum** -- från/till datumväljare + snabbvalsknappar: Senaste veckan, Senaste månaden, Senaste 3 månaderna. Filtrerar på `createdAt`
- **Filter: Antal gilla** -- numeriskt inputfält för minsta antal reaktioner totalt
- OR-logik: ett inlägg visas om det matchar minst ett aktivt filter. Om inga filter är aktiva visas alla inlägg
- Filterpanel öppnas via en "Filter"-knapp ovanför listan
- Aktivt filterantal visas som badge på filterknappen
- "Rensa filter"-knapp inuti panelen

### Modify
- `MyPosts.tsx`: lägg till filterknapp och FilterPanel, applicera filterlogik på `posts`-arrayen
- Kommentardata laddas lazily via `useComments` för varje post (för alias-filtret). Eftersom detta är dyrt hämtas kommentarer bara om alias-filtret är aktivt

### Remove
- Ingenting tas bort

## Implementation Plan

1. Skapa `MyPostsFilterPanel.tsx` med Sheet-komponent (shadcn) som öppnas/stängs
2. Filterstatus som `useState` i `MyPosts.tsx`: `{ commentAlias: string, categoryId: bigint|null, accessLevels: string[], dateFrom: Date|null, dateTo: Date|null, minLikes: number|null }`
3. Snabbvalsknappar sätter `dateFrom` och `dateTo` automatiskt
4. Hämta kategorier via `useCategories()` för kategori-dropdown
5. Hämta kommentarer via `useComments` per post -- aktiveras bara när `commentAlias` är ifyllt
6. Filterlogik (OR): ett inlägg matchar om:
   - `commentAlias` matchar någon kommentars `authorAlias` (case-insensitive), ELLER
   - `categoryId` matchar inläggets `categoryId`, ELLER
   - inläggets kategoris `accessLevel` finns i valda `accessLevels`, ELLER
   - `createdAt` faller inom datumintervallet, ELLER
   - totalt antal reaktioner >= `minLikes`
7. Visa filtrerat antal inlägg i rubriken
8. Badge på filterknappen visar antal aktiva filter
