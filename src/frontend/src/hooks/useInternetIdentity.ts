/**
 * ⚠️ CRITICAL FILE -- DO NOT MODIFY WITHOUT READING AUTH_RULES.md ⚠️
 *
 * RULE 1: authClient MUST be stored in a useRef, NOT useState.
 *         Using useState causes the useEffect to re-run every time the client
 *         is set, creating an infinite loop that breaks session restoration.
 *
 * RULE 2: The `finally` block MUST NOT exist in the useEffect.
 *         A finally block always runs setStatus("idle"), which overwrites
 *         "success" even when a valid session was found. This makes the app
 *         think the user is not logged in even when they are.
 *
 * RULE 3: Status MUST be set explicitly.
 *         If isAuthenticated === true  → setStatus("success")
 *         If isAuthenticated === false → setStatus("idle")
 *         There is NO finally block. Status must be set on every code path.
 *
 * RULE 4: login() MUST silently sync state if already authenticated.
 *         It must NOT call setErrorMessage("User is already authenticated").
 *         If the session is already valid, update identity + status to success.
 *
 * RULE 5: The useEffect dependency array MUST NOT include authClient.
 *         Including it re-triggers the effect after setAuthClient(), causing
 *         another loop. Use an empty [] dependency array.
 *
 * Symptoms of regression:
 *   - Login button doesn't work
 *   - Posts/drafts not visible after page reload
 *   - "Not connected" errors on mutations
 *   - Menu items (Skapa inlägg, Mina inlägg) not showing after login
 */

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
  // RULE 1: useRef, not useState -- avoids re-triggering useEffect
  const authClientRef = useRef<AuthClient | null>(null);
  const createOptionsRef = useRef(createOptions);

  const [identity, setIdentity] = useState<Identity | undefined>(undefined);
  const [loginStatus, setStatus] = useState<Status>("initializing");
  const [loginError, setError] = useState<Error | undefined>(undefined);

  const setErrorMessage = useCallback((message: string) => {
    setStatus("loginError");
    setError(new Error(message));
  }, []);

  const handleLoginSuccess = useCallback(() => {
    const client = authClientRef.current;
    if (!client) {
      setErrorMessage("Identity not found after successful login");
      return;
    }
    const latestIdentity = client.getIdentity();
    setIdentity(latestIdentity);
    setStatus("success");
  }, [setErrorMessage]);

  const handleLoginError = useCallback(
    (maybeError?: string) => {
      setErrorMessage(maybeError ?? "Login failed");
    },
    [setErrorMessage],
  );

  const login = useCallback(() => {
    const client = authClientRef.current;
    if (!client) {
      setErrorMessage(
        "AuthClient is not initialized yet, make sure to call `login` on user interaction e.g. click.",
      );
      return;
    }

    const currentIdentity = client.getIdentity();
    // RULE 4: If already authenticated, sync state instead of throwing error
    if (
      !currentIdentity.getPrincipal().isAnonymous() &&
      currentIdentity instanceof DelegationIdentity &&
      isDelegationValid(currentIdentity.getDelegation())
    ) {
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
        authClientRef.current = null;
        setIdentity(undefined);
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

  // RULE 5: Empty dependency array -- runs exactly once on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setStatus("initializing");
        const client = await createAuthClient(createOptionsRef.current);
        if (cancelled) return;
        authClientRef.current = client;

        const isAuthenticated = await client.isAuthenticated();
        if (cancelled) return;

        // RULE 2 & 3: No finally block. Set status explicitly on every path.
        if (isAuthenticated) {
          const loadedIdentity = client.getIdentity();
          setIdentity(loadedIdentity);
          setStatus("success"); // RULE 3: explicitly "success"
        } else {
          setStatus("idle"); // RULE 3: explicitly "idle"
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
      // RULE 2: NO finally block here
    })();
    return () => {
      cancelled = true;
    };
  }, []); // RULE 5: empty deps

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
