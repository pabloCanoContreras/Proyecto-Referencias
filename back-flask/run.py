import base64
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from app.services.author_service import get_author_h_index
from app.services.journal_service import get_journal_metrics_single
from ranking.rankingfinish import LitStudy
import pandas as pd
import nltk
import csv
import os
import networkx as nx
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from collections import Counter
from wordcloud import WordCloud
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
from pyvis.network import Network
import io
from datetime import datetime
import json
from pybliometrics.scopus import AbstractRetrieval
from pybliometrics.scopus import AuthorRetrieval, ScopusSearch, SerialTitle
from mapas.mapa_referencias_final import build_citation_graph, plot_citation_graph, get_refs_scopus

# Descargar recursos necesarios de NLTK
nltk.download('punkt')
nltk.download('stopwords')

# Inicialización de la aplicación Flask
app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
CORS(app)

# Instancia del servicio LitStudy con API Key
api_key = "0be79d019c20568890c2bb62478dd3b3"
lit_study = LitStudy(api_key)

@app.route('/get_h_index', methods=['GET'])
def get_h_index():
    author_name = request.args.get('author_name')
    if not author_name:
        return jsonify({'error': 'Author name is required'}), 400

    h_index = get_author_h_index(author_name)
    return jsonify({'h_index': h_index})

@app.route('/author_eid', methods=['GET'])
def get_author_eid():
    """
    Obtiene los EIDs de autor basados en el nombre de autor proporcionado.
    """
    author_name = request.args.get('author_name')
    max_results = int(request.args.get('max_results'))  

    if not author_name:
        return jsonify({'error': 'El nombre del autor es obligatorio'}), 400

    try:
        search_results = ScopusSearch(f"AUTH({author_name})")
        if search_results.results:
            author_ids_list = []
            # Obtener los primeros `max_results` autores
            for result in search_results.results[:max_results]:
                author_ids_list.extend(result.author_ids.split(";"))
            return jsonify({"author_ids": list(set(author_ids_list))})
        else:
            return jsonify({"error": f"No se encontró el autor: {author_name}"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/generate_report', methods=['POST'])
def generate_author_impact_report():
    """
    Genera un informe de impacto de autor en formato CSV y lo devuelve al cliente.
    """
    data = request.get_json()
    author_name = data.get('author_name')
    author_ids = data.get('author_ids', [])
    max_results = int(data.get('max_results'))  # Valor predeterminado: 5 resultados

    if not author_name or not author_ids:
        return jsonify({'error': 'El nombre del autor y los IDs son obligatorios'}), 400

    report_data = []
    sanitized_author_name = author_name.replace(" ", "_").replace("/", "_")  # Sanear nombre del archivo
    output_file = f"{sanitized_author_name}_impact_report.csv"

    try:
        for author_id in author_ids:
            try:
                # Obtener detalles del autor
                author = AuthorRetrieval(author_id)
                # Buscar artículos del autor
                search_results = ScopusSearch(f"AU-ID({author_id})")

                for result in search_results.results[:max_results]:
                    title = result.title
                    cited_by_count = result.citedby_count
                    issn = result.issn
                    cover_date = result.coverDate

                    # Obtener métricas del journal (si tiene ISSN)
                    scimago_rank, snip, journal_h_index, publisher = None, None, None, "Desconocido"
                    if issn:
                        try:
                            journal = SerialTitle(issn)
                            scimago_rank = journal.sjrlist[0][1] if journal.sjrlist else None
                            snip = journal.sniplist[0][1] if journal.sniplist else None
                            journal_h_index = journal.citescoreyearinfolist
                            publisher = journal.publisher
                        except Exception as e:
                            print(f"Error al obtener métricas del ISSN {issn}: {e}")

                    # Agregar datos al informe
                    report_data.append({
                        "Título": title,
                        "Fecha": cover_date,
                        "SJR (SCImago)": scimago_rank or "No disponible",
                        "SNIP": snip or "No disponible",
                        "H-index de la revista": journal_h_index or "No disponible",
                        "Editorial": publisher,
                        "Citas": cited_by_count,
                        "Lecturas (Estimadas)": author.cited_by_count
                    })

            except Exception as e:
                print(f"Error procesando autor ID {author_id}: {e}")
                continue

        # Generar archivo CSV
        with open(output_file, "w", newline='', encoding="utf-8") as csvfile:
            fieldnames = [
                "Título", "Fecha", "SJR (SCImago)", "SNIP", "H-index de la revista",
                "Editorial", "Citas", "Lecturas (Estimadas)"
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(report_data)

        # Enviar el archivo generado al cliente
        return send_file(output_file, as_attachment=True, download_name=output_file)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/search_and_rank', methods=['POST'])  
def search_and_rank():
    try:
        # Obtener parámetros de la solicitud
        data = request.get_json()
        busqueda = data.get('busqueda', '')
        tipo_busqueda = data.get('tipoBusqueda', 'title')  # Ahora puede ser "title" o "author"
        fecha_inicio = data.get('fechaInicio', None)
        fecha_fin = data.get('fechaFin', None)
        sources = data.get('sources', ['scopus', 'crossref'])  # Fuentes seleccionadas

        # Convertir fechas a enteros si son válidas
        try:
            fecha_inicio = int(fecha_inicio) if fecha_inicio else None
            fecha_fin = int(fecha_fin) if fecha_fin else None
        except ValueError:
            return jsonify({"error": "Las fechas deben ser números válidos"}), 400

        # Ajustar la consulta según el tipo de búsqueda
        query = busqueda  # Por defecto es título
        search_type = "title"  # Valor por defecto

        if tipo_busqueda.lower() == "author":
            search_type = "author"  # Especificar búsqueda por autor
        
        elif tipo_busqueda.lower() == "keywords":
            search_type = "keywords"

        results = {"scopus": [], "crossref": []}  # ✅ Diccionario con listas separadas

        for source in sources:
            if source in ['scopus', 'crossref']:
                articles = lit_study.search_and_rank(query=query, source=source, search_type=search_type) or []

                filtered_articles = []  # ✅ Lista específica para cada fuente

                for article in articles:
                    pub_year = None
                    title = 'Sin título'
                    author_names = 'Sin autores'
                    citation_count = 0
                    keywords = 'No disponibles'
                    h_index_info = {}

                    if source == "scopus":
                        if isinstance(article, dict) and "article" in article:
                            article_obj = article["article"]

                            # Extraer datos del artículo
                            title = getattr(article_obj, 'title', 'Sin título')
                            author_names = getattr(article_obj, 'author_names', 'Sin autores')
                            citation_count = getattr(article_obj, 'citedby_count', 0)
                            keywords = getattr(article_obj, 'authkeywords', 'No disponibles')
                            journal_h_index = [{"year": entry.year, "citescore": entry.citescore} 
                            for entry in (article.get("journal_h_index") or [])  
                            ]
                            scimago_rank = article.get('scimago_rank', 'No disponibles')
                            snip =  article.get('snip', 'No disponibles')
                            doi = getattr(article_obj, 'doi', 'No disponibles')

                            # Extraer el año de publicación
                            cover_date = getattr(article_obj, 'coverDate', None)
                            if cover_date and len(cover_date) >= 4:
                                try:
                                    pub_year = int(cover_date[:4])
                                except ValueError:
                                    pub_year = None

                            # Obtener AUIDs y calcular H-index
                            author_ids = getattr(article_obj, "author_ids", "").split(";") if getattr(article_obj, "author_ids", None) else []
                            for auid in author_ids:
                                try:
                                    author = AuthorRetrieval(auid)
                                    h_index_info[auid] = author.h_index
                                except Exception as e:
                                    h_index_info[auid] = "No disponible"

                            # ✅ Agregar artículo filtrado a la lista de Scopus
                            if title != 'Sin título' and author_names != 'Sin autores':
                                filtered_articles.append({
                                    "title": title,
                                    "citation_count": citation_count,
                                    "publication_year": pub_year or "Desconocido",
                                    "authors": author_names,
                                    "h_index": h_index_info,
                                    "keywords": keywords,
                                    "journal_h_index": journal_h_index,
                                    "scimago_rank": scimago_rank,
                                    "doi": doi,
                                    "snip": snip,
                                    "source": "scopus"  
                                })

                    elif source == "crossref":
                        for article_data in articles:
                            if isinstance(article_data, dict) and "article" in article_data:
                                article_obj = article_data["article"]

                                # Extraer valores
                                title = getattr(article_obj, "title", "Sin título")
                                score = article_data.get("score", 0)  
                                publisher = article_data.get("publisher", "Desconocido")

                                # Extraer fecha de publicación
                                pub_date = getattr(article_obj, "publication_date", None)
                                pub_year = pub_date.year if pub_date and hasattr(pub_date, "year") else None
                                citation_count = getattr(article_obj, "citation_count", "Sin título")

                                authors = []
                                if hasattr(article_obj, "authors") and article_obj.authors:
                                    for author in article_obj.authors:
                                        given_name = getattr(author, "given", None)
                                        family_name = getattr(author, "family", None)
                                        full_name = f"{given_name or ''} {family_name or ''}".strip()

                                        if full_name:  
                                            authors.append(full_name)
                                        elif hasattr(author, "name") and author.name:
                                            authors.append(author.name)
                                        else:
                                            authors.append("Autor desconocido")

                                    authors_str = ", ".join(filter(None, authors)) if authors else "Autores no disponibles"

                                # ✅ Agregar artículo filtrado a la lista de CrossRef
                                filtered_articles.append({
                                    "title": title,
                                    "citation_count": citation_count,  
                                    "publication_year": pub_year or "Desconocido",
                                    "authors": authors_str,
                                    "h_index": "N/A",
                                    "keywords": "No disponibles",
                                    "source": "crossref"  
                                })

                # ✅ Filtrar artículos por fecha si corresponde
                final_articles = [
                    article for article in filtered_articles 
                    if isinstance(article["publication_year"], int)
                    and ((not fecha_inicio or article["publication_year"] >= fecha_inicio) 
                        and (not fecha_fin or article["publication_year"] <= fecha_fin))
                ]

                # ✅ Guardar artículos en la lista correspondiente
                results[source] = final_articles  

        return jsonify(results)

    except Exception as e:
        print("❌ Error en el backend:", str(e))
        return jsonify({"error": str(e)}), 500  


        return jsonify(results)

    except Exception as e:
        print("❌ Error en el backend:", str(e))
        return jsonify({"error": str(e)}), 500






@app.route('/get_journal_metrics', methods=['GET'])
def get_journal_metrics():
    issns = request.args.getlist('issns')
    
    if not issns:
        return jsonify({"error": "No ISSNs provided"}), 400

    all_info = [get_journal_metrics_single(issn) for issn in issns if issn]

    return jsonify(all_info)

@app.route('/upload_csv', methods=['POST'])
def upload_csv():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and file.filename.endswith('.csv'):
        try:
            data = pd.read_csv(file.stream)
            if 'abstract' not in data.columns:
                return jsonify({'error': 'CSV file must contain an "abstract" column.'}), 400

            abstracts = data['abstract'].dropna().tolist()
            all_keywords = []

            def preprocesar_texto(texto):
                texto = texto.lower()
                tokens = word_tokenize(texto)
                return [token for token in tokens if token.isalpha() and token not in stopwords.words('spanish')]

            for abstract in abstracts:
                palabras = preprocesar_texto(abstract)
                all_keywords.extend(palabras)

            keyword_counter = Counter(all_keywords)
            df_keywords = pd.DataFrame(keyword_counter.items(), columns=['Palabra', 'Frecuencia'])
            df_keywords['Frecuencia Relativa'] = df_keywords['Frecuencia'] / df_keywords['Frecuencia'].sum()

            return jsonify(df_keywords.to_dict(orient='records'))

        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'error': 'Invalid file type. Only CSV files are allowed.'}), 400

@app.route('/wordcloud', methods=['POST'])
def wordcloud():
    data = request.json
    texto = data.get('texto', '')

    if not texto:
        return jsonify({'error': 'No se proporcionó texto'}), 400

    wordcloud = WordCloud(width=800, height=400, background_color='white').generate(texto)

    img = io.BytesIO()
    plt.figure(figsize=(10, 5))
    plt.imshow(wordcloud, interpolation='bilinear')
    plt.axis('off')
    plt.savefig(img, format='png')
    img.seek(0)

    return send_file(img, mimetype='image/png', as_attachment=True, download_name='wordcloud.png')


def get_author_from_scopus(doi=None, scopus_id=None):
    """
    Intenta obtener el apellido del primer autor de un documento en Scopus,
    usando DOI o Scopus ID. Si no se encuentra, devuelve 'Desconocido'.
    """
    try:
        if doi:
            abstract = AbstractRetrieval(doi=doi)
        elif scopus_id:
            abstract = AbstractRetrieval(scopus_id)
        else:
            return "Desconocido"

        # Extraer autores
        if abstract.authors and isinstance(abstract.authors, list):
            first_author = abstract.authors[0].surname  # Apellido del primer autor
            return first_author
        else:
            return "Desconocido"
    except Exception as e:
        print(f"⚠️ Error obteniendo autor desde Scopus: {e}")
        return "Desconocido"


def extract_last_name(full_name):
    """
    Extrae el apellido del autor de un string completo.
    Si el nombre tiene un guion, lo conserva (ejemplo: "Lopez-Carmona M.A.").
    """
    if not full_name:
        return "Desconocido"
    
    parts = full_name.split()  # Divide por espacios
    last_name = parts[0]  # Toma la primera parte (puede incluir guion)

    return last_name

def extract_year(date_string):
    """
    Extrae el año de una fecha en formato 'Mes Año' o 'YYYY-MM-DD'.
    Si la fecha es None o vacía, devuelve 'Desconocido'.
    """
    if not date_string:
        return "Desconocido"
    
    parts = date_string.split()  # Divide por espacios
    year = parts[-1]  # Toma la última parte (que debería ser el año)

    return year if year.isdigit() else "Desconocido"



def build_citation_graph(documents):
    """
    Crea un grafo de citas a partir de los documentos, usando 'Apellido - Año' en los nodos.
    """
    G = nx.DiGraph()

    for doc in documents:
        print("\n🔹 Documento principal:", doc)  # ✅ Depuración

        # Obtener el apellido del autor principal
        creator = doc.get("creator", "")  
        main_author = extract_last_name(creator)

        # Obtener el año de publicación desde 'coverDisplayDate'
        cover_display_date = doc.get("coverDisplayDate", "")
        main_pub_year = extract_year(cover_display_date)

        # Etiqueta del nodo principal
        main_label = f"{main_author} - {main_pub_year}"

        G.add_node(main_label, label=main_label, title=doc.get("title", "Título desconocido"),
                   color="red", size=20)

        # Procesar referencias
        for ref in doc.get("ref_docs", []):
            print("\n   🔹 Referencia encontrada:", ref)  # ✅ Depuración

            # Intentar obtener el autor de la referencia
            ref_author = "Desconocido"

            # Si hay una lista de autores, extraer el apellido del primero
            ref_authors = ref.get("authors", [])  
            if isinstance(ref_authors, list) and ref_authors:
                ref_author = extract_last_name(ref_authors[0])
            else:
                # Si no hay autores en los datos originales, intentar obtener desde Scopus
                ref_author = get_author_from_scopus(doi=ref.get("doi"), scopus_id=ref.get("id"))

            # Obtener el año de publicación de la referencia
            ref_pub_date = ref.get("pub_date", "Desconocido")
            ref_pub_year = str(ref_pub_date)[:4] if ref_pub_date else "Desconocido"

            # Etiqueta de la referencia
            ref_label = f"{ref_author} - {ref_pub_year}"

            if ref_pub_year != "Desconocido":
                G.add_node(ref_label, label=ref_label, title=ref.get("title", "Título desconocido"),
                           color="blue", size=15)
                G.add_edge(main_label, ref_label)

    return G


def plot_citation_graph(G):
    """
    Crea un grafo interactivo con pyvis donde los nodos muestran "Título"
    pero revelan el nombre completo al pasar el mouse, junto con autores, año y revista.
    """
    net = Network(height="700px", width="100%", directed=True)
    net.toggle_physics(True)

    # Añadir nodos con información adicional para mostrar al hacer hover
    for node, data in G.nodes(data=True):
        # Obtener la información necesaria del nodo (Título, Autor, Año, Revista)
        label_parts = data["label"].split(" - ")  # Suponiendo que la etiqueta está en formato "Autor - Año"
        author = label_parts[0] if len(label_parts) > 1 else "Desconocido"
        year = label_parts[1] if len(label_parts) > 1 else "Desconocido"
        title = data.get("title", "Título desconocido")
        source_title = data.get("source_title", "Revista desconocida")  # Supongamos que tienes el nombre de la revista

        # Crear un texto más completo para el hover, que incluye título, autores, año y revista
        hover_text = f"""
            Título: {title}
            Autores: {author}
            Año: {year}
            Revista:{source_title}
        """

        # Añadir el nodo a la red, con el texto completo para el hover
        net.add_node(
            node,
            label=data["label"],   # Solo "Título"
            title=hover_text,  # Información completa en el hover
            color=data["color"],
            size=data["size"]
        )

    # Añadir los bordes (aristas) entre los nodos
    for edge in G.edges():
        net.add_edge(edge[0], edge[1])

    # Guardar el grafo en un archivo HTML
    graph_path = "citation_graph.html"
    net.save_graph(graph_path)

    # Leer el archivo HTML generado por pyvis
    with open(graph_path, "r", encoding="utf-8") as f:
        graph_html = f.read()

    # Convertir el HTML a base64 para enviarlo en una API o para usarlo de otra manera
    return base64.b64encode(graph_html.encode()).decode("utf-8")


@app.route('/generate_citation_graph', methods=['POST'])
def generate_citation_graph():
    """
    Endpoint para generar el grafo de citas y devolverlo como HTML interactivo.
    """
    data = request.get_json()
    query = data.get('query', '')
    limit = int(data.get('limit', 4))  # Limita la cantidad de referencias

    if not query:
        return jsonify({"status": "error", "message": "No se proporcionó una consulta"}), 400

    try:
        full_query = f"{query}"
        print("Buscando referencias para:", full_query)

        # 🚀 Llamar a la función y evitar el error de NoneType
        documents = get_refs_scopus(full_query, limit=limit) or []  # Si None, devolver []

        if not isinstance(documents, list) or not documents:
            return jsonify({"status": "error", "message": "No se encontraron documentos"}), 404

        # Crear el grafo de citas
        G = build_citation_graph(documents)

        # Convertir el grafo a HTML interactivo en base64
        citation_graph_base64 = plot_citation_graph(G)

        return jsonify({"status": "success", "graph_html": citation_graph_base64})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500




@app.route('/')
def serve_react():
    return send_from_directory('../frontend/build', 'index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
