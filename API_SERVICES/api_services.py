import os
import requests
from dotenv import load_dotenv

load_dotenv()


class ApiClient:
    def __init__(self, api_key=None):
        self.api_key = os.getenv('API_KEY_ZOTERO')

        # URLs base de las APIs
        self.base_urls = {
            'scopus': 'https://api.elsevier.com/content/',
            'crossref': 'https://api.crossref.org/works',
        }

    def get(self, api_name, endpoint, query,  params=None):
        """
        Realiza una solicitud GET a una API específica.

        Args:
            api_name (str): Nombre de la API ('scopus' o 'crossref').
            endpoint (str): Endpoint específico de la API.
            params (dict, optional): Parámetros de la solicitud GET.

        Returns:
            dict: Respuesta JSON de la API.

        Raises:
            ValueError: Si el nombre de la API no es válido.
            requests.exceptions.RequestException: Si ocurre un error durante la solicitud.
            :param api_name:
            :param endpoint:
            :param params:
            :param query:
        """
        if api_name not in self.base_urls:
            raise ValueError(f"API '{api_name}' no soportada.")

        url = f"{self.base_urls[api_name]}{endpoint}"
        params = {'apiKey': self.api_key, 'query': query}

        try:
            response = requests.get(url, params=params)
            print(response)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error al hacer la solicitud a la API '{api_name}': {e}")
            raise



