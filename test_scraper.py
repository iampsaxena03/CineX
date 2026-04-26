import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def run():
    print("Starting script...", flush=True)
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument("--headless")
    user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
    chrome_options.add_argument(f"user-agent={user_agent}")
    chrome_options.add_argument("--log-level=3")
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    
    start_url = "https://episodes.modpro.blog/archives/33502"
    print("Navigating to:", start_url, flush=True)
    try:
        driver.get(start_url)
    except Exception as e:
        print("Error navigating to start_url", e, flush=True)
        driver.quit()
        return
        
    time.sleep(5)
    
    print("Looking for Fast Server 1 (G-Drive)...", flush=True)
    try:
        wait = WebDriverWait(driver, 15)
        element = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, 'a.maxbutton-fast-server-gdrive, a.maxbutton-google-drive-server-2, a.maxbutton-download-links')))
        shortener_link = element.get_attribute('href')
        print("Found shortener link:", shortener_link, flush=True)
        driver.get(shortener_link)
    except Exception as e:
        print("Failed to find/click fast server link:", e, flush=True)
        driver.save_screenshot("error1.png")
        driver.quit()
        return

    print("Solving shortener on:", driver.current_url, flush=True)
    time.sleep(5)
    
    try:
        driver.execute_script("""document.getElementById('landing').submit();""")
        wait = WebDriverWait(driver, 10)
        element = wait.until(EC.presence_of_element_located((By.ID, 'verify_button2')))
        if element:
            driver.execute_script("""var ubPopupContent = document.querySelector(".ub-popupcontent");
        if (ubPopupContent) {
            ubPopupContent.style.display = "none";
        }
        var button2 = document.getElementById("verify_button2");
        button2.style.visibility = "visible";
        button2.dispatchEvent(new Event("click"));
        var button3 = document.getElementById("verify_button");
        button3.style.visibility = "visible";

        button3.dispatchEvent(new Event("click"));

        var button4 = document.getElementById("two_steps_btn");
        button4.style.display = "block";
        """)

        wait = WebDriverWait(driver, 10)
        element2 = wait.until(EC.presence_of_element_located((By.LINK_TEXT, 'GO TO DOWNLOAD')))
        if element2:
            driver.execute_script("""var button4 = document.getElementById("two_steps_btn");
                button4.click()""")
    except Exception as e:
        print("Shortener bypass fallback/error:", e, flush=True)
        pass
        
    print("Waiting for final redirection...", flush=True)
    time.sleep(10)
    
    window_handles = driver.window_handles
    if len(window_handles) > 1:
        driver.switch_to.window(window_handles[-1])
        
    print("Final URL:", driver.current_url, flush=True)
    driver.save_screenshot("final.png")
    
    if "driveseed" in driver.current_url:
        print("Successfully reached driveseed!", flush=True)
        try:
            dl_btn = driver.find_element(By.CSS_SELECTOR, "a.btn-success")
            print("Direct Download URL:", dl_btn.get_attribute("href"), flush=True)
        except:
            pass
            
    driver.quit()

if __name__ == "__main__":
    run()
