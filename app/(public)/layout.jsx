import Navbar from "@/components/Navbar.jsx";
import Footer from "@/components/Footer.jsx";
import PageViewTracker from "@/components/analytics/PageViewTracker.jsx";

export default function PublicLayout({ children }) {
    return (
        <>
            <PageViewTracker />
            <Navbar />
            <main className="pb-24 sm:pb-0">{children}</main>
            <Footer />
        </>
    );
}
