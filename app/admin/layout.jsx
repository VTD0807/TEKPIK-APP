import AdminLayout from "@/components/admin/AdminLayout";

export const metadata = {
    title: "TEKPIK - Admin",
    description: "TEKPIK Admin Panel",
};

export default function RootAdminLayout({ children }) {
    return <AdminLayout>{children}</AdminLayout>
}
