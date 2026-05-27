import { useQuery } from "@tanstack/react-query";
import { fetchAnnouncements } from "@/lib/queries";

export function AnnouncementBar() {
  const { data } = useQuery({ queryKey: ["announcements"], queryFn: fetchAnnouncements });
  const items = data ?? [];
  if (items.length === 0) return null;
  const text = items.map((a) => a.text_bn).join("    •    ");
  return (
    <div className="bg-primary text-primary-foreground text-xs sm:text-sm overflow-hidden">
      <div className="flex whitespace-nowrap animate-marquee py-2">
        <span className="px-8">{text}    •    {text}</span>
        <span className="px-8">{text}    •    {text}</span>
      </div>
    </div>
  );
}
