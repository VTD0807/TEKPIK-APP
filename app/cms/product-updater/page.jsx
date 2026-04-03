import ProductUpdaterPanel from '@/components/admin/ProductUpdaterPanel'

export const metadata = {
    title: 'TEKPIK CMS - Product Updater',
    description: 'Automated Amazon product updater and logs',
}

export default function CMSProductUpdaterPage() {
    return <ProductUpdaterPanel mode="full" title="CMS Amazon Product Updater" />
}
