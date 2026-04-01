import { Cart3 } from "react-bootstrap-icons";

export default function CMSOrders() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Orders Management</h1>
                <p className="text-sm text-slate-500 mt-1">Track and fulfill customer orders</p>
            </div>
            <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
                <Cart3 size={40} className="mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">No orders to display yet.</p>
            </div>
        </div>
    );
}
