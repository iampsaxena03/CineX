import requests
from bs4 import BeautifulSoup
import re

url = "https://driveseed.org/file/zpBOrYvYyo"
headers = {"User-Agent": "Mozilla/5.0"}
r = requests.get(url, headers=headers)
soup = BeautifulSoup(r.text, 'html.parser')

print("Fetching:", url)
links = soup.find_all('a')
for l in links:
    text = l.text.strip().lower()
    if 'download' in text or 'resume' in text or 'instant' in text:
        print(f"[{text}] -> {l.get('href')}")
        
# also check buttons or forms
forms = soup.find_all('form')
for f in forms:
    print("Found Form:")
    print("Action:", f.get("action"))
    inputs = f.find_all('input')
    for i in inputs:
        print(f"  {i.get('name')} = {i.get('value')}")
        
