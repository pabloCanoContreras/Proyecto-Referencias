class ApiUrls:
    """
    Class for managing URLs of various APIs.
    """

    def __init__(self):
        """
        Initializes base URLs and endpoints for different APIs.
        """
        self.base_urls = {
            'scopus': 'https://api.elsevier.com/content/',
            'crossRef': 'https://api.crossref.org/works',
        }
        self.endpoints = {
            'scopus_search': 'search/scopus',
            'scopus_abstract_doi': 'abstract/doi/',
            'scopus_serial_issN': 'serial/title/issn/',
        }

    def get_scopus_search_url(self):
        """
        Retrieves the URL for performing a search in Scopus.

        Returns:
            str: The complete URL for Scopus search.

        Raises:
            KeyError: If the base URL or endpoint for Scopus search is missing.
        """
        if 'scopus' in self.base_urls and 'scopus_search' in self.endpoints:
            return f"{self.base_urls['scopus']}{self.endpoints['scopus_search']}"
        else:
            raise KeyError("Missing base URL or endpoint for Scopus search")

    def get_scopus_abstract_doi_url(self, doi):
        """
        Retrieves the URL to fetch the abstract of an article in Scopus given its DOI.

        Args:
            doi (str): The DOI (Digital Object Identifier) of the article.

        Returns:
            str: The complete URL for fetching the abstract in Scopus.

        Raises:
            KeyError: If the base URL or endpoint for Scopus abstract by DOI is missing.
        """
        if 'scopus' in self.base_urls and 'scopus_abstract_doi' in self.endpoints:
            return f"{self.base_urls['scopus']}{self.endpoints['scopus_abstract_doi']}{doi}"
        else:
            raise KeyError("Missing base URL or endpoint for Scopus abstract by DOI")

    def get_scopus_serial_issN_url(self, issN):
        """
        Retrieves the URL to obtain information about a journal in Scopus given its ISSN.

        Args:
            issn (str): The ISSN (International Standard Serial Number) of the journal.

        Returns:
            str: The complete URL for obtaining journal information in Scopus.

        Raises:
            KeyError: If the base URL or endpoint for Scopus serial by ISSN is missing.
            :param issN:
        """
        if 'scopus' in self.base_urls and 'scopus_serial_issN' in self.endpoints:
            return f"{self.base_urls['scopus']}{self.endpoints['scopus_serial_issN']}{issN}"
        else:
            raise KeyError("Missing base URL or endpoint for Scopus serial by issN")

    def get_crossRef_search_url(self, query, rows=10):
        """
        Retrieves the URL for performing a search in CrossRef.

        Args:
            query (str): The query string for the search.
            rows (int, optional): Number of rows to retrieve (default is 10).

        Returns:
            str: The complete URL for CrossRef search with specified query and rows.

        Raises:
            KeyError: If the base URL for CrossRef search is missing.
        """
        if 'crossRef' in self.base_urls:
            return f"{self.base_urls['crossRef']}?query={query}&rows={rows}"
        else:
            raise KeyError("Missing base URL for CrossRef search")














