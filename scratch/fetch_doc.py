import urllib.request

url = "https://raw.githubusercontent.com/markmishaev76/ai-harness-scorecard/main/src/ai_harness_scorecard/checks/review.py"
response = urllib.request.urlopen(url)
content = response.read().decode('utf-8')
print("Fetched characters:", len(content))

with open("scratch/review_full.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Done writing scratch/documentation_full.py")
