import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, lokaApi, logoutAccount } from "../lib/api";
import "./dashboard.css";

type Row = Record<string, any>;
const money = (n: unknown) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(n ?? 0));
const rows = (v: any): Row[] => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];
const slugify = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function Dashboard() {
  const navigate = useNavigate();
  const [role, setRole] = useState("user");
  const [busy, setBusy] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cart, setCart] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Row[]>([]);
  const [sessions, setSessions] = useState<Row[]>([]);
  const [metrics, setMetrics] = useState<Row>({});
  const [products, setProducts] = useState<Row[]>([]);
  const [stores, setStores] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Row[]>([]);
  const [sellers, setSellers] = useState<Row[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [address, setAddress] = useState({ recipientName: "", phone: "", addressLine1: "", city: "", state: "", country: "Nigeria", label: "Home", isDefault: true });
  const [storeForm, setStoreForm] = useState({ name: "", description: "" });
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", stock: "1", categoryId: "", sku: "" });

  const load = async () => {
    setBusy(true); setError("");
    try {
      const current = await getCurrentUser();
      const userRole = current.user.role || "user";
      setRole(userRole);
      if (userRole === "admin") {
        const [dashboard, allOrders, allSellers] = await Promise.all([lokaApi.admin.dashboard(), lokaApi.admin.orders(), lokaApi.admin.sellers()]);
        setMetrics((dashboard as any).data || {});
        setOrders(rows(allOrders));
        setSellers(rows(allSellers));
      } else if (userRole === "seller") {
        const [dashboard, allOrders, allProducts, allStores, allCategories] = await Promise.all([
          lokaApi.seller.dashboard(), lokaApi.seller.orders(), lokaApi.seller.products(),
          lokaApi.seller.stores(), lokaApi.marketplace.categories()
        ]);
        setMetrics((dashboard as any).data || {});
        setOrders(rows(allOrders));
        setProducts(rows(allProducts));
        const storeRows = rows(allStores);
        setStores(storeRows);
        setSelectedStore((currentStore) => currentStore || storeRows[0]?.id || "");
        setCategories(rows(allCategories));
      } else {
        const [cartResult, orderResult, sessionResult] = await Promise.all([
          lokaApi.user.cart(), lokaApi.user.orders(), lokaApi.user.checkoutSessions()
        ]);
        setCart(rows((cartResult as any).items));
        setOrders(rows(orderResult));
        setSessions(rows(sessionResult));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load dashboard");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const checkout = async () => {
    setWorking(true); setNotice(""); setError("");
    try {
      const addressResult: any = await lokaApi.user.createAddress(address);
      const addressId = addressResult?.data?.id;
      const sessionResult: any = await lokaApi.user.checkout({ ...(addressId ? { addressId } : {}) });
      const sessionId = sessionResult?.data?.checkout_session_id || sessionResult?.data?.id;
      if (!sessionId) throw new Error("Checkout did not return a session ID.");
      const payment: any = await lokaApi.payments.initialize({ checkoutSessionId: sessionId });
      const url = payment?.checkout?.authorizationUrl;
      if (!url) throw new Error("Paystack did not return a payment link. Confirm the server payment configuration.");
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout could not start");
      await load();
    } finally {
      setWorking(false);
    }
  };

  const payAgain = async (sessionId: string) => {
    setWorking(true); setError("");
    try {
      const payment: any = await lokaApi.payments.initialize({ checkoutSessionId: sessionId });
      const url = payment?.checkout?.authorizationUrl;
      if (!url) throw new Error("No Paystack authorization URL returned.");
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not initialize payment");
    } finally {
      setWorking(false);
    }
  };

  const changeCartQuantity = async (productId: string, quantity: number) => {
    setWorking(true); setError("");
    try {
      if (quantity < 1) await lokaApi.user.removeCartItem(productId);
      else await lokaApi.user.setCartItem(productId, quantity);
      const result: any = await lokaApi.user.cart();
      setCart(rows(result.items));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update your cart");
    } finally {
      setWorking(false);
    }
  };

  const saveStoreDetails = async () => {
    if (!selectedStore) return;
    setWorking(true); setError(""); setNotice("");
    try {
      const result: any = await lokaApi.seller.updateStore(selectedStore, { name: storeForm.name, description: storeForm.description });
      setStores((current) => current.map((store) => store.id === selectedStore ? { ...store, ...result?.data } : store));
      setNotice("Store details saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save store details"); }
    finally { setWorking(false); }
  };

  const editProductDetails = async (product: Row) => {
    const name = window.prompt("Product name", product.name);
    if (name === null || name.trim().length < 2) return;
    const priceText = window.prompt("Price in NGN", String(product.price));
    if (priceText === null || !(Number(priceText) > 0)) return;
    setWorking(true); setError(""); setNotice("");
    try {
      const result: any = await lokaApi.seller.updateProduct(product.id, { name: name.trim(), slug: slugify(name), price: Number(priceText) });
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, ...result?.data } : item));
      setNotice("Product details saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update product"); }
    finally { setWorking(false); }
  };

  const createStore = async () => {
    setWorking(true); setError(""); setNotice("");
    try {
      const result: any = await lokaApi.seller.createStore({ name: storeForm.name, slug: slugify(storeForm.name), description: storeForm.description });
      const created = result?.data;
      if (!created?.id) throw new Error("Store was created without a returned ID.");
      setStores((current) => [created, ...current]);
      setSelectedStore(created.id);
      setStoreForm({ name: "", description: "" });
      setNotice("Store created.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create store");
    } finally {
      setWorking(false);
    }
  };

  const createProduct = async () => {
    setWorking(true); setError(""); setNotice("");
    try {
      if (!selectedStore) throw new Error("Create or select a store before adding products.");
      const result: any = await lokaApi.seller.createProduct({
        storeId: selectedStore,
        categoryId: productForm.categoryId || null,
        name: productForm.name,
        slug: slugify(productForm.name),
        description: productForm.description,
        price: Number(productForm.price),
        currency: "NGN",
        sku: productForm.sku || null,
        status: "active"
      });
      const created = result?.data;
      if (!created?.id) throw new Error("Product was created without a returned ID.");
      await lokaApi.seller.updateInventory(created.id, { quantity: Number(productForm.stock), reservedQuantity: 0 });
      setProducts((current) => [created, ...current]);
      setProductForm({ name: "", description: "", price: "", stock: "1", categoryId: "", sku: "" });
      setNotice("Product published and inventory saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create product");
    } finally {
      setWorking(false);
    }
  };

  const saveStock = async (productId: string, quantity: number) => {
    setWorking(true); setError(""); setNotice("");
    try {
      const current: any = await lokaApi.seller.inventory(productId);
      await lokaApi.seller.updateInventory(productId, { quantity, reservedQuantity: Number(current?.data?.reserved_quantity ?? 0) });
      setNotice("Inventory updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update inventory");
    } finally {
      setWorking(false);
    }
  };

  const changeProductStatus = async (productId: string, status: string) => {
    setWorking(true); setError(""); setNotice("");
    try {
      await lokaApi.seller.updateProduct(productId, { status });
      setProducts((current) => current.map((p) => p.id === productId ? { ...p, status } : p));
      setNotice("Product status updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update product");
    } finally {
      setWorking(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    setWorking(true); setError(""); setNotice("");
    try {
      await lokaApi.seller.updateOrderStatus(orderId, status);
      setNotice("Order status updated.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update order");
    } finally {
      setWorking(false);
    }
  };

  const approve = async (userId: string) => {
    try {
      await lokaApi.admin.approveSeller(userId);
      setNotice("Seller approved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not approve seller");
    }
  };

  const logout = async () => { await logoutAccount(); navigate("/login"); };
  if (busy) return <main className="loka-dashboard"><p>Loading your LOKA workspace…</p></main>;

  return <main className="loka-dashboard">
    <header className="dash-top"><Link to="/app" className="dash-logo">LOKA</Link><nav><Link to="/app">Marketplace</Link><button onClick={logout}>Sign out</button></nav></header>
    <section className="dash-intro"><p>LOKA ACCOUNT</p><h1>{role === "admin" ? "Company administration" : role === "seller" ? "Seller workspace" : "Your account"}</h1><span>{role === "admin" ? "Monitor marketplace activity and seller operations." : role === "seller" ? "Manage your store, products, inventory and orders." : "Manage your basket, payments and deliveries."}</span></section>
    {error && <p className="dash-alert" role="alert">{error}</p>}{notice && <p className="dash-notice" role="status">{notice}</p>}

    {role === "user" && <>
      <section className="dash-panel"><h2>Shopping cart</h2>{!cart.length ? <p>Your cart is empty. <Link to="/app">Explore products</Link></p> : <>
        {cart.map((item,i) => <div className="dash-row" key={item.id || i}><span>{item.product?.name || "Product"}<small> · {money(item.product?.price)} each</small></span><div className="dash-cart-controls"><button disabled={working} onClick={()=>changeCartQuantity(item.productId,Number(item.quantity)-1)}>−</button><strong>{item.quantity}</strong><button disabled={working} onClick={()=>changeCartQuantity(item.productId,Number(item.quantity)+1)}>+</button><button disabled={working} onClick={()=>changeCartQuantity(item.productId,0)}>Remove</button><strong>{money(item.lineTotal ?? Number(item.product?.price || 0) * Number(item.quantity || 0))}</strong></div></div>)}
        <div className="dash-total"><span>Subtotal</span><strong>{money(cart.reduce((n,item)=>n+Number(item.lineTotal ?? Number(item.product?.price||0)*Number(item.quantity||0)),0))}</strong></div>
        <h3>Delivery details</h3><div className="dash-form">
          <input placeholder="Recipient name" value={address.recipientName} onChange={e=>setAddress({...address,recipientName:e.target.value})}/>
          <input placeholder="Phone number" value={address.phone} onChange={e=>setAddress({...address,phone:e.target.value})}/>
          <input placeholder="Street address" value={address.addressLine1} onChange={e=>setAddress({...address,addressLine1:e.target.value})}/>
          <input placeholder="City" value={address.city} onChange={e=>setAddress({...address,city:e.target.value})}/>
          <input placeholder="State" value={address.state} onChange={e=>setAddress({...address,state:e.target.value})}/>
        </div><button className="dash-primary" disabled={working || !address.recipientName || !address.phone || !address.addressLine1 || !address.city || !address.state} onClick={checkout}>{working ? "Preparing secure checkout…" : "Continue to Paystack"}</button>
      </>}</section>
      <section className="dash-panel"><h2>Pending payments</h2>{sessions.filter(s=>s.status==="pending").length===0?<p>No pending checkout payments.</p>:sessions.filter(s=>s.status==="pending").map((s,i)=><div className="dash-order" key={s.id||i}><div><strong>Checkout {String(s.id).slice(0,8)}</strong><p>{new Date(s.created_at).toLocaleString()} · {money(s.total)}</p></div><span className="dash-status">Awaiting payment</span><button disabled={working} onClick={()=>payAgain(s.id)}>Resume payment</button></div>)}</section>
      <section className="dash-panel"><h2>Order tracking</h2>{!orders.length?<p>No orders yet.</p>:orders.map((o,i)=>{const payment=Array.isArray(o.payments)?o.payments[0]:o.payments;return <div className="dash-order" key={o.id||i}><div><strong>Order {String(o.id||"").slice(0,8)}</strong><p>{new Date(o.created_at).toLocaleDateString()} · {money(o.total)} · Payment: {payment?.status || "not recorded"}</p></div><span className="dash-status">{o.status}</span></div>})}</section>
    </>}

    {role === "seller" && <>
      <section className="dash-metrics"><article><span>Orders (30 days)</span><strong>{metrics.orders?.total ?? 0}</strong></article><article><span>Active products</span><strong>{metrics.products?.active ?? 0}</strong></article><article><span>Gross order value</span><strong>{money(metrics.revenue?.gross)}</strong></article><article><span>Seller net commissions</span><strong>{money(metrics.commissions?.sellerNet)}</strong></article><article><span>Low-stock products</span><strong>{metrics.products?.lowStock ?? 0}</strong></article></section>
      <section className="dash-panel"><h2>Store management</h2>{stores.length>0?<><label className="dash-field-label">Your store</label><select value={selectedStore} onChange={e=>{setSelectedStore(e.target.value);const store=stores.find(s=>s.id===e.target.value);if(store)setStoreForm({name:store.name||"",description:store.description||""});}}>{stores.map((s,i)=><option key={s.id||i} value={s.id}>{s.name}</option>)}</select><p>{stores.find(s=>s.id===selectedStore)?.description || "Manage your marketplace store."}</p><div className="dash-form"><input placeholder="Store name" value={storeForm.name} onChange={e=>setStoreForm({...storeForm,name:e.target.value})}/><input placeholder="Store description" value={storeForm.description} onChange={e=>setStoreForm({...storeForm,description:e.target.value})}/></div><button disabled={working || !selectedStore || storeForm.name.trim().length<2} onClick={saveStoreDetails}>Save store details</button></>:<p>You need a store before publishing products.</p>}
        <div className="dash-form"><input placeholder="New store name" value={storeForm.name} onChange={e=>setStoreForm({...storeForm,name:e.target.value})}/><input placeholder="New store description" value={storeForm.description} onChange={e=>setStoreForm({...storeForm,description:e.target.value})}/></div><button className="dash-primary" disabled={working || storeForm.name.trim().length<2} onClick={createStore}>Create another store</button>
      </section>
      <section className="dash-panel"><h2>Add a product</h2><div className="dash-form"><input placeholder="Product name" value={productForm.name} onChange={e=>setProductForm({...productForm,name:e.target.value})}/><input type="number" min="0.01" step="0.01" placeholder="Price (NGN)" value={productForm.price} onChange={e=>setProductForm({...productForm,price:e.target.value})}/><input type="number" min="0" step="1" placeholder="Opening stock" value={productForm.stock} onChange={e=>setProductForm({...productForm,stock:e.target.value})}/><input placeholder="SKU (optional)" value={productForm.sku} onChange={e=>setProductForm({...productForm,sku:e.target.value})}/><select value={productForm.categoryId} onChange={e=>setProductForm({...productForm,categoryId:e.target.value})}><option value="">Choose category (optional)</option>{categories.map((c,i)=><option key={c.id||i} value={c.id}>{c.name}</option>)}</select><input placeholder="Description" value={productForm.description} onChange={e=>setProductForm({...productForm,description:e.target.value})}/></div><button className="dash-primary" disabled={working || !selectedStore || productForm.name.trim().length<2 || !(Number(productForm.price)>0) || Number(productForm.stock)<0} onClick={createProduct}>Publish product</button></section>
      <section className="dash-panel"><h2>Products and inventory</h2>{products.length===0?<p>No products yet. Add your first product above.</p>:products.map((p,i)=><div className="dash-product-row" key={p.id||i}><div><strong>{p.name}</strong><p>{money(p.price)} · SKU {p.sku || "—"}</p></div><select value={p.status} onChange={e=>changeProductStatus(p.id,e.target.value)}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select><button disabled={working} onClick={()=>editProductDetails(p)}>Edit product</button><button disabled={working} onClick={async()=>{const raw=window.prompt("Set available stock quantity");if(raw!==null && /^\d+$/.test(raw)) await saveStock(p.id,Number(raw));}}>Update stock</button></div>)}</section>
      <section className="dash-panel"><h2>Orders to fulfil</h2>{orders.length===0?<p>No orders yet.</p>:orders.map((o,i)=>{const next=o.status==="confirmed"?"processing":o.status==="processing"?"shipped":o.status==="shipped"?"delivered":"";return <div className="dash-order" key={o.id||i}><div><strong>Order {String(o.id||"").slice(0,8)}</strong><p>{money(o.total)} · {new Date(o.created_at).toLocaleDateString()}</p></div><span className="dash-status">{o.status}</span>{next&&<button disabled={working} onClick={()=>updateStatus(o.id,next)}>Mark {next}</button>}</div>})}</section>
    </>}

    {role === "admin" && <>
      <section className="dash-metrics"><article><span>Customers</span><strong>{metrics.users ?? 0}</strong></article><article><span>Approved sellers</span><strong>{metrics.sellers?.approved ?? 0}</strong></article><article><span>Products (30 days)</span><strong>{metrics.products ?? 0}</strong></article><article><span>Orders (30 days)</span><strong>{metrics.orders?.total ?? 0}</strong></article><article><span>Net revenue</span><strong>{money(metrics.revenue?.net ?? ((metrics.revenue?.gross||0)-(metrics.revenue?.processedRefunds||0)))}</strong></article></section>
      <section className="dash-panel"><h2>Seller applications</h2>{sellers.filter(s=>s.status==="pending").length===0?<p>No pending seller applications.</p>:sellers.filter(s=>s.status==="pending").map((s,i)=><div className="dash-order" key={s.user_id||i}><div><strong>{s.store_name || s.user_id}</strong><p>{s.status}</p></div><button className="dash-primary" onClick={()=>approve(s.user_id)}>Approve seller</button></div>)}</section>
      <section className="dash-panel"><h2>Marketplace orders</h2>{orders.slice(0,20).map((o,i)=><div className="dash-row" key={o.id||i}><span>{String(o.id||"").slice(0,10)} · {o.status}</span><strong>{money(o.total)}</strong></div>)}</section>
    </>}
  </main>;
}
