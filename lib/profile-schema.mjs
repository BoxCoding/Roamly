import {z} from 'zod';
import {VEHICLES,PROFILE_LINKS,cleanLinks} from '../public/domain.mjs';
export const vehicleSchema=z.object({
  id:z.string().uuid(), type:z.enum(['Bike','Car']), make:z.string().trim().min(1).max(40), model:z.string().trim().min(1).max(60),
  // Read the year during validation: Workers startup can expose the epoch clock.
  year:z.number().int().min(1980).refine(year=>year<=new Date().getUTCFullYear()+1,{message:'Model year cannot be later than next year.'}),
  fuel:z.enum(['Petrol','Diesel','Hybrid','Electric']),
  mileage:z.number().min(1).max(200), seats:z.number().int().min(1).max(8),
  engineCc:z.number().int().min(0).max(10000),
}).strict().refine(v=>v.seats<=VEHICLES[v.type].maxSeats,v=>({message:`A ${v.type.toLowerCase()} can have at most ${VEHICLES[v.type].maxSeats} seats.`}));
export const profileSchema=z.object({homeCity:z.string().trim().max(80),experience:z.enum(['Beginner','Intermediate','Experienced']),bio:z.string().trim().max(500),links:z.record(z.string()).default({}).superRefine((links,ctx)=>{const r=cleanLinks(links,PROFILE_LINKS);if(r.error)return ctx.addIssue({code:'custom',message:r.error});if(Object.keys(links).some(k=>r.links[k]!==links[k]))ctx.addIssue({code:'custom',message:'Social links must be saved in their cleaned form.'})}),vehicles:z.array(vehicleSchema).max(10).refine(v=>new Set(v.map(x=>x.id)).size===v.length,{message:'Vehicle IDs must be unique.'})}).strict();
export const profileUpdateSchema=z.object({profile:profileSchema,updatedAt:z.string().datetime().nullable()}).strict();
export const emptyProfile=()=>({homeCity:'',experience:'Beginner',bio:'',links:{},vehicles:[]});
