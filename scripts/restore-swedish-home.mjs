import { readFileSync, writeFileSync } from "node:fs";

const home = {
  badge: "En AI-first beslutsassistent",
  hero: {
    heading: "Letar du efter ett nytt hem? Du har hittat rätt.",
    paragraph1:
      "Oavsett om du vill hyra en lägenhet, köpa ditt första hus eller hitta en plats att börja om på, hjälper Realt AI dig genom hela bostadsresan. Utforska nya möjligheter, upptäck områden som passar din livsstil och få hjälp att hitta ett boende som känns rätt för dig — inte bara på papper, utan i vardagen.",
    paragraph2:
      "Och det bästa av allt? Realt AI är helt gratis för dig som söker boende. Inga dolda avgifter, inga betalda uppgraderingar eller extra kostnader. Vi är här för att hjälpa dig hitta rätt — och det ska inte behöva kosta dig någonting.",
    cta: "Hitta mitt nästa hem",
    images: {
      apartment: "Modernt flerbostadshus mot blå himmel",
      house: "Modernt hus med garage och trädgård",
      balcony: "Lägenhetshus med balkonger i solnedgång",
      villa: "Modern villa med pool",
      townhouses: "Rad av moderna radhus",
      rowHouses: "Radhus med trä- och plåtfasad",
    },
  },
  about: {
    heading: "Om oss",
    p1: "Realt AI är ett AI-drivet bostadsintelligensbolag som skapats för att förändra hur människor upptäcker, utvärderar och väljer sitt nästa hem.",
    p2: "Från början skapat för att hjälpa studenter och unga vuxna att hitta bostäder som passar deras ekonomi, utbildning och livsstil insåg vi att de här utmaningarna finns på hela bostadsmarknaden.",
    p3: "Vår plattform använder AI för att förstå individuella behov, analysera bostadsmöjligheter och koppla ihop människor med relevanta bostadsaktörer, bland annat mäklarbyråer, fastighetsbolag och bostadsplattformar.",
    p4: "Vi är en gratis B2B2C Agentic SaaS (Software as a Service). Vår tjänst är och förblir 100 % gratis för användarna. Vi tjänar pengar genom affärspartnerskap och företag som vill ha relevant synlighet, aldrig genom att ta betalt av människor för att hitta ett hem.",
    p5: "Vår vision är global: att göra smartare bostadsbeslut tillgängliga för alla, överallt.",
    tagline: "Realt AI — Ett smartare sätt att hitta dit du hör hemma.",
  },
  countdown: {
    eyebrow: "Lansering",
    heading: "Lansering 1 februari 2027 kl. 10:00",
    sweden: "Vi börjar i Sverige.",
    days: "dagar",
    hours: "timmar",
    minutes: "minuter",
    seconds: "sekunder",
    launched: "Realt AI är lanserat.",
    waitlist: {
      heading: "Gå med i väntelistan",
      description: "Fyll i din e-postadress så skickar vi ett meddelande när Realt AI lanseras.",
      placeholder: "Din e-postadress",
      button: "Gå med",
      sending: "Går med…",
      success: "Du står på listan. Vi mejlar dig när Realt AI lanseras.",
      invalid: "Ange en giltig e-postadress.",
      error: "Något gick fel. Försök igen.",
      consent: "Vi använder bara din e-postadress för att berätta om lanseringen.",
    },
  },
  how: {
    heading: "Hur fungerar Realt AI?",
    subheading:
      "De flesta söktjänster visar bostäder. Realt AI börjar med dig: den lär sig vad som är viktigt, väger det ärligt och förklarar varje rekommendation.",
    steps: {
      describe: {
        title: "Förstår dig med vanliga ord",
        description:
          "Skriv som du pratar. Realt AI läser av budget, pendling, yta, livsstil och dealbreakers i dina egna ord och gör om dem till en strukturerad profil.",
      },
      weights: {
        title: "Lär sig vad som väger tyngst",
        description:
          "Alla önskemål väger inte lika. Dina prioriteringar blir vikter, så att det du bryr dig mest om styr resultatet.",
      },
      conflicts: {
        title: "Ser konflikter före dig",
        description:
          "När två önskemål drar åt olika håll berättar Realt AI det direkt och hjälper dig välja, i stället för att låtsas att du kan få allt.",
      },
      score: {
        title: "Poängsätter varje bostad, öppet",
        description:
          "Varje bostad får ett matchningsbetyg byggt på dina viktade prioriteringar, med skälen för och emot, så det finns inga svarta lådor.",
      },
      connect: {
        title: "Kopplar dig till rätt aktörer",
        description:
          "Relevanta bostäder kommer från mäklarbyråer, fastighetsbolag och bostadsplattformar som passar din profil.",
      },
      free: {
        title: "Gratis för dig, alltid",
        description:
          "Att söka med Realt AI kostar ingenting. Vi tjänar pengar på affärspartnerskap, aldrig på människor som söker bostad.",
      },
    },
    visual: {
      message: "Vi är två, en trea i Stockholm, under 4 miljoner kr, max 30 minuter till jobbet, lugnt område.",
      chipBudget: "Budget ≤ 4 000 000 kr",
      chipCommute: "Pendling ≤ 30 min",
      chipSpace: "3 rum",
      chipLifestyle: "Lugnt område",
      weightBudget: "Budget",
      weightCommute: "Pendling",
      weightSpace: "Yta",
      conflictTitle: "Prioritetskonflikt",
      conflictA: "Lugnt område",
      conflictB: "Livlig innerstad",
      conflictHint: "De här drar ofta åt olika håll. Vilket är viktigast?",
      score: "Matchning 87 %",
      reasonBudget: "Passar din budget",
      reasonCommute: "24 min till jobbet",
      reasonTradeoff: "Ingen parkering ingår",
      agencies: "Mäklarbyråer",
      companies: "Fastighetsbolag",
      platforms: "Bostadsplattformar",
      free: "för dig som söker bostad",
      freeBig: "100 % gratis",
      caption: "Illustrativt exempel.",
    },
  },
  features: {
    heading: "Våra viktigaste funktioner",
    more: "Klicka för att se mer",
    less: "Visa mindre",
    caption: "Illustrativa exempel.",
    analysis: {
      title: "Personlig AI-analys",
      subtitle: "Bostadsbeslut, byggda kring dig.",
      p1: "Realt AI analyserar dina individuella behov, din budget, livsstil och personliga prioriteringar för att hjälpa dig hitta bostäder som verkligen passar ditt liv. Genom en intelligent, samtalsbaserad analys lär sig Realt AI vad som är viktigast för dig — från läge och ekonomi till yta, komfort och vardagsbekvämlighet.",
      p2: "Utöver att förstå dina önskemål hjälper Realt AI dig att se möjliga kompromisser, motstridiga prioriteringar och faktorer du kanske inte har tänkt på. Genom att göra komplexa bostadskrav till tydliga insikter hjälper vi dig att förstå dina alternativ, fatta välgrundade beslut och känna dig tryggare under hela din bostadsresa.",
    },
    area: {
      title: "Områdesutforskning",
      subtitle: "Upptäck livet runt ditt nästa hem.",
      p1: "Att hitta rätt hem handlar om mer än själva bostaden. Området runt omkring spelar en lika viktig roll för din vardag. Med områdesutforskning hjälper Realt AI dig att upptäcka hur det faktiskt skulle vara att bo på en viss plats.",
      p2: "Utforska närliggande restauranger, gym, matbutiker, parker, kollektivtrafik och annan viktig service direkt på en interaktiv karta. Förstå avstånd, hitta användbara platser och få en bredare bild av området innan du bestämmer dig.",
      p3: "Genom att ta med omgivningen i din bostadssökning hjälper Realt AI dig att bedöma inte bara var du skulle kunna bo, utan också hur väl platsen passar din livsstil, dina rutiner och dina dagliga behov.",
    },
    matching: {
      title: "Smartare bostadsmatchning",
      subtitle: "Mindre letande. Mer meningsfulla träffar.",
      p1: "Realt AI går längre än traditionella bostadsfilter genom att utvärdera bostäder utifrån dina individuella behov, önskemål och prioriteringar. I stället för att bara visa annonser som matchar ett antal sökkriterier analyserar vår AI hur väl varje bostad passar det sätt du vill leva på.",
      p2: "Varje rekommendation är utformad för att hjälpa dig förstå varför en bostad kan passa dig, med relevanta fördelar, möjliga nackdelar och viktiga faktorer att tänka på. Du kan jämföra olika alternativ utifrån det som är viktigast för dig, i stället för att drunkna i oändliga annonser.",
      p3: "Resultatet är en mer fokuserad och intelligent bostadssökning där varje rekommendation har ett syfte — så att du lägger mindre tid på att leta och mer tid på att hitta en plats som verkligen känns rätt.",
    },
    visual: {
      chatTitle: "Realt AI",
      question: "Vad är viktigast för dig?",
      chipLocation: "Läge",
      chipPrice: "Pris",
      chipSpace: "Yta",
      chipSafety: "Trygghet",
      userMessage: "Ett lugnt område, nära stan och ett gym.",
      reply: "Uppfattat. Utifrån dina önskemål fokuserar vi på moderna lägenheter i lugna områden nära centrum.",
      work: "Jobb",
      gym: "Gym",
      friends: "Vänner",
      minutes: "min",
      match: "96 % match",
      address: "Storgatan 24",
      city: "Malmö",
      price: "4 250 000 kr",
      size: "72 m²",
    },
  },
  steps: {
    eyebrow: "Kom igång i 8 steg",
    s1: { title: "Skapa ditt konto", description: "Registrera dig på en stund för att spara dina sökningar och fortsätta där du slutade." },
    s2: { title: "Svara på grunderna", description: "Realt AI frågar först var du vill bo och sedan om du vill hyra eller köpa." },
    s3: { title: "Gå djupare", description: "Realt AI ställer fler frågor, även om sådant du inte trodde skulle spela roll." },
    s4: { title: "Dina svar analyseras", description: "Realt AI går igenom allt du sagt och gör om det till en tydlig bild av dina prioriteringar." },
    s5: { title: "Konflikter upptäcks", description: "Om två önskemål drar åt olika håll får du veta det direkt." },
    s6: { title: "Varje bostad poängsätts", description: "Varje bostad får ett öppet matchningsbetyg, med skälen för och emot." },
    s7: { title: "Rätt aktörer kopplas in", description: "Relevanta bostäder kommer från mäklarbyråer, fastighetsbolag och bostadsplattformar." },
    s8: {
      title: "Öppna dina tre bästa träffar",
      description:
        "Gå in i fönstret med dina alternativ och vidare till annonssidan, där du hittar hyresvärdar, mäklare och andra bostadsaktörer.",
    },
  },
  finalCta: {
    heading: "Så vad väntar du på? Hitta ditt drömboende.",
    paragraph1:
      "Det tar bara några minuter att berätta för Realt AI vad som är viktigt för dig. Skriv med egna ord, svara på ett par snabba frågor och se hur dina prioriteringar formar de bostäder som passar dig bäst.",
    paragraph2:
      "Och återigen: Realt AI är helt gratis för dig som söker bostad. Inga dolda avgifter, inga betalda uppgraderingar, ingen hake. Det finns ingen bra anledning att låta bli att prova. Det värsta som kan hända är att du förstår dina egna prioriteringar lite bättre, och det bästa är att du hittar platsen där du hör hemma.",
    button: "Kom igång",
  },
  contact: {
    heading: "Kontakta oss",
    description: "Frågor, idéer eller vill du testa Realt AI tidigt? Skriv till oss.",
    subject: "Hej Realt AI",
    business:
      "Är du mäklare, hyresvärd eller företag och vill veta mer? Skriv till oss, så berättar vi hur ett samarbete kan se ut.",
  },
};

// Make sure Swedish has exactly the same keys as English.
function paths(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? paths(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}
const en = JSON.parse(readFileSync("messages/en.json", "utf8"));
const enPaths = new Set(paths(en.home));
const svPaths = new Set(paths(home));
const missing = [...enPaths].filter((p) => !svPaths.has(p));
const extra = [...svPaths].filter((p) => !enPaths.has(p));
if (missing.length || extra.length) {
  console.error("Key mismatch", { missing, extra });
  process.exit(1);
}

const svPath = "messages/sv.json";
const sv = JSON.parse(readFileSync(svPath, "utf8"));
sv.home = home;
sv.footer = {
  ...sv.footer,
  contactHeading: "Kontakt",
  followHeading: "Följ oss",
  instagram: "Instagram",
  tiktok: "TikTok",
};
writeFileSync(svPath, JSON.stringify(sv, null, 2) + "\n");
console.log("ok");
