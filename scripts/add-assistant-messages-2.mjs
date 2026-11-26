import { readFileSync, writeFileSync } from "node:fs";

const texts = {
  en: {
    emptyHeading: "What kind of home are you looking for?",
    newChat: "New chat",
    newChatTitle: "New chat",
    history: "Recent chats",
    noHistory: "Your chats will appear here.",
    deleteChat: "Delete chat",
    showMenu: "Show menu",
    hideMenu: "Hide menu",
    backToSite: "Back to the site",
    situationTitle: "Your situation",
    conflictsTitle: "Priority conflict",
  },
  sv: {
    emptyHeading: "Vilken bostad letar du efter?",
    newChat: "Ny chatt",
    newChatTitle: "Ny chatt",
    history: "Tidigare samtal",
    noHistory: "Dina samtal visas här.",
    deleteChat: "Ta bort chatt",
    showMenu: "Visa meny",
    hideMenu: "Dölj meny",
    backToSite: "Tillbaka till sidan",
    situationTitle: "Din situation",
    conflictsTitle: "Prioritetskonflikt",
  },
};

for (const locale of ["en", "sv"]) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.assistant = { ...json.assistant, ...texts[locale] };
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`Updated ${path}`);
}
