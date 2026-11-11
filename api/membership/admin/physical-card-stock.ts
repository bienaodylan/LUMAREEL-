import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRole, methodNotAllowed } from '../../_lib/supabase.js';

const clean = (v: unknown, max = 160) => String(v ?? '').trim().slice(0, max);
const validRef = (v: string) => /^[A-Za-z0-9_-]{16,160}$/.test(v);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!['GET','POST','PATCH'].includes(req.method || '')) return methodNotAllowed(res,['GET','POST','PATCH']);
  const auth = await requireRole(req,['super_admin']);
  if (!auth.ok) return res.status(auth.status).json({success:false,error:auth.error});
  try {
    if (req.method === 'GET') {
      const {data,error}=await auth.db.from('membership_physical_card_stock')
        .select('id,manufacturer_serial,chip_reference,batch_reference,chip_type,stock_status,membership_card_id,received_at,verified_at,shipped_at,delivered_at,carrier,tracking_reference')
        .order('received_at',{ascending:false}).limit(1000);
      if(error) throw error;
      return res.status(200).json({success:true,stock:data||[]});
    }
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    if(req.method==='PATCH'){
      const stockId=clean(body.stockId,80);const status=clean(body.status,30);
      if(!stockId||!['verified','ready','shipped','delivered','blocked','returned'].includes(status))return res.status(400).json({success:false,error:'Carte et statut logistique valides requis.'});
      const {data,error}=await auth.db.rpc('lumareel_update_received_card_status',{
        p_stock_id:stockId,p_status:status,p_carrier:clean(body.carrier,100)||null,
        p_tracking_reference:clean(body.trackingReference,160)||null,
      });
      if(error){
        const code=error.code||'';
        const statusCode=code==='42501'?403:code==='P0002'?404:['22023'].includes(code)?400:['23514','23505'].includes(code)?409:500;
        console.error('[physical-card-stock] status RPC:',error.message);
        return res.status(statusCode).json({success:false,error:statusCode===500?'Transition logistique indisponible.':error.message});
      }
      return res.status(200).json({success:true,stock:data});
    }
    if(body.action==='associate'){
      const stockId=clean(body.stockId,80);const membershipCardId=clean(body.membershipCardId,80);
      if(!stockId||!membershipCardId)return res.status(400).json({success:false,error:'Carte reçue et membre requis.'});
      const {data,error}=await auth.db.rpc('lumareel_assign_received_card',{p_stock_id:stockId,p_membership_card_id:membershipCardId});
      if(error){const status=error.code==='42501'?403:['23505','23514','22023'].includes(error.code||'')?409:500;return res.status(status).json({success:false,error:status===500?'Association physique indisponible.':error.message});}
      return res.status(200).json({success:true,association:data});
    }
    const items=Array.isArray(body.items)?body.items:[body];
    if(!items.length||items.length>500) return res.status(400).json({success:false,error:'Import limité à 1–500 cartes par lot.'});
    const rows:any[]=[];const seenSerial=new Set<string>();const seenChip=new Set<string>();
    for(const [i,item] of items.entries()){
      const serial=clean(item.manufacturerSerial||item.manufacturer_serial,120);
      const chip=clean(item.chipReference||item.chip_reference,160);
      const batch=clean(item.batchReference||item.batch_reference,120)||null;
      const type=clean(item.chipType||item.chip_type,40)||'MIFARE_DESFIRE_EV3';
      if(!serial) return res.status(400).json({success:false,error:`Ligne ${i+1}: numéro de série fabricant obligatoire.`});
      if(chip&&!validRef(chip)) return res.status(400).json({success:false,error:`Ligne ${i+1}: référence NFC opaque invalide (16–160 caractères alphanumériques, _ ou -).`});
      if(seenSerial.has(serial)|| (chip&&seenChip.has(chip))) return res.status(400).json({success:false,error:`Doublon détecté dans le fichier (ligne ${i+1}).`});
      seenSerial.add(serial);if(chip)seenChip.add(chip);
      rows.push({manufacturer_serial:serial,chip_reference:chip||null,batch_reference:batch,chip_type:type,received_by:auth.user.id});
    }
    const {data,error}=await auth.db.from('membership_physical_card_stock').insert(rows).select('id,manufacturer_serial,chip_reference,batch_reference,stock_status,received_at');
    if(error){const duplicate=error.code==='23505';return res.status(duplicate?409:500).json({success:false,error:duplicate?'Une carte ou référence NFC existe déjà dans le stock. Import annulé.':'Enregistrement du stock impossible.'});}
    return res.status(201).json({success:true,inserted:data?.length||0,stock:data||[]});
  }catch(e:any){console.error('[physical-card-stock]',e?.message||e);return res.status(500).json({success:false,error:'Registre de réception indisponible.'});}
}
