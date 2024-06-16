import os

import pandas as pd

from API_SERVICES.api_services import ApiClient
from MANAGE_API.urls import ApiUrls
from dotenv import load_dotenv
from MANAGE_API.extract import DataExtractor

load_dotenv()


def main():
    api_services = ApiClient()
    urls = ApiUrls()

    urlScopus = urls.get_scopus_search_url()
    result = api_services.get(urlScopus, "KEY(psicologia)")
    data_extractor = DataExtractor(result)
    data = data_extractor.extract_data()
    df = pd.DataFrame(data)
    df.to_csv('DATA/scopus_data.csv', index=False)


if __name__ == '__main__':
    main()
