import { prisma } from "@/lib/admin";

const HISTORY_KEY = "TELEGRAM_POST_HISTORY";

export async function getPostedHistory(): Promise<Set<string>> {
  try {
    const setting = await prisma.appSettings.findUnique({
      where: { key: HISTORY_KEY }
    });
    if (setting && setting.value) {
      const arr = JSON.parse(setting.value);
      return new Set(arr);
    }
  } catch (error) {
    console.error("Failed to fetch telegram history:", error);
  }
  return new Set();
}

export async function addPostedHistory(uid: string) {
  try {
    const history = await getPostedHistory();
    history.add(uid);
    const arr = Array.from(history);
    
    await prisma.appSettings.upsert({
      where: { key: HISTORY_KEY },
      update: { value: JSON.stringify(arr) },
      create: { key: HISTORY_KEY, value: JSON.stringify(arr) }
    });
  } catch (error) {
    console.error("Failed to save telegram history:", error);
  }
}
