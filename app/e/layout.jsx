import EmployeeLayout from '@/components/employee/EmployeeLayout'

export const metadata = {
    title: 'TEKPIK - Employee',
    description: 'TEKPIK Employee Panel',
}

export default function RootEmployeeLayout({ children }) {
    return <EmployeeLayout>{children}</EmployeeLayout>
}
