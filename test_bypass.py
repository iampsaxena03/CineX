import requests
import re
import urllib.parse
from bs4 import BeautifulSoup

def test_bypass(movie_link):
    h1 = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "X-Forwarded-For": "192.168.29.7",
    }
    print(f"[*] Step 1: GET {movie_link}")
    # Note: Sometimes links.modpro.blog requires POST to start the chain, or just GET.
    # We will try GET. If it's a redirect page directly, we might need POST.
    r1 = requests.get(url=movie_link, headers=h1)
    print(f"[*] Get status: {r1.status_code}")
    
    soup = BeautifulSoup(r1.text, 'html.parser')
    input_tag = soup.find('input', {'name': '_wp_http'})
    if not input_tag:
        print("[-] Could not find _wp_http form input. Printing snippet:")
        print(r1.text[:500])
        print(f"[*] Let's try POST {movie_link}")
        r1 = requests.post(url=movie_link, headers=h1)
        soup = BeautifulSoup(r1.text, 'html.parser')
        input_tag = soup.find('input', {'name': '_wp_http'})
        if not input_tag:
            fast_srv = soup.find('a', class_='maxbutton-fast-server-gdrive')
            if fast_srv:
                print(f"[*] Found fast server link: {fast_srv['href']}")
                r1 = requests.post(url=fast_srv['href'], headers=h1)
                soup = BeautifulSoup(r1.text, 'html.parser')
                input_tag = soup.find('input', {'name': '_wp_http'})
            elif soup.form:
                print(f"[*] Found a form instead: action={soup.form.get('action')}")
                inputs = soup.form.find_all('input')
                for i in inputs:
                    print(f"  {i.get('name')} = {i.get('value')}")
            else:
                return
        
    if not input_tag:
        print("[-] Aborting, no _wp_http found!")
        return

    value = input_tag.get('value')
    # get the domain of the form action
    form_action = soup.form.get('action')
    print(f"[*] Found form action: {form_action}")
    
    # We will let the automation handle the requests.
    from urllib.parse import urlparse
    if not form_action.startswith('http'):
        parsed_action = urlparse(movie_link)
        host = parsed_action.netloc
        origin = f"{parsed_action.scheme}://{host}"
        if not form_action.startswith('/'):
            form_action = '/' + form_action
        form_action = origin + form_action
    else:
        parsed_action = urlparse(form_action)
        host = parsed_action.netloc
        origin = f"{parsed_action.scheme}://{host}"
    
    print(f"[*] Extracted _wp_http value. Target Host: {host}")
    
    link2 = urllib.parse.quote(value, safe='')

    headers = {
        "Host": host,
        "Cache-Control": "max-age=0",
        "Sec-Ch-Ua": '"Chromium";v="121", "Not A(Brand";v="99"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Upgrade-Insecure-Requests": "1",
        "Content-Type": "application/x-www-form-urlencoded",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Dest": "document",
        "User-Agent": h1["User-Agent"]
    }
    data = f"_wp_http={link2}"
    print(f"[*] Step 2: POST to {form_action}")
    r2 = requests.post(url=form_action, headers=headers, data=data)
    
    soup2 = BeautifulSoup(r2.text, 'html.parser')
    form2 = soup2.form
    if not form2:
        print("[-] No second form found!")
        print(r2.text[:500])
        return
        
    link3 = form2.get('action')
    if not link3.startswith('http'):
        link3 = origin + link3
        
    print(f"[*] Found 2nd form action: {link3}")
    http2_input = soup2.find('input', {'name': '_wp_http2'})
    token_input = soup2.find('input', {'name': 'token'})
    
    if not http2_input or not token_input:
        print("[-] Missing wp_http2 or token")
        return
        
    http2 = urllib.parse.quote(http2_input.get('value'), safe='')
    token = token_input.get('value')
    
    headers1 = {
        "Host": host,
        "Cache-Control": "max-age=0",
        "Upgrade-Insecure-Requests": "1",
        "Origin": origin,
        "Content-Type": "application/x-www-form-urlencoded",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-User": "?1",
        "Sec-Fetch-Dest": "document",
        "Referer": form_action,
        "User-Agent": h1["User-Agent"]
    }
    data1 = f"_wp_http2={http2}&token={token}"
    
    print(f"[*] Step 3: POST to {link3}")
    r3 = requests.post(url=link3, headers=headers1, data=data1)
    
    # Try to extract the pepe stuff
    match1 = re.findall(r'pepe-[a-zA-Z\d]+', r3.text)
    match2 = re.findall(r"\'eJ(.*?)\', \d+\)", r3.text)
    
    if match1 and match2:
        pepe_number = match1[0]
        val = match2[0]
        pepe = f"eJ{val}"
        link4 = f"{origin}/?go={pepe_number}"
        intro = re.sub(r'^.*?pepe-', 'pepe-', link4)
        
        print(f"[*] Step 4: Found Pepe cookie -> {intro}={pepe}")
        print(f"[*] Requesting {link4}")
        
        headers2 = {
            "Host": host,
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-User": "?1",
            "Sec-Fetch-Dest": "document",
            "Referer": link3,
            "User-Agent": h1["User-Agent"]
        }
        cookies = {intro: pepe}
        
        r4 = requests.get(url=link4, headers=headers2, cookies=cookies)
        soup4 = BeautifulSoup(r4.text, 'html.parser')
        meta = soup4.find('meta', {'http-equiv': 'refresh'})
        if meta:
            quarter_final = meta.get('content').split('url=')[1]
            print(f"[*] Step 5: Found Meta Refresh URL -> {quarter_final}")
            
            index = quarter_final.find('/r?')
            if index != -1:
                modi5_url = quarter_final[:index]
                
            print(f"[*] Step 6: Requesting Meta url {quarter_final}")
            r5 = requests.get(url=quarter_final)
            match3 = re.search(r'window\.location\.replace\("([^"]+)"\)', r5.text)
            if match3:
                url = match3.group(1)
                semi_final = url
                final = f"{modi5_url}{semi_final}"
                print(f"[+] Final Link Found: {final}")
            else:
                print("[-] Could not find window.location.replace in final page")
                print(f"[debug] Response headers: {r5.headers}")
                if r5.history:
                    print(f"Redirected to: {r5.url}")
        else:
            print("[-] Could not find meta refresh tag in r4:")
            print(r4.text[:500])
    else:
        print("[-] Could not find pepe matches.")
        print("Looking for modpro directly in response...")
        modpro_link = re.search(r'https?://[^\s]+modi5[^\s"\']*', r3.text)
        if modpro_link:
            print(f"[+] Final Link Found Directly: {modpro_link.group(0)}")
        else:
            print("Snippet of r3.text:")
            print(r3.text[:800])

if __name__ == '__main__':
    test_bypass("https://links.modpro.blog/archives/153810")
