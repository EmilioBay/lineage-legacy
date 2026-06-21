export function getFingerprint(): string {
  if (typeof window === "undefined") return "";
  try {
    const parts = [
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height,
      new Date().getTimezoneOffset().toString(),
    ];
    // Light hash
    const str = parts.join("|");
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36);
  } catch {
    return "";
  }
}
