import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = /^Bearer ([^\s]+)$/.exec(authorizationHeader);
  return match?.[1] ?? null;
}

export function secretsMatch(expected: string, supplied: string | null): boolean {
  if (!supplied) return false;
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
  const suppliedDigest = createHash("sha256").update(supplied, "utf8").digest();
  return timingSafeEqual(expectedDigest, suppliedDigest);
}

function normalizeIp(candidate: string | null): string | null {
  if (!candidate) return null;
  const value = candidate.trim();
  if (isIP(value)) return value;

  const bracketedIpv6 = /^\[([^\]]+)\](?::\d+)?$/.exec(value)?.[1];
  if (bracketedIpv6 && isIP(bracketedIpv6)) return bracketedIpv6;

  const ipv4WithPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(value)?.[1];
  return ipv4WithPort && isIP(ipv4WithPort) ? ipv4WithPort : null;
}

export function resolveRequestIp(headers: Headers, trustProxyHeaders: boolean): string {
  if (!trustProxyHeaders) return "untrusted-client";

  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0] ?? null;
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    forwardedFor,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeIp(candidate);
    if (normalized) return normalized;
  }
  return "unknown-client";
}
