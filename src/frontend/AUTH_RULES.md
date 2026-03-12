# AUTH_RULES.md -- Kritiska regler for useInternetIdentity.ts

> **Las detta innan du andrar `useInternetIdentity.ts`.**
> Filen har blivit trasig upprepade ganger (v11, v12, v15, v17, v18, v20, v24-v35)
> av till synes sma andringar. Reglerna nedan ar inte valfria.

---

## Regel 1: authClient MASTE vara `useRef` -- aldrig `useState`

**Fel:**
```ts
const [authClient, setAuthClient] = useState<AuthClient | undefined>(undefined);
```

**Ratt:**
```ts
const authClientRef = useRef<AuthClient | undefined>(undefined);
```

**Varfor:** Om `authClient` ar `useState` triggar `setAuthClient(...)` ett nytt render,
vilket gor att `useEffect` (med `authClient` i sin dependency-array) kors om sig sjalv.
Det skapar en loop och bryter sessions-aterstellningen vid sidladdning.

---

## Regel 2: `finally`-blocket FAR INTE satta `setStatus("idle")`

**Fel:**
```ts
} finally {
  if (!cancelled) setStatus("idle"); // FORSTORS allt
}
```

**Ratt:** Inga `finally`-block. Status satts explicit (se Regel 5).

**Varfor:** `finally` kors ALLTID -- aven efter att `setStatus("success")` anropats.
Det overskriver "success" med "idle" och doljer alla menyval, inlagg och utkast.
Det ar rotorsaken till varje inloggningsbug i projektets historia.

---

## Regel 3: `useEffect`-dependency-arrayen FAR INTE innehalla `authClient`

**Fel:**
```ts
useEffect(() => { ... }, [createOptions, authClient]);
```

**Ratt:**
```ts
useEffect(() => { ... }, []); // Tom array -- kors exakt en gang
```

**Varfor:** `authClientRef.current` andras utan att trigga re-renders -- det ar
korrekt beteende. Med `authClient` (useState-variant) i dependency-arrayen
kors effekten om varje gang klienten satts, vilket aterintroducerar loop-buggen.

---

## Regel 4: `login()` ska synka state om sessionen redan ar giltig

**Fel:**
```ts
if (alreadyAuthenticated) {
  setErrorMessage("User is already authenticated"); // Knappen slutar fungera
  return;
}
```

**Ratt:**
```ts
if (alreadyAuthenticated) {
  setIdentity(currentIdentity);
  setStatus("success"); // Synka state tyst
  return;
}
```

**Varfor:** Om anvandaren klickar "Logga in" och en session redan finns, ska appen
bara synka state -- inte visa ett felmeddelande. Annars verkar knappen inte fungera.

---

## Regel 5: Status satts EXPLICIT baserat pa autentiseringsstatus

```ts
if (isAuthenticated) {
  setIdentity(loadedIdentity);
  setStatus("success"); // Explicit "success"
} else {
  setStatus("idle");    // Explicit "idle"
}
// Inget finally-block
```

---

## Historik

Buggen aterkoms i foljande versioner pga att en eller flera av reglerna ovan brotts:
v11, v12, v15, v17, v18, v20, v24, v25, v26, v27, v28, v29, v30, v31, v32, v34, v35

Symtom som indikerar att reglerna brutits:
- Inloggningsknappen fungerar inte
- Inlagg/utkast/kategorier forsvinner efter sidladdning
- "Not connected"-notis dyker upp direkt efter inloggning
- Menyalternativ (Hem, Mina inlagg) doljs efter sidladdning
