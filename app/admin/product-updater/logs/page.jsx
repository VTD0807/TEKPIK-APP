import ProductUpdaterPanel from '@/components/admin/ProductUpdaterPanel'

export const metadata = {
    title: 'TEKPIK - Updater Logs',
    description: 'Amazon updater execution logs',
}

export default function AdminProductUpdaterLogsPage() {
    return <ProductUpdaterPanel mode="logs" title="Amazon Product Updater Logs" />
}
