import { readFileSync, writeFileSync } from "node:fs";

const add = {
  sv: {
    countdown: {
      heading: "Lansering 1 februari 2027",
      days: "dagar",
      hours: "timmar",
      minutes: "minuter",
      seconds: "sekunder",
      launched: "Realt AI är lanserat.",
      note: "Vi bygger Realt AI just nu och öppnar den 1 februari.",
    },
    about: {
      heading: "Om oss",
      paragraph1:
        "Realt AI hjälper dig att välja bostad utifrån ditt liv. Du berättar med egna ord vad som är viktigt, och Realt AI visar vad som passar, vad som krockar och varför.",
      paragraph2:
        "Vi bygger Realt AI i Sverige, tillsammans med människor som kan bostadsmarknaden. Målet är att fler ska kunna välja bostad med trygghet.",
      values: {
        honest: {
          title: "Ärlighet",
          description: "Du får se avvägningarna och riskerna i förväg, och varför en bostad passar eller inte.",
        },
        together: {
          title: "Framsteg tillsammans",
          description: "Vi vill utveckla bostadsbranschen tillsammans med mäklare, hyresvärdar och andra aktörer.",
        },
        help: {
          title: "Vi finns här för att hjälpa",
          description: "Realt AI är till för dig som ska hitta hem, och för dem som hjälper dig dit.",
        },
      },
    },
    contact: {
      heading: "Kontakta oss",
      description: "Har du frågor, idéer eller vill testa Realt AI tidigt? Skriv till oss.",
      subject: "Hej Realt AI",
      business:
        "Är du mäklare, hyresvärd eller företag och vill veta mer? Skriv till oss, så berättar vi hur ett samarbete kan se ut.",
    },
  },
  en: {
    countdown: {
      heading: "Launching 1 February 2027",
      days: "days",
      hours: "hours",
      minutes: "minutes",
      seconds: "seconds",
      launched: "Realt AI has launched.",
      note: "We are building Realt AI right now and open on 1 February.",
    },
    about: {
      heading: "About us",
      paragraph1:
        "Realt AI helps you choose a home that fits your life. You describe what matters in your own words, and Realt AI shows what fits, what conflicts and why.",
      paragraph2:
        "We are building Realt AI in Sweden, together with people who know the housing market. The goal is for more people to choose a home with confidence.",
      values: {
        honest: {
          title: "Honesty",
          description: "You see the trade-offs and risks up front, and why a home fits or does not.",
        },
        together: {
          title: "Progress together",
          description: "We want to move the housing industry forward together with brokers, landlords and other partners.",
        },
        help: {
          title: "Here to help",
          description: "Realt AI is for people finding a home, and for those who help them get there.",
        },
      },
    },
    contact: {
      heading: "Contact us",
      description: "Questions, ideas, or want to try Realt AI early? Write to us.",
      subject: "Hello Realt AI",
      business:
        "A broker, landlord or company that wants to know more? Write to us and we will tell you what a collaboration could look like.",
    },
  },
};

for (const locale of ["sv", "en"]) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  Object.assign(json.home, add[locale]);
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
}
console.log("ok");
