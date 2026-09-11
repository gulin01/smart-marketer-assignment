import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { parseChannel } from "@/lib/channels";
import { VISITOR_COOKIE } from "@/proxy";

export const dynamic = "force-dynamic";

/**
 * The public form page. The page shell is ours; the operator's HTML is embedded
 * in a sandboxed iframe pointing at /f/[slug]/render, so template JavaScript runs
 * with an opaque origin and can never touch the admin session (ADR 0003).
 */
export default async function PublicFormPage({
  params,
  searchParams,
}: PageProps<"/f/[slug]">) {
  const { slug } = await params;
  const { ch } = await searchParams;

  const form = await prisma.form.findUnique({
    where: { slug },
    select: { id: true, title: true, isActive: true },
  });

  if (!form || !form.isActive) notFound();

  const channel = parseChannel(typeof ch === "string" ? ch : null);
  const visitorId = (await cookies()).get(VISITOR_COOKIE)?.value;
  const userAgent = (await headers()).get("user-agent");

  // Analytics must never break the form: a DB hiccup here is swallowed.
  if (visitorId) {
    try {
      await prisma.visit.create({
        data: { formId: form.id, channel, visitorId, userAgent },
      });
    } catch (error) {
      console.error("[visit] failed to record", error);
    }
  }

  const renderSrc = `/f/${encodeURIComponent(slug)}/render${
    channel ? `?ch=${channel.toLowerCase()}` : ""
  }`;

  return (
    <main className="flex flex-1 flex-col">
      <h1 className="sr-only">{form.title}</h1>
      <iframe
        title={form.title}
        src={renderSrc}
        // No `allow-same-origin`: the template gets an opaque origin.
        sandbox="allow-forms allow-scripts"
        className="h-dvh w-full border-0"
      />
    </main>
  );
}
