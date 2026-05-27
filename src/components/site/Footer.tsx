import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-secondary/40">
      <div className="container mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2 md:col-span-1">
          <div className="text-lg font-semibold text-primary mb-3">মেডিকেয়ার</div>
          <p className="text-muted-foreground leading-relaxed">
            বাংলাদেশের বিশ্বস্ত স্বাস্থ্য ও সৌন্দর্য পণ্যের অনলাইন স্টোর। ১০০% অরিজিনাল পণ্যের নিশ্চয়তা।
          </p>
        </div>
        <div>
          <div className="font-medium mb-3">দোকান</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/products">সব পণ্য</Link></li>
            <li><Link to="/track">অর্ডার ট্র্যাক</Link></li>
            <li><Link to="/cart">কার্ট</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-3">কোম্পানি</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/about">আমাদের সম্পর্কে</Link></li>
            <li><Link to="/contact">যোগাযোগ</Link></li>
            <li><Link to="/policy/refund">রিফান্ড নীতি</Link></li>
            <li><Link to="/policy/privacy">গোপনীয়তা নীতি</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-3">যোগাযোগ</div>
          <ul className="space-y-2 text-muted-foreground">
            <li>+৮৮০১XXXXXXXXX</li>
            <li>support@medicare.com.bd</li>
            <li>ঢাকা, বাংলাদেশ</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-5 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} মেডিকেয়ার। সর্বস্বত্ব সংরক্ষিত।
        </div>
      </div>
    </footer>
  );
}
