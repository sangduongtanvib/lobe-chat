// Script to add tab section to all chat.json files
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../locales');

// Define translations for different languages
const translations = {
  'ar': { historyChat: 'التاريخ', assistantList: 'المساعدين' },
  'bg-BG': { historyChat: 'История', assistantList: 'Асистенти' },
  'de-DE': { historyChat: 'Verlauf', assistantList: 'Assistenten' },
  'en-US': { historyChat: 'History', assistantList: 'Assistants' },
  'es-ES': { historyChat: 'Historial', assistantList: 'Asistentes' },
  'fa-IR': { historyChat: 'تاریخچه', assistantList: 'دستیاران' },
  'fr-FR': { historyChat: 'Historique', assistantList: 'Assistants' },
  'it-IT': { historyChat: 'Cronologia', assistantList: 'Assistenti' },
  'ja-JP': { historyChat: '履歴', assistantList: 'アシスタント' },
  'ko-KR': { historyChat: '기록', assistantList: '어시스턴트' },
  'nl-NL': { historyChat: 'Geschiedenis', assistantList: 'Assistenten' },
  'pl-PL': { historyChat: 'Historia', assistantList: 'Asystenci' },
  'pt-BR': { historyChat: 'Histórico', assistantList: 'Assistentes' },
  'ru-RU': { historyChat: 'История', assistantList: 'Ассистенты' },
  'tr-TR': { historyChat: 'Geçmiş', assistantList: 'Asistanlar' },
  'vi-VN': { historyChat: 'Lịch sử', assistantList: 'D.S trợ lý' },
  'zh-TW': { historyChat: '歷史記錄', assistantList: '助手列表' },
};

// Get all directories in locales folder
const localeDirs = fs.readdirSync(localesDir).filter(file => {
  return fs.statSync(path.join(localesDir, file)).isDirectory();
});

console.log('Found locale directories:', localeDirs);

// Process each locale directory
localeDirs.forEach(locale => {
  const chatJsonPath = path.join(localesDir, locale, 'chat.json');
  
  // Skip if chat.json doesn't exist
  if (!fs.existsSync(chatJsonPath)) {
    console.log(`Skipping ${locale} as chat.json doesn't exist`);
    return;
  }
  
  try {
    // Read the chat.json file
    const chatJsonContent = fs.readFileSync(chatJsonPath, 'utf8');
    let chatJson;
    
    try {
      chatJson = JSON.parse(chatJsonContent);
    } catch (parseError) {
      console.error(`Error parsing ${locale}/chat.json:`, parseError);
      return;
    }
    
    // Check if tab section already exists
    if (chatJson.tab && chatJson.tab.historyChat && chatJson.tab.assistantList) {
      console.log(`Tab section already exists in ${locale}/chat.json`);
      return;
    }
    
    // Get translations for this locale or use English as fallback
    const localeTranslations = translations[locale] || translations['en-US'];
    
    // Add tab section
    chatJson.tab = {
      historyChat: localeTranslations.historyChat,
      assistantList: localeTranslations.assistantList
    };
    
    // Write the updated JSON back to the file
    fs.writeFileSync(chatJsonPath, JSON.stringify(chatJson, null, 2), 'utf8');
    console.log(`Added tab section to ${locale}/chat.json`);
  } catch (error) {
    console.error(`Error processing ${locale}/chat.json:`, error);
  }
});

console.log('Done!');
