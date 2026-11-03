import { useEffect, useState } from 'react';
import { Search, Trash2, Printer, Download } from 'lucide-react';
import Swal from 'sweetalert2';
import { getSales, deleteSale } from '../services/api.js';

export default function SalesRecordsPage() {
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSales = async () => {
    try {
      const res = await getSales();
      setSales(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const handleDelete = async (id) => {
    const confirmed = await Swal.fire({
      title: 'Are you sure?',
      text: 'The invoice will be removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    });

    if (!confirmed.isConfirmed) return;

    try {
      await deleteSale(id);
      Swal.fire('Deleted', 'Invoice deleted successfully.', 'success');
      loadSales();
    } catch (error) {
      Swal.fire('Error', 'Something went wrong.', 'error');
    }
  };

  const filtered = sales.filter((sale) => `${sale.invoiceNo} ${sale.salespersonName || ''}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
          <div>
            <h5 className="mb-1">Sales Records</h5>
            <p className="text-muted mb-0">Manage invoices and completed orders</p>
          </div>
          <div className="input-group" style={{ maxWidth: 280 }}>
            <span className="input-group-text"><Search size={16} /></span>
            <input className="form-control" placeholder="Search invoice..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-5 text-muted">No records found.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Salesperson</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.invoiceNo}</td>
                    <td>{new Date(sale.saleDate).toLocaleDateString()}</td>
                    <td>{sale.salespersonName || 'N/A'}</td>
                    <td>Rs {Number(sale.grandTotal || 0).toLocaleString()}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <button className="btn btn-outline-info btn-sm"><Printer size={14} /></button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(sale.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
