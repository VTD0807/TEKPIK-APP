from flask import Flask, render_template_string, request
import requests
from bs4 import BeautifulSoup
import re

app = Flask(__name__)

# Single-file HTML Template
HTML_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cloud Amazon Scraper</title>
    <style>
        :root { --amz-orange: #ff9900; --amz-navy: #232f3e; }
        body { font-family: 'Segoe UI', sans-serif; background: #f3f3f3; margin: 0; padding: 20px; display: flex; justify-content: center; }
        .container { background: white; max-width: 900px; width: 100%; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid var(--amz-orange); margin-bottom: 20px; padding-bottom: 10px; }
        .input-group { display: flex; gap: 10px; margin-bottom: 30px; }
        input { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; outline: none; }
        button { background: var(--amz-orange); border: none; padding: 12px 25px; border-radius: 6px; font-weight: bold; cursor: pointer; }
        
        .product-layout { display: grid; grid-template-columns: 300px 1fr; gap: 30px; }
        .img-container img { width: 100%; border-radius: 8px; border: 1px solid #eee; padding: 10px; box-sizing: border-box; }
        .price-box { margin: 15px 0; padding: 10px; background: #fffcf5; border-radius: 8px; }
        .current-p { color: #B12704; font-size: 28px; font-weight: bold; }
        .original-p { text-decoration: line-through; color: #565959; margin-left: 10px; font-size: 18px; }
        .desc-list { background: #fafafa; padding: 15px; border-radius: 8px; font-size: 13px; line-height: 1.6; max-height: 300px; overflow-y: auto; }
        .status { text-align: center; color: #666; font-style: italic; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>📦 Amazon Cloud Scraper</h1></div>
        
        <form method="POST">
            <div class="input-group">
                <input type="text" name="url" placeholder="Paste Amazon URL or Short Link (amzn.to) here..." required>
                <button type="submit">Scrape</button>
            </div>
        </form>

        {% if data %}
        <div class="product-layout">
            <div class="img-container">
                <img src="{{ data.img }}" alt="Product Image">
            </div>
            <div class="details">
                <h2>{{ data.title }}</h2>
                <div class="price-box">
                    <span class="current-p">{{ data.price }}</span>
                    {% if data.original %}
                    <span class="original-p">{{ data.original }}</span>
                    {% endif %}
                </div>
                <p>⭐ {{ data.rating }} | {{ data.reviews }}</p>
                <strong>Description & Highlights:</strong>
                <div class="desc-list">{{ data.description | safe }}</div>
            </div>
        </div>
        {% elif error %}
        <div style="color: #D8000C; background: #FFBABA; padding: 15px; border-radius: 6px;">{{ error }}</div>
        {% endif %}
    </div>
</body>
</html>
'''

def get_amazon_data(input_url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://www.google.com/"
    }

    try:
        session = requests.Session()
        
        # 1. Handle Short Links (Redirects)
        final_url = input_url
        if "amzn.to" in input_url or "short" in input_url:
            resp = session.get(input_url, headers=headers, allow_redirects=True, timeout=10)
            final_url = resp.url

        # 2. Fetch the actual product page
        response = session.get(final_url, headers=headers, timeout=15)
        if response.status_code != 200:
            return {"error": f"Amazon Blocked the Request (Status {response.status_code})"}

        soup = BeautifulSoup(response.content, 'html.parser')

        # 3. Scraping logic
        title = soup.select_one('#productTitle')
        price = soup.select_one('.a-price-whole')
        original = soup.select_one('.basisPrice .a-offscreen') or soup.select_one('.a-text-strike')
        rating = soup.select_one('span.a-icon-alt')
        reviews = soup.select_one('#acrCustomerReviewText')
        img = soup.select_one('#landingImage') or soup.select_one('#imgBlkFront')
        desc = soup.select_one('#feature-bullets')

        return {
            "title": title.get_text(strip=True) if title else "Product Not Found",
            "price": f"₹{price.get_text(strip=True)}" if price else "Price Not Found",
            "original": original.get_text(strip=True) if original else None,
            "rating": rating.get_text(strip=True) if rating else "No Ratings",
            "reviews": reviews.get_text(strip=True) if reviews else "0",
            "img": img['src'] if img else "",
            "description": str(desc) if desc else "No description available."
        }
    except Exception as e:
        return {"error": f"Error: {str(e)}"}

@app.route('/', methods=['GET', 'POST'])
def index():
    data, error = None, None
    if request.method == 'POST':
        url = request.form.get('url').strip()
        result = get_amazon_data(url)
        if "error" in result: error = result["error"]
        else: data = result
    return render_template_string(HTML_TEMPLATE, data=data, error=error)

if __name__ == '__main__':
    app.run(debug=True)