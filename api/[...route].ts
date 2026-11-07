import type { VercelRequest, VercelResponse } from '@vercel/node';
import { publicDb, requireRole, methodNotAllowed } from './_lib/supabase.js';

const json = (res: VercelResponse, status: number, body: unknown) => res.status(status).json(body);
const bodyOf = (req: VercelRequest) => typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
const pathOf = (req: VercelRequest) => String(req.url || '').split('?')[0].replace(/^\/api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);

async function admin(req: VercelRequest, res: VercelResponse, roles = ['super_admin']) {
  const auth = await requireRole(req, roles);
  if (!auth.ok) { json(res, auth.status, { success:false, error:auth.error }); return null; }
  return auth;
}
async function customerDb(req: VercelRequest) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i,'');
  if (!token) return null;
  const db = publicDb();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return { db, user:data.user };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  const p=pathOf(req), route=p.join('/');
  try {
    // Admin endpoints: only verified Supabase sessions with the appropriate DB role.
    if (route==='admin/overview') {
      if(req.method!=='GET') return methodNotAllowed(res,['GET']);
      const a=await admin(req,res,['super_admin','box_office']); if(!a)return;
      const [events,orders,tickets,users]=await Promise.all([
        a.db.from('events').select('id',{count:'exact',head:true}),
        a.db.from('orders').select('id,total_amount,payment_status,created_at'),
        a.db.from('tickets').select('id,status',{count:'exact',head:true}),
        a.db.from('users').select('id',{count:'exact',head:true})
      ]);
      if(events.error||orders.error||tickets.error||users.error) return json(res,500,{success:false,error:'Statistiques indisponibles.'});
      const completed=(orders.data||[]).filter(o=>o.payment_status==='completed');
      return json(res,200,{success:true,stats:{events:events.count||0,orders:(orders.data||[]).length,tickets:tickets.count||0,users:users.count||0,revenue:completed.reduce((s,o)=>s+Number(o.total_amount||0),0),pending:(orders.data||[]).filter(o=>o.payment_status==='pending').length}});
    }
    if(route==='admin/orders') {
      if(req.method!=='GET') return methodNotAllowed(res,['GET']);
      const a=await admin(req,res,['super_admin','box_office']); if(!a)return;
      const {data,error}=await a.db.from('orders').select('*').order('created_at',{ascending:false}).limit(1000);
      if(error)return json(res,500,{success:false,error:'Commandes indisponibles.'});
      return json(res,200,{success:true,orders:data||[]});
    }
    if(route==='admin/emails') {
      if(req.method!=='GET') return methodNotAllowed(res,['GET']);
      const a=await admin(req,res,['super_admin']); if(!a)return;
      const {data,error}=await a.db.from('transactional_emails').select('*').order('sent_at',{ascending:false}).limit(500);
      if(error)return json(res,500,{success:false,error:'Historique emails indisponible.'});
      return json(res,200,{success:true,emails:data||[]});
    }
    if(route==='admin/settings') {
      if(req.method==='GET') {
        const {data,error}=await publicDb().from('platform_settings').select('*').eq('id',1).maybeSingle();
        if(error)return json(res,500,{success:false,error:'Paramètres indisponibles.'});
        const s=data||{};
        return json(res,200,{success:true,settings:{platformName:s.platform_name,tagline:s.tagline,logoMonogram:s.logo_monogram,logoUrl:s.logo_url,currency:s.currency,infoline:s.infoline,socialLinks:s.social_links||{},githubRepoUrl:s.github_repo_url}});
      }
      if(req.method==='PUT') {
        const a=await admin(req,res,['super_admin']);if(!a)return;
        const b=bodyOf(req); const row={id:1,platform_name:String(b.platformName||'LUMARÉEL').slice(0,100),tagline:String(b.tagline||'').slice(0,200),logo_monogram:String(b.logoMonogram||'LR').slice(0,20),logo_url:String(b.logoUrl||'').slice(0,2000),currency:String(b.currency||'FCFA').slice(0,10),infoline:String(b.infoline||'').slice(0,100),social_links:b.socialLinks&&typeof b.socialLinks==='object'?b.socialLinks:{},updated_at:new Date().toISOString()};
        const {error}=await a.db.from('platform_settings').upsert(row,{onConflict:'id'});
        if(error)return json(res,500,{success:false,error:'Sauvegarde refusée.'});
        return json(res,200,{success:true});
      }
      return methodNotAllowed(res,['GET','PUT']);
    }
    if(route==='admin/supabase-config') return json(res,410,{success:false,error:'La configuration Supabase ne doit jamais être enregistrée dans la base ou exposée par une route publique. Configurez les variables Vercel.'});
    if(route==='admin/git-sync') return json(res,410,{success:false,error:'Synchronisation Git désactivée côté API : un token GitHub ne doit pas être transmis ni conservé dans le navigateur. Utilisez les commits GitHub et le déploiement automatique Vercel.'});

    if(route==='customer/orders') {
      if(req.method!=='GET')return methodNotAllowed(res,['GET']);
      const auth=await customerDb(req);if(!auth)return json(res,401,{success:false,error:'Session Supabase requise.'});
      const {data:orders,error}=await auth.db.from('orders').select('*').eq('customer_id',auth.user.id).order('created_at',{ascending:false});
      if(error)return json(res,500,{success:false,error:'Commandes client indisponibles.'});
      const ids=(orders||[]).map(o=>o.id);
      const {data:tickets}=ids.length?await auth.db.from('tickets').select('*').in('order_id',ids):{data:[]};
      const mapped=(orders||[]).map(o=>({...o,id:o.id,reference:o.reference,customerId:o.customer_id,customerName:o.customer_name,customerEmail:o.customer_email,customerPhone:o.customer_phone,eventId:o.event_id,eventTitle:o.event_title,eventDate:o.event_date,eventVenue:o.event_venue,categoryId:o.category_id,categoryName:o.category_name,quantity:o.quantity,unitPrice:Number(o.unit_price),totalAmount:Number(o.total_amount),currency:o.currency,paymentStatus:o.payment_status,paymentProvider:o.payment_provider,paymentRef:o.payment_ref,createdAt:o.created_at,paidAt:o.paid_at,tickets:(tickets||[]).filter(t=>t.order_id===o.id).map(t=>({...t,eventId:t.event_id,eventTitle:t.event_title,eventDate:t.event_date,eventTime:t.event_time,eventVenue:t.event_venue,categoryId:t.category_id,categoryName:t.category_name,serialNumber:t.serial_number,holderName:t.holder_name,holderEmail:t.holder_email,issuedAt:t.issued_at}))}));
      return json(res,200,{success:true,orders:mapped});
    }
    if(route==='orders/checkout') {
      if(req.method!=='POST')return methodNotAllowed(res,['POST']);
      // This endpoint intentionally does not mark orders paid or mint tickets. Payment gateway webhook must do that.
      const b=bodyOf(req);const q=Number(b.quantity);
      if(!b.eventId||!b.categoryId||!Number.isInteger(q)||q<1||q>10||!String(b.customerName||'').trim()||!/^\S+@\S+\.\S+$/.test(String(b.customerEmail||'')))return json(res,400,{success:false,error:'Informations de commande invalides.'});
      return json(res,503,{success:false,error:'Paiement réel non configuré. Aucune commande payée ni aucun billet ne sera créé sans confirmation du prestataire.'});
    }
    if(/^orders\/[^/]+\/pay-sandbox$/.test(route))return json(res,410,{success:false,error:'Le paiement sandbox est désactivé. Aucun billet ne peut être émis par simulation.'});
    if(route==='tickets/verify-and-burn') {
      if(req.method!=='POST')return methodNotAllowed(res,['POST']);
      const b=bodyOf(req);
      const {data,error}=await publicDb().rpc('verify_and_check_in_physical_ticket',{p_token:String(b.ticketId||b.token||b.qrData||''),p_event_id:String(b.eventId||''),p_agent_name:String(b.gateAgentName||'Agent').slice(0,100),p_scanner_token:String(b.scannerToken||'')});
      if(error)return json(res,500,{success:false,error:'Validation du billet impossible.'});
      return json(res,200,data);
    }
    if(route==='organizers/register') {
      if(req.method!=='POST')return methodNotAllowed(res,['POST']);
      const b=bodyOf(req);if(!b.companyName||!b.contactName||!b.email)return json(res,400,{success:false,error:'Nom, contact et email requis.'});
      const {error}=await publicDb().from('external_organizers').insert({id:'org_'+crypto.randomUUID(),company_name:String(b.companyName).slice(0,180),contact_name:String(b.contactName).slice(0,150),email:String(b.email).slice(0,254).toLowerCase(),phone:String(b.phone||'').slice(0,60),city:String(b.city||'').slice(0,100),country:String(b.country||'').slice(0,100),status:'pending'});
      if(error)return json(res,500,{success:false,error:'Demande organisateur non enregistrée.'});
      return json(res,201,{success:true,message:'Demande reçue.'});
    }
    if(route==='works')return req.method==='GET'?json(res,200,{success:true,works:[]}):methodNotAllowed(res,['GET']);
    if(route==='archives') {
      if(req.method==='GET'){const {data,error}=await publicDb().from('archives').select('*').eq('is_published',true).order('order_index');if(error)return json(res,500,{success:false,error:'Archives indisponibles.'});return json(res,200,{success:true,archives:data||[]});}
      const a=await admin(req,res,['super_admin']);if(!a)return;
      if(req.method==='POST'){const b=bodyOf(req);const {error}=await a.db.from('archives').upsert({id:b.id||'arch_'+crypto.randomUUID(),title:b.title,year:b.year,date:b.date,city:b.city,country:b.country,venue:b.venue,artists:b.artists||[],cover_image:b.coverImage,description:b.description,youtube_url:b.youtubeUrl,youtube_embed_url:b.youtubeEmbedUrl,duration:b.duration,photos:b.photos||[],is_published:b.isPublished!==false,order_index:b.orderIndex||1});if(error)return json(res,500,{success:false,error:'Archive non enregistrée.'});return json(res,201,{success:true});}
      return methodNotAllowed(res,['GET','POST']);
    }
    if(route==='news') {
      if(req.method!=='GET')return methodNotAllowed(res,['GET']);
      const {data,error}=await publicDb().from('news_articles').select('*').eq('is_published',true).order('published_at',{ascending:false}).limit(100);
      if(error)return json(res,500,{success:false,error:'Actualités indisponibles.'});
      return json(res,200,{success:true,news:data||[],articles:data||[]});
    }
    if(route.startsWith('events/')) {
      const id=route.slice(7);
      if(req.method==='GET'){const {data,error}=await publicDb().from('events').select('*').or('id.eq.'+id+',slug.eq.'+id).maybeSingle();if(error||!data)return json(res,404,{success:false,error:'Événement introuvable.'});return json(res,200,{success:true,event:data});}
      const a=await admin(req,res,['super_admin']);if(!a)return;
      if(req.method==='PUT'){const b=bodyOf(req);const {error}=await a.db.from('events').upsert({...b,id},{onConflict:'id'});if(error)return json(res,500,{success:false,error:'Événement non enregistré.'});return json(res,200,{success:true});}
      if(req.method==='DELETE'){const {error}=await a.db.from('events').delete().eq('id',id);if(error)return json(res,500,{success:false,error:'Événement non supprimé.'});return json(res,200,{success:true});}
      return methodNotAllowed(res,['GET','PUT','DELETE']);
    }
    if(route.startsWith('customer/tickets/')&&route.endsWith('/print'))return json(res,501,{success:false,error:'Impression du billet électronique à connecter après authentification client.'});
    return json(res,404,{success:false,error:'Route API inconnue.'});
  } catch(e:any) {
    console.error('[api catch-all]',e);
    return json(res,500,{success:false,error:'Erreur API interne.'});
  }
}