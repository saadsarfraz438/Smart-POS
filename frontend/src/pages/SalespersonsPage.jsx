import { useEffect, useState } from 'react';
import { Pencil, Trash2, Search } from 'lucide-react';
import Swal from 'sweetalert2';
import FormField from '../components/FormField.jsx';
import { getSalespersons, createSalesperson, updateSalesperson, deleteSalesperson } from '../services/api.js';

const initialPayload = {
  code: '',
  name: '',
  phone: '',
  email: '',
  address: '',
  password: '',
  status: 'Active',
};

const getErrorMessage = (error) => error?.response?.data?.message || 'Something went wrong.';

export default function SalespersonsPage() {
  const [salespersons, setSalespersons] = useState([]);
  const [form, setForm] = useState(initialPayload);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSalespersons = async () => {
    try {
      const res = await getSalespersons();
      setSalespersons(res.data || []);
    } catch (error) {
      console.error('Failed to load salespersons', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalespersons();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      code: form.code.trim(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      password: form.password.trim(),
    };

    if (!editingId && !payload.password) {
      Swal.fire('Validation', 'Please set a password for the new salesperson.', 'warning');
      return;
    }

    if (!payload.code || !payload.name || !payload.phone || !payload.email || !payload.address) {
      Swal.fire('Validation', 'Please fill all required fields including address.', 'warning');
      return;
    }

    if (!payload.password) {
      delete payload.password;
    }

    try {
      if (editingId) {
        await updateSalesperson(editingId, payload);
        Swal.fire('Updated', 'Salesperson updated successfully.', 'success');
      } else {
        await createSalesperson(payload);
        Swal.fire('Saved', 'Salesperson saved successfully.', 'success');
      }
      setForm(initialPayload);
      setEditingId(null);
      loadSalespersons();
    } catch (error) {
      Swal.fire('Error', getErrorMessage(error), 'error');
    }
  };

  const handleEdit = (salesperson) => {
    setForm({
      code: salesperson.code,
      name: salesperson.name,
      phone: salesperson.phone,
      email: salesperson.email,
      address: salesperson.address || '',
        password: '',
      status: salesperson.status || 'Active',
    });
    setEditingId(salesperson.id);
  };

  const handleDelete = async (id) => {
    const confirmed = await Swal.fire({
      title: 'Are you sure?',
      text: 'This action will delete the salesperson.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
    });

    if (!confirmed.isConfirmed) return;

    try {
      await deleteSalesperson(id);
      Swal.fire('Deleted', 'Salesperson deleted successfully.', 'success');
      loadSalespersons();
    } catch (error) {
      Swal.fire('Error', getErrorMessage(error), 'error');
    }
  };

  const filtered = salespersons.filter((salesperson) => `${salesperson.code} ${salesperson.name}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="row g-4">
        <div className="col-12 col-xl-4">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h5 className="mb-3">Salesperson Management</h5>
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <FormField label="Salesperson Code" className="col-12">
                    <input className="form-control" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
                  </FormField>
                  <FormField label="Salesperson Name" className="col-12">
                    <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </FormField>
                  <FormField label="Phone" className="col-6">
                    <input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                  </FormField>
                  <FormField label="Email" className="col-6">
                    <input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </FormField>
                  <FormField label="Password" hint={editingId ? 'Leave blank to keep the current password.' : 'Set the login password for this salesperson.'} className="col-12">
                    <input type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  </FormField>
                  <FormField label="Address" className="col-12">
                    <textarea className="form-control" rows="3" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </FormField>
                  <FormField label="Status" className="col-12">
                    <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </FormField>
                </div>
                <div className="d-flex gap-2 mt-4">
                  <button className="btn btn-success" type="submit">{editingId ? 'Update' : 'Save'}</button>
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
                  <h5 className="mb-1">Salesperson Records</h5>
                  <p className="text-muted mb-0">Browse and maintain salesperson profiles</p>
                </div>
                <div className="input-group" style={{ maxWidth: 280 }}>
                  <span className="input-group-text"><Search size={16} /></span>
                  <input className="form-control" placeholder="Search salesperson..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
              {loading ? (
                <div className="text-center py-4"><div className="spinner-border text-success" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-5 text-muted">No records found.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-hover align-middle">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((salesperson) => (
                        <tr key={salesperson.id}>
                          <td>{salesperson.code}</td>
                          <td>{salesperson.name}</td>
                          <td>{salesperson.phone}</td>
                          <td>{salesperson.email}</td>
                          <td><span className={`badge bg-${salesperson.status === 'Active' ? 'success' : 'secondary'}`}>{salesperson.status}</span></td>
                          <td>
                            <div className="d-flex gap-2">
                              <button className="btn btn-outline-primary btn-sm" onClick={() => handleEdit(salesperson)}><Pencil size={14} /></button>
                              <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(salesperson.id)}><Trash2 size={14} /></button>
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
