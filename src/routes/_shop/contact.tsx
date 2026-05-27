import { createFileRoute } from "@tanstack/react-router";
import { Phone, Mail, MapPin } from "lucide-react";

export const Route = createFileRoute("/_shop/contact")({
  head: () => ({ meta: [{ title: "যোগাযোগ — মেডিকেয়ার" }] }),
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
