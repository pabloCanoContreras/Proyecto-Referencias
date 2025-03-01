from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from app.services.journal_service import get_journal_metrics_single
from ranking.ranking import LitStudy
import csv
from litstudy.sources.crossref import CrossRefDocument
import requests
from litstudy import search_crossref
import matplotlib
from pybliometrics.scopus import AuthorRetrieval, ScopusSearch, SerialTitle
from mapas.mapa_referencias import build_citation_graph, plot_citation_graph, get_refs_scopus, get_refs_crossref
from config import SCOPUS_API_KEY,SCOPUS_HEADERS,SCOPUS_BASE_URL


# Inicialización de la aplicación Flask
app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
CORS(app)
matplotlib.use('Agg')


lit_study = LitStudy(SCOPUS_API_KEY)


@app.route('/author_eid', methods=['GET'])
def get_author_eid():
    author_name = request.args.get('author_name')
    max_results = int(request.args.get('max_results', 5))  # Valor por defecto

    if not author_name:
        return jsonify({'error': 'El nombre del autor es obligatorio'}), 400

    try:
        search_results = ScopusSearch(f"AUTH({author_name})")
        if search_results.results:
            author_ids_list = [
                result.author_ids.split(";")[0] for result in search_results.results[:max_results]
            ]
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
        tipo_busqueda = data.get('tipoBusqueda', 'title')  # Puede ser "title", "author" o "keywords"
        fecha_inicio = data.get('fechaInicio', None)
        fecha_fin = data.get('fechaFin', None)
        sources = data.get('sources', ['scopus', 'crossref', 'scholar'])  # Fuentes seleccionadas

        # Convertir fechas a enteros si son válidas
        try:
            fecha_inicio = int(fecha_inicio) if fecha_inicio else None
            fecha_fin = int(fecha_fin) if fecha_fin else None
        except ValueError:
            return jsonify({"error": "Las fechas deben ser números válidos"}), 400

        # Ajustar la consulta según el tipo de búsqueda
        query = busqueda  # Por defecto es búsqueda por título
        search_type = "title"

        if tipo_busqueda.lower() == "author":
            search_type = "author"
        elif tipo_busqueda.lower() == "keywords":
            search_type = "keywords"

        results = {"scopus": [], "crossref": [], "scholar": []}  # Diccionario con listas separadas

        for source in sources:
            if source in ['scopus', 'crossref', 'scholar']:
                articles = lit_study.search_and_rank(query=query, source=source, search_type=search_type) or []
                print(f"Articulos para {source}:",articles)

                filtered_articles = []  # Lista específica para cada fuente

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
                            journal_h_index = [
                                {"year": getattr(entry, "year", "Desconocido"), "citescore": getattr(entry, "citescore", "No disponible")}
                                for entry in (article.get("journal_h_index") or []) if entry is not None
                            ]

                            scimago_rank = article.get('scimago_rank', 'No disponibles')
                            snip = article.get('snip', 'No disponibles')
                            doi = getattr(article_obj, 'doi', 'No disponibles')

                            # Extraer el año de publicación de 'coverDate'
                            cover_date = getattr(article_obj, 'coverDate', None)
                            if cover_date:  # Verificar si existe
                                try:
                                    if len(cover_date) == 4:  # Ejemplo: "2023"
                                        pub_year = int(cover_date)
                                    elif len(cover_date) == 7:  # Ejemplo: "2023-05"
                                        pub_year = int(cover_date[:4])
                                    else:  # Ejemplo: "2023-05-15"
                                        pub_year = int(cover_date[:4])  # Extraer solo el año
                                except ValueError:
                                    pub_year = None  # Si el formato es incorrecto, asignar None
                            else:
                                pub_year = None  # Si no existe, asignar None

                            # 🔹 Obtener lista de IDs y nombres de autores
                        author_names_list = author_names.split(";") if author_names else []
                        author_ids_list = getattr(article_obj, "author_ids", "").split(";") if getattr(article_obj, "author_ids", None) else []

                        # 🔥 Diccionario para almacenar { author_id: { name, h_index } }
                        author_data = {}

                        # 🔹 Asegurar que los IDs correspondan con los nombres en orden
                        for idx, author_name in enumerate(author_names_list):
                            author_name = author_name.strip()
                            author_id = author_ids_list[idx] if idx < len(author_ids_list) else None

                            # Si hay un ID, obtenemos el H-Index
                            if author_id:
                                try:
                                    author = AuthorRetrieval(author_id)
                                    h_index = author.h_index
                                except Exception:
                                    h_index = "No disponible"

                                # Guardamos en el diccionario con el formato { author_id: { name, h_index } }
                                author_data[author_id] = {
                                    "name": author_name,
                                    "h_index": h_index
                                }


                            # Agregar artículo filtrado a la lista de Scopus
                            if title != 'Sin título' and author_names != 'Sin autores':
                                filtered_articles.append({
                                    "title": title,
                                    "citation_count": citation_count,
                                    "publication_year": pub_year or "Desconocido",
                                    "authors": author_data,
                                    "h_index": h_index_info,
                                    "keywords": keywords,
                                    "journal_h_index": journal_h_index,
                                    "scimago_rank": scimago_rank,
                                    "doi": doi,
                                    "snip": snip,
                                    "source": "scopus"
                                })

                    elif source == "crossref":
                        # Llamamos a la función search_crossref para obtener los artículos de CrossRef
                        docs = search_crossref(query=query, limit=10, session=None)

                        # Filtramos los artículos obtenidos de CrossRef
                        for doc in docs:
                            if isinstance(doc, CrossRefDocument):  # Verificamos que el artículo sea un objeto CrossRefDocument
                                title = doc.title
                                doi = doc.id.doi  # Accedemos al DOI

                                # Extraer fecha de publicación
                                pub_date = doc.publication_date
                                pub_year = pub_date.year if pub_date else "Desconocido"

                                # Acceder a los autores, reemplazando valores None por "Autor desconocido"
                                authors = [author.name if author.name else "Autor desconocido" for author in doc.authors] if doc.authors else ["Autor desconocido"]
                                authors_str = ", ".join(authors)  # Convertimos la lista en un string separado por comas

                                # Agregar el artículo procesado a la lista filtrada
                                filtered_articles.append({
                                    "title": title,
                                    "citation_count": doc.citation_count if doc.citation_count else 0,
                                    "publication_year": pub_year,
                                    "authors": authors_str,
                                    "doi": doi,
                                    "source": "crossref"
                                })

                    
                    elif source == "scholar":
                        print("Bienvenido a scholar......")
                        scholar_articles = lit_study.get_scholar_articles(query=query, search_type=search_type, limit=10)
                        print("Scholar articles:", scholar_articles)
                        filtered_articles = []

                        for article in scholar_articles:
                            title = article.get("title", "Sin título")
                            link = article.get("link", "No disponible")
                            authors = ", ".join([author["name"] for author in article.get("authors", []) if isinstance(author, dict)] or ["Sin autores"])
                            
                            # Extraer h-index como un diccionario { "Autor1": h_index1, "Autor2": h_index2 }
                            h_index_dict = article.get("h_index", {})
                            citations = article.get("citations", 0)
                            pub_year = int(article.get("year")) if article.get("year") else "Desconocido"
                            author_id = article.get("author_id","")

                            # ✅ Extraer keywords con verificación de tipo
                            keywords_list = []
                            for entry in article.get("keywords", []):
                                if isinstance(entry, dict):  # 🔥 Verifica que entry sea un diccionario antes de usar `.get()`
                                    keywords_list.extend(entry.get("keywords", []))  # 🔥 Extrae las keywords si existen

                            filtered_articles.append({
                                "title": title,
                                "citation_count": citations,
                                "publication_year": pub_year,
                                "authors": authors,
                                "h_index": h_index_dict,
                                "keywords": keywords_list if keywords_list else ["No disponible"],  # Si está vacío, mostrar "No disponible"
                                "link": link,
                                "author_id": author_id,
                                "source": "scholar"
                            })



                # Filtrar artículos por fecha si corresponde
                final_articles = [
                    article for article in filtered_articles 
                    if isinstance(article["publication_year"], int)
                    and ((not fecha_inicio or article["publication_year"] >= fecha_inicio) 
                        and (not fecha_fin or article["publication_year"] <= fecha_fin))
                ]

                # Guardar artículos en la lista correspondiente
                results[source] = final_articles  

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

@app.route('/generate_citation_graph', methods=['POST'])
def generate_citation_graph():
    """
    Endpoint para generar el grafo de citas y devolverlo como HTML interactivo.
    """
    data = request.get_json()
    query = data.get('query', '')
    source = data.get('source', 'scopus')  # ⬅️ Por defecto, usa Scopus si no se especifica
    limit = int(data.get('limit', 4))  # Limita la cantidad de referencias

    if not query:
        return jsonify({"status": "error", "message": "No se proporcionó una consulta"}), 400

    try:
        full_query = f"{query}"
        print("Buscando referencias para:", full_query)
        print(f"📖 Buscando referencias en {source} para:", query)

        # 🚀 Elegir la función correcta según la fuente
        if source.lower() == "scopus":
            documents = get_refs_scopus(query, limit=limit) or []
        elif source.lower() == "crossref":
            documents = get_refs_crossref(query, limit=limit) or []
        else:
            return jsonify({"status": "error", "message": f"Fuente desconocida: {source}"}), 400

        if not documents:
            return jsonify({"status": "error", "message": "No se encontraron documentos"}), 404

        if not isinstance(documents, list) or not documents:
            return jsonify({"status": "error", "message": "No se encontraron documentos"}), 404

        # Crear el grafo de citas
        G = build_citation_graph(documents, source=source)

        # Convertir el grafo a HTML interactivo en base64
        citation_graph_base64 = plot_citation_graph(G)

        return jsonify({"status": "success", "graph_html": citation_graph_base64})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500



def get_article_details_scopus(doi):
    """Obtiene los detalles de un artículo desde Scopus."""
    url = f"{SCOPUS_BASE_URL}/article/doi/{doi}"
    response = requests.get(url, headers=SCOPUS_HEADERS)
    if response.status_code == 200:
        return response.json().get("full-text-retrieval-response", {}).get("coredata", {})
    return None


def get_cited_by_scopus(doi):
    """Obtiene los artículos que citan un DOI desde Scopus."""
    url = f"{SCOPUS_BASE_URL}/search/scopus"
    params = {"query": f"REF({doi})", "field": "dc:identifier,dc:title,dc:creator", "count": 200}
    response = requests.get(url, headers=SCOPUS_HEADERS, params=params)
    if response.status_code == 200:
        return response.json().get("search-results", {}).get("entry", [])
    return []


def get_article_details_crossref(doi):
    """Obtiene los detalles del artículo desde CrossRef a través de la API."""
    url = f"https://api.crossref.org/works/{doi}"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()["message"]
    else:
        return None

def get_cited_by_crossref(doi):
    """Obtiene los artículos que citan un artículo desde CrossRef."""
    url = f"https://api.crossref.org/works/{doi}/citations"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()["message"]["items"]
    else:
        return []


@app.route('/')
def serve_react():
    return send_from_directory('../frontend/build', 'index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
