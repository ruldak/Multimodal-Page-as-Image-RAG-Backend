class DocumentNotReadyException(Exception):
    def __init__(self, status: str):
        self.status = status
        super().__init__(f"Document not ready, status: {status}")

class UpstreamAPIException(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)
