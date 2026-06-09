import { useEffect, useState } from 'react';
import { Plus, Download } from 'lucide-react';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getSession } from '../lib/authStore';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function formatMad(value) {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'MAD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value) || 0);
}

export default function PurchaseReceiptsPage() {
    const [session] = useState(() => getSession());
    const [receipts, setReceipts] = useState([]);
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!session?.accessToken) {
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        let url = `${API_BASE_URL}/api/v1/purchase-receipts?`;
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (dateFilter) url += `date=${encodeURIComponent(dateFilter)}`;

        fetch(url, {
            headers: { Authorization: `Bearer ${session.accessToken}` }
        })
        .then(res => res.json())
        .then(data => {
            setReceipts(data.receipts || []);
            setIsLoading(false);
        })
        .catch(err => {
            console.error(err);
            setIsLoading(false);
        });
    }, [session, search, dateFilter]);

    const handleDownload = async (id, ref) => {
        const res = await fetch(`${API_BASE_URL}/api/v1/purchase-receipts/${id}/pdf`, {
            headers: { Authorization: `Bearer ${session.accessToken}` }
        });
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${ref || 'receipt-' + id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <>
            <PageBackground />
            <Header isDashboard={true} />
            <main className="section section-shell dashboard-page">
                <section className="dashboard-head">
                    <p className="eyebrow">Purchase Receipts</p>
                    <h1>Purchase Receipts History</h1>
                    <p>View and download all receipts</p>
                </section>

                <div className="flex justify-end mb-6">
                    <Link to="/purchase-receipts/new" className="btn btn-primary">
                        <Plus size={16} /> Create Receipt
                    </Link>
                </div>

                <section className="grid gap-6 lg:grid-cols-[1fr]">
                    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="grid gap-4 md:grid-cols-2 mb-6">
                            <label className="grid gap-2 text-sm text-slate-600">
                                Search by Buyer or Reference
                                <input 
                                    type="text" 
                                    value={search} 
                                    onChange={e => setSearch(e.target.value)} 
                                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                                    placeholder="Search..."
                                />
                            </label>
                            <label className="grid gap-2 text-sm text-slate-600">
                                Filter by Date
                                <input 
                                    type="date" 
                                    value={dateFilter} 
                                    onChange={e => setDateFilter(e.target.value)} 
                                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                                />
                            </label>
                        </div>

                        {isLoading ? (
                            <p className="text-center text-slate-500 py-8">Loading receipts...</p>
                        ) : receipts.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">No receipts found. <Link to="/purchase-receipts/new" className="text-indigo-600 hover:underline">Create one now</Link></p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="border-b border-slate-200 bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Reference</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Buyer</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Total</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {receipts.map(r => (
                                            <tr key={r.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 text-sm text-slate-900">{new Date(r.receipt_date).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{r.reference_number || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-900">{r.buyer_name}</td>
                                                <td className="px-4 py-3 text-sm text-slate-900 font-medium">{formatMad(r.total)}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button 
                                                        onClick={() => handleDownload(r.id, r.reference_number)} 
                                                        className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1 ml-auto"
                                                    >
                                                        <Download size={16} /> Download
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </article>
                </section>
            </main>
        </>
    );
}
