import { readFileSync, writeFileSync } from "node:fs";

const texts = {
  en: {
    name: "Realt AI Assistant",
    metaTitle: "Realt AI Assistant",
    metaDescription: "Chat with Realt AI Assistant about the home you're looking for.",
    greeting:
      "Hi! I'm Realt AI Assistant. Tell me about the home you're looking for — budget, commute, space, safety, schools or lifestyle — in your own words.",
    placeholder: "Describe your ideal home…",
    inputLabel: "Your message",
    send: "Send",
    thinking: "Thinking…",
    summaryIntro:
      "Thanks! Here's what I understood. Check it and adjust anything before I find your matches.",
  },
  sv: {
    name: "Realt AI Assistant",
    metaTitle: "Realt AI Assistant",
    metaDescription: "Chatta med Realt AI Assistant om bostaden du söker.",
    greeting:
      "Hej! Jag är Realt AI Assistant. Berätta med egna ord vilken bostad du söker – budget, pendling, yta, trygghet, skolor eller livsstil.",
    placeholder: "Beskriv din drömbostad…",
    inputLabel: "Ditt meddelande",
    send: "Skicka",
    thinking: "Tänker…",
    summaryIntro:
      "Tack! Så här har jag förstått dig. Kontrollera och justera innan jag letar matchningar.",
  },
};

for (const locale of ["en", "sv"]) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.assistant = texts[locale];
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`Updated ${path}`);
}
