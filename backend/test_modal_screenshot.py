import json, time, subprocess, base64, urllib.request

# Start chrome in background with remote debugging
proc = subprocess.Popen([
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--remote-debugging-port=9222",
    "--remote-allow-origins=*",
    "http://localhost:3000/works"
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

try:
    time.sleep(3)
    # Get tabs from CDP
    req = urllib.request.urlopen("http://localhost:9222/json")
    tabs = json.loads(req.read().decode())
    target = None
    for tab in tabs:
        if "localhost:3000/works" in tab.get("url", ""):
            target = tab
            break
    if not target and tabs:
        target = tabs[0]

    ws_url = target["webSocketDebuggerUrl"]
    print("Connecting to ws:", ws_url)

    # Use websocket client or simple python
    import websocket
    ws = websocket.create_connection(ws_url)

    # Click on the Dasara action teaser or Shiva Chaithra tile
    ws.send(json.dumps({
        "id": 1,
        "method": "Runtime.evaluate",
        "params": {"expression": "document.querySelector('.cine-tile.panoramic') ? document.querySelector('.cine-tile.panoramic').click() : document.querySelector('.cine-tile').click()"}
    }))
    res1 = ws.recv()
    print("Click res:", res1)
    time.sleep(1.5)

    # Take screenshot
    ws.send(json.dumps({
        "id": 2,
        "method": "Page.captureScreenshot",
        "params": {"format": "png"}
    }))
    res2 = json.loads(ws.recv())
    data = res2["result"]["data"]
    with open("/Users/saipranvith/.gemini/antigravity/brain/1e9d84f7-aac1-4bba-89a1-b85deae59ecb/video_modal_open.png", "wb") as f:
        f.write(base64.b64decode(data))
    print("Screenshot saved to video_modal_open.png")
    ws.close()
except Exception as e:
    print("Error:", e)
finally:
    proc.terminate()
