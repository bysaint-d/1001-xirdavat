// Server-only adapter. It does not create orders or trust browser callback fields.
// Protocol: https://developer.oderopay.com.tr/az/api/checkout
const endpoints={sandbox:'https://sbx-api-gateway.odero.az',live:'https://api-gateway.odero.az'};
const cents=v=>{if(!Number.isSafeInteger(v)||v<0||v>100000000)throw Error('Invalid payment amount');return v};
const validId=v=>Number.isSafeInteger(v)&&v>0;
function httpsUrl(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.hash)throw Error('HTTPS URL required');return u}
export async function oderoSignature({baseUrl,apiKey,secretKey,path,nonce,body=''}){
 // V1 algorithm matches the provider's official AuthSignatureGenerator test vectors.
 const value=baseUrl+decodeURIComponent(path.replaceAll('+',' '))+apiKey+secretKey+nonce+body;
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
 return btoa(String.fromCharCode(...bytes));
}
export function oderoConfig(env){
 const mode=env.ODERO_ENV||'sandbox';
 if(!endpoints[mode])throw Error('Invalid Odero environment');
 if(!env.ODERO_API_KEY||!env.ODERO_SECRET_KEY)throw Error('Odero runtime secrets are missing');
 return {mode,baseUrl:endpoints[mode],apiKey:env.ODERO_API_KEY,secretKey:env.ODERO_SECRET_KEY};
}
export function checkoutPayload(session,{callbackUrl,subMerchants}){
 if(!session?.id||!Array.isArray(session.lines)||!session.lines.length||session.lines.length>50)throw Error('Invalid checkout session');
 const items=session.lines.map(line=>{
  const mapping=subMerchants?.[line.store];
  if(!validId(mapping?.id)||!Number.isSafeInteger(mapping?.payoutBasisPoints)||mapping.payoutBasisPoints<0||mapping.payoutBasisPoints>10000)throw Error('Seller payout mapping is missing or invalid');
  if(!Number.isSafeInteger(line.qty)||line.qty<1||line.qty>99||!line.product||!line.name)throw Error('Invalid checkout line');
  const amount=cents(cents(line.price)*line.qty);if(!amount)throw Error('Invalid checkout line price');
  return {externalId:line.product,name:String(line.name).slice(0,120),price:amount/100,subMerchantId:mapping.id,subMerchantPrice:Math.floor(amount*mapping.payoutBasisPoints/10000)/100};
 });
 const shipping=cents(session.shipping);if(shipping)items.push({externalId:'shipping',name:'Çatdırılma',price:shipping/100});
 const total=cents(session.total);if(!total||Math.round(items.reduce((sum,item)=>sum+item.price,0)*100)!==total)throw Error('Checkout total mismatch');
 return {price:total/100,paidPrice:total/100,walletPrice:0,currency:'AZN',paymentGroup:'PRODUCT',conversationId:session.id,callbackUrl:httpsUrl(callbackUrl).href,items};
}
export function assertVerifiedPayment(payment,session){
 if(!payment||payment.paymentStatus!=='SUCCESS'||payment.currency!=='AZN'||payment.conversationId!==session.id||!validId(payment.id))throw Error('Payment is not verified');
 if(!Number.isFinite(payment.price)||!Number.isFinite(payment.paidPrice)||Math.round(payment.price*100)!==cents(session.total)||Math.round(payment.paidPrice*100)!==session.total)throw Error('Payment amount mismatch');
 if(payment.paymentRefunds?.length||payment.paymentTransactions?.some(t=>t.paymentTransactionRefunds?.length))throw Error('Refunded payment needs reconciliation');
 return {paymentId:String(payment.id),sessionId:session.id,total:session.total,currency:'AZN'};
}
export class OderoClient{
 constructor(env,{fetchImpl=fetch}={}){this.config=oderoConfig(env);this.fetch=fetchImpl}
 async request(path,{method='GET',data}={}){
  const {baseUrl,apiKey,secretKey}=this.config;
  if(!/^\/payment\/v1\/checkout-payments(?:\/init|\/[a-f0-9-]+)$/.test(path))throw Error('Unsupported Odero route');
  const nonce=crypto.randomUUID(),body=data===undefined?'':JSON.stringify(data);
  const signature=await oderoSignature({baseUrl,apiKey,secretKey,path,nonce,body});
  // Do not retry payment initialization automatically: a timeout has an unknown outcome.
  let response;try{response=await this.fetch(baseUrl+path,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{'content-type':'application/json','accept':'application/json','x-api-key':apiKey,'x-rnd-key':nonce,'x-auth-version':'V1','x-signature':signature},...(body?{body}:{})})}catch{throw Error('Odero request unavailable; reconcile before retrying')}
  let payload;try{payload=await response.json()}catch{throw Error('Invalid Odero response')}
  // Upstream messages may contain personal information; keep them out of client errors/logs.
  if(!response.ok||payload.errors||!payload.data)throw Error('Odero request was not accepted');
  return payload.data;
 }
 async initialize(session,options){
  const data=await this.request('/payment/v1/checkout-payments/init',{method:'POST',data:checkoutPayload(session,options)});
  if(typeof data.token!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(data.token))throw Error('Invalid Odero checkout token');
  const page=httpsUrl(data.pageUrl);if(!['odero.az','oderopay.com.tr'].some(domain=>page.hostname===domain||page.hostname.endsWith('.'+domain)))throw Error('Untrusted Odero checkout URL');
  return {token:data.token,pageUrl:page.href,expiresAt:data.tokenExpireDate};
 }
 async verify(token,session){
  if(typeof token!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(token))throw Error('Invalid Odero checkout token');
  return assertVerifiedPayment(await this.request('/payment/v1/checkout-payments/'+token),session);
 }
}
