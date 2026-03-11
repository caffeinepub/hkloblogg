# HKLOBlogg – Fas 2

## Current State
Fas 1 är klar med:
- Backend: kategorier, inlägg (draft/published), användarprofiler med alias, moderationsloggar, blockedWords-filter
- Frontend: grundläggande App.tsx med inloggning via Internet Identity
- Blob storage integrerat

Post-typen saknar: omslagsbild, bildgalleri, uppdateringsdatum, möjlighet att redigera/radera

## Requested Changes (Diff)

### Add
- Fält på Post: `coverImageKey` (Text, optional), `galleryImageKeys` ([Text]), `updatedAt` (Int)
- Backend: `updatePost(id, title, content, categoryId)` – ändrar eget inlägg
- Backend: `deletePost(id)` – raderar eget inlägg (eller admin)
- Backend: `getPostsByAuthor()` – alla inlägg (inkl. utkast) för inloggad användare
- Backend: `updatePostImages(id, coverImageKey, galleryImageKeys)` – uppdaterar bild-keys
- Frontend: Sida för att skapa inlägg med enkel rich text-editor, kategoriväljare, bilduppladdning (omslagsbild + galleri)
- Frontend: Sida för att redigera befintliga inlägg
- Frontend: Lista "Mina inlägg" med status (utkast/publicerat) och knappar för redigera/radera
- Frontend: Läsarvy med bildgalleri

### Modify
- Post-typen utökas med image-fält och updatedAt
- App.tsx utökas med routing till nya sidor

### Remove
- Inget tas bort

## Implementation Plan
1. Manuellt uppdatera main.mo med nya Post-fält och CRUD-funktioner
2. Uppdatera backend.d.ts med nya typer och metoder
3. Frontend: PostEditor-komponent med TipTap-liknande enkel editor (bold, italic, headings, lists via contentEditable + execCommand eller ren textarea med markdown)
4. Frontend: MyPosts-sida med lista och åtgärder
5. Frontend: PostView-sida med bildgalleri
