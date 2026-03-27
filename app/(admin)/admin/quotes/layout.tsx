import { QuotesSubNav } from "@/components/QuotesSubNav";

export default function QuotesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <QuotesSubNav />
      {children}
    </div>
  );
}
