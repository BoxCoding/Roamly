// Curated planning ideas. Distances, time allowances and budgets are estimates, not live route or availability data.
export const trips=[
  {
    "id": "spiti",
    "title": "The Spiti Valley expedition",
    "location": "Himachal Pradesh",
    "route": "Manali → Kaza → Chandratal",
    "vehicle": "Bike",
    "days": 7,
    "km": 650,
    "seasons": [
      "Monsoon"
    ],
    "level": "Challenging",
    "tag": "THE HIGH-ALTITUDE ESCAPE",
    "desc": "An unforgettable loop through stark mountain valleys, centuries-old monasteries, and roads that make you feel very small. Acclimatization is part of the journey.",
    "months": [
      5,
      6,
      7,
      8
    ],
    "risk": "High altitude and remote roads. Build in acclimatization days, carry fuel, and check local road openings before departure.",
    "places": [
      {
        "id": "spiti-p0",
        "name": "Hadimba Temple, Manali",
        "minutes": 90,
        "area": "Manali",
        "stayArea": "Manali"
      },
      {
        "id": "spiti-p1",
        "name": "Key Monastery, Kaza",
        "minutes": 120,
        "area": "Kaza",
        "stayArea": "Kaza"
      },
      {
        "id": "spiti-p2",
        "name": "Chandratal Lake",
        "minutes": 90,
        "area": "Kaza — Chandratal excursion",
        "stayArea": "Kaza"
      }
    ],
    "stops": [
      {
        "name": "Manali",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Kaza",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      }
    ],
    "stays": [
      {
        "area": "Manali",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "Kaza",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      }
    ],
    "source": "https://www.incredibleindia.gov.in/en/himachal-pradesh/spiti-valley",
    "cover": {
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d0/Key_Monastery_-_Spiti_-Himachal_Pradesh_MG_6796.jpg/1280px-Key_Monastery_-_Spiti_-Himachal_Pradesh_MG_6796.jpg",
      "credit": "Photo: Prasad Gaude · CC BY-SA 4.0 · Wikimedia Commons",
      "page": "https://commons.wikimedia.org/wiki/File:Key_Monastery_-_Spiti_-Himachal_Pradesh_MG_6796.jpg"
    }
  },
  {
    "id": "coorg",
    "title": "Coffee trails & Coorg mornings",
    "location": "Karnataka",
    "route": "Bengaluru → Mysuru → Coorg",
    "vehicle": "Car",
    "days": 3,
    "km": 540,
    "seasons": [
      "Autumn",
      "Winter"
    ],
    "level": "Easy going",
    "tag": "THE WEEKEND RESET",
    "desc": "Trade city traffic for misty plantations, slow breakfasts, and winding forest roads. A relaxed escape with time to stop whenever the view deserves it.",
    "months": [
      9,
      10,
      11,
      0,
      1
    ],
    "risk": "Forest stretches can be foggy. Avoid night driving and respect wildlife crossings; heavy rainfall can affect access.",
    "places": [
      {
        "id": "coorg-p0",
        "name": "Mysuru Palace",
        "minutes": 90,
        "area": "Mysuru",
        "stayArea": "Mysuru"
      },
      {
        "id": "coorg-p1",
        "name": "Abbey Falls, Madikeri",
        "minutes": 120,
        "area": "Madikeri",
        "stayArea": "Madikeri"
      },
      {
        "id": "coorg-p2",
        "name": "Raja’s Seat, Madikeri",
        "minutes": 90,
        "area": "Madikeri",
        "stayArea": "Madikeri"
      }
    ],
    "stops": [
      {
        "name": "Mysuru",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Madikeri",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      }
    ],
    "stays": [
      {
        "area": "Madikeri",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "Kushalnagar",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "Mysuru",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      }
    ],
    "source": "https://www.incredibleindia.gov.in/en/karnataka/coorg",
    "cover": {
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/Paddy_Hills_Inakanahalli_Coorg_Nov24_A7CR_04454.jpg/1280px-Paddy_Hills_Inakanahalli_Coorg_Nov24_A7CR_04454.jpg",
      "credit": "Photo: Timothy A. Gonsalves · CC BY-SA 4.0 · Wikimedia Commons",
      "page": "https://commons.wikimedia.org/wiki/File:Paddy_Hills_Inakanahalli_Coorg_Nov24_A7CR_04454.jpg"
    }
  },
  {
    "id": "konkan",
    "title": "Chasing the Konkan coastline",
    "location": "Maharashtra",
    "route": "Mumbai → Ratnagiri → Goa",
    "vehicle": "Bike",
    "days": 5,
    "km": 720,
    "seasons": [
      "Autumn",
      "Winter"
    ],
    "level": "Moderate",
    "tag": "SALT IN THE AIR",
    "desc": "Ocean detours, quiet coastal villages, and golden evenings. Follow the Konkan coast at a pace that leaves room for one more beach.",
    "months": [
      10,
      11,
      0,
      1
    ],
    "risk": "Narrow coastal roads and limited lighting. Ride in daylight; monsoon flooding and slippery surfaces can change the route.",
    "places": [
      {
        "id": "konkan-p0",
        "name": "Ganpatipule Beach",
        "minutes": 90,
        "area": "Ganpatipule / Ratnagiri",
        "stayArea": "Ratnagiri"
      },
      {
        "id": "konkan-p1",
        "name": "Ratnagiri Fort",
        "minutes": 120,
        "area": "Ratnagiri",
        "stayArea": "Ratnagiri"
      },
      {
        "id": "konkan-p2",
        "name": "Fort Aguada, Goa",
        "minutes": 90,
        "area": "Panaji",
        "stayArea": "Panaji"
      }
    ],
    "stops": [
      {
        "name": "Chiplun",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Ratnagiri",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Sawantwadi",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      }
    ],
    "stays": [
      {
        "area": "Ratnagiri",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "Panaji",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      }
    ],
    "source": "https://www.incredibleindia.gov.in/en/goa",
    "cover": {
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/GANPATIPULE_BEACH_%281%29.jpg/1280px-GANPATIPULE_BEACH_%281%29.jpg",
      "credit": "Photo: Sanjaybhagwat · CC BY-SA 4.0 · Wikimedia Commons",
      "page": "https://commons.wikimedia.org/wiki/File:GANPATIPULE_BEACH_(1).jpg"
    }
  },
  {
    "id": "rajasthan",
    "title": "Fort roads & desert sunsets",
    "location": "Rajasthan",
    "route": "Jaipur → Jodhpur → Jaisalmer",
    "vehicle": "Car",
    "days": 6,
    "km": 900,
    "seasons": [
      "Autumn",
      "Winter"
    ],
    "level": "Moderate",
    "tag": "THE DESERT CHAPTER",
    "desc": "A warm winter route through sandstone forts, open desert highways, and cities full of color.",
    "months": [
      10,
      11,
      0,
      1
    ],
    "risk": "Long distances between stops. Carry water and avoid midday heat; check visibility during winter fog.",
    "places": [
      {
        "id": "rajasthan-p0",
        "name": "Amber Fort, Jaipur",
        "minutes": 90,
        "area": "Jaipur",
        "stayArea": "Jaipur"
      },
      {
        "id": "rajasthan-p1",
        "name": "Mehrangarh Fort, Jodhpur",
        "minutes": 120,
        "area": "Jodhpur",
        "stayArea": "Jodhpur"
      },
      {
        "id": "rajasthan-p2",
        "name": "Jaisalmer Fort",
        "minutes": 90,
        "area": "Jaisalmer",
        "stayArea": "Jaisalmer"
      }
    ],
    "stops": [
      {
        "name": "Ajmer",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Jodhpur",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Pokhran",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      }
    ],
    "stays": [
      {
        "area": "Jaipur",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "Jodhpur",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "Jaisalmer",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      }
    ],
    "source": "https://www.incredibleindia.gov.in/en/rajasthan",
    "cover": {
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/Jaisalmer_forteresse.jpg/1280px-Jaisalmer_forteresse.jpg",
      "credit": "Photo: Gérard Janot · CC BY-SA 3.0 · Wikimedia Commons",
      "page": "https://commons.wikimedia.org/wiki/File:Jaisalmer_forteresse.jpg"
    }
  },
  {
    "id": "ladakh",
    "title": "The Ladakh monastery loop",
    "location": "Ladakh",
    "route": "Leh → Hemis → Leh",
    "vehicle": "Bike",
    "days": 5,
    "km": 220,
    "months": [
      5,
      6,
      7,
      8
    ],
    "level": "Challenging",
    "tag": "YOUR NEXT CHAPTER",
    "desc": "An independent road-trip idea through Ladakh, with time for local sights, breaks and unhurried evenings.",
    "risk": "Allow acclimatization before riding; remote high-altitude roads and cold weather require local advice.",
    "places": [
      {
        "id": "ladakh-p0",
        "name": "Leh Palace",
        "minutes": 90,
        "area": "Leh",
        "stayArea": "Leh"
      },
      {
        "id": "ladakh-p1",
        "name": "Shanti Stupa, Leh",
        "minutes": 120,
        "area": "Leh",
        "stayArea": "Leh"
      },
      {
        "id": "ladakh-p2",
        "name": "Hemis Monastery",
        "minutes": 90,
        "area": "Leh — Hemis excursion",
        "stayArea": "Leh"
      }
    ],
    "stops": [
      {
        "name": "Leh",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Karu",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      }
    ],
    "stays": [
      {
        "area": "Leh",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      }
    ],
    "source": "https://www.incredibleindia.gov.in/en/trips/trip-listing/leh-unraveling-the-ladakhi-landscapes",
    "seasons": [
      "Monsoon"
    ],
    "cover": {
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/Hemis_Monastery_02.jpg/1280px-Hemis_Monastery_02.jpg",
      "credit": "Photo: Bernard Gagnon Canon EOS REBEL T4i · CC BY-SA 4.0 · Wikimedia Commons",
      "page": "https://commons.wikimedia.org/wiki/File:Hemis_Monastery_02.jpg"
    }
  },
  {
    "id": "rishikesh",
    "title": "Ganga-side weekend",
    "location": "Uttarakhand",
    "route": "Delhi → Haridwar → Rishikesh",
    "vehicle": "Car",
    "days": 4,
    "km": 520,
    "months": [
      1,
      2,
      3,
      9,
      10
    ],
    "level": "Moderate",
    "tag": "YOUR NEXT CHAPTER",
    "desc": "An independent road-trip idea through Uttarakhand, with time for local sights, breaks and unhurried evenings.",
    "risk": "River activities need authorized operators. Check congestion, weather and hill-road access locally.",
    "places": [
      {
        "id": "rishikesh-p0",
        "name": "Har Ki Pauri, Haridwar",
        "minutes": 90,
        "area": "Haridwar",
        "stayArea": "Haridwar"
      },
      {
        "id": "rishikesh-p1",
        "name": "Beatles Ashram, Rishikesh",
        "minutes": 120,
        "area": "Rishikesh",
        "stayArea": "Rishikesh"
      },
      {
        "id": "rishikesh-p2",
        "name": "Triveni Ghat, Rishikesh",
        "minutes": 90,
        "area": "Rishikesh",
        "stayArea": "Rishikesh"
      }
    ],
    "stops": [
      {
        "name": "Meerut",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Haridwar",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      }
    ],
    "stays": [
      {
        "area": "Haridwar",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "Rishikesh",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      }
    ],
    "source": "https://www.incredibleindia.gov.in/en/trips/trip-listing/rishikesh-rendezvous",
    "seasons": [
      "Winter",
      "Summer",
      "Autumn"
    ],
    "cover": {
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/63/Lakshman_Jhula_Bridge_-_Hrishikesh_-_Uttarakhand_001.jpg/1280px-Lakshman_Jhula_Bridge_-_Hrishikesh_-_Uttarakhand_001.jpg",
      "credit": "Photo: Snehrashmi · CC BY-SA 4.0 · Wikimedia Commons",
      "page": "https://commons.wikimedia.org/wiki/File:Lakshman_Jhula_Bridge_-_Hrishikesh_-_Uttarakhand_001.jpg"
    }
  },
  {
    "id": "meghalaya",
    "title": "Cloud country calling",
    "location": "Meghalaya",
    "route": "Guwahati → Shillong → Cherrapunji → Dawki",
    "vehicle": "Car",
    "days": 6,
    "km": 460,
    "months": [
      0,
      1,
      2,
      9,
      10,
      11
    ],
    "level": "Moderate",
    "tag": "YOUR NEXT CHAPTER",
    "desc": "An independent road-trip idea through Meghalaya, with time for local sights, breaks and unhurried evenings.",
    "risk": "Heavy rain can affect visibility and access. Keep daylight buffers and confirm road conditions.",
    "places": [
      {
        "id": "meghalaya-p0",
        "name": "Umiam Lake",
        "minutes": 90,
        "area": "Shillong / Umiam",
        "stayArea": "Shillong"
      },
      {
        "id": "meghalaya-p1",
        "name": "Elephant Falls, Shillong",
        "minutes": 120,
        "area": "Shillong",
        "stayArea": "Shillong"
      },
      {
        "id": "meghalaya-p2",
        "name": "Umngot River, Dawki",
        "minutes": 90,
        "area": "Dawki",
        "stayArea": "Dawki"
      }
    ],
    "stops": [
      {
        "name": "Nongpoh",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Shillong",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Cherrapunji",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      }
    ],
    "stays": [
      {
        "area": "Shillong",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "Cherrapunji",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "Dawki",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      }
    ],
    "source": "https://www.incredibleindia.gov.in/en/trips/trip-listing/the-northeast-green-triangle",
    "seasons": [
      "Winter",
      "Summer",
      "Autumn"
    ],
    "cover": {
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/Dawki_Bridge_and_Umngot_River.jpg/1280px-Dawki_Bridge_and_Umngot_River.jpg",
      "credit": "Photo: ANKAN · CC BY-SA 4.0 · Wikimedia Commons",
      "page": "https://commons.wikimedia.org/wiki/File:Dawki_Bridge_and_Umngot_River.jpg"
    }
  },
  {
    "id": "sikkim",
    "title": "Sikkim’s slower roads",
    "location": "Sikkim",
    "route": "Siliguri → Gangtok → Ravangla",
    "vehicle": "Bike",
    "days": 6,
    "km": 330,
    "months": [
      2,
      3,
      4,
      9,
      10
    ],
    "level": "Challenging",
    "tag": "YOUR NEXT CHAPTER",
    "desc": "An independent road-trip idea through Sikkim, with time for local sights, breaks and unhurried evenings.",
    "risk": "Mountain weather and landslides can alter routes. Check local access and any applicable permits.",
    "places": [
      {
        "id": "sikkim-p0",
        "name": "Namgyal Institute of Tibetology, Gangtok",
        "minutes": 90,
        "area": "Gangtok",
        "stayArea": "Gangtok"
      },
      {
        "id": "sikkim-p1",
        "name": "Rumtek Monastery",
        "minutes": 120,
        "area": "Gangtok — Rumtek excursion",
        "stayArea": "Gangtok"
      },
      {
        "id": "sikkim-p2",
        "name": "Buddha Park, Ravangla",
        "minutes": 90,
        "area": "Ravangla",
        "stayArea": "Ravangla"
      }
    ],
    "stops": [
      {
        "name": "Rangpo",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Gangtok",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      }
    ],
    "stays": [
      {
        "area": "Gangtok",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "Ravangla",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      }
    ],
    "source": "https://www.incredibleindia.gov.in/en/trips/trip-listing/small-but-beautiful",
    "seasons": [
      "Summer",
      "Autumn"
    ],
    "cover": {
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e2/Kanchenjunga_range_viewed_from_Hanuman_Tok_temple%2C_Gangtok%2C_Sikkim%2C_India.jpg/1280px-Kanchenjunga_range_viewed_from_Hanuman_Tok_temple%2C_Gangtok%2C_Sikkim%2C_India.jpg",
      "credit": "Photo: Dinesh Valke from Thane, India Derivative work: UnpetitproleX · CC BY-SA 2.0 · Wikimedia Commons",
      "page": "https://commons.wikimedia.org/wiki/File:Kanchenjunga_range_viewed_from_Hanuman_Tok_temple,_Gangtok,_Sikkim,_India.jpg"
    }
  },
  {
    "id": "hampi",
    "title": "Boulders, ruins & big skies",
    "location": "Karnataka",
    "route": "Bengaluru → Chitradurga → Hampi",
    "vehicle": "Bike",
    "days": 4,
    "km": 740,
    "months": [
      0,
      1,
      9,
      10,
      11
    ],
    "level": "Moderate",
    "tag": "YOUR NEXT CHAPTER",
    "desc": "An independent road-trip idea through Karnataka, with time for local sights, breaks and unhurried evenings.",
    "risk": "Start early for heat management. Check monument entry and parking arrangements.",
    "places": [
      {
        "id": "hampi-p0",
        "name": "Chitradurga Fort",
        "minutes": 90,
        "area": "Chitradurga",
        "stayArea": "Chitradurga"
      },
      {
        "id": "hampi-p1",
        "name": "Virupaksha Temple, Hampi",
        "minutes": 120,
        "area": "Hampi",
        "stayArea": "Hosapete"
      },
      {
        "id": "hampi-p2",
        "name": "Vijaya Vittala Temple, Hampi",
        "minutes": 90,
        "area": "Hampi",
        "stayArea": "Hosapete"
      }
    ],
    "stops": [
      {
        "name": "Chitradurga",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Hosapete",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      }
    ],
    "stays": [
      {
        "area": "Hosapete",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "Hampi",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "Chitradurga",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      }
    ],
    "source": "https://karnatakatourism.org/en/attractions/virupaksha-temple/",
    "seasons": [
      "Winter",
      "Autumn"
    ],
    "cover": {
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Complex_of_Virupaksha_Temple%2C_Hampi_%2804%29.jpg/1280px-Complex_of_Virupaksha_Temple%2C_Hampi_%2804%29.jpg",
      "credit": "Photo: iMahesh · CC BY-SA 4.0 · Wikimedia Commons",
      "page": "https://commons.wikimedia.org/wiki/File:Complex_of_Virupaksha_Temple,_Hampi_(04).jpg"
    }
  },
  {
    "id": "wayanad",
    "title": "The Wayanad forest escape",
    "location": "Kerala",
    "route": "Kozhikode → Vythiri → Kalpetta",
    "vehicle": "Car",
    "days": 3,
    "km": 220,
    "months": [
      0,
      1,
      2,
      9,
      10,
      11
    ],
    "level": "Moderate",
    "tag": "YOUR NEXT CHAPTER",
    "desc": "An independent road-trip idea through Kerala, with time for local sights, breaks and unhurried evenings.",
    "risk": "Ghat bends, fog and seasonal rain need slower travel. Respect forest restrictions and wildlife.",
    "places": [
      {
        "id": "wayanad-p0",
        "name": "Lakkidi View Point",
        "minutes": 90,
        "area": "Vythiri",
        "stayArea": "Vythiri"
      },
      {
        "id": "wayanad-p1",
        "name": "Pookode Lake",
        "minutes": 120,
        "area": "Vythiri",
        "stayArea": "Vythiri"
      },
      {
        "id": "wayanad-p2",
        "name": "Edakkal Caves",
        "minutes": 90,
        "area": "Kalpetta — Edakkal excursion",
        "stayArea": "Kalpetta"
      }
    ],
    "stops": [
      {
        "name": "Thamarassery",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Vythiri",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      }
    ],
    "stays": [
      {
        "area": "Vythiri",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "Kalpetta",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      }
    ],
    "source": "https://www.keralatourism.org/",
    "seasons": [
      "Winter",
      "Summer",
      "Autumn"
    ],
    "cover": {
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/Banasura_hills_from_View_Point_Wayanad_Resort%2C_Pulinjal_%2845%29.jpg/1280px-Banasura_hills_from_View_Point_Wayanad_Resort%2C_Pulinjal_%2845%29.jpg",
      "credit": "Photo: Vinayaraj · CC BY-SA 4.0 · Wikimedia Commons",
      "page": "https://commons.wikimedia.org/wiki/File:Banasura_hills_from_View_Point_Wayanad_Resort,_Pulinjal_(45).jpg"
    }
  },
  {
    "id": "munnar",
    "title": "Tea country detour",
    "location": "Kerala",
    "route": "Kochi → Munnar → Mattupetty",
    "vehicle": "Car",
    "days": 4,
    "km": 320,
    "months": [
      0,
      1,
      2,
      9,
      10,
      11
    ],
    "level": "Moderate",
    "tag": "YOUR NEXT CHAPTER",
    "desc": "An independent road-trip idea through Kerala, with time for local sights, breaks and unhurried evenings.",
    "risk": "Hill roads can be foggy. Confirm park opening, advance-entry requirements and rain advisories.",
    "places": [
      {
        "id": "munnar-p0",
        "name": "Munnar Tea Museum",
        "minutes": 90,
        "area": "Munnar",
        "stayArea": "Munnar"
      },
      {
        "id": "munnar-p1",
        "name": "Eravikulam National Park",
        "minutes": 120,
        "area": "Munnar — park excursion",
        "stayArea": "Munnar"
      },
      {
        "id": "munnar-p2",
        "name": "Mattupetty Dam",
        "minutes": 90,
        "area": "Munnar — Mattupetty excursion",
        "stayArea": "Munnar"
      }
    ],
    "stops": [
      {
        "name": "Kothamangalam",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Adimali",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      }
    ],
    "stays": [
      {
        "area": "Munnar",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "Chithirapuram",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      }
    ],
    "source": "https://www.keralatourism.org/destination/munnar/202/",
    "seasons": [
      "Winter",
      "Summer",
      "Autumn"
    ],
    "cover": {
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/94/Munnar_Tea_Plantations-WUS07343-Pano.jpg/1280px-Munnar_Tea_Plantations-WUS07343-Pano.jpg",
      "credit": "Photo: Rainer Halama · CC BY-SA 4.0 · Wikimedia Commons",
      "page": "https://commons.wikimedia.org/wiki/File:Munnar_Tea_Plantations-WUS07343-Pano.jpg"
    }
  },
  {
    "id": "ooty",
    "title": "Nilgiri blue-mountain run",
    "location": "Tamil Nadu",
    "route": "Coimbatore → Coonoor → Ooty",
    "vehicle": "Bike",
    "days": 3,
    "km": 200,
    "months": [
      0,
      1,
      2,
      3,
      4,
      8,
      9,
      10,
      11
    ],
    "level": "Challenging",
    "tag": "YOUR NEXT CHAPTER",
    "desc": "An independent road-trip idea through Tamil Nadu, with time for local sights, breaks and unhurried evenings.",
    "risk": "Steep bends require vehicle checks. Confirm any current e-pass and traffic restrictions before travel.",
    "places": [
      {
        "id": "ooty-p0",
        "name": "Sim’s Park, Coonoor",
        "minutes": 90,
        "area": "Coonoor",
        "stayArea": "Coonoor"
      },
      {
        "id": "ooty-p1",
        "name": "Government Botanical Garden, Ooty",
        "minutes": 120,
        "area": "Ooty",
        "stayArea": "Ooty"
      },
      {
        "id": "ooty-p2",
        "name": "Doddabetta Peak",
        "minutes": 90,
        "area": "Ooty",
        "stayArea": "Ooty"
      }
    ],
    "stops": [
      {
        "name": "Mettupalayam",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Coonoor",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      }
    ],
    "stays": [
      {
        "area": "Coonoor",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "Ooty",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      }
    ],
    "source": "https://www.tourism.tn.gov.in/destinations/ooty",
    "seasons": [
      "Winter",
      "Summer",
      "Monsoon",
      "Autumn"
    ],
    "cover": {
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/Nilgiri_Mountain_Railway_on_Bridge%2C_May_2010.JPG/1280px-Nilgiri_Mountain_Railway_on_Bridge%2C_May_2010.JPG",
      "credit": "Photo: Stephan Niewolik · CC BY 3.0 · Wikimedia Commons",
      "page": "https://commons.wikimedia.org/wiki/File:Nilgiri_Mountain_Railway_on_Bridge,_May_2010.JPG"
    }
  },
  {
    "id": "pondy",
    "title": "East coast, easy pace",
    "location": "Tamil Nadu & Puducherry",
    "route": "Chennai → Mahabalipuram → Puducherry",
    "vehicle": "Car",
    "days": 3,
    "km": 350,
    "months": [
      0,
      1,
      2,
      10,
      11
    ],
    "level": "Easy going",
    "tag": "YOUR NEXT CHAPTER",
    "desc": "An independent road-trip idea through Tamil Nadu & Puducherry, with time for local sights, breaks and unhurried evenings.",
    "risk": "Check coastal storm forecasts and avoid riding through waterlogged stretches.",
    "places": [
      {
        "id": "pondy-p0",
        "name": "Shore Temple, Mahabalipuram",
        "minutes": 90,
        "area": "Mahabalipuram",
        "stayArea": "Mahabalipuram"
      },
      {
        "id": "pondy-p1",
        "name": "French Quarter, Puducherry",
        "minutes": 120,
        "area": "Puducherry",
        "stayArea": "White Town, Puducherry"
      },
      {
        "id": "pondy-p2",
        "name": "Promenade Beach, Puducherry",
        "minutes": 90,
        "area": "Puducherry",
        "stayArea": "White Town, Puducherry"
      }
    ],
    "stops": [
      {
        "name": "Mahabalipuram",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Marakkanam",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      }
    ],
    "stays": [
      {
        "area": "Mahabalipuram",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "White Town, Puducherry",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      }
    ],
    "source": "https://www.incredibleindia.gov.in/en/puducherry/puducherry/exploring-puducherry",
    "seasons": [
      "Winter",
      "Summer",
      "Autumn"
    ],
    "cover": {
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/Promenade_Beach_Puducherry_IMG_20180609_084012736_HDR.jpg/1280px-Promenade_Beach_Puducherry_IMG_20180609_084012736_HDR.jpg",
      "credit": "Photo: P Jeganathan · CC BY-SA 4.0 · Wikimedia Commons",
      "page": "https://commons.wikimedia.org/wiki/File:Promenade_Beach_Puducherry_IMG_20180609_084012736_HDR.jpg"
    }
  },
  {
    "id": "kutch",
    "title": "White desert, wide horizons",
    "location": "Gujarat",
    "route": "Ahmedabad → Bhuj → Dhordo",
    "vehicle": "Car",
    "days": 5,
    "km": 1000,
    "months": [
      0,
      1,
      10,
      11
    ],
    "level": "Moderate",
    "tag": "YOUR NEXT CHAPTER",
    "desc": "An independent road-trip idea through Gujarat, with time for local sights, breaks and unhurried evenings.",
    "risk": "Long remote stretches need water and fuel planning. Verify permits and salt-desert access.",
    "places": [
      {
        "id": "kutch-p0",
        "name": "Aina Mahal, Bhuj",
        "minutes": 90,
        "area": "Bhuj",
        "stayArea": "Bhuj"
      },
      {
        "id": "kutch-p1",
        "name": "Great Rann of Kutch",
        "minutes": 120,
        "area": "Dhordo",
        "stayArea": "Dhordo"
      },
      {
        "id": "kutch-p2",
        "name": "Kalo Dungar",
        "minutes": 90,
        "area": "Dhordo — Kalo Dungar excursion",
        "stayArea": "Dhordo"
      }
    ],
    "stops": [
      {
        "name": "Maliya",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Bhuj",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      }
    ],
    "stays": [
      {
        "area": "Bhuj",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "Dhordo",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      }
    ],
    "source": "https://www.incredibleindia.gov.in/en/gujarat/kutch",
    "seasons": [
      "Winter",
      "Autumn"
    ],
    "cover": {
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/White_salt_desert_at_Rann_of_Kutch.jpg/1280px-White_salt_desert_at_Rann_of_Kutch.jpg",
      "credit": "Photo: Prof Ranga Sai · CC BY-SA 4.0 · Wikimedia Commons",
      "page": "https://commons.wikimedia.org/wiki/File:White_salt_desert_at_Rann_of_Kutch.jpg"
    }
  },
  {
    "id": "udaipur",
    "title": "Lakes & Aravalli lanes",
    "location": "Rajasthan",
    "route": "Ahmedabad → Udaipur → Kumbhalgarh",
    "vehicle": "Bike",
    "days": 5,
    "km": 850,
    "months": [
      0,
      1,
      9,
      10,
      11
    ],
    "level": "Moderate",
    "tag": "YOUR NEXT CHAPTER",
    "desc": "An independent road-trip idea through Rajasthan, with time for local sights, breaks and unhurried evenings.",
    "risk": "Rural hill roads can be narrow. Leave daylight for the fort approach and check local closures.",
    "places": [
      {
        "id": "udaipur-p0",
        "name": "City Palace, Udaipur",
        "minutes": 90,
        "area": "Udaipur",
        "stayArea": "Udaipur"
      },
      {
        "id": "udaipur-p1",
        "name": "Lake Pichola",
        "minutes": 120,
        "area": "Udaipur",
        "stayArea": "Udaipur"
      },
      {
        "id": "udaipur-p2",
        "name": "Kumbhalgarh Fort",
        "minutes": 90,
        "area": "Kumbhalgarh",
        "stayArea": "Kumbhalgarh"
      }
    ],
    "stops": [
      {
        "name": "Himmatnagar",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Udaipur",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      }
    ],
    "stays": [
      {
        "area": "Udaipur",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "Kumbhalgarh",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      }
    ],
    "source": "https://www.incredibleindia.gov.in/en/rajasthan/udaipur",
    "seasons": [
      "Winter",
      "Autumn"
    ],
    "cover": {
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fb/20191207_Lake_Pichola%2C_Udaipur%2C_1531_7276.jpg/1280px-20191207_Lake_Pichola%2C_Udaipur%2C_1531_7276.jpg",
      "credit": "Photo: Jakub Hałun · CC BY-SA 4.0 · Wikimedia Commons",
      "page": "https://commons.wikimedia.org/wiki/File:20191207_Lake_Pichola,_Udaipur,_1531_7276.jpg"
    }
  },
  {
    "id": "goa",
    "title": "A slower side of Goa",
    "location": "Goa",
    "route": "Panaji → Old Goa → Palolem",
    "vehicle": "Bike",
    "days": 4,
    "km": 180,
    "months": [
      0,
      1,
      2,
      10,
      11
    ],
    "level": "Easy going",
    "tag": "YOUR NEXT CHAPTER",
    "desc": "An independent road-trip idea through Goa, with time for local sights, breaks and unhurried evenings.",
    "risk": "Expect narrow village roads and pedestrians. Check coastal weather and park only where permitted.",
    "places": [
      {
        "id": "goa-p0",
        "name": "Fontainhas, Panaji",
        "minutes": 90,
        "area": "Panaji",
        "stayArea": "Panaji"
      },
      {
        "id": "goa-p1",
        "name": "Basilica of Bom Jesus, Old Goa",
        "minutes": 120,
        "area": "Panaji — Old Goa excursion",
        "stayArea": "Panaji"
      },
      {
        "id": "goa-p2",
        "name": "Palolem Beach",
        "minutes": 90,
        "area": "Palolem",
        "stayArea": "Palolem"
      }
    ],
    "stops": [
      {
        "name": "Panaji",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      },
      {
        "name": "Margao",
        "purpose": "Meal, fuel/charging and rest search area; verify facilities before arrival."
      }
    ],
    "stays": [
      {
        "area": "Panaji",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      },
      {
        "area": "Palolem",
        "type": "Homestay, guesthouse or hotel",
        "min": 900,
        "max": 3500
      }
    ],
    "source": "https://www.incredibleindia.gov.in/en/goa",
    "seasons": [
      "Winter",
      "Summer",
      "Autumn"
    ],
    "cover": {
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/Rocks_on_Palolem_Beach_South_Goa.jpg/1280px-Rocks_on_Palolem_Beach_South_Goa.jpg",
      "credit": "Photo: Vachary · CC BY-SA 4.0 · Wikimedia Commons",
      "page": "https://commons.wikimedia.org/wiki/File:Rocks_on_Palolem_Beach_South_Goa.jpg"
    }
  }
];
