import { Landing } from "@/components/landing";
import { SiteNav } from "@/components/site-nav";
import { Footer } from "@/components/footer";

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <Landing />
      <Footer />
    </>
  );
}
