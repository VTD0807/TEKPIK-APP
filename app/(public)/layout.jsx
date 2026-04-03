import Navbar from "@/components/Navbar.jsx";
import Footer from "@/components/Footer.jsx";

export default function PublicLayout({ children }) {
    return (
        <>
            <Navbar />
            <main className="pb-24 sm:pb-0">{children}</main>
            <Footer />
        </>
    );
}
