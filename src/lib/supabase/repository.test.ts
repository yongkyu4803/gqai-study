import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  SIGNED_ASSET_URL_REFRESH_INTERVAL_MS,
  SIGNED_ASSET_URL_TTL_SECONDS,
  SupabaseRepository,
} from "@/lib/supabase/repository";

describe("SupabaseRepository signed asset URLs", () => {
  it("keeps private asset URLs valid beyond the refresh interval", async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://storage.example.test/signed/image.png" },
      error: null,
    });
    const from = vi.fn(() => ({ createSignedUrl }));
    const client = { storage: { from } } as unknown as SupabaseClient;
    const repository = new SupabaseRepository(client);

    await expect(
      repository.getSignedUrl(
        "gqai-aistudy-module-assets",
        "module/notion/skills-01.png",
      ),
    ).resolves.toBe("https://storage.example.test/signed/image.png");
    expect(createSignedUrl).toHaveBeenCalledWith(
      "module/notion/skills-01.png",
      SIGNED_ASSET_URL_TTL_SECONDS,
    );
    expect(SIGNED_ASSET_URL_REFRESH_INTERVAL_MS).toBeLessThan(
      SIGNED_ASSET_URL_TTL_SECONDS * 1000,
    );
  });
});
