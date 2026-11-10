import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRole, methodNotAllowed } from '../../_lib/supabase.js';

const countRows = async (db:any, table:string, column?:string, value?:string) => {
  let query=db.from(table).select('id',{count:'exact',head:true});
  if(column && value) query=query.eq(column,value);
  const {count,error}=await query;
  if(error) throw error;
  return count||0;
};

export default async function handler(req:VercelRequest,res:VercelResponse){
  if(req.method!=='GET') return methodNotAllowed(res,['GET']);
  const auth=await requireRole(req,['super_admin']);
  if(!auth.ok) return res.status(auth.status).json({success:false,error:auth.error});
  try{
    const db=auth.db;
    const [orders,cards,active,suspended,revoked,expired,pending,shipped,delivered,credentials,nfcActive,nfcRevoked,unassigned,events,orderRows,physicalCards]=await Promise.all([
      countRows(db,'membership_orders'),
      countRows(db,'membership_cards'),
      countRows(db,'membership_cards','card_status','active'),
      countRows(db,'membership_cards','card_status','suspended'),
      countRows(db,'membership_cards','card_status','revoked'),
      countRows(db,'membership_cards','card_status','expired'),
      countRows(db,'membership_cards','physical_card_status','in_production'),
      countRows(db,'membership_cards','physical_card_status','shipped'),
      countRows(db,'membership_cards','physical_card_status','delivered'),
      countRows(db,'membership_chip_credentials'),
      countRows(db,'membership_chip_credentials','credential_status','active'),
      countRows(db,'membership_chip_credentials','credential_status','revoked'),
      countRows(db,'membership_cards','physical_card_status','not_requested'),
      db.from('membership_events').select('id,action_type,entity_type,entity_id,details,created_at').order('created_at',{ascending:false}).limit(15),\n      db.from('membership_orders').select('id,order_reference,amount,currency,payment_status,paid_at,created_at').order('created_at',{ascending:false}).limit(100),\n      db.from('membership_cards').select('id,card_number,cardholder_name,card_status,physical_card_status,physical_card_tracking_number,issued_at,expires_at').order('issued_at',{ascending:false}).limit(200),
    ]);
    if(events.error) throw events.error;
    return res.status(200).json({success:true,stats:{orders,cards,active,suspended,revoked,expired,pending,shipped,delivered,credentials,nfcActive,nfcRevoked,unassigned},events:events.data||[]});
  }catch(error:any){
    console.error('[physical-cards-overview]',error?.message||error);
    return res.status(500).json({success:false,error:'Les données de gestion des cartes sont indisponibles. Vérifiez les migrations Supabase.'});
  }
}
