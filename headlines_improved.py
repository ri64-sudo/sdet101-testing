import urllib.request, urllib.parse, json, sqlite3
from datetime import datetime, timedelta

API_KEY = "YOUR_API_KEY"
conn = sqlite3.connect("news.db")
c = conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS headlines (
    id INTEGER PRIMARY KEY, title TEXT UNIQUE, description TEXT, published_at TEXT)''')

def fetch_news(topic):
    try:
        url = "https://newsapi.org/v2/everything?" + urllib.parse.urlencode({
            "q": topic, "apiKey": API_KEY, "pageSize": 5, "sortBy": "publishedAt", "language": "en"
        })
        r = json.loads(urllib.request.urlopen(url).read().decode())
        
        if r.get("status") != "ok":
            print(f"API Error: {r.get('message', 'Unknown error')}")
            return
            
        print("\nTop Headlines:\n")
        saved = 0
        for i, a in enumerate(r.get("articles", []), 1):
            title, desc, date = a.get('title', ''), a.get('description', ''), a.get('publishedAt', '')[:10]
            print(f"{i}. Title: {title}\n   Description: {desc}\n   Published At: {date}\n")
            try:
                c.execute("INSERT INTO headlines (title, description, published_at) VALUES (?, ?, ?)", (title, desc, date))
                saved += 1
            except sqlite3.IntegrityError:
                continue
        conn.commit()
        print(f"Data saved. ({saved} new headlines)\n")
    except Exception as e:
        print(f"Error: {e}\n")

def search(keyword):
    rows = c.execute("SELECT title, description, published_at FROM headlines WHERE title LIKE ? OR description LIKE ?", 
                    ('%' + keyword + '%', '%' + keyword + '%')).fetchall()
    if rows:
        for i, (t, d, p) in enumerate(rows, 1):
            print(f"{i}. Title: {t}\n   Description: {d}\n   Published At: {p}\n")
    else:
        print("No results found.\n")

def delete_old(days):
    try:
        cutoff = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        c.execute("DELETE FROM headlines WHERE published_at < ?", (cutoff,))
        conn.commit()
        print(f"Deleted {c.rowcount} headline(s).\n")
    except Exception as e:
        print(f"Error: {e}\n")

while True:
    print("1. Fetch news  2. Search  3. Delete old  4. Exit")
    ch = input("Choice: ")
    if ch == '1': fetch_news(input("Topic: "))
    elif ch == '2': search(input("Keyword: "))
    elif ch == '3': delete_old(int(input("Days old: ")))
    elif ch == '4': break
