import asyncio
from telethon.sync import TelegramClient
from telethon.sessions import StringSession

API_ID = 31120234
API_HASH = "4cd603fa0666777b8af89a2279a50152"

async def main():
    print("Welcome to the Telethon Session Generator!")
    print("This will log into your Telegram account and generate a session string.")
    print("Follow the prompts below to log in (you will need your phone number and the code Telegram sends you).")
    print("-" * 50)
    
    # Create a new client with an empty StringSession
    client = TelegramClient(StringSession(""), API_ID, API_HASH)
    
    # Start the client. This will prompt for phone number and code.
    await client.start()
    
    print("\n" + "=" * 50)
    print("✅ SUCCESS! YOUR SESSION STRING IS GENERATED:")
    print("=" * 50)
    print("\n" + client.session.save() + "\n")
    print("=" * 50)
    print("1. Copy the long string above.")
    print("2. Go to your Hugging Face Space -> Settings -> Variables and secrets.")
    print("3. Create or update the secret named 'TG_SESSION' and paste this string.")
    print("4. Restart your Hugging Face space.")
    print("⚠️  IMPORTANT: Never share this string with anyone else!")

if __name__ == "__main__":
    asyncio.run(main())
