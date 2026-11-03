import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import Swal from 'sweetalert2';
import SectionCard from '../components/SectionCard.jsx';
import { getProducts, getSalespersons, createSale, getCurrentUser } from '../services/api.js';
import { getStoredSession, getStoredSettings } from '../lib/auth.ts';
import { buildReceiptHtml, buildReceiptText } from '../lib/receipt.ts';

const getTodayDateValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const today = getTodayDateValue();

const addNotification = (message) => {
  if (typeof window === 'undefined') return;
  const stored = JSON.parse(window.localStorage.getItem('lumensoft-notifications') || '[]');
  const next = [{ id: Date.now(), message, createdAt: new Date().toISOString() }, ...stored].slice(0, 8);
  window.localStorage.setItem('lumensoft-notifications', JSON.stringify(next));
  window.dispatchEvent(new Event('lumensoft:notifications'));
};

export default function PosPage() {
  const session = getStoredSession();
  const isAdmin = session?.role === 'admin';
  const [products, setProducts] = useState([]);
  const [salespersons, setSalespersons] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSalesperson, setSelectedSalesperson] = useState(String(session?.salespersonId || ''));
  const [currentUser, setCurrentUser] = useState(session || null);
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Date.now().toString().slice(-5)}`);
  const [saleDate, setSaleDate] = useState(today);
  const [selectedItems, setSelectedItems] = useState([]);
  const [settings, setSettings] = useState(getStoredSettings);

  const isActiveStatus = (status) => String(status || '').trim().toLowerCase() === 'active';

  useEffect(() => {
    const load = async () => {
      try {
        const [productsRes, meRes] = await Promise.all([getProducts(), getCurrentUser()]);
        setProducts(productsRes.data || []);
        setCurrentUser(meRes.data || session || null);

        if (isAdmin) {
          const salespersonsRes = await getSalespersons();
          setSalespersons(salespersonsRes.data || []);
        } else if (meRes.data?.salespersonId) {
          setSalespersons([
            {
              id: meRes.data.salespersonId,
              name: meRes.data.displayName,
              email: meRes.data.email,
              status: 'Active',
            },
          ]);
          setSelectedSalesperson(String(meRes.data.salespersonId));
        }
      } catch (error) {
        console.error(error);
      }
    };

    load();
    const syncSettings = () => setSettings(getStoredSettings());
    window.addEventListener('storage', syncSettings);
    window.addEventListener('lumensoft:settings', syncSettings);
    return () => {
      window.removeEventListener('storage', syncSettings);
      window.removeEventListener('lumensoft:settings', syncSettings);
    };
  }, [isAdmin]);

  const activeProducts = useMemo(() => products.filter((product) => isActiveStatus(product.status)), [products]);

  const activeSalespersons = useMemo(() => salespersons.filter((person) => isActiveStatus(person.status)), [salespersons]);

  const activeSalespersonName = useMemo(() => {
    if (isAdmin) {
      return activeSalespersons.find((person) => String(person.id) === String(selectedSalesperson))?.name || '';
    }

    return currentUser?.displayName || currentUser?.email || '';
  }, [activeSalespersons, currentUser, isAdmin, selectedSalesperson]);

  const filteredProducts = useMemo(() => {
    const visibleProducts = activeProducts;
    if (!searchTerm) return visibleProducts.slice(0, 8);
    return visibleProducts.filter((product) => `${product.code} ${product.name}`.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 8);
  }, [activeProducts, searchTerm]);

  useEffect(() => {
    if (isAdmin && selectedSalesperson && !activeSalespersons.some((person) => String(person.id) === String(selectedSalesperson))) {
      setSelectedSalesperson('');
    }
  }, [activeSalespersons, isAdmin, selectedSalesperson]);

  useEffect(() => {
    if (selectedItems.length === 0) return;

    const activeProductIds = new Set(activeProducts.map((product) => String(product.id)));
    setSelectedItems((current) => current.filter((item) => activeProductIds.has(String(item.id))));
  }, [activeProducts, selectedItems.length]);

  const lineDiscount = (item) => {
    const lineSubtotal = item.retailPrice * item.qty;
    if (item.discountType === 'cash') {
      return Math.min(Math.max(Number(item.discountValue || 0), 0), lineSubtotal);
    }

    const percentage = Math.min(Math.max(Number(item.discountValue || 0), 0), 100);
    return lineSubtotal * (percentage / 100);
  };

  const addItem = (product) => {
    const existing = selectedItems.find((item) => item.id === product.id);
    const defaultDiscountType = settings.discountMode === 'cash' ? 'cash' : 'percentage';

    if (existing) {
      setSelectedItems((current) => current.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setSelectedItems((current) => [...current, { id: product.id, name: product.name, retailPrice: Number(product.retailPrice || 0), qty: 1, discountType: defaultDiscountType, discountValue: 0 }]);
    }
    setSearchTerm('');
  };

  const updateItem = (id, field, value) => {
    if (field === 'qty') {
      const numericValue = Number(value);
      if (numericValue <= 0) {
        removeItem(id);
        return;
      }
    }

    setSelectedItems((current) => current.flatMap((item) => {
      if (item.id !== id) return [item];
      if (field === 'qty') {
        return [{ ...item, qty: Number(value) }];
      }
      if (field === 'discountType') {
        return [{ ...item, discountType: value }];
      }
      if (field === 'discountValue') {
        return [{ ...item, discountValue: Math.max(0, Number(value || 0)) }];
      }
      return [{ ...item, [field]: Number(value) }];
    }));
  };

  const removeItem = (id) => {
    setSelectedItems((current) => current.filter((item) => item.id !== id));
  };

  const subtotal = selectedItems.reduce((sum, item) => sum + item.retailPrice * item.qty, 0);
  const discount = selectedItems.reduce((sum, item) => sum + lineDiscount(item), 0);
  const taxRate = Number(settings.taxRate || 0);
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = Math.max(0, subtotal + taxAmount - discount);
  const discountEnabled = settings.discountEnabled !== false;

  const saveSale = async () => {
    if ((isAdmin && !selectedSalesperson) || selectedItems.length === 0) {
      Swal.fire('Validation', 'Choose a salesperson and add at least one product.', 'warning');
      return;
    }

    if (!isAdmin && !currentUser?.salespersonId) {
      Swal.fire('Validation', 'Your salesperson profile was not loaded correctly. Please log in again.', 'warning');
      return;
    }

    const salesperson = isAdmin
      ? activeSalespersons.find((item) => String(item.id) === String(selectedSalesperson))
      : { id: currentUser?.salespersonId, name: currentUser?.displayName || currentUser?.email || 'Salesperson' };
    if (!salesperson) {
      Swal.fire('Validation', 'Please choose an active salesperson.', 'warning');
      return;
    }

    const selectedProductIds = new Set(activeProducts.map((product) => String(product.id)));
    const inactiveSelection = selectedItems.some((item) => !selectedProductIds.has(String(item.id)));
    if (inactiveSelection) {
      Swal.fire('Validation', 'One or more selected products are no longer active.', 'warning');
      return;
    }

    const invalidQty = selectedItems.some((item) => Number(item.qty) <= 0);
    if (invalidQty) {
      Swal.fire('Validation', 'Each product quantity must be greater than zero.', 'warning');
      return;
    }

    const invalidDiscounts = selectedItems.some((item) => {
      const amount = Number(item.discountValue || 0);
      const lineSubtotal = item.retailPrice * item.qty;
      return item.discountType === 'cash'
        ? amount < 0 || amount > lineSubtotal
        : amount < 0 || amount > 100;
    });
    if (invalidDiscounts) {
      Swal.fire('Validation', 'Percentage discounts must be between 0 and 100, and cash discounts cannot exceed the line total.', 'warning');
      return;
    }

    const effectiveSaleDate = getTodayDateValue();
    if (saleDate !== effectiveSaleDate) {
      setSaleDate(effectiveSaleDate);
    }

    const salespersonName = salesperson.name || '';
    const payload = {
      invoiceNo: invoiceNo.trim(),
      saleDate: effectiveSaleDate,
      salespersonId: Number(isAdmin ? selectedSalesperson : currentUser?.salespersonId),
      salespersonName,
      grandTotal,
      items: selectedItems.map((item) => {
        const discountAmount = lineDiscount(item);
        return {
          productId: item.id,
          productName: item.name,
          quantity: item.qty,
          retailPrice: item.retailPrice,
          discount: discountAmount,
          total: item.retailPrice * item.qty - discountAmount,
        };
      }),
    };

    try {
      await createSale(payload);
      addNotification(`${salespersonName || 'Salesperson'} completed invoice ${payload.invoiceNo}`);
      Swal.fire('Saved', 'Sale recorded successfully.', 'success');
      setSelectedItems([]);
      setSelectedSalesperson('');
      setInvoiceNo(`INV-${Date.now().toString().slice(-5)}`);
      setSaleDate(today);
    } catch (error) {
      const message = error?.response?.data?.message || 'Something went wrong.';
      Swal.fire('Error', message, 'error');
    }
  };

  const handlePrintReceipt = () => {
    const salespersonName = activeSalespersonName || 'N/A';
    const receiptDateTime = new Date().toLocaleString();
    const formatDiscount = (item) => item.discountType === 'cash' ? `Rs ${Number(item.discountValue || 0).toLocaleString()}` : `${Number(item.discountValue || 0).toLocaleString()}%`;
    const receiptItems = selectedItems.map((item) => {
      const itemDiscount = lineDiscount(item);
      return {
        name: item.name,
        qty: item.qty,
        unitPrice: item.retailPrice,
        discountLabel: formatDiscount(item),
        lineTotal: item.retailPrice * item.qty - itemDiscount,
      };
    });

    const receiptPayload = {
      companyName: settings.companyName || 'Lumensoft POS',
      invoiceNo,
      salespersonName,
      receiptDateTime,
      currency: 'Rs',
      items: receiptItems,
      subtotal,
      taxRate,
      taxAmount,
      discount,
      grandTotal,
    };

    const receiptText = buildReceiptText(receiptPayload);
    const receiptHtml = buildReceiptHtml(receiptPayload);

    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoiceNo || 'receipt'}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);

    if (settings.printEnabled !== false) {
      const printWindow = window.open('', '_blank', 'width=600,height=800');
      if (printWindow) {
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }
  };

  return (
    <div>
      <SectionCard className="mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label">Salesperson</label>
            {isAdmin ? (
              <select className="form-select" value={selectedSalesperson} onChange={(e) => setSelectedSalesperson(e.target.value)}>
                <option value="">Choose salesperson</option>
                {activeSalespersons.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            ) : (
              <div className="form-control d-flex align-items-center justify-content-between">
                <span>{currentUser?.displayName || currentUser?.email || 'Salesperson'}</span>
                <span className="badge bg-primary">Assigned</span>
              </div>
            )}
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Sale Date</label>
            <input className="form-control" type="date" value={saleDate} min={today} max={today} onChange={(e) => setSaleDate(e.target.value)} />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Invoice No</label>
            <input className="form-control" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Search Product</label>
            <div className="input-group">
              <span className="input-group-text"><Search size={16} /></span>
              <input className="form-control" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Start typing..." />
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="row g-4">
        <div className="col-12 col-xl-8">
          <SectionCard title="Product Search">
            <div className="row g-3">
              {filteredProducts.map((product) => (
                <div className="col-12 col-md-6 col-lg-4" key={product.id}>
                  <div className="border rounded-4 p-3 h-100 hover-card">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-semibold">{product.name}</div>
                        <small className="text-muted">{product.code}</small>
                      </div>
                      <span className="badge bg-primary">Rs {Number(product.retailPrice || 0).toLocaleString()}</span>
                    </div>
                    <div className="mt-3 d-flex justify-content-between align-items-center">
                      <small className="text-muted">Stock available</small>
                      <button className="btn btn-outline-primary btn-sm" onClick={() => addItem(product)}><Plus size={14} /> Add</button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 ? <div className="col-12 text-center text-muted py-4">No active products available.</div> : null}
            </div>
          </SectionCard>
        </div>

        <div className="col-12 col-xl-4">
          <SectionCard title="Sale Items">
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Retail</th>
                    {discountEnabled ? <th>Discount</th> : null}
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td><input type="number" min="1" className="form-control form-control-sm" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} /></td>
                      <td>{item.retailPrice}</td>
                      {discountEnabled ? (
                        <td>
                          <div className="d-flex gap-2">
                            <select className="form-select form-select-sm w-auto" value={item.discountType || settings.discountMode || 'percentage'} onChange={(e) => updateItem(item.id, 'discountType', e.target.value)}>
                              <option value="percentage">%</option>
                              <option value="cash">Rs</option>
                            </select>
                            <input
                              type="number"
                              min="0"
                              step={item.discountType === 'cash' ? '0.01' : '1'}
                              className="form-control form-control-sm"
                              value={item.discountValue || 0}
                              onChange={(e) => updateItem(item.id, 'discountValue', e.target.value)}
                            />
                          </div>
                        </td>
                      ) : null}
                      <td>{(item.retailPrice * item.qty - lineDiscount(item)).toLocaleString()}</td>
                      <td><button className="btn btn-outline-danger btn-sm" onClick={() => removeItem(item.id)}><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-top pt-3 mt-3">
              <div className="d-flex justify-content-between"><span>Sub Total</span><b>Rs {subtotal.toLocaleString()}</b></div>
              <div className="d-flex justify-content-between"><span>Tax</span><b>Rs {taxAmount.toLocaleString()}</b></div>
              <div className="d-flex justify-content-between"><span>Discount</span><b>Rs {discount.toLocaleString()}</b></div>
              <div className="d-flex justify-content-between mt-2 fs-5"><span>Grand Total</span><b>Rs {grandTotal.toLocaleString()}</b></div>
            </div>
            <div className="d-flex gap-2 mt-4">
              <button className="btn btn-primary" onClick={saveSale}>Save Sale</button>
              <button className="btn btn-outline-secondary" onClick={() => setSelectedItems([])}>Clear</button>
              <button className="btn btn-outline-info" onClick={handlePrintReceipt} disabled={selectedItems.length === 0}>Print</button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
