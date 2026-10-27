import {z} from 'zod';
export const vehicleSchema=z.object({
  id:z.string().uuid(), type:z.enum(['Bike','Car']), make:z.string().trim().min(1).max(40), model:z.string().trim().min(1).max(60),
  year:z.number().int().min(1980).max(new Date().getUTCFullYear()+1),
  fuel:z.enum(['Petrol','Diesel','Hybrid','Electric']),
  mileage:z.number().min(1).max(200), seats:z.number().int().min(1).max(8),
  engineCc:z.number().int().min(0).max(10000),
}).strict().refine(v=>v.type!=='Bike'||v.seats<=2,{message:'A bike can have at most two seats.'});
export const profileSchema=z.object({homeCity:z.string().trim().max(80),experience:z.enum(['Beginner','Intermediate','Experienced']),bio:z.string().trim().max(500),vehicles:z.array(vehicleSchema).max(10).refine(v=>new Set(v.map(x=>x.id)).size===v.length,{message:'Vehicle IDs must be unique.'})}).strict();
export const profileUpdateSchema=z.object({profile:profileSchema,updatedAt:z.string().datetime().nullable()}).strict();
export const emptyProfile=()=>({homeCity:'',experience:'Beginner',bio:'',vehicles:[]});
