import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, lokaApi, logoutAccount } from "../lib/api";
import "./dashboard.css";

type Row = Record<string, any>;
const money = (n: unknown) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(n ?? 0));
const rows = (v: any): Row[] => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];
const emptyProduct = { name:"", slug:"", description:"", price:"", compareAtPrice:"", categoryId:"", storeId:"", sku:"", status:"draft", quantity:"0" };

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
  const [stores, setStores] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Row[]>([]);
  const [address, setAddress] = useState({ recipientName:"", phone:"", addressLine1:"", city:"", state:"", country:"Nigeria", label:"Home", isDefault:true });
  const [storeForm, setStoreForm] = useState({ name:"", slug:"", description:"" });
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingProduct, setEditingProduct] = useState("");
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");

  const load = async () => {
    setBusy(true); setError("");
    try {
      const current = await getCurrentUser();
      const userRole = current.user.role || "user";
      setRole(userRole);
      if (userRole === "admin") {
        const [dashboard, allOrders, allSellers] = await Promise.all([lokaApi.admin.dashboard(), lokaApi.admin.orders(), lokaApi.admin.sellers()]);
        setMetrics((dashboard as any).data || {}); setOrders(rows(allOrders)); setSellers(rows(allSellers));
      } else if (userRole === "seller") {
        const [dashboard, allOrders, allProducts, allStores, categoryResult] = await Promise.all([
          lokaApi.seller.dashboard(), lokaApi.seller.orders(), lokaApi.seller.products(), lokaApi.seller.stores(), lokaApi.categories.list()
        ]);
        setMetrics((dashboard as any).data || {}); setOrders(rows(allOrders)); setProducts(rows(allProducts));
        setStores(rows(allStores)); setCategories(rows(categoryResult));
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
      if (!addressId) throw new Error("Your delivery address could not be saved.");
      const sessionResult: any = await lokaApi.user.checkout({ addressId });
      const sessionId = sessionResult?.data?.checkout_session_id;
      if (!sessionId) throw new Error("Checkout was created but no checkout session ID was returned.");
      const payment: any = await lokaApi.payments.initialize({ checkoutSessionId: sessionId });
      const url = payment?.checkout?.authorizationUrl;
      if (!url) throw new Error("Paystack did not return a payment link. Check backend payment configuration.");
      window.location.assign(url);
    } catch (e) { setError(e instanceof Error ? e.message : "Checkout could not start"); }
    finally { setWorking(false); }
  };

  const payAgain = async (orderId: string) => {
    setWorking(true); setError("");
    try {
      const payment: any = await lokaApi.payments.initialize({ orderId });
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

  const saveStore = async (event: FormEvent) => {
    event.preventDefault(); setWorking(true); setError(""); setNotice("");
    try {
      const slug = storeForm.slug || storeForm.name.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
      if (stores.length) await lokaApi.seller.updateStore(stores[0].id, { ...storeForm, slug });
      else await lokaApi.seller.createStore({ ...storeForm, slug });
      setNotice("Store details saved."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save store"); }
    finally { setWorking(false); }
  };

  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault(); setWorking(true); setError(""); setNotice("");
    try {
      const slug = productForm.slug || productForm.name.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
      const payload = {
        name:productForm.name, slug, description:productForm.description,
        price:Number(productForm.price), compareAtPrice:productForm.compareAtPrice ? Number(productForm.compareAtPrice) : null,
        categoryId:productForm.categoryId || null, storeId:productForm.storeId || null,
        sku:productForm.sku || null, status:productForm.status, currency:"NGN"
      };
      let productId = editingProduct;
      if (editingProduct) await lokaApi.seller.updateProduct(editingProduct,payload);
      else { const created:any = await lokaApi.seller.createProduct(payload); productId = created?.data?.id; }
      if (!productId) throw new Error("Product saved without a product ID; inventory was not updated.");
      const currentInventory:any = editingProduct ? await lokaApi.seller.inventory(productId) : null;
      const reservedQuantity = Number(currentInventory?.data?.reserved_quantity ?? currentInventory?.data?.reservedQuantity ?? 0);
      if (Number(productForm.quantity) < reservedQuantity) throw new Error("Available stock cannot be lower than stock already reserved for customer orders.");
      await lokaApi.seller.updateInventory(productId,{ quantity:Number(productForm.quantity), reservedQuantity });
      setProductForm(emptyProduct); setEditingProduct(""); setNotice("Product and inventory saved."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save product"); }
    finally { setWorking(false); }
  };

  const editProduct = async (product: Row) => {
    setError("");
    try {
      const result:any = await lokaApi.seller.product(product.id);
      const p = result?.data || product;
      const inventory = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
      setProductForm({
        name:p.name||"", slug:p.slug||"", description:p.description||"", price:String(p.price??""),
        compareAtPrice:p.compare_at_price==null?"":String(p.compare_at_price), categoryId:p.category_id||"",
        storeId:p.store_id||"", sku:p.sku||"", status:p.status||"draft", quantity:String(inventory?.quantity??0)
      });
      setEditingProduct(p.id);
    } catch(e) { setError(e instanceof Error?e.message:"Could not load product"); }
  };

  const deleteProduct = async (productId:string) => {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    try { await lokaApi.seller.deleteProduct(productId); setNotice("Product deleted."); await load(); }
    catch(e) { setError(e instanceof Error?e.message:"Could not delete product"); }
  };

  const approve = async (userId: string) => {
    try { await lokaApi.admin.approveSeller(userId); setNotice("Seller approved."); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not approve seller"); }
  };

  const logout = async () => { await logoutAccount(); navigate("/login"); };
  if (busy) return <main className="loka-dashboard"><p>Loading your LOKA workspace…</p></main>;

  return <main className="loka-dashboard">
    <header className="dash-top"><Link to="/app" className="dash-logo">LOKA</Link><nav><Link to="/app">Marketplace</Link><button onClick={logout}>Sign out</button></nav></header>
    <section className="dash-intro"><p>LOKA ACCOUNT</p><h1>{role === "admin" ? "Company administration" : role === "seller" ? "Seller workspace" : "Your account"}</h1><span>{role === "admin" ? "Monitor marketplace activity and seller operations." : role === "seller" ? "Manage your store, products, inventory and orders." : "Manage your basket, payments and deliveries."}</span></section>
    {error && <p className="dash-alert">{error}</p>}{notice && <p className="dash-notice">{notice}</p>}
    {role === "user" && <>
      <section className="dash-panel"><h2>Shopping cart</h2>{!cart.length ? <p>Your cart is empty. <Link to="/app">Explore products</Link></p> : <>
        {cart.map((item,i) => <div className="dash-row" key={item.id || i}><span>{item.product?.name || "Product"} × {item.quantity}</span><strong>{money(item.lineTotal ?? Number(item.product?.price || 0) * Number(item.quantity || 0))}</strong><button onClick={async()=>{await lokaApi.user.removeCartItem(item.productId);await load();}}>Remove</button></div>)}
        <div className="dash-total"><span>Subtotal</span><strong>{money(cart.reduce((n,item)=>n+Number(item.lineTotal ?? Number(item.product?.price||0)*Number(item.quantity||0)),0))}</strong></div>
        <h3>Delivery details</h3><div className="dash-form">
          <input placeholder="Recipient name" value={address.recipientName} onChange={e=>setAddress({...address,recipientName:e.target.value})}/>
          <input placeholder="Phone number" value={address.phone} onChange={e=>setAddress({...address,phone:e.target.value})}/>
          <input placeholder="Street address" value={address.addressLine1} onChange={e=>setAddress({...address,addressLine1:e.target.value})}/>
          <input placeholder="City" value={address.city} onChange={e=>setAddress({...address,city:e.target.value})}/>
          <input placeholder="State" value={address.state} onChange={e=>setAddress({...address,state:e.target.value})}/>
        </div><button className="dash-primary" disabled={working || !address.recipientName || !address.phone || !address.addressLine1 || !address.city || !address.state} onClick={checkout}>{working ? "Preparing secure checkout…" : "Continue to Paystack"}</button>
      </>}</section>
      <section className="dash-panel"><h2>Order tracking</h2>{!orders.length?<p>No orders yet.</p>:orders.map((o,i)=><div className="dash-order" key={o.id||i}><div><strong>Order {String(o.id||"").slice(0,8)}</strong><p>{new Date(o.created_at).toLocaleDateString()} · {money(o.total)}</p></div><span className="dash-status">{o.status}</span>{o.status==="pending" && <button disabled={working} onClick={()=>payAgain(o.id)}>Continue payment</button>}</div>)}</section>
    </>}
    {role === "seller" && <>
      <section className="dash-metrics"><article><span>Orders</span><strong>{metrics.orders ?? orders.length}</strong></article><article><span>Active products</span><strong>{metrics.activeProducts ?? products.filter(p=>p.status==="active").length}</strong></article><article><span>Gross order value</span><strong>{money(metrics.grossOrderValue)}</strong></article><article><span>Seller net</span><strong>{money(metrics.sellerNet)}</strong></article></section>
      <section className="dash-panel"><h2>Store profile</h2><form className="dash-form" onSubmit={saveStore}><input required placeholder="Store name" value={storeForm.name || stores[0]?.name || ""} onChange={e=>setStoreForm({...storeForm,name:e.target.value})}/><input placeholder="Store URL slug" value={storeForm.slug || stores[0]?.slug || ""} onChange={e=>setStoreForm({...storeForm,slug:e.target.value})}/><input placeholder="Store description" value={storeForm.description || stores[0]?.description || ""} onChange={e=>setStoreForm({...storeForm,description:e.target.value})}/><button className="dash-primary" disabled={working}>{stores.length?"Update store":"Create store"}</button></form></section>
      <section className="dash-panel"><h2>{editingProduct?"Edit product":"Add a product"}</h2><form className="dash-form" onSubmit={saveProduct}>
        <input required placeholder="Product name" value={productForm.name} onChange={e=>setProductForm({...productForm,name:e.target.value})}/>
        <input placeholder="URL slug (auto-generated if blank)" value={productForm.slug} onChange={e=>setProductForm({...productForm,slug:e.target.value})}/>
        <input required type="number" min="0" step="0.01" placeholder="Price (NGN)" value={productForm.price} onChange={e=>setProductForm({...productForm,price:e.target.value})}/>
        <input type="number" min="0" step="0.01" placeholder="Compare-at price" value={productForm.compareAtPrice} onChange={e=>setProductForm({...productForm,compareAtPrice:e.target.value})}/>
        <input type="number" min="0" step="1" placeholder="Available stock" value={productForm.quantity} onChange={e=>setProductForm({...productForm,quantity:e.target.value})}/>
        <input placeholder="SKU" value={productForm.sku} onChange={e=>setProductForm({...productForm,sku:e.target.value})}/>
        <select value={productForm.storeId} onChange={e=>setProductForm({...productForm,storeId:e.target.value})}><option value="">No store selected</option>{stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <select value={productForm.categoryId} onChange={e=>setProductForm({...productForm,categoryId:e.target.value})}><option value="">No category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select value={productForm.status} onChange={e=>setProductForm({...productForm,status:e.target.value})}><option value="draft">Draft</option><option value="active">Publish</option><option value="archived">Archived</option></select>
        <textarea placeholder="Product description" value={productForm.description} onChange={e=>setProductForm({...productForm,description:e.target.value})}/>
        <button className="dash-primary" disabled={working}>{working?"Saving…":editingProduct?"Save product changes":"Create product"}</button>{editingProduct&&<button type="button" onClick={()=>{setEditingProduct("");setProductForm(emptyProduct);}}>Cancel edit</button>}
      </form></section>
      <section className="dash-panel"><h2>Your products</h2>{!products.length?<p>No products yet. Add your first product above.</p>:products.map((p,i)=><div className="dash-order" key={p.id||i}><div><strong>{p.name}</strong><p>{money(p.price)} · {p.status} · SKU {p.sku||"—"}</p></div><button onClick={()=>editProduct(p)}>Edit</button><button onClick={()=>deleteProduct(p.id)}>Delete</button></div>)}</section>
      <section className="dash-panel"><h2>Orders to fulfil</h2>{!orders.length?<p>No orders to fulfil yet.</p>:orders.map((o,i)=><div className="dash-order" key={o.id||i}><div><strong>Order {String(o.id||"").slice(0,8)}</strong><p>{money(o.total)} · {new Date(o.created_at).toLocaleDateString()}</p></div><span className="dash-status">{o.status}</span><select value={o.status} onChange={e=>updateStatus(o.id,e.target.value)}><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option></select></div>)}</section>
    </>}
    {role === "admin" && <>
      <section className="dash-metrics"><article><span>Customers</span><strong>{metrics.users ?? 0}</strong></article><article><span>Approved sellers</span><strong>{metrics.sellers?.approved ?? 0}</strong></article><article><span>Products</span><strong>{metrics.products ?? 0}</strong></article><article><span>Orders</span><strong>{metrics.orders?.total ?? 0}</strong></article><article><span>Net revenue</span><strong>{money((metrics.revenue?.gross||0)-(metrics.revenue?.processedRefunds||0))}</strong></article></section>
      <section className="dash-panel"><h2>Seller applications</h2>{sellers.filter(s=>s.status==="pending").length===0?<p>No pending seller applications.</p>:sellers.filter(s=>s.status==="pending").map((s,i)=><div className="dash-order" key={s.user_id||i}><div><strong>{s.store_name || s.user_id}</strong><p>{s.status}</p></div><button className="dash-primary" onClick={()=>approve(s.user_id)}>Approve seller</button></div>)}</section>
      <section className="dash-panel"><h2>Marketplace orders</h2>{orders.slice(0,20).map((o,i)=><div className="dash-row" key={o.id||i}><span>{String(o.id||"").slice(0,10)} · {o.status}</span><strong>{money(o.total)}</strong></div>)}</section>
    </>}
  </main>;
}
