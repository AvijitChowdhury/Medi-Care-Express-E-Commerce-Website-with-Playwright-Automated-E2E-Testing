import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_shop/policy/privacy")({
  head: () => ({ meta: [{ title: "গোপনীয়তা নীতি — মেডিকেয়ার" }] }),
  component: () => (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">গোপনীয়তা নীতি</h1>
      <div className="mt-6 space-y-4 text-sm text-foreground/80 leading-relaxed">
        <p>আপনার তথ্যের গোপনীয়তা আমাদের কাছে গুরুত্বপূর্ণ। আমরা শুধুমাত্র অর্ডার প্রসেসিং, ডেলিভারি ও কাস্টমার সাপোর্টের জন্য আপনার তথ্য ব্যবহার করি।</p>
        <p>আমরা কোনো তৃতীয় পক্ষের সাথে আপনার ব্যক্তিগত তথ্য শেয়ার করি না, ডেলিভারি পার্টনার ছাড়া।</p>
      </div>
    </div>
  ),
});
