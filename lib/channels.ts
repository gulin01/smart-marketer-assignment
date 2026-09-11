import { Channel } from "@/generated/prisma/enums";
import { env } from "./env";

export const CHANNELS = [
  Channel.INSTAGRAM,
  Channel.X,
  Channel.YOUTUBE,
  Channel.THREADS,
] as const;

/** Lowercase slug used in the `?ch=` query parameter (ADR 0006). */
export function channelSlug(channel: Channel): string {
  return channel.toLowerCase();
}

/** Parses a `?ch=` value. Unknown or missing values become `null`, never an error. */
export function parseChannel(value: string | null | undefined): Channel | null {
  if (!value) return null;
  const match = CHANNELS.find((c) => channelSlug(c) === value.trim().toLowerCase());
  return match ?? null;
}

export function distributionUrl(slug: string, channel: Channel): string {
  return `${env.FORM_HOST.replace(/\/$/, "")}/f/${slug}?ch=${channelSlug(channel)}`;
}

export { Channel };
