from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from scholarly import scholarly
import requests

app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
CORS(app)

API_KEY = "0be79d019c20568890c2bb62478dd3b3"

def get_author_h_index(author_name):
    search_query = scholarly.search_author(author_name)
    try:
        author = scholarly.fill(next(search_query))
        return author['hindex']
    except StopIteration:
        return 'N/A'
    except Exception as e:
        print(f"Error al obtener el H-index de {author_name}: {e}")
        return 'N/A'

@app.route('/get_h_index', methods=['GET'])
def get_h_index():
    author_name = request.args.get('author_name')
    if not author_name:
        return jsonify({'error': 'Author name is required'}), 400

    h_index = get_author_h_index(author_name)
    return jsonify({'h_index': h_index})

def get_journal_metrics_single(issn):
    url = f"https://api.elsevier.com/content/serial/title/issn/{issn}"
    headers = {
        "X-ELS-APIKey": API_KEY,
        "Accept": "application/json"
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        entry = data.get('serial-metadata-response', {}).get('entry', [{}])[0]

        info = {
            "Title": entry.get('dc:title'),
            "Publisher": entry.get('dc:publisher'),
            "Coverage Start Year": entry.get('coverageStartYear'),
            "Coverage End Year": entry.get('coverageEndYear'),
            "ISSN (Print)": entry.get('prism:issn'),
            "eISSN (Electronic)": entry.get('prism:eIssn'),
            "Aggregation Type": entry.get('prism:aggregationType'),
            "Source ID": entry.get('source-id'),
            "Open Access": entry.get('openaccess'),
            "Open Access Article": entry.get('openaccessArticle'),
            "Subject Area": {
                "Code": entry.get('subject-area', [{}])[0].get('@code'),
                "Abbreviation": entry.get('subject-area', [{}])[0].get('@abbrev'),
                "Description": entry.get('subject-area', [{}])[0].get('$')
            },
            "SNIP (2023)": entry.get('SNIPList', {}).get('SNIP', [{}])[0].get('$'),
            "SJR (2023)": entry.get('SJRList', {}).get('SJR', [{}])[0].get('$'),
            "CiteScore": {
                "Current Metric": entry.get('citeScoreYearInfoList', {}).get('citeScoreCurrentMetric'),
                "Current Metric Year": entry.get('citeScoreYearInfoList', {}).get('citeScoreCurrentMetricYear'),
                "Tracker": entry.get('citeScoreYearInfoList', {}).get('citeScoreTracker'),
                "Tracker Year": entry.get('citeScoreYearInfoList', {}).get('citeScoreTrackerYear')
            },
            "Links": {
                "Self Link": data.get('serial-metadata-response', {}).get('link', [{}])[0].get('@href'),
                "Scopus Source": entry.get('link', [{}])[0].get('@href'),
                "Cover Image": entry.get('link', [{}])[1].get('@href')
            }
        }

        return info
    else:
        return None

@app.route('/get_journal_metrics', methods=['GET'])
def get_journal_metrics():
    issns = request.args.getlist('issns')
    
    if not issns:
        return jsonify({"error": "No ISSNs provided"}), 400

    all_info = []
    for issn in issns:
        info = get_journal_metrics_single(issn)
        if info:
            all_info.append(info)

    return jsonify(all_info)

@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True)
