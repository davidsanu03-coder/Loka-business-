import {useEffect,useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {lokaApi} from "../lib/api";
import "./dashboard.css";
export default function PaymentReturn(){
 const [params]=useSearchParams(); const reference=params.get("reference")||params.get("trxref")||"";
 const [state,setState]=useState("verifying"); const [message,setMessage]=useState("Confirming your payment securely with LOKA and Paystack…");
 useEffect(()=>{let active=true;if(!reference){setState("error");setMessage("No Paystack transaction reference was returned.");return}
 lokaApi.payments.verify(reference).then((result:any)=>{if(!active)return;const status=result?.data?.status||result?.providerStatus;if(status==="paid"||status==="success"){setState("success");setMessage("Payment confirmed. Your order is being processed.")}else{setState("pending");setMessage("Payment has not been confirmed yet. Check your order status before trying again.")}}).catch(e=>{if(active){setState("error");setMessage(e instanceof Error?e.message:"We could not verify this payment.")}});
 return()=>{active=false};
 },[reference]);
 return <main className="loka-dashboard"><header className="dash-top"><Link to="/app" className="dash-logo">LOKA</Link></header><section className="dash-panel" style={{maxWidth:620,margin:"70px auto"}}><p className="dash-status">{state}</p><h1>Payment status</h1><p>{message}</p><Link to="/dashboard">Go to your dashboard</Link></section></main>;
}
