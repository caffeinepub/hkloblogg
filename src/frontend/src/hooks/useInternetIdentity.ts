import {
  AuthClient,
  type AuthClientCreateOptions,
  type AuthClientLoginOptions,
} from "@dfinity/auth-client";
import type { Identity } from "@icp-sdk/core/agent";
/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  CRITICAL FILE – DO NOT MODIFY WITHOUT READING AUTH_RULES.md        ║
 * ║                                                                      ║
 * ║  RULE 1: authClient MUST be useRef, NEVER useState                  ║
 * ║  RULE 2: The finally block MUST NOT exist – it overwrites "success" ║
 * ║  RULE 3: login() MUST sync state if already authenticated            ║
 * ║  RULE 4: status MUST be set explicitly to "success" on restore       ║
 * ║  RULE 5: useEffect deps MUST be [] (empty) – runs once on mount      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
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
  // RULE 1: useRef, NOT useState – avoids re-render loops
  const authClientRef = useRef<AuthClient | null>(null);
  const createOptionsRef = useRef(createOptions);

  const [identity, setIdentity] = useState<Identity | undefined>(undefined);
  const [loginStatus, setStatus] = useState<Status>("initializing");
  const [loginError, setError] = useState<Error | undefined>(undefined);

  const setErrorMessage = useCallback((message: string) => {
    setStatus("loginError");
    setError(new Error(message));
  }, []);

  // RULE 5: Empty deps [] – runs exactly once on mount
  useEffect(() => {
    void (async () => {
      try {
        setStatus("initializing");
        const client = await createAuthClient(createOptionsRef.current);
        authClientRef.current = client;

        const isAuthenticated = await client.isAuthenticated();
        if (isAuthenticated) {
          const loadedIdentity = client.getIdentity();
          setIdentity(loadedIdentity);
          // RULE 4: explicitly set "success" when session is restored
          setStatus("success");
        } else {
          setStatus("idle");
        }
        // RULE 2: NO finally block – it would overwrite "success" with "idle"
      } catch (unknownError) {
        setStatus("loginError");
        setError(
          unknownError instanceof Error
            ? unknownError
            : new Error("Initialization failed"),
        );
      }
    })();
  }, []); // RULE 5: empty array

  const login = useCallback(() => {
    const client = authClientRef.current;
    if (!client) {
      setErrorMessage(
        "AuthClient is not initialized yet, make sure to call `login` on user interaction e.g. click.",
      );
      return;
    }

    // RULE 3: sync state if already authenticated, do NOT set an error
    const currentIdentity = client.getIdentity();
    if (!currentIdentity.getPrincipal().isAnonymous()) {
      setIdentity(currentIdentity);
      setStatus("success");
      return;
    }

    const options: AuthClientLoginOptions = {
      identityProvider: DEFAULT_IDENTITY_PROVIDER,
      onSuccess: () => {
        const latestIdentity = authClientRef.current?.getIdentity();
        if (!latestIdentity) {
          setErrorMessage("Identity not found after successful login");
          return;
        }
        setIdentity(latestIdentity);
        setStatus("success");
      },
      onError: (maybeError?: string) => {
        setErrorMessage(maybeError ?? "Login failed");
      },
      maxTimeToLive: ONE_HOUR_IN_NANOSECONDS * BigInt(24 * 30),
    };

    setStatus("logging-in");
    void client.login(options);
  }, [setErrorMessage]);

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
