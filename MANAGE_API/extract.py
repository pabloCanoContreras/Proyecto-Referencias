class DataExtractor:
    def __init__(self, results):
        self.results = results
        self.data = {
            'Title': [],
            'Publication Date': [],
            'Authors': [],
            'ORCID': [],
            'Citations': [],
            'DOI': [],
            'Abstract': [],
            'Journal': [],
            'References': []
        }

    def extract_data(self):
        articles = self.results.get('search-results', {}).get('entry', [])

        for article in articles:
            title = self.extract_title(article)
            pub_date = self.extract_pub_date(article)
            authors, orchids = self.extract_authors_and_orchids(article)
            citations = self.extract_citations(article)
            doi = self.extract_doi(article)
            abstract = self.extract_abstract(article)
            journal = self.extract_journal(article)
            references = self.extract_references(article)

            self.data['Title'].append(title)
            self.data['Publication Date'].append(pub_date)
            self.data['Authors'].append(', '.join(authors))
            self.data['ORCID'].append(', '.join(orchids))
            self.data['Citations'].append(citations)
            self.data['DOI'].append(doi)
            self.data['Abstract'].append(abstract)
            self.data['Journal'].append(journal)
            self.data['References'].append(references)

        return self.data

    @staticmethod
    def extract_title(article):
        return article.get('dc:title', '')

    @staticmethod
    def extract_pub_date(article):
        return article.get('prism:coverDate', '')

    @staticmethod
    def extract_authors_and_orchids(article):
        authors = []
        orchids = []
        for author in article.get('authors', []):
            authors.append(author['ce:indexed-name'])
            orchids.append(author.get('authid', ''))
        return authors, orchids

    @staticmethod
    def extract_citations(article):
        return article.get('citedby-count', '')

    @staticmethod
    def extract_doi(article):
        return article.get('prism:doi', '')

    @staticmethod
    def extract_abstract(article):
        return article.get('dc:description', 'N/A')

    @staticmethod
    def extract_journal(article):
        return article.get('prism:publicationName', 'N/A')

    @staticmethod
    def extract_references(article):
        return article.get('ref', 'N/A')
