import { Sparkles } from "lucide-react";
import { EventListing } from "@/components/public/event-listing";

export default function PublicEventsPage() {
  return (
    <div className="fluid-container py-8 sm:py-12">
      <section className="space-y-6" aria-labelledby="events-heading">
        <div>
          <h1 id="events-heading" className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
            <Sparkles className="h-6 w-6 text-primary-500" /> Discover Events
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Find and register for running events near you.
          </p>
        </div>
        <EventListing />
      </section>
    </div>
  );
}
