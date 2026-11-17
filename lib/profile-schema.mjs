import {z} from 'zod';
import {VEHICLES,PROFILE_LINKS,RIDING_STYLES,RIDING_PACES,LOOKING_FOR,cleanLinks} from '../public/domain.mjs';
// Links object limited to `kinds`, each already in cleanLink() form.
export const linksField=kinds=>z.record(z.string()).default({}).superRefine((links,ctx)=>{const r=cleanLinks(links,kinds);if(r.error)return ctx.addIssue({code:'custom',message:r.error});if(Object.keys(links).some(k=>r.links[k]!==links[k]))ctx.addIssue({code:'custom',message:'Links must be saved in their cleaned form.'})});
export const vehicleSchema=z.object({
  id:z.string().uuid(), type:z.enum(['Bike','Car']), make:z.string().trim().min(1).max(40), model:z.string().trim().min(1).max(60),
  // Read the year during validation: Workers startup can expose the epoch clock.
  year:z.number().int().min(1980).refine(year=>year<=new Date().getUTCFullYear()+1,{message:'Model year cannot be later than next year.'}),
  fuel:z.enum(['Petrol','Diesel','Hybrid','Electric']),
  mileage:z.number().min(1).max(200), seats:z.number().int().min(1).max(8),
  engineCc:z.number().int().min(0).max(10000),
}).strict().refine(v=>v.seats<=VEHICLES[v.type].maxSeats,v=>({message:`A ${v.type.toLowerCase()} can have at most ${VEHICLES[v.type].maxSeats} seats.`}));
export const BLOOD_GROUPS=['','A+','A-','B+','B-','AB+','AB-','O+','O-'];
// Private to the rider and the leads of rides they are going on; never on the public rider card.
const emergencySchema=z.object({name:z.string().trim().max(60).default(''),phone:z.string().trim().regex(/^(\+?[0-9][0-9 -]{6,15})?$/,'Enter a valid emergency phone number.').default(''),bloodGroup:z.enum(BLOOD_GROUPS).default('')}).strict().default({});
const picks=(options,max)=>z.array(z.enum(options)).max(max).refine(a=>new Set(a).size===a.length,{message:'Choose each option once.'}).default([]);
export const profileSchema=z.object({homeCity:z.string().trim().max(80),experience:z.enum(['Beginner','Intermediate','Experienced']),bio:z.string().trim().max(500),links:linksField(PROFILE_LINKS),
  ridingSince:z.number().int().min(1950).refine(y=>y<=new Date().getUTCFullYear(),{message:'Riding since cannot be in the future.'}).nullable().default(null),
  styles:picks(RIDING_STYLES,RIDING_STYLES.length),pace:z.enum(['',...RIDING_PACES]).default(''),lookingFor:picks(LOOKING_FOR,LOOKING_FOR.length),
  regions:z.string().trim().max(200).default(''),languages:z.string().trim().max(100).default(''),emergency:emergencySchema,vehicles:z.array(vehicleSchema).max(10).refine(v=>new Set(v.map(x=>x.id)).size===v.length,{message:'Vehicle IDs must be unique.'})}).strict();
export const profileUpdateSchema=z.object({profile:profileSchema,updatedAt:z.string().datetime().nullable()}).strict();
export const emptyProfile=()=>({homeCity:'',experience:'Beginner',bio:'',links:{},ridingSince:null,styles:[],pace:'',lookingFor:[],regions:'',languages:'',emergency:{name:'',phone:'',bloodGroup:''},vehicles:[]});
// Stored profiles from before a field existed get its default.
export const withDefaults=p=>({...emptyProfile(),...p});
