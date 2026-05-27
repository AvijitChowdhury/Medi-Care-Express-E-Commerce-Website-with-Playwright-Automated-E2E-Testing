import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_shop/about")({
  head: () => ({ meta: [{ title: "আমাদের সম্পর্কে — মেডিকেয়ার" }] }),
  component: About,
});

function About() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">আমাদের সম্পর্কে</h1>
      <div className="mt-6 prose prose-sm max-w-none text-foreground/80 space-y-4">
        <p>মেডিকেয়ার বাংলাদেশের একটি বিশ্বস্ত স্বাস্থ্য ও সৌন্দর্য পণ্যের অনলাইন স্টোর। আমরা ১০০% অরিজিনাল ভিটামিন, সাপ্লিমেন্ট, স্কিন কেয়ার ও হেয়ার কেয়ার পণ্য সরবরাহ করি — সরাসরি নির্ভরযোগ্য উৎস থেকে।</p>
        <p>আমাদের লক্ষ্য সাশ্রয়ী মূল্যে প্রিমিয়াম মানের পণ্য আপনার ঘরে পৌঁছে দেওয়া। সারা দেশে দ্রুত ডেলিভারি, ক্যাশ অন ডেলিভারি সুবিধা ও ৭ দিনের মানি ব্যাক গ্যারান্টি — সব মিলিয়ে আপনার নিশ্চিন্ত কেনাকাটার অভিজ্ঞতা।</p>
        <p>আমরা বিশ্বাস করি — সুস্বাস্থ্য ও আত্মবিশ্বাসই হলো প্রকৃত সৌন্দর্যের ভিত্তি।</p>
      </div>
    </div>
  );
}
