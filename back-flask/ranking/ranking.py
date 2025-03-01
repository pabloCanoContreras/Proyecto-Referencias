from datetime import datetime
from pybliometrics.scopus import AuthorRetrieval, ScopusSearch
from litstudy import search_crossref, refine_crossref
from litstudy.sources.crossref import CrossRefDocument
import pybliometrics
from pybliometrics.scopus import SerialTitle
from serpapi import GoogleSearch
import requests

# Inicialización de la API de pybliometrics
pybliometrics.scopus.init()

class LitStudy:
    def __init__(self, api_key):
        self.api_key = api_key

    def get_scopus_articles(self, query, search_type="title", limit=100):
        """
        Realiza una búsqueda en Scopus y retorna los artículos encontrados.
        """

        if search_type == "author":
            query = f'AUTH("{query}")'
        
        elif search_type == "keywords":
            query = f'KEY("{query}")'
        
        elif search_type == "title":
            query = f'TITLE("{query}")'

        search = ScopusSearch(query, download=True)

        if not search.results:
            print("No se encontraron artículos para esta consulta.")
            return []

        articles = []

        for article in search.results[:limit]:
            # Extraer y mostrar detalles básicos del artículo
            title = getattr(article, "title", "Sin título")
            doi = getattr(article, "doi", "Sin DOI")
            cover_date = getattr(article, "coverDate", "Desconocido")
            article_keywords = getattr(article, "authkeywords", None)

            # Mostrar el título, DOI, fecha de publicación y keywords (solo para Scopus)
            if article_keywords:
                print(f"Título: {title}, DOI: {doi}, Fecha de publicación: {cover_date}, Keywords: {article_keywords}")
            else:
                print(f"Título: {title}, DOI: {doi}, Fecha de publicación: {cover_date}, Keywords: No disponibles")

            articles.append(article)

        return articles
    
    def get_scopus_h_index(self, auid):
        """
        Obtiene el h-index de un autor desde Scopus usando su AUID.
        """
        try:
            author = AuthorRetrieval(auid)
            return author.h_index
        except Exception as e:
            print(f"Error al obtener el h-index de Scopus para el AUID {auid}: {e}")
            return "Error"

    def get_crossref_articles(self, query, rows=100):
        """
        Busca artículos en CrossRef y extrae correctamente los autores y DOI.
        """
        articles = search_crossref(query=query, limit=rows)
        found, not_found = refine_crossref(articles)

        print(f"Artículos encontrados en CrossRef: {len(found)}, no encontrados: {len(not_found)}")

        for article in found:
            pub_year = article.publication_date.year if article.publication_date else "Desconocido"
            # Extraer DOI
            doi = article.entry.get("DOI", "No disponible")

            # Extraer nombres de autores
            authors = []
            if article.authors:
                for author in article.authors:
                    given_name = getattr(author, "given", "").strip()
                    family_name = getattr(author, "family", "").strip()
                    full_name = f"{given_name} {family_name}".strip()

                    if full_name:  
                        authors.append(full_name)
                    elif hasattr(author, "name") and author.name:
                        authors.append(author.name)
                    else:
                        authors.append("Autor desconocido")

            authors_str = ", ".join(authors) if authors else "Sin autores"

            citation_count = article.citation_count or 0

            print(f"Título: {article.title}, Año: {pub_year}")
            print(f"Autores Crossref: {authors_str}")
            print(f"Citas: {citation_count}")
            print(f"DOI: {doi}")  # Imprime el DOI

        return found  # Devuelve los artículos
    

    
    from serpapi import GoogleSearch

    def get_scholar_articles(self,query, search_type="title", limit=10):
        """
        Realiza una búsqueda en Google Scholar usando SerpApi y devuelve los artículos encontrados,
        incluyendo el h-index de los autores si está disponible.
        """
        
        # Construcción de la consulta según el tipo de búsqueda
        if search_type == "author":
            search_query = f'author:{query}'
        elif search_type == "keywords":
            search_query = query
        elif search_type == "title":
            search_query = f'"{query}"'
        else:
            raise ValueError("search_type debe ser 'title', 'keywords' o 'author'.")
        
        # Parámetros de la consulta para SerpApi
        params = {
            "engine": "google_scholar",
            "q": search_query,
            "api_key": "813709d154c03e80cb6e34ea14964cff575713bc24ea0f42ea1dce046261e0f7",
            "num": limit
        }
        
        # Hacer la consulta a SerpApi
        search = GoogleSearch(params)
        results = search.get_dict()
        
        if not results.get("organic_results"):
            print("No se encontraron artículos para esta consulta.")
            return []
        
        articles = []
        
        for result in results.get("organic_results", [])[:limit]:
            title = result.get("title", "Sin título")
            link = result.get("link", "Sin enlace")
            authors = result.get("publication_info", {}).get("authors", [])
            source = result.get("publication_info", {}).get("summary", "Fuente desconocida")
            
            # Extraer el año de la fuente
            year = None
            if source:
                for word in source.split():
                    if word.isdigit() and len(word) == 4:
                        year = word
                        break
            
            citations = result.get("inline_links", {}).get("cited_by", {}).get("total", "No disponible")

            
            # Obtener h-index de los autores si tienen author_id
            h_index_data = {}
            keywords_data = []

            for author in authors:
                author_name = author.get("name", "").strip()
                author_id = author.get("author_id")
                if author_id:
                    h_index = self.get_h_index_scholar(author_id)
                    h_index_data[author["name"]] = h_index
                # Solo buscar keywords si no se han obtenido aún
                if not keywords_data:
                    keywords_data = self.get_scholar_keywords(author_name)
            
            articles.append({
                "title": title,
                "link": link,
                "authors": authors,
                "author_id": author_id,
                "source": source,
                "year": year,
                "citations": citations,
                "keywords": keywords_data if keywords_data else ["No disponible"],
                "h_index": h_index_data  # Diccionario con h-index de cada autor
            })
        
        return articles

    def get_h_index_scholar(self,author_id):
        params = {
            "engine": "google_scholar_author",
            "author_id": author_id,
            "api_key": "813709d154c03e80cb6e34ea14964cff575713bc24ea0f42ea1dce046261e0f7"
        }
        search = GoogleSearch(params)
        results = search.get_dict()
        h_index = None
        for entry in results.get("cited_by", {}).get("table", []):
            if "h_index" in entry:
                h_index = entry["h_index"].get("all")
                break
        return h_index
    

    def get_scholar_keywords(self, author_name):
        """
        Obtiene los intereses (keywords) de un autor en Google Scholar usando SerpAPI.
        """
        params = {
            "engine": "google_scholar_profiles",
            "mauthors": author_name,
            "hl": "en",
            "api_key": "813709d154c03e80cb6e34ea14964cff575713bc24ea0f42ea1dce046261e0f7"
        }

        search = GoogleSearch(params)
        data = search.get_dict()

        # Extraer los keywords (interests)
        keywords = []
        if "profiles" in data:
            for profile in data["profiles"]:
                author_name = profile.get("name", "Desconocido")
                author_interests = profile.get("interests", [])
                
                # Extraer solo los títulos de los intereses
                interests_list = [interest["title"] for interest in author_interests]
                
                keywords.append({"author": author_name, "keywords": interests_list})

        return keywords




    def get_citescore(self, source_id):
        """
        Obtiene el CiteScore de una revista en Scopus dado su source_id.
        """
        try:
            journal = SerialTitle(source_id)
            return journal.citescoreyear_info.get("citeScore", "No disponible")
        except Exception as e:
            print(f"Error al obtener el CiteScore para source_id {source_id}: {e}")
            return "Error"



    def get_scopus_h_index(self, auid):
        """
        Obtiene el h-index de un autor desde Scopus usando su AUID.
        """
        try:
            author = AuthorRetrieval(auid)
            return author.h_index
        except Exception as e:
            print(f"Error al obtener el h-index de Scopus para el AUID {auid}: {e}")
            return "Error"

    def _calculate_score(self, article, alpha, beta, gamma, source):
        """
        Calcula la puntuación del artículo en función de citas, antigüedad y novedad.
        """
        current_year = datetime.now().year

        if source == "scopus":
            citations = int(getattr(article, "citation_count", 0))
            pub_year = None
            if hasattr(article, "coverDate") and article.coverDate:
                try:
                    pub_year = int(article.coverDate[:4])  
                except ValueError:
                    pub_year = None

        elif source == "crossref":
            citations = article.citation_count or 0
            pub_year = article.publication_date.year if article.publication_date else None

        else:
            pub_year = None

        if pub_year is None:
            return 0

        novelty_divisor = max(current_year - pub_year + 1, 1)
        novelty = 1 / novelty_divisor
        antiquity = current_year - pub_year

        return (alpha * citations) + (beta * novelty) + (gamma * antiquity)

    def rank_articles(self, articles, alpha=0.7, beta=0.2, gamma=0.1, source="scopus"):
        """
        Ordena los artículos en función de su puntuación y obtiene métricas de la revista (si aplica).

        :param articles: Lista de artículos obtenidos de Scopus, CrossRef o Google Scholar.
        :param alpha: Peso para el score (ej. número de citas).
        :param beta: Peso para la antigüedad del artículo.
        :param gamma: Peso para el ranking de la revista.
        :param source: Fuente de los artículos ("scopus", "crossref", "scholar").
        :return: Lista de artículos ordenados por relevancia.
        """

        filtered_articles = []
        current_year = datetime.now().year

        for article in articles:
            if source == "scopus":
                pub_year = None
                if hasattr(article, "coverDate") and article.coverDate:
                    try:
                        pub_year = int(article.coverDate[:4])
                    except ValueError:
                        pub_year = None

            elif source == "crossref":
                pub_year = article.publication_date.year if article.publication_date else None

            elif source == "scholar":
                # Google Scholar no tiene un campo claro para el año, lo extraemos de la fuente
                pub_year = None
                if "year" in article and article["year"]:
                    try:
                        pub_year = int(article["year"])
                    except ValueError:
                        pub_year = None

            else:
                pub_year = None

            # Filtrar solo los artículos publicados en años válidos
            if pub_year is not None and 1900 <= pub_year <= current_year:
                filtered_articles.append(article)

        ranked_articles = []

        for article in filtered_articles:
            # Calcular la puntuación del artículo
            score = self._calculate_score(article, alpha, beta, gamma, source)

            # Obtener métricas de la revista solo para Scopus
            if source == "scopus" and hasattr(article, "issn"):
                issn = article.issn
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
                
                ranked_articles.append({
                    "article": article,
                    "score": score,
                    "scimago_rank": scimago_rank,
                    "snip": snip,
                    "journal_h_index": journal_h_index,
                    "publisher": publisher
                })

            else:
                # Para Google Scholar y CrossRef, dejamos en None las métricas que no aplican
                ranked_articles.append({
                    "article": article,
                    "score": score,
                    "scimago_rank": None,
                    "snip": None,
                    "journal_h_index": None,
                    "publisher": "Desconocido"
                })

        # Ordenar los artículos según la puntuación de mayor a menor
        ranked_articles.sort(key=lambda x: x["score"], reverse=True)

        return ranked_articles
    def display_author_h_index(self, author_name, auid=None):
        """
        Muestra el índice h de un autor en Google Scholar y Scopus (si aplica).
        """
        if auid:
            h_index_scopus = self.get_scopus_h_index(auid)
            print(f"Índice h en Scopus para {author_name} (AUID: {auid}): {h_index_scopus}")

    def search_and_rank(self, query, source, search_type, alpha=0.7, beta=0.2, gamma=0.1):
        """
        Busca artículos en una fuente y los ordena.
        """
        if source == "scopus":
            articles = self.get_scopus_articles(query,search_type)
        elif source == "crossref":
            articles = self.get_crossref_articles(query)
        elif source == "scholar":
            print("Bienvenido a scholar !!!")
            articles = self.get_scholar_articles(query,search_type)
            print(articles)
        else:
            print(f"Fuente desconocida: {source}")
            return None

        if articles:
            ranked_articles = self.rank_articles(articles, alpha, beta, gamma, source)
            return ranked_articles
        else:
            print(f"No se encontraron artículos en {source}.")
            return None
    

    def display_ranked_articles(self, ranked_articles, source, top_n=30):
        """
        Muestra los mejores artículos de una lista ordenada, incluyendo autores, h-index y métricas de la revista.
        Solo muestra los artículos provenientes de CrossRef.
        """
        if source == "crossref":
            print(f"\nMejores artículos de {source.capitalize()}:")
            if ranked_articles:
                for idx, entry in enumerate(ranked_articles[:top_n], 1):
                    article = entry["article"]
                    score = entry["score"]
                    scimago_rank = entry["scimago_rank"]
                    snip = entry["snip"]
                    journal_h_index = entry["journal_h_index"]
                    publisher = entry["publisher"]

                    title = getattr(article, "title", "Sin título")

                    # Intentamos obtener los autores de CrossRef
                    authors = "Sin autores"
                    if hasattr(article, 'authors') and article.authors:
                        authors = ", ".join([f"{author.given} {author.family}" if hasattr(author, 'given') and hasattr(author, 'family') else "Autor desconocido" for author in article.authors]) 

                    citations = getattr(article, "citation_count", 0)
                    pub_year = getattr(article, "publication_date", "Desconocido")

                    # Formatear salida de autores con su H-index
                    print(f"{idx}. {title}")
                    print(f"   Autores: {authors}")
                    print(f"   Año: {pub_year} - Citas: {citations}")
                    print(f"   Puntuación: {score}")
                    print(f"   SCImago Rank: {scimago_rank or 'No disponible'}")
                    print(f"   SNIP: {snip or 'No disponible'}")
                    print(f"   H-index de la revista: {journal_h_index or 'No disponible'}")
                    print(f"   Editorial: {publisher}")
                    print(f"   -----------")
            else:
                print(f"No se pudieron obtener los artículos de {source}.")




# Configuración
api_key = "0be79d019c20568890c2bb62478dd3b3"
lit_study = LitStudy(api_key)