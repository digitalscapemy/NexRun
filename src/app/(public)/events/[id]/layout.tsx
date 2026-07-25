import type { Metadata } from "next";
import { db } from "@/server/db";
import { PUBLIC_EVENT_STATUSES } from "@/lib/event-public-visibility";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = await db.event.findFirst({
    where: {
      slug: id,
      status: { in: [...PUBLIC_EVENT_STATUSES] },
      organization: { status: "APPROVED" },
    },
    select: { title: true, description: true, bannerImageUrl: true, eventDate: true, venue: true, state: true },
  });
  if (!event) return { title: "Event" };
  const description = event.description.replace(/[#*_`>\-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 155);
  return {
    title: event.title,
    description,
    openGraph: {
      type: "website",
      title: event.title,
      description,
      images: [{ url: event.bannerImageUrl, alt: event.title }],
    },
    other: {
      "event:start_time": event.eventDate.toISOString(),
      "event:location": `${event.venue}, ${event.state}`,
    },
  };
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return children;
}
