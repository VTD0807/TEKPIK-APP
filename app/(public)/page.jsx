import Hero from "@/components/Hero";
import OurSpecs from "@/components/OurSpec";
import Newsletter from "@/components/Newsletter";
import LatestProducts from "@/components/LatestProducts";
import BestSelling from "@/components/BestSelling";

// Server component — renders instantly, no client JS needed for initial paint
export default function Home() {
    return (
        <div>
            <Hero />
            <LatestProducts />
            <BestSelling />
            <OurSpecs />
            <Newsletter />
        </div>
    )
}
