import { HttpAgent } from "@icp-sdk/core/agent";
import { useCallback, useEffect, useState } from "react";
import { loadConfig } from "../config";
import { StorageClient } from "../utils/StorageClient";
import { useInternetIdentity } from "./useInternetIdentity";

export function useStorageClient() {
  const { identity } = useInternetIdentity();
  const [client, setClient] = useState<StorageClient | null>(null);

  useEffect(() => {
    loadConfig().then((config) => {
      const agent = new HttpAgent({
        ...(identity ? { identity } : {}),
        host: config.backend_host,
      });
      const storageClient = new StorageClient(
        config.bucket_name,
        config.storage_gateway_url,
        config.backend_canister_id,
        config.project_id,
        agent,
      );
      setClient(storageClient);
    });
  }, [identity]);

  const uploadImage = useCallback(
    async (file: File, onProgress?: (pct: number) => void): Promise<string> => {
      if (!client) throw new Error("Storage client not initialized");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { hash } = await client.putFile(bytes, onProgress);
      return hash;
    },
    [client],
  );

  const getImageUrl = useCallback(
    async (hash: string): Promise<string> => {
      if (!client) throw new Error("Storage client not initialized");
      return client.getDirectURL(hash);
    },
    [client],
  );

  return { uploadImage, getImageUrl, isReady: !!client };
}
