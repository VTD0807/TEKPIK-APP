import ProductUpdaterPanel from '@/components/admin/ProductUpdaterPanel'

export const metadata = {
    title: 'TEKPIK CMS - Updater Logs',
    description: 'Amazon updater execution logs',
}

export default function CMSProductUpdaterLogsPage() {
    return <ProductUpdaterPanel mode="logs" title="CMS Amazon Product Updater Logs" />
}
