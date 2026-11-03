import { useEffect, useState } from 'react';
import { Pencil, Trash2, Eye, Search } from 'lucide-react';
import Swal from 'sweetalert2';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../services/api.js';

const initialPayload = {
  code: '',
  name: '',
  costPrice: '',
  retailPrice: '',
  imageUrl: '',
  comment: '',
  status: 'Active',
};

const getErrorMessage = (error) => error?.response?.data?.message || 'Something went wrong.';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialPayload);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    try {
      const res = await getProducts();
      setProducts(res.data || []);
    } catch (error) {
      console.error('Failed to load products', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      code: form.code.trim(),
      name: form.name.trim(),
      costPrice: Number(form.costPrice),
      retailPrice: Number(form.retailPrice),
    };

    if (!payload.code || !payload.name || !Number.isFinite(payload.costPrice) || !Number.isFinite(payload.retailPrice)) {
      Swal.fire('Validation', 'Please fill all required fields.', 'warning');
      return;
    }

    if (payload.costPrice <= 0 || payload.retailPrice <= 0) {
      Swal.fire('Validation', 'Prices must be greater than zero.', 'warning');
      return;
    }

    if (payload.retailPrice <= payload.costPrice) {
      Swal.fire('Validation', 'Retail price must be greater than cost price.', 'warning');
      return;
    }

    try {
      if (editingId) {
        await updateProduct(editingId, payload);
        Swal.fire('Updated', 'Product updated successfully.', 'success');
      } else {
        await createProduct(payload);
        Swal.fire('Saved', 'Product saved successfully.', 'success');
      }
      setForm(initialPayload);
      setEditingId(null);
      loadProducts();
    } catch (error) {
      Swal.fire('Error', getErrorMessage(error), 'error');
    }
  };

  const handleEdit = (product) => {
    setForm({
      code: product.code,
      name: product.name,
      costPrice: product.costPrice,
      retailPrice: product.retailPrice,
      imageUrl: product.imageUrl || '',
      comment: product.comment || '',
      status: product.status || 'Active',
    });
    setEditingId(product.id);
  };

  const handleDelete = async (id) => {
    const confirmed = await Swal.fire({
      title: 'Are you sure?',
      text: 'This action will delete the product.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
    });

    if (!confirmed.isConfirmed) return;

    try {
      await deleteProduct(id);
      Swal.fire('Deleted', 'Product deleted successfully.', 'success');
      loadProducts();
    } catch (error) {
      Swal.fire('Error', getErrorMessage(error), 'error');
    }
  };

  const filteredProducts = products.filter((product) => `${product.code} ${product.name}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="row g-4">
        <div className="col-12 col-xl-4">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="mb-1">Product Management</h5>
                  <p className="text-muted mb-0">Create and edit products</p>
                </div>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Product Code</label>
                    <input className="form-control" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Product Name</label>
                    <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Cost Price</label>
                    <input type="number" className="form-control" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} required />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Retail Price</label>
                    <input type="number" className="form-control" value={form.retailPrice} onChange={(e) => setForm({ ...form, retailPrice: e.target.value })} required />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Image URL</label>
                    <input className="form-control" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Comments</label>
                    <textarea className="form-control" rows="3" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="d-flex gap-2 mt-4">
                  <button className="btn btn-primary" type="submit">{editingId ? 'Update' : 'Save'}</button>
                  <button className="btn btn-outline-secondary" type="button" onClick={() => { setForm(initialPayload); setEditingId(null); }}>Clear</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-8">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
                <div>
                  <h5 className="mb-1">Product Records</h5>
                  <p className="text-muted mb-0">View, edit, and remove products</p>
                </div>
                <div className="input-group" style={{ maxWidth: 280 }}>
                  <span className="input-group-text"><Search size={16} /></span>
                  <input className="form-control" placeholder="Search Product..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
              {loading ? (
                <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-5 text-muted">No records found.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-hover align-middle">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Cost</th>
                        <th>Retail</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.id}>
                          <td><img src={product.imageUrl || 'https://via.placeholder.com/50'} alt="product" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} /></td>
                          <td>{product.code}</td>
                          <td>{product.name}</td>
                          <td>Rs {Number(product.costPrice || 0).toLocaleString()}</td>
                          <td>Rs {Number(product.retailPrice || 0).toLocaleString()}</td>
                          <td><span className={`badge bg-${product.status === 'Active' ? 'success' : 'secondary'}`}>{product.status}</span></td>
                          <td>
                            <div className="d-flex gap-2">
                              <button className="btn btn-outline-primary btn-sm" onClick={() => handleEdit(product)}><Pencil size={14} /></button>
                              <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(product.id)}><Trash2 size={14} /></button>
                              <button className="btn btn-outline-info btn-sm"><Eye size={14} /></button>
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
        </div>
      </div>
    </div>
  );
}
