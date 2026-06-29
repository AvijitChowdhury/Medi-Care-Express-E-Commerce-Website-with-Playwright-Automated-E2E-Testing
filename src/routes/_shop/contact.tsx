import { createFileRoute } from "@tanstack/react-router";
import { Phone, Mail, MapPin } from "lucide-react";

const SITE_URL = "https://pharmacy-express-now.lovable.app";

export const Route = createFileRoute("/_shop/contact")({
  head: () => ({
    meta: [
      { title: "যোগাযোগ — মেডিকেয়ার" },
      { name: "description", content: "মেডিকেয়ার কাস্টমার সাপোর্টের সাথে যোগাযোগ করুন — ফোন, ইমেইল ও ঠিকানা। অর্ডার, ডেলিভারি বা পণ্য সংক্রান্ত যেকোনো প্রশ্নে আমরা পাশে আছি।" },
      { property: "og:title", content: "যোগাযোগ করুন — মেডিকেয়ার কাস্টমার সাপোর্ট" },
      { property: "og:description", content: "ফোন, ইমেইল বা সরাসরি আমাদের ঠিকানায় যোগাযোগ করুন। ২৪/৭ গ্রাহক সহায়তা।" },
      { property: "og:url", content: `${SITE_URL}/contact` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/contact` }],
  }),
  component: Contact,
});

function Contact() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">যোগাযোগ করুন</h1>
      <p className="mt-2 text-sm text-muted-foreground">আমাদের সাথে সরাসরি যোগাযোগ করতে নিচের তথ্য ব্যবহার করুন।</p>
      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        {[
          { Icon: Phone, t: "ফোন", d: "+৮৮০ ১XXX-XXXXXX" },
          { Icon: Mail, t: "ইমেইল", d: "support@medicare.com.bd" },
          { Icon: MapPin, t: "ঠিকানা", d: "ঢাকা, বাংলাদেশ" },
        ].map(({ Icon, t, d }) => (
          <div key={t} className="bg-card border border-border rounded-2xl p-6 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-5 w-5" /></div>
            <div className="mt-4 font-medium text-sm">{t}</div>
            <div className="mt-1 text-xs text-muted-foreground">{d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
