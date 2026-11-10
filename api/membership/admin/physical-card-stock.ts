import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRole, methodNotAllowed } from '../../_lib/supabase.js';

const clean = (v: unknown, max = 160) => String(v ?? '').trim().slice(0, max);
const validRef = (v: string) => /^[A-Za-z0-9_-]{16,160}$/.test(v);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!['GET','POST'].includes(req.method || '')) return methodNotAllowed(res,['GET','POST']);
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
