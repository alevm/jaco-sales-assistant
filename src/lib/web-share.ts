/** Detects whether the current browser can share a File array via the Web Share API.
 *  Returns `false` on the server (no `navigator`) and on any browser whose `canShare`
 *  either doesn't exist or returns false for a synthetic image File. */
export function detectCanShareFiles(navLike?: {
  canShare?: (data?: { files?: File[] }) => boolean;
}): boolean {
  const nav = navLike ?? (typeof navigator !== "undefined" ? (navigator as unknown as { canShare?: (d?: { files?: File[] }) => boolean }) : undefined);
  if (!nav || typeof nav.canShare !== "function") return false;
  try {
    const probe = new File([new Uint8Array(1)], "probe.jpg", { type: "image/jpeg" });
    return Boolean(nav.canShare({ files: [probe] }));
  } catch {
    return false;
  }
}
