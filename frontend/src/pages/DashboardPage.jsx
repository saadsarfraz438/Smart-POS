import { ArrowUpRight, Box, Coins, CoinsIcon, CreditCard, DollarSign, HandCoinsIcon, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getProducts, getSales, getSalespersons } from '../services/api.js';
import { Link, useLocation } from 'react-router-dom';

export default function DashboardPage() {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/sales') ? '/sales' : '/admin';
  const [products, setProducts] = useState([]);
  const [salespersons, setSalespersons] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [productsRes, salespersonsRes, salesRes] = await Promise.all([getProducts(), getSalespersons(), getSales()]);
        setProducts(productsRes.data || []);
        setSalespersons(salespersonsRes.data || []);
        setSales(salesRes.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const summary = useMemo(() => {
    const revenue = (sales || []).reduce((sum, sale) => sum + Number(sale.grandTotal || 0), 0);
    const totalCost = (sales || []).reduce((sum, sale) => {
      const cost = (sale.items || []).reduce((itemTotal, item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return itemTotal + Number(product?.costPrice || 0) * Number(item.quantity || 0);
      }, 0);
      return sum + cost;
    }, 0);
    const profit = revenue - totalCost;
    return {
      products: products.length,
      salespersons: salespersons.length,
      salesToday: sales.filter((sale) => new Date(sale.saleDate).toDateString() === new Date().toDateString()).length,
      revenue,
      totalCost,
      profit,
    };
  }, [products, salespersons, sales]);

/*Dashboard page component that displays summary cards and recent sales/products. */

  return (
    <div>
      <div className="row g-4 mb-4">
        {[
          { title: 'Total Products', value: summary.products, icon: Box, color: 'primary', path: `${basePath}/products` },
          { title: 'Total Salespersons', value: summary.salespersons, icon: Users, color: 'primary', path: `${basePath}/salespersons` },
          { title: "Today's Sales", value: summary.salesToday, icon: CreditCard, color: 'primary', path: `${basePath}/sales-records` },
          { title: 'Revenue', value: `Rs ${summary.revenue.toLocaleString()}`, icon: HandCoinsIcon, color: 'primary', path: `${basePath}/sales-records` },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div className="col-12 col-md-6 col-xl-3" key={card.title}>
              <div className={`card border-0 shadow-sm h-100 bg-${card.color} text-white`}>
                <div className="card-body d-flex justify-content-between align-items-center">
                  <div>
                    <p className="mb-1 small opacity-75">{card.title}</p>
                    <h3 className="mb-0">{card.value}</h3>
                  </div>
                  <div className="icon-box bg-white bg-opacity-25 rounded-circle p-3">
                    <Icon size={24} />
                  </div>
                </div>
                <div className="card-footer bg-transparent border-0 pt-0">
                  <Link to={card.path} className="text-white text-decoration-none small">
                    View details <ArrowUpRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-md-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="mb-3">Profit Overview</h5>
              <div className="d-flex justify-content-between mb-2"><span>Total Cost</span><strong>Rs {summary.totalCost.toLocaleString()}</strong></div>
              <div className="d-flex justify-content-between"><span>Total Profit</span><strong className="text-success">Rs {summary.profit.toLocaleString()}</strong></div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="mb-3">Salesperson Activity</h5>
              {sales.length === 0 ? (
                <p className="text-muted mb-0">No sales yet.</p>
              ) : (
                <div className="list-group list-group-flush">
                  {sales.slice(0, 4).map((sale) => (
                    <div className="list-group-item px-0 d-flex justify-content-between align-items-center" key={sale.id}>
                      <div>
                        <div className="fw-semibold">{sale.salespersonName || 'N/A'}</div>
                        <small className="text-muted">{sale.invoiceNo}</small>
                      </div>
                      <span className="badge bg-primary">Rs {Number(sale.grandTotal || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-8">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Recent Sales</h5>
                <Link to={`${basePath}/sales-records`} className="btn btn-outline-primary btn-sm">View All</Link>
              </div>
              {loading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" role="status" /><p className="mt-2">Loading...</p></div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Salesperson</th>
                        <th>Date</th>
                        <th>Revenue</th>
                        <th>Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.slice(0, 5).map((sale) => {
                        const cost = (sale.items || []).reduce((itemTotal, item) => {
                          const product = products.find((entry) => entry.id === item.productId);
                          return itemTotal + Number(product?.costPrice || 0) * Number(item.quantity || 0);
                        }, 0);
                        const profit = Number(sale.grandTotal || 0) - cost;
                        return (
                          <tr key={sale.id}>
                            <td>{sale.invoiceNo}</td>
                            <td>{sale.salespersonName || 'N/A'}</td>
                            <td>{new Date(sale.saleDate).toLocaleDateString()}</td>
                            <td>Rs {Number(sale.grandTotal || 0).toLocaleString()}</td>
                            <td className="text-success">Rs {profit.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Recent Products</h5>
                <Link to={`${basePath}/products`} className="btn btn-outline-primary btn-sm">Manage</Link>
              </div>
              {loading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" role="status" /></div>
              ) : (
                <div className="list-group list-group-flush">
                  {products.slice(0, 5).map((product) => (
                    <div className="list-group-item px-0 d-flex justify-content-between align-items-center" key={product.id}>
                      <div>
                        <div className="fw-semibold">{product.name}</div>
                        <small className="text-muted">{product.code}</small>
                      </div>
                      <span className="badge bg-success">Rs {Number(product.retailPrice || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
