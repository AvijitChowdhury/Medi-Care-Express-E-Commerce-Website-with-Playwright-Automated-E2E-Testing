import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_shop/policy/refund")({
  head: () => ({ meta: [{ title: "রিফান্ড নীতি — মেডিকেয়ার" }] }),
  component: () => (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">রিফান্ড নীতি</h1>
      <div className="mt-6 space-y-4 text-sm text-foreground/80 leading-relaxed">
        <p>পণ্য পাওয়ার ৭ দিনের মধ্যে যদি কোনো সমস্যা থাকে, আপনি ফেরত পাঠাতে পারবেন।</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>পণ্য অবশ্যই ব্যবহার না করা ও সিল করা অবস্থায় থাকতে হবে</li>
          <li>মূল প্যাকেজিং অক্ষত থাকতে হবে</li>
          <li>রিফান্ড অনুমোদনের ৫-৭ কর্মদিবসের মধ্যে টাকা ফেরত দেওয়া হবে</li>
          <li>ক্ষতিগ্রস্ত বা নষ্ট পণ্যের ক্ষেত্রে সম্পূর্ণ রিফান্ড</li>
        </ul>
      </div>
    </div>
  ),
});
