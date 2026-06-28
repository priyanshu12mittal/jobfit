import logging
from typing import List
from fastembed import TextEmbedding

logger = logging.getLogger(__name__)

# Initialize the embedding model. This will download the model weights (~100-200MB)
# on the very first run and cache them locally.
# We explicitly set the model name so the dimension (384) is stable.
MODEL_NAME = "BAAI/bge-small-en-v1.5"

try:
    logger.info(f"Loading fastembed model: {MODEL_NAME}...")
    embedding_model = TextEmbedding(model_name=MODEL_NAME)
    logger.info("Embedding model loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load embedding model: {e}")
    embedding_model = None

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    if not embedding_model:
        raise RuntimeError("Embedding model is not initialized.")
    
    # embed() returns a generator of numpy arrays, we convert to list of lists of floats
    embeddings_gen = embedding_model.embed(texts)
    
    result = []
    for emb in embeddings_gen:
        result.append(emb.tolist())
        
    return result
