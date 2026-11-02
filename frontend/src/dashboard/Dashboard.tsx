import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, lokaApi, logoutAccount } from "../lib/api";
import "./dashboard.css";

type Row = Record<string, any>;
const money = (n: unknown) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(n ?? 0));
const rows = (v: any): Row[] => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];

export default function Dashboard() {
  const navigate = useNavigate();
  const [role, setRole] = useState("user");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Row[]>([]);
  const [metrics, setMetrics] = useState<Row>({});
  const [products, setProducts] = useState<Row[]>([]);
  const [sellers, setSellers] = useState<Row[]>([]);
  const [address, setAddress] = useState({ recipientName: "", phone: "", addressLine1: "", city: "", state: "", country: "Nigeria", label: "Home", isDefault: true });
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");

  const load = async () => {
    setBusy(true); setError("");
    try {
      const current = await getCurrentUser();
      const userRole = current.user.role || "user"; setRole(userRole);
      if (userRole === "admin") {
        const [dashboard, allOrders, allSellers] = await Promise.all([lokaApi.admin.dashboard(), lokaApi.admin.orders(), lokaApi.admin.sellers()]);
        setMetrics((dashboard as any).data || {}); setOrders(rows(allOrders)); setSellers(rows(allSellers));
      } else if (userRole === "seller") {
        const [dashboard, allOrders, allProducts] = await Promise.all([lokaApi.seller.dashboard(), lokaApi.seller.orders(), lokaApi.seller.products()]);
        setMetrics((dashboard as any).data || {}); setOrders(rows(allOrders)); setProducts(rows(allProducts));
      } else {
        const [cartResult, orderResult] = await Promise.all([lokaApi.user.cart(), lokaApi.user.orders()]);
        setCart(rows((cartResult as any).items)); setOrders(rows(orderResult));
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load dashboard"); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);

  const checkout = async () => {
    setWorking(true); setNotice(""); setError("");
    try {
      const addressResult: any = await lokaApi.user.createAddress(address);
      const addressId = addressResult?.data?.id;
      const sessionResult: any = await lokaApi.user.checkout({ ...(addressId ? { addressId } : {}) });
      const session = sessionResult?.data;
      const sessionId = session?.id || session?.checkout_session_id;
      if (!sessionId) throw new Error("Checkout was created but no checkout session ID was returned.");
      const payment: any = await lokaApi.payments.initialize({ checkoutSessionId: sessionId });
      const url = payment?.checkout?.authorizationUrl;
      if (!url) throw new Error("Paystack did not return a payment link. Check backend payment configuration.");
      window.location.assign(url);
    } catch (e) { setError(e instanceof Error ? e.message : "Checkout could not start"); }
    finally { setWorking(false); }
  };

  const payAgain = async (sessionId: string) => {
    setWorking(true);
    try {
      const payment: any = await lokaApi.payments.initialize({ checkoutSessionId: sessionId });
      const url = payment?.checkout?.authorizationUrl;
      if (!url) throw new Error("No Paystack authorization URL returned");
      window.location.assign(url);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not initialize payment"); }
    finally { setWorking(false); }
  };

  const updateStatus = async (orderId: string, status: string) => {
    try { await lokaApi.seller.updateOrderStatus(orderId, status); setNotice("Order status updated."); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update order"); }
  };

  const approve = async (userId: string) => {
    try { await lokaApi.admin.approveSeller(userId); setNotice("Seller approved."); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not approve seller"); }
  };

  const logout = async () => { await logoutAccount(); navigate("/login"); };
  if (busy) return <main className="loka-dashboard"><p>Loading your LOKA workspace…</p></main>;

  return <main className="loka-dashboard">
    <header className="dash-top"><Link to="/app" className="dash-logo">LOKA</Link><nav><Link to="/app">Marketplace</Link><button onClick={logout}>Sign out</button></nav></header>
    <section className="dash-intro"><p>LOKA ACCOUNT</p><h1>{role === "admin" ? "Company administration" : role === "seller" ? "Seller workspace" : "Your account"}</h1><span>{role === "admin" ? "Monitor marketplace activity and seller operations." : role === "seller" ? "Manage orders, products and store performance." : "Manage your basket, payments and deliveries."}</span></section>
    {error && <p className="dash-alert">{error}</p>}{notice && <p className="dash-notice">{notice}</p>}
    {role === "user" && <>
      <section className="dash-panel"><h2>Shopping cart</h2>{!cart.length ? <p>Your cart is empty. <Link to="/app">Explore products</Link></p> : <>
        {cart.map((item,i) => <div className="dash-row" key={item.id || i}><span>{item.product?.name || "Product"} × {item.quantity}</span><strong>{money(Number(item.product?.price || 0) * Number(item.quantity || 0))}</strong></div>)}
        <div className="dash-total"><span>Subtotal</span><strong>{money(cart.reduce((n,item)=>n+Number(item.product?.price||0)*Number(item.quantity||0),0))}</strong></div>
        <h3>Delivery details</h3><div className="dash-form">
          <input placeholder="Recipient name" value={address.recipientName} onChange={e=>setAddress({...address,recipientName:e.target.value})}/>
          <input placeholder="Phone number" value={address.phone} onChange={e=>setAddress({...address,phone:e.target.value})}/>
          <input placeholder="Street address" value={address.addressLine1} onChange={e=>setAddress({...address,addressLine1:e.target.value})}/>
          <input placeholder="City" value={address.city} onChange={e=>setAddress({...address,city:e.target.value})}/>
          <input placeholder="State" value={address.state} onChange={e=>setAddress({...address,state:e.target.value})}/>
        </div><button className="dash-primary" disabled={working || !address.recipientName || !address.phone || !address.addressLine1 || !address.city || !address.state} onClick={checkout}>{working ? "Preparing secure checkout…" : "Continue to Paystack"}</button>
      </>}</section>
      <section className="dash-panel"><h2>Order tracking</h2>{!orders.length?<p>No orders yet.</p>:orders.map((o,i)=><div className="dash-order" key={o.id||i}><div><strong>Order {String(o.id||"").slice(0,8)}</strong><p>{new Date(o.created_at).toLocaleDateString()} · {money(o.total)}</p></div><span className="dash-status">{o.status}</span>{o.status==="pending" && o.checkout_session_id && <button onClick={()=>payAgain(o.checkout_session_id)}>Pay now</button>}</div>)}</section>
    </>}
    {role === "seller" && <>
      <section className="dash-metrics"><article><span>Orders</span><strong>{metrics.orders ?? orders.length}</strong></article><article><span>Active products</span><strong>{metrics.activeProducts ?? products.filter(p=>p.status==="active").length}</strong></article><article><span>Gross order value</span><strong>{money(metrics.grossOrderValue)}</strong></article><article><span>Seller net</span><strong>{money(metrics.sellerNet)}</strong></article></section>
      <section className="dash-panel"><h2>Recent products</h2>{products.slice(0,8).map((p,i)=><div className="dash-row" key={p.id||i}><span>{p.name}</span><strong>{money(p.price)} · {p.status}</strong></div>)}<p>Product creation and inventory management are available through the seller API; a full product editor is the next UI increment.</p></section>
      <section className="dash-panel"><h2>Orders to fulfil</h2>{orders.map((o,i)=><div className="dash-order" key={o.id||i}><div><strong>Order {String(o.id||"").slice(0,8)}</strong><p>{money(o.total)} · {new Date(o.created_at).toLocaleDateString()}</p></div><span className="dash-status">{o.status}</span><select value={o.status} onChange={e=>updateStatus(o.id,e.target.value)}><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option></select></div>)}</section>
    </>}
    {role === "admin" && <>
      <section className="dash-metrics"><article><span>Customers</span><strong>{metrics.users ?? 0}</strong></article><article><span>Approved sellers</span><strong>{metrics.sellers?.approved ?? 0}</strong></article><article><span>Products</span><strong>{metrics.products ?? 0}</strong></article><article><span>Orders (30 days)</span><strong>{metrics.orders?.total ?? 0}</strong></article><article><span>Net revenue</span><strong>{money((metrics.revenue?.gross||0)-(metrics.revenue?.processedRefunds||0))}</strong></article></section>
      <section className="dash-panel"><h2>Seller applications</h2>{sellers.filter(s=>s.status==="pending").length===0?<p>No pending seller applications.</p>:sellers.filter(s=>s.status==="pending").map((s,i)=><div className="dash-order" key={s.user_id||i}><div><strong>{s.store_name || s.user_id}</strong><p>{s.status}</p></div><button className="dash-primary" onClick={()=>approve(s.user_id)}>Approve seller</button></div>)}</section>
      <section className="dash-panel"><h2>Marketplace orders</h2>{orders.slice(0,20).map((o,i)=><div className="dash-row" key={o.id||i}><span>{String(o.id||"").slice(0,10)} · {o.status}</span><strong>{money(o.total)}</strong></div>)}</section>
    </>}
  </main>;
}
