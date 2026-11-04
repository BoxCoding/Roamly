import assert from 'node:assert/strict';
const SystemDate=Date;
function setClock(time){
  globalThis.Date=class extends SystemDate {
    constructor(...args){super(...(args.length?args:[time]));}
    static now(){return time;}
  };
}
try{
  // Workers can initialize modules with an epoch clock before a request arrives.
  setClock(0);
  const {profileSchema,emptyProfile}=await import('./lib/profile-schema.mjs?startup-clock-regression');
  const vehicle={id:crypto.randomUUID(),type:'Bike',make:'Royal Enfield',model:'Meteor 350',year:2026,fuel:'Petrol',mileage:32,seats:2,engineCc:350};
  const validate=year=>profileSchema.safeParse({...emptyProfile(),vehicles:[{...vehicle,year}]});
  setClock(SystemDate.UTC(2026,10,4));
  assert(validate(2026).success,'A 2026 Meteor 350 must be accepted after epoch-time module initialization.');
  assert(validate(2027).success,'Next model year must be accepted.');
  assert(!validate(2028).success,'Years beyond next year must still be rejected.');
  assert(!validate(1979).success,'The minimum model year must still be enforced.');
  assert(!validate(2026.5).success,'A model year must be an integer.');
  setClock(SystemDate.UTC(2027,0,1));
  assert(validate(2028).success,'The same loaded schema must use the current request year.');
  console.log('Profile-year regression passed: epoch startup, current/next year, invalid years, and year rollover.');
}finally{globalThis.Date=SystemDate;}
