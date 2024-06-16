import os
import requests
from dotenv import load_dotenv

load_dotenv()


class ApiClient:
    def __init__(self, api_key=None):
        self.api_key = os.getenv('API_KEY_ZOTERO')

    def get(self, url, query):
        """
        Makes a GET request to a specific API.

        Args:
            api_name (str): Name of the API ('scopus' or 'crossref').
            endpoint (str): Specific endpoint of the API.
            params (dict, optional): GET request parameters.

        Returns:
            dict: JSON response from the API.

        Raises:
            ValueError: If the API name is not valid.
            requests.exceptions.RequestException: If an error occurs during the request.
            :param url:
            :param query:
        """

        params = {'apiKey': self.api_key, 'query': query}

        try:
            response = requests.get(url, params=params)
            print(f"Response of the API : {response.status_code}")
            response.raise_for_status()
            data = response.json()
            return data
        except requests.exceptions.RequestException as e:
            print(f"Error making the request to the API '{url}': {e}")
            raise
