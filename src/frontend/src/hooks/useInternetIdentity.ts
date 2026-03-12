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
  // Use ref to avoid re-runs of the init effect when authClient changes
  const authClientRef = useRef<AuthClient | null>(null);
  const [identity, setIdentity] = useState<Identity | undefined>(undefined);
  const [loginStatus, setStatus] = useState<Status>("initializing");
  const [loginError, setError] = useState<Error | undefined>(undefined);

  // Initialize auth client once on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setStatus("initializing");
        const client = await createAuthClient(createOptions);
        if (cancelled) return;
        authClientRef.current = client;

        const isAuthenticated = await client.isAuthenticated();
        if (cancelled) return;

        if (isAuthenticated) {
          const loadedIdentity = client.getIdentity();
          setIdentity(loadedIdentity);
          // CRITICAL: set "success" when session is restored from storage
          setStatus("success");
        } else {
          setStatus("idle");
        }
      } catch (unknownError) {
        if (cancelled) return;
        setStatus("loginError");
        setError(
          unknownError instanceof Error
            ? unknownError
            : new Error("Initialization failed"),
        );
      }
      // No finally block -- status is set explicitly above
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOptions]);

  const handleLoginSuccess = useCallback(() => {
    const client = authClientRef.current;
    if (!client) return;
    const latestIdentity = client.getIdentity();
    setIdentity(latestIdentity);
    setStatus("success");
    setError(undefined);
  }, []);

  const handleLoginError = useCallback((maybeError?: string) => {
    setStatus("loginError");
    setError(new Error(maybeError ?? "Login failed"));
  }, []);

  const login = useCallback(() => {
    const client = authClientRef.current;
    if (!client) {
      setStatus("loginError");
      setError(new Error("AuthClient is not initialized yet."));
      return;
    }

    // If already authenticated, sync state and return -- do NOT set error
    const currentIdentity = client.getIdentity();
    if (
      !currentIdentity.getPrincipal().isAnonymous() &&
      currentIdentity instanceof DelegationIdentity &&
      isDelegationValid(currentIdentity.getDelegation())
    ) {
      setIdentity(currentIdentity);
      setStatus("success");
      setError(undefined);
      return;
    }

    const options: AuthClientLoginOptions = {
      identityProvider: DEFAULT_IDENTITY_PROVIDER,
      onSuccess: handleLoginSuccess,
      onError: handleLoginError,
      maxTimeToLive: ONE_HOUR_IN_NANOSECONDS * BigInt(24 * 30), // 30 days
    };

    setStatus("logging-in");
    void client.login(options);
  }, [handleLoginError, handleLoginSuccess]);

  const clear = useCallback(() => {
    const client = authClientRef.current;
    if (!client) return;
    void client
      .logout()
      .then(() => {
        authClientRef.current = null;
        setIdentity(undefined);
        setStatus("idle");
        setError(undefined);
        // Re-create client for next login
        void createAuthClient().then((newClient) => {
          authClientRef.current = newClient;
        });
      })
      .catch((unknownError: unknown) => {
        setStatus("loginError");
        setError(
          unknownError instanceof Error
            ? unknownError
            : new Error("Logout failed"),
        );
      });
  }, []);

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
