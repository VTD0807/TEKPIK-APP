import ProductUpdaterPanel from '@/components/admin/ProductUpdaterPanel'

export const metadata = {
    title: 'TEKPIK - Product Updater',
    description: 'Automated Amazon product updater and logs',
}

export default function AdminProductUpdaterPage() {
    return <ProductUpdaterPanel mode="full" title="Amazon Product Updater" />
}
