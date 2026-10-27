export function estimate({distance,days,people,vehicle,stay,fuelPrice=105,mileage=vehicle==='Bike'?32:14,seats=vehicle==='Bike'?1:4,vehicleCount=Math.ceil(people/seats)}) {
  const values=[distance,days,people,fuelPrice,mileage,seats,vehicleCount];
  if(values.some(x=>!Number.isFinite(x)||x<=0)||distance>20000||days>60||people>30||!Number.isInteger(days)||!Number.isInteger(people)||mileage>200||seats>8||(vehicle==='Bike'&&seats>2)||!Number.isInteger(seats)||!Number.isInteger(vehicleCount)||vehicleCount<Math.ceil(people/seats)||vehicleCount>30||!['Bike','Car'].includes(vehicle)||!['Budget','Comfort','Premium'].includes(stay)) throw new Error('Use a distance up to 20,000 km, 1–60 days, and 1–30 travelers.');
  const vehicles=vehicleCount;
  const fuel=Math.round(distance/mileage*fuelPrice*vehicles);
  const accommodation=Math.round((days-1)*({Budget:900,Comfort:1800,Premium:3500}[stay])*Math.ceil(people/2));
  const food=days*people*650;
  const extras=Math.round(distance*(vehicle==='Car'?1.6:.3)*vehicles+days*people*200);
  const contingency=Math.round((fuel+accommodation+food+extras)*.15);
  const total=fuel+accommodation+food+extras+contingency;
  return {fuel,accommodation,food,extras,contingency,total,perPerson:Math.ceil(total/people),vehicles};
}
export const credibility=g=>Math.round(g.profile*.25+g.completion*.45+g.reviews*.30);
export const matches=(trip,{query='',vehicle='All',season='All'})=>(!query||`${trip.title} ${trip.location} ${trip.route}`.toLowerCase().includes(query.toLowerCase().trim()))&&(vehicle==='All'||trip.vehicle===vehicle)&&(season==='All'||trip.seasons.includes(season));
