from pybliometrics.scopus import ScopusSearch, AbstractRetrieval, AuthorRetrieval
import pybliometrics.scopus
import networkx as nx
import matplotlib.pyplot as plt
import requests
import base64
from pyvis.network import Network


pybliometrics.scopus.init()


def get_refs_scopus(query: str, *, limit: int = 4):
    all_documents = []

    try:
        # Realiza la búsqueda en Scopus
        results = ScopusSearch(query, view="STANDARD")
        
        # Si se especifica un límite, recorta los resultados a ese límite
        documents_to_process = results.results[:limit] if limit else results.results

        # Itera sobre los documentos obtenidos
        for doc in documents_to_process:
            try:
                doc_dict = doc._asdict()
                eid = doc_dict["eid"]

                # Recupera las referencias para el documento
                document = AbstractRetrieval(eid, view="REF")
                print(document)
                refs = []

                # Extrae las referencias del documento
                for ref in document.references:
                    ref_doc = {
                        "doi": ref.doi,
                        "title": ref.title,
                        "id": ref.id,
                        "sourcetitle": ref.sourcetitle,
                        "pub_date": ref.coverDate  # Incluye la fecha de publicación de la referencia
                    }
                    refs.append(ref_doc)

                doc_dict["ref_docs"] = refs
                doc_dict["coverDate"] = document.coverDate  # Incluye la fecha de publicación del documento principal

                # Agrega el documento a la lista de resultados
                all_documents.append(doc_dict)
                
            except Exception as e:
                print(f"Error procesando el documento {doc_dict.get('eid', 'unknown')}: {e}")
        
        return all_documents

    except Exception as e:
        print(f"Error en la búsqueda de documentos: {e}")
        return []
    
def get_refs_crossref(query, limit=50):
    """
    Busca referencias en CrossRef basándose en el título.
    """
    url = f"https://api.crossref.org/works?query={query}&rows={limit}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        documents = []
        for item in data.get("message", {}).get("items", []):
            # 🛠 Manejo robusto de los autores
            authors = item.get("author", [])
            if authors:
                first_author = authors[0]
                creator = first_author.get("family") or first_author.get("name", "Desconocido")
            else:
                creator = "Desconocido"

            documents.append({
                "title": item.get("title", ["Título desconocido"])[0],
                "creator": creator,
                "doi": item.get("DOI", ""),
                "coverDisplayDate": extract_year(item.get("issued", {}).get("date-parts", [[None]])),
                "publicationName": item.get("container-title", ["Revista desconocida"])[0],
                "ref_docs": item.get("reference", []),
            })

        return documents
    except Exception as e:
        print(f"⚠️ Error obteniendo referencias de CrossRef: {e}")
        return []
    
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
    Extrae el año de una fecha en formato 'Mes Año', 'YYYY-MM-DD' o lista de CrossRef.
    Si la fecha es None o vacía, devuelve 'Desconocido'.
    """
    if not date_string:
        return "Desconocido"

    # 🛠 Si es una lista de listas (formato CrossRef)
    if isinstance(date_string, list) and isinstance(date_string[0], list):
        return str(date_string[0][0])  # Devuelve el primer valor (año)

    # 🛠 Si es un número entero (puede venir así en CrossRef)
    if isinstance(date_string, int):
        return str(date_string)

    # 🛠 Si es un string normal (Scopus)
    parts = date_string.split()  # Divide por espacios
    return parts[-1] if parts[-1].isdigit() else "Desconocido"

def get_citation_count(doi=None, scopus_id=None, source='scopus'): 
    """ Obtiene el número de citas desde Scopus o CrossRef usando DOI o Scopus ID """
    try:
        if source.lower() == 'scopus':
            if scopus_id:
                abstract = AbstractRetrieval(scopus_id, view="FULL")
                return abstract.citedby_count or 0
            elif doi:
                abstract = AbstractRetrieval(doi, view="FULL")
                return abstract.citedby_count or 0
        elif source.lower() == 'crossref':
            if doi:
                url = f"https://api.crossref.org/works/{doi}"
                response = requests.get(url)
                if response.status_code == 200:
                    data = response.json()
                    return data['message'].get('is-referenced-by-count', 0)
                return 0
        else:
            return "Desconocido"
    except Exception as e:
        print(f"⚠️ Error obteniendo citas para {doi or scopus_id}: {e}")
        return "Desconocido"
    
def get_author_from_crossref(doi):
    """
    Obtiene el autor de un artículo usando su DOI desde CrossRef.
    """
    url = f"https://api.crossref.org/works/{doi}"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        authors = data['message'].get('author', [])
        print(authors)
        if authors:
            return extract_last_name(authors[0]['family'])
    return "Desconocido"


def get_author_from_scopus(doi=None, scopus_id=None):
    """
    Intenta obtener el apellido del primer autor de un documento en Scopus,
    usando DOI o Scopus ID. Si no se encuentra, devuelve 'Desconocido'.
    """
    try:
        if doi:
            # Si se pasa el DOI, obtenemos la información correspondiente
            print(f"Obteniendo autor por DOI: {doi}")
            abstract = AbstractRetrieval(doi)
        elif scopus_id:
            # Si se pasa el Scopus ID, obtenemos la información correspondiente
            print(f"Obteniendo autor por Scopus ID: {scopus_id}")
            author = AuthorRetrieval(scopus_id)
            
            # Retornar el nombre del autor (usualmente el primer autor)
            first_author = author.given_name + " " + author.surname
            print("Autor encontrado:", first_author)
            return first_author
        else:
            print("No se proporcionó ni DOI ni Scopus ID.")
            return "Desconocido"

        # Extraer autores si la respuesta es válida
        if abstract.authors and isinstance(abstract.authors, list):
            first_author = abstract.authors[0].surname  # Apellido del primer autor
            print("Autor encontrado:", first_author)
            return first_author
        else:
            print("No se encontraron autores.")
            return "Desconocido"

    except Exception as e:
        print(f"⚠️ Error obteniendo autor desde Scopus: {e}")
        return "Desconocido"


def build_citation_graph(documents, source='None'):
    """
    Crea un grafo de citas a partir de los documentos, usando 'Apellido - Año' en los nodos.
    """
    G = nx.DiGraph()

    # Diccionario para almacenar las referencias ya agregadas por su etiqueta
    nodes_set = set()

    # Iterar sobre todos los documentos principales
    for doc in documents:
        print("\n🔹 Documento principal:", doc)  # ✅ Depuración

        creator = doc.get("creator", "")
        doi = doc.get("doi", "")
        cover_display_date = doc.get("coverDisplayDate", "")
        scopus_id = doc.get("id", "")
        
        main_author = extract_last_name(creator)
        main_pub_year = extract_year(cover_display_date)
        if doi:
            url = f"https://doi.org/{doi}"
        elif scopus_id:
            url = f"https://www.scopus.com/record/display.uri?eid={scopus_id}"
        else:
            url = None

        # 🔥 Obtener el número de citas
        citation_count = get_citation_count(doi, scopus_id)

        # Etiqueta del nodo principal
        main_label = f"{main_author} - {main_pub_year}"

        # Obtener información de la revista
        journal_name = doc.get("publicationName", "Revista desconocida")
        volume = doc.get("volume", "No disponible")
        issue = doc.get("issueIdentifier", "No disponible")
        article_number = doc.get("article_number", "No disponible")
        issn = doc.get("issn", "No disponible")
        eissn = doc.get("eIssn", "No disponible")

        if url:
            if main_label not in nodes_set:
                # Asegurarnos de que el nodo principal sea añadido con color rojo
                G.add_node(main_label, 
                           label=main_label, 
                           title=doc.get("title", "Título desconocido"),
                           citation_count=citation_count,
                           color="red",  # Color rojo para documento principal
                           size=20,
                           url=url,
                           publicationName=journal_name, 
                           volume=volume, 
                           issueIdentifier=issue, 
                           article_number=article_number, 
                           issn=issn, 
                           eIssn=eissn)
                nodes_set.add(main_label)

        # Procesar referencias para este documento
        for ref in doc.get("ref_docs", []):
            print("\n   🔹 Referencia encontrada:", ref)  # ✅ Depuración

            # Intentar obtener el autor de la referencia
            ref_author = "Desconocido"
            # Definir ref_scopus_id antes del if
            ref_scopus_id = None  

            # Comprobar si la fuente es CrossRef o Scopus y obtener el DOI correctamente
            if source == 'crossref':
                ref_doi = ref.get("DOI")  # CrossRef usa "DOI"
                ref_pub_year = ref.get("year", "Desconocido")  # CrossRef usa "year"
                ref_journal_name = ref.get("journal-title", "Revista desconocida")  # CrossRef usa "journal-title"
                ref_title = ref.get("article-title", "Título desconocido")  # CrossRef usa "article-title"
            else:
                ref_doi = ref.get("doi")  # Scopus usa "doi"
                ref_pub_date = ref.get("pub_date", "Desconocido")  # Scopus usa "pub_date"
                ref_pub_year = str(ref_pub_date)[:4] if ref_pub_date else "Desconocido"  # Extrae el año de "pub_date"
                ref_journal_name = ref.get("sourcetitle", "Revista desconocida")  # Scopus usa "sourcetitle"
                ref_title = ref.get("title", "Título desconocido")  # Scopus usa "title"
                ref_scopus_id = ref.get("id")

            # 🔥 Obtener citas de la referencia
            ref_citation_count = get_citation_count(ref_doi, ref_scopus_id)

            # Obtener el autor dependiendo de la fuente
            ref_author = get_author_from_crossref(ref_doi) if source == 'crossref' else get_author_from_scopus(ref_doi, ref_scopus_id)

            # Etiqueta de la referencia
            ref_label = f"{ref_author} - {ref_pub_year}"

            if ref_doi:
                ref_url = f"https://doi.org/{ref_doi}"
            elif ref_scopus_id:
                ref_url = f"https://www.scopus.com/record/display.uri?eid={ref_scopus_id}"
            else:
                ref_url = None  # Si no tiene identificador, no agregarlo

            # Si no se ha agregado la referencia al grafo
            if ref_pub_year != "Desconocido" and ref_url:
                # Verifica si la referencia ya existe
                if ref_label not in nodes_set:
                    # Si no existe, la agrega
                    G.add_node(ref_label, 
                            label=ref_label, 
                            title=ref_title,  # Usar el título correcto según la fuente
                            color="blue",  # Color azul para referencias
                            size=15,
                            url=ref_url,
                            citation_count=ref_citation_count,
                            publicationName=ref_journal_name)

                    nodes_set.add(ref_label)

                # Crear el arco (edge) entre el documento principal y la referencia
                G.add_edge(main_label, ref_label)

    return G


def plot_citation_graph(G): 
    """
    Crea un grafo interactivo con pyvis donde los nodos muestran "Título"
    pero revelan información completa al hacer hover (Título, Autor, Año, Revista, Volumen...).
    """
    net = Network(height="700px", width="100%", directed=True)
    net.toggle_physics(True)

    # Añadir nodos con información detallada
    for node, data in G.nodes(data=True):
        # Obtener título y autor
        title = data.get("title", "Título desconocido")
        label_parts = data["label"].split(" - ")  # "Autor - Año"
        author = label_parts[0] if len(label_parts) > 1 else "Desconocido"
        year = label_parts[1] if len(label_parts) > 1 else "Desconocido"
        citation_count = data.get("citation_count", "Desconocido")

        # Obtener información de la revista
        journal_name = data.get("publicationName", "Revista desconocida")
        url = data.get("url", "#")

        # Verificar si el nodo es azul (referencia) y eliminar campos innecesarios
        if data.get("color") == "blue":
            hover_text = f"""
            <b>Título:</b> {title} <br>
            <b>Autor:</b> {author} <br>
            <b> Año:</b> {year} <br>
            <b> Citas:</b> {citation_count} <br>
            <b> Revista:</b> {journal_name} <br>
            <a href="{url}" target="_blank">Ver artículo</a> 
            """
        else:
            volume = data.get("volume", "No disponible")
            issue = data.get("issueIdentifier", "No disponible")
            article_number = data.get("article_number", "No disponible")
            issn = data.get("issn", "No disponible")
            eissn = data.get("eIssn", "No disponible")

            hover_text = f"""
            <b>Título:</b> {title} <br>
            <b>Autor:</b> {author} <br>
            <b>Año:</b> {year} <br>
            <b> Citas:</b> {citation_count} <br>
            <b>Revista:</b> {journal_name} <br>
            <b>Volumen:</b> {volume} <br>
            <b>Número:</b> {issue} <br>
            <b>Artículo:</b> {article_number} <br>
            <b>ISSN:</b> {issn} <br>
            <b>eISSN:</b> {eissn} <br>
            <a href="{url}" target="_blank">Ver artículo</a>
            """

        label_with_link = f'{data["label"]}'
        # Añadir el nodo con la información completa en el hover
        net.add_node(
            node,
            label=label_with_link,  # Solo "Título"
            title=hover_text,  # Información completa en el hover
            color=data["color"],
            size=data["size"],
            href=url
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

