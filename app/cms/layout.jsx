import CMSLayout from "@/components/cms/CMSLayout";

export const metadata = {
    title: "TEKPIK CMS — Content Management System",
    description: "Professional-grade content management for TEKPIK",
};

export default function CMSRootLayout({ children }) {
    return <CMSLayout>{children}</CMSLayout>
}
