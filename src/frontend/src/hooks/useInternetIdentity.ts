// ============================================================
// ⚠️  VARNING -- KRITISK FIL -- LÄS INNAN DU ÄNDRAR  ⚠️
// ============================================================
// Denna fil har upprepade gånger blivit trasig av till synes
// små ändringar. Följ reglerna nedan EXAKT.
//
// REGEL 1: authClient MÅSTE vara useRef -- ALDRIG useState
//   - Om authClient är useState triggar setAuthClient() ett
//     nytt render → useEffect kör om sig → oändlig loop.
//
// REGEL 2: finally-blocket FÅR INTE sätta setStatus("idle")
//   - finally körs ALLTID, även efter att en sparad session
//     hittats och setStatus("success") anropats. Det överskriver
//     "success" med "idle" och döljer alla menyval/inlägg.
//
// REGEL 3: useEffect-dependency-arrayen FÅR INTE innehålla authClient
//   - authClientRef.current ändras utan att trigga re-renders.
//     Det är rätt beteende. Lägg INTE till authClient i arrayen.
//
// REGEL 4: login() ska SYNKA state om sessionen redan är giltig
//   - INTE sätta loginError. Annars slutar knappen fungera.
//
// REGEL 5: status sätts EXPLICIT
//   - "success" om isAuthenticated() === true vid init
//   - "idle" annars
//   - Aldrig via finally-blocket
//
// Se AUTH_RULES.md för fullständig förklaring och historik.
// ============================================================

import {
  AuthClient,
  type AuthClientCreateOptions,
  type AuthClientLoginOptions,
} from "@dfinity/auth-client";
import type { Identity } from "@icp-sdk/core/agent";
import { DelegationIdentity, isDelegationValid } from "@icp-sdk/core/identity";
import {
  type PropsWithChildren,
  type ReactNode,
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { loadConfig } from "../config";

export type Status =
  | "initializing"
  | "idle"
  | "logging-in"
  | "success"
  | "loginError";

export type InternetIdentityContext = {
  identity?: Identity;
  login: () => void;
  clear: () => void;
  loginStatus: Status;
  isInitializing: boolean;
  isLoginIdle: boolean;
  isLoggingIn: boolean;
  isLoginSuccess: boolean;
  isLoginError: boolean;
  loginError?: Error;
};

const ONE_HOUR_IN_NANOSECONDS = BigInt(3_600_000_000_000);
const DEFAULT_IDENTITY_PROVIDER = process.env.II_URL;

type ProviderValue = InternetIdentityContext;
const InternetIdentityReactContext = createContext<ProviderValue | undefined>(
  undefined,
);

async function createAuthClient(
  createOptions?: AuthClientCreateOptions,
): Promise<AuthClient> {
  const config = await loadConfig();
  const options: AuthClientCreateOptions = {
    idleOptions: {
      disableDefaultIdleCallback: true,
      disableIdle: true,
      ...createOptions?.idleOptions,
    },
    loginOptions: {
      derivationOrigin: config.ii_derivation_origin,
    },
    ...createOptions,
  };
  return AuthClient.create(options);
}

function assertProviderPresent(
  context: ProviderValue | undefined,
): asserts context is ProviderValue {
  if (!context) {
    throw new Error(
      "InternetIdentityProvider is not present. Wrap your component tree with it.",
    );
  }
}

export const useInternetIdentity = (): InternetIdentityContext => {
  const context = useContext(InternetIdentityReactContext);
  assertProviderPresent(context);
  return context;
};

export function InternetIdentityProvider({
  children,
  createOptions,
}: PropsWithChildren<{
  children: ReactNode;
  createOptions?: AuthClientCreateOptions;
}>) {
  // ⚠️ REGEL 1: useRef -- aldrig useState för authClient
  const authClientRef = useRef<AuthClient | undefined>(undefined);
  const createOptionsRef = useRef(createOptions);

  const [identity, setIdentity] = useState<Identity | undefined>(undefined);
  const [loginStatus, setStatus] = useState<Status>("initializing");
  const [loginError, setError] = useState<Error | undefined>(undefined);

  const setErrorMessage = useCallback((message: string) => {
    setStatus("loginError");
    setError(new Error(message));
  }, []);

  const handleLoginSuccess = useCallback(() => {
    const latestIdentity = authClientRef.current?.getIdentity();
    if (!latestIdentity) {
      setErrorMessage("Identity not found after successful login");
      return;
    }
    setIdentity(latestIdentity);
    setStatus("success");
  }, [setErrorMessage]);

  const handleLoginError = useCallback(
    (maybeError?: string) => {
      setErrorMessage(maybeError ?? "Login failed");
    },
    [setErrorMessage],
  );

  // ⚠️ REGEL 4: Synka state om sessionen redan är giltig
  const login = useCallback(() => {
    const client = authClientRef.current;
    if (!client) {
      setErrorMessage(
        "AuthClient is not initialized yet, make sure to call login on user interaction.",
      );
      return;
    }

    const currentIdentity = client.getIdentity();
    if (
      !currentIdentity.getPrincipal().isAnonymous() &&
      currentIdentity instanceof DelegationIdentity &&
      isDelegationValid(currentIdentity.getDelegation())
    ) {
      // Redan autentiserad -- synka state tyst istället för att sätta fel
      setIdentity(currentIdentity);
      setStatus("success");
      return;
    }

    const options: AuthClientLoginOptions = {
      identityProvider: DEFAULT_IDENTITY_PROVIDER,
      onSuccess: handleLoginSuccess,
      onError: handleLoginError,
      maxTimeToLive: ONE_HOUR_IN_NANOSECONDS * BigInt(24 * 30),
    };

    setStatus("logging-in");
    void client.login(options);
  }, [handleLoginError, handleLoginSuccess, setErrorMessage]);

  const clear = useCallback(() => {
    const client = authClientRef.current;
    if (!client) {
      setErrorMessage("Auth client not initialized");
      return;
    }

    void client
      .logout()
      .then(() => {
        setIdentity(undefined);
        authClientRef.current = undefined;
        setStatus("idle");
        setError(undefined);
      })
      .catch((unknownError: unknown) => {
        setStatus("loginError");
        setError(
          unknownError instanceof Error
            ? unknownError
            : new Error("Logout failed"),
        );
      });
  }, [setErrorMessage]);

  // ⚠️ REGEL 2 & 3: Inget finally, inga authClient i deps -- körs EN gång
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setStatus("initializing");
        if (!authClientRef.current) {
          authClientRef.current = await createAuthClient(
            createOptionsRef.current,
          );
        }
        if (cancelled) return;

        const isAuthenticated = await authClientRef.current.isAuthenticated();
        if (cancelled) return;

        if (isAuthenticated) {
          // ⚠️ REGEL 5: Explicit "success" -- INTE via finally
          const loadedIdentity = authClientRef.current.getIdentity();
          setIdentity(loadedIdentity);
          setStatus("success");
        } else {
          // ⚠️ REGEL 5: Explicit "idle" om ingen session
          setStatus("idle");
        }
      } catch (unknownError) {
        if (!cancelled) {
          setStatus("loginError");
          setError(
            unknownError instanceof Error
              ? unknownError
              : new Error("Initialization failed"),
          );
        }
      }
      // ⚠️ REGEL 2: INGET finally-block här
    })();
    return () => {
      cancelled = true;
    };
  }, []); // ⚠️ REGEL 3: Tom dependency-array -- körs exakt en gång

  const value = useMemo<ProviderValue>(
    () => ({
      identity,
      login,
      clear,
      loginStatus,
      isInitializing: loginStatus === "initializing",
      isLoginIdle: loginStatus === "idle",
      isLoggingIn: loginStatus === "logging-in",
      isLoginSuccess: loginStatus === "success",
      isLoginError: loginStatus === "loginError",
      loginError,
    }),
    [identity, login, clear, loginStatus, loginError],
  );

  return createElement(InternetIdentityReactContext.Provider, {
    value,
    children,
  });
}
